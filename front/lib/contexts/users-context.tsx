'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { User, Role, MemberSpecialty, RequestStatus } from '@/types';
import { mockUsers } from '@/lib/mock-data';
import { employeeApi, authApi, userApi, getApiToken, decodeJwtPayload, type ApiUser } from '@/lib/project-api';
import { toast } from '@/hooks/use-toast';
import { usePolling } from '@/hooks/use-polling';
import { useNotifications } from '@/lib/contexts/notifications-context';

/** How often an admin's open page checks for newly registered pending accounts. */
const PENDING_POLL_MS = 30_000;

function isAdminSession(): boolean {
  const token = getApiToken();
  return !!token && (decodeJwtPayload(token)?.roles ?? []).includes('ROLE_ADMIN');
}

// `_existing`: kept for call-site compatibility; the role now comes from the API data alone.
export function mapApiUser(api: ApiUser, _existing?: Partial<User>): User {
  const roles = api.roles ?? [];
  // No ROLE_CLIENT server-side: clients and membres both have no elevated
  // role, and the backend guarantees a membre always has a memberSpecialty
  // while nobody else does (AuthController, EmployeeController, UserController).
  // Previously every such API user defaulted to 'membre', so real clients
  // showed up as membres (e.g. the admin's "Clients" filter stayed at 0).
  const role: Role = roles.includes('ROLE_ADMIN') ? 'admin' : roles.includes('ROLE_CHEF_DE_PROJET') ? 'chef_de_projet' : api.memberSpecialty ? 'membre' : 'client';
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    role,
    memberSpecialty: (api.memberSpecialty as MemberSpecialty | null) ?? undefined,
    avatarUrl: api.avatarUrl,
    phone: api.phone ?? undefined,
    company: api.company ?? undefined,
    address: api.address ?? undefined,
    bio: api.bio ?? undefined,
    accountStatus: (api.accountStatus as User['accountStatus']) ?? 'active',
    createdAt: api.createdAt ?? new Date().toISOString(),
  };
}

const DEFAULT_SPECIALTIES: string[] = ['Designer', 'DevOps', 'Frontend', 'Backend', 'Fullstack', 'QA', 'Chef de projet junior', 'Autre'];
const SPECIALTIES_KEY = 'taskManagerSpecialties';

interface UsersState {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  /** 'loading' until the real roster has been fetched (or until we've decided there's no backend to fetch from). */
  status: RequestStatus;
  specialties: string[];
  addSpecialty: (name: string) => void;
  addEmployee: (data: { name: string; email: string; password: string; phone: string; role: 'admin' | 'chef_de_projet' | 'membre'; memberSpecialty?: MemberSpecialty; avatarUrl?: string; company?: string; address?: string; bio?: string }, apiToken: string | null) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string; role: 'client' | 'chef_de_projet' | 'membre'; company?: string; memberSpecialty?: MemberSpecialty; bio?: string }) => Promise<boolean>;
  reviewAccount: (currentUserRole: Role | undefined, userId: string, decision: 'approved' | 'rejected') => void;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; devCode?: string }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<boolean>;
  updateUser: (currentUserRole: Role | undefined, userId: string, data: { name?: string; email?: string; phone?: string; company?: string; address?: string; bio?: string; role?: Role; memberSpecialty?: MemberSpecialty; password?: string; avatarUrl?: string }) => void;
  updateProfile: (currentUserId: string | undefined, data: { name?: string; email?: string; phone?: string; company?: string; address?: string; bio?: string; memberSpecialty?: MemberSpecialty; avatarUrl?: string }) => void;
  /**
   * Accounts waiting for an admin's validation (admin sidebar badge). Derived
   * from `users`, the same list the /admin/users page shows, so both always agree.
   */
  pendingCount: number;
  /**
   * @internal called by SessionProvider right after a successful login (apiToken just appeared).
   * `silent`: background refresh (polling) -- keeps `status` as is, so no skeleton flashes.
   */
  fetchUsers: (opts?: { silent?: boolean }) => Promise<void>;
}

const UsersContext = createContext<UsersState | null>(null);

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within UsersProvider');
  return ctx;
}

export function UsersProvider({ children }: { children: React.ReactNode }) {
  // getApiToken() is a synchronous localStorage read, so this is correct on
  // the very first render: if a session is about to be restored, start
  // empty + 'loading' (never show the mock roster first) ; if there's truly
  // no token, the mock roster *is* the final answer (offline/demo mode),
  // so 'success' immediately -- no flash either way.
  const [users, setUsers] = useState<User[]>(() => (getApiToken() ? [] : mockUsers));
  const [status, setStatus] = useState<RequestStatus>(() => (getApiToken() ? 'loading' : 'success'));
  const { pushNotification, fetchNotifications } = useNotifications();

  const fetchUsers = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!getApiToken()) {
      // Logged out (or never logged in): reset to the demo roster rather
      // than leaving a previous user's real data lingering on screen.
      setUsers(mockUsers);
      setStatus('success');
      return;
    }
    if (!silent) setStatus('loading');
    try {
      const list = await userApi.list();
      setUsers(list.map((u) => mapApiUser(u)));
      setStatus('success');
    } catch {
      // Backend unreachable while authenticated: fall back to the demo
      // roster rather than leaving the UI stuck on a skeleton forever.
      setUsers((prev) => (prev.length > 0 ? prev : mockUsers));
      setStatus('success');
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // BFCache restore (back/forward) and long-idle-tab refocus: refetch
  // instead of trusting whatever was last in memory/restored by the browser.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) fetchUsers(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchUsers(); };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchUsers]);

  const pendingCount = useMemo(() => users.filter((u) => u.accountStatus === 'pending').length, [users]);
  const pendingCountRef = useRef(pendingCount);
  pendingCountRef.current = pendingCount;

  // Admins only: poll the cheap count endpoint, and reload the full roster
  // (silently) only when it no longer matches what's on screen -- e.g. a new
  // registration, or an account another admin just approved/rejected.
  usePolling(async () => {
    if (!isAdminSession()) return;
    try {
      const { count } = await userApi.pendingCount();
      if (count !== pendingCountRef.current) await fetchUsers({ silent: true });
    } catch {
      // backend unreachable: keep the current list, retry on the next tick
    }
  }, PENDING_POLL_MS);

  const [specialties, setSpecialties] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_SPECIALTIES;
    try {
      const raw = window.localStorage.getItem(SPECIALTIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return Array.from(new Set([...DEFAULT_SPECIALTIES, ...parsed.map((s) => String(s))]));
        }
      }
    } catch {
      // storage unavailable
    }
    return DEFAULT_SPECIALTIES;
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(SPECIALTIES_KEY, JSON.stringify(specialties));
    } catch {
      // storage unavailable
    }
  }, [specialties]);

  const addSpecialty = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSpecialties((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }, []);

  const addEmployee: UsersState['addEmployee'] = useCallback(async (data, apiToken) => {
    if (apiToken) {
      try {
        const created = await employeeApi.create(data);
        const newUser: User = {
          id: String(created.id),
          name: created.name,
          email: created.email,
          role: data.role,
          memberSpecialty: (created.memberSpecialty as MemberSpecialty | null) ?? undefined,
          avatarUrl: created.avatarUrl,
          phone: created.phone ?? undefined,
          company: created.company ?? undefined,
          address: created.address ?? undefined,
          bio: created.bio ?? undefined,
          createdAt: created.createdAt ?? new Date().toISOString(),
        };
        setUsers((prev) => [...prev, newUser]);
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Échec de la création de l'employé", description: err?.message || 'Le serveur a refusé la création de ce compte.' });
      }
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      memberSpecialty: data.memberSpecialty,
      avatarUrl: data.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=b6e3f4`,
      password: data.password,
      phone: data.phone,
      company: data.company,
      address: data.address,
      bio: data.bio,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
  }, []);

  // register() is always a pre-auth call (no session yet), so it always
  // tries the real API first and only falls back to a local/demo account if
  // the backend is unreachable -- unlike the other actions here, which gate
  // on an existing apiToken.
  const register: UsersState['register'] = useCallback(async (data) => {
    // Every self-registered account (client included) waits for an admin --
    // same rule as AuthController::register on the backend.
    try {
      const created = await authApi.register(data);
      setUsers((prev) => [...prev, mapApiUser(created, { role: data.role })]);
      return true;
    } catch (err: any) {
      if (getApiToken() === null && !navigator.onLine) {
        // Truly offline: keep the demo usable without a backend.
      } else if (err?.message && !/Failed to fetch|NetworkError/i.test(err.message)) {
        // The backend responded with a real validation error (e.g. duplicate
        // email) -- surface it instead of silently falling back.
        toast({ variant: 'destructive', title: 'Inscription refusée', description: err.message });
        return false;
      }
      const newUserMeta: User = {
        id: `u-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        memberSpecialty: data.memberSpecialty,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=b6e3f4`,
        password: data.password,
        phone: data.phone ?? '',
        company: data.company,
        bio: data.bio,
        accountStatus: 'pending',
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUserMeta]);
      pushNotification({
        userId: 'u-admin-1',
        type: 'account_created',
        title: 'Nouveau compte à valider',
        message: `« ${data.name} » a créé un compte ${data.role === 'chef_de_projet' ? 'chef de projet' : data.role}. À valider.`,
      });
      return true;
    }
  }, [pushNotification]);

  const reviewAccount: UsersState['reviewAccount'] = useCallback(async (currentUserRole, userId, decision) => {
    if (currentUserRole !== 'admin') return;

    if (getApiToken()) {
      try {
        const updated = await userApi.review(userId, decision);
        setUsers((prev) => prev.map((u) => (u.id === userId ? mapApiUser(updated, u) : u)));
        // The server marked this account's "account_created" alerts as read
        // for every admin: refresh so the bell's unread count drops now.
        fetchNotifications({ silent: true });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la validation du compte', description: err?.message || 'Le serveur a refusé cette action.' });
      }
      return;
    }

    setUsers((prev) => prev.map((u) =>
      u.id === userId ? { ...u, accountStatus: decision === 'approved' ? 'active' : ('rejected' as const) } : u
    ));
    pushNotification({
      userId,
      type: decision === 'approved' ? 'account_validated' : 'account_rejected',
      title: decision === 'approved' ? 'Compte activé' : 'Compte refusé',
      message: decision === 'approved' ? 'Votre compte a été validé par un administrateur. Vous pouvez maintenant vous connecter.' : 'Votre demande de compte a été refusée par un administrateur.',
    });
  }, [pushNotification, fetchNotifications]);

  // Also a pre-auth flow: always calls the real API (which issues a 6-digit
  // code, 15 min expiry -- see AuthController::forgotPassword). Since
  // MAILER_DSN=null in this environment, the dev response includes the code
  // directly so the flow stays testable end to end without a real mailer.
  const requestPasswordReset: UsersState['requestPasswordReset'] = useCallback(async (email) => {
    try {
      const res = await authApi.forgotPassword(email);
      return { ok: true, devCode: res.devCode };
    } catch {
      return { ok: false };
    }
  }, []);

  const resetPassword: UsersState['resetPassword'] = useCallback(async (email, code, newPassword) => {
    try {
      await authApi.resetPassword(email, code, newPassword);
      return true;
    } catch {
      // Offline/demo fallback: no server-side code to check against, so just
      // require a matching local account (same as this app's previous behaviour).
      const target = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!target) return false;
      setUsers((prev) => prev.map((u) => u.id === target.id ? { ...u, password: newPassword } : u));
      return true;
    }
  }, [users]);

  const updateUser: UsersState['updateUser'] = useCallback(async (currentUserRole, userId, data) => {
    if (currentUserRole !== 'admin') return;

    if (getApiToken()) {
      try {
        const updated = await userApi.update(userId, data);
        setUsers((prev) => prev.map((u) => (u.id === userId ? mapApiUser(updated, u) : u)));
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Échec de la mise à jour", description: err?.message || 'Le serveur a refusé cette action.' });
      }
      return;
    }

    setUsers((prev) => prev.map((u) =>
      u.id === userId ? { ...u, ...data } : u
    ));
  }, []);

  const updateProfile: UsersState['updateProfile'] = useCallback(async (currentUserId, data) => {
    if (!currentUserId) return;

    if (getApiToken()) {
      try {
        const updated = await userApi.updateMe(data);
        setUsers((prev) => prev.map((u) => (u.id === currentUserId ? mapApiUser(updated, u) : u)));
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Échec de la mise à jour du profil", description: err?.message || 'Le serveur a refusé cette action.' });
      }
      return;
    }

    setUsers((prev) => prev.map((u) =>
      u.id === currentUserId ? { ...u, ...data } : u
    ));
  }, []);

  const value = useMemo<UsersState>(() => ({
    users, setUsers, status, specialties, addSpecialty, addEmployee, register, reviewAccount, requestPasswordReset, resetPassword, updateUser, updateProfile, pendingCount, fetchUsers,
  }), [users, status, specialties, addSpecialty, addEmployee, register, reviewAccount, requestPasswordReset, resetPassword, updateUser, updateProfile, pendingCount, fetchUsers]);

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}
