'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User } from '@/types';
import { loginApi, getApiToken, clearApiToken, decodeJwtPayload, mapJwtRolesToAppRole, userApi, ApiError, SESSION_EXPIRED_EVENT } from '@/lib/project-api';
import { useUsers, mapApiUser } from '@/lib/contexts/users-context';
import { useNotifications } from '@/lib/contexts/notifications-context';

const SESSION_KEY = 'activeUserId';
/** sessionStorage flag read by the login page to explain why the user landed there. */
export const SESSION_EXPIRED_FLAG = 'taskManagerSessionExpired';
const ACTIVE_USERS_KEY = 'taskManagerActiveUsers';
const SEED_ACTIVE_USERS = ['u-admin-1', 'u-mgr-1', 'u-emp-1', 'u-cli-1'];

/**
 * `reason`: set when the credentials were right but the server refused the
 * account itself (pending validation / rejected) -- message to show as is.
 */
export type LoginResult = { ok: true } | { ok: false; reason?: string };

interface SessionState {
  currentUser: User | null;
  sessionInitialized: boolean;
  apiToken: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  activeUserIds: string[];
  setUserActive: (userId: string, active: boolean) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { users, setUsers, fetchUsers } = useUsers();
  const { fetchNotifications } = useNotifications();

  // The session only tracks *which* user is logged in; the full profile is
  // always read live from UsersContext so edits (updateUser/updateProfile)
  // are reflected immediately without a second, divergent copy of the data.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [apiToken, setApiToken] = useState<string | null>(() => getApiToken());

  const [activeUserIds, setActiveUserIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(ACTIVE_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((s) => String(s));
      }
    } catch {
      // storage unavailable
    }
    return SEED_ACTIVE_USERS;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(activeUserIds));
    } catch {
      // storage unavailable
    }
  }, [activeUserIds]);

  const setUserActive = useCallback((userId: string, active: boolean) => {
    setActiveUserIds((prev) => {
      if (active) return prev.includes(userId) ? prev : [...prev, userId];
      return prev.filter((id) => id !== userId);
    });
  }, []);

  const currentUser = useMemo(
    () => (currentUserId ? users.find((u) => u.id === currentUserId) ?? null : null),
    [users, currentUserId]
  );

  // Re-sync notifications and the user roster on every apiToken transition:
  // login -> fetch the real data ; logout -> both functions reset back to
  // the local/demo dataset themselves (see users-context/notifications-context),
  // so a previous user's real data never lingers on screen after logout.
  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, [apiToken, fetchNotifications, fetchUsers]);

  useEffect(() => {
    try {
      const id = window.localStorage.getItem(SESSION_KEY);
      if (id) {
        const mockMatch = users.find((u) => u.id === id);
        if (mockMatch) {
          setCurrentUserId(id);
          setActiveUserIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        } else if (apiToken) {
          // Session belongs to a user that only exists in Symfony (not in the
          // local mock dataset) — rebuild it from the still-valid JWT instead
          // of silently dropping the session on every full page reload.
          const payload = decodeJwtPayload(apiToken);
          if (payload?.username) {
            const restoredUser: User = {
              id,
              name: payload.username,
              email: payload.username,
              role: mapJwtRolesToAppRole(payload.roles),
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.username)}`,
              createdAt: new Date().toISOString(),
            };
            setUsers((prev) => (prev.some((u) => u.id === id) ? prev : [...prev, restoredUser]));
            setCurrentUserId(id);
            setActiveUserIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          }
        }
      }
    } catch {
      // storage unavailable
    } finally {
      setSessionInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const trimmedEmail = email.trim();

    // 1. Real authentication against the Symfony backend.
    try {
      const { token } = await loginApi(trimmedEmail, password);
      setApiToken(token);

      // The authoritative id is the backend's publicId (userApi.me()), never
      // a synthetic one built from the JWT payload: users-context's
      // fetchUsers() replaces the whole roster with real publicIds right
      // after login (see session-context's apiToken effect), so a
      // synthetic/mock id here would stop matching anything in `users` the
      // moment that fetch resolves -- making currentUser go null and
      // useAuthGuard bounce straight back to /login.
      let authenticatedUser: User;
      try {
        const me = await userApi.me();
        const mockMatch = users.find((u) => u.email.toLowerCase() === trimmedEmail.toLowerCase());
        authenticatedUser = mapApiUser(me, mockMatch);
      } catch {
        // /api/users/me itself failed right after a successful login: very
        // unlikely, but fall back to a JWT-derived profile rather than fail outright.
        const payload = decodeJwtPayload(token);
        authenticatedUser = {
          id: `api-${payload?.username ?? trimmedEmail}`,
          name: payload?.username ?? trimmedEmail,
          email: trimmedEmail,
          role: mapJwtRolesToAppRole(payload?.roles),
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedEmail)}`,
          createdAt: new Date().toISOString(),
        };
      }

      setUsers((prev) => {
        const exists = prev.some((u) => u.id === authenticatedUser.id);
        return exists
          ? prev.map((u) => u.id === authenticatedUser.id ? { ...u, ...authenticatedUser, active: true, lastActive: new Date().toISOString() } : u)
          : [...prev, authenticatedUser];
      });
      setCurrentUserId(authenticatedUser.id);
      setActiveUserIds((prev) => (prev.includes(authenticatedUser.id) ? prev : [...prev, authenticatedUser.id]));
      try {
        window.localStorage.setItem(SESSION_KEY, authenticatedUser.id);
      } catch {
        // ignore
      }
      return { ok: true };
    } catch (err) {
      // The server answered (wrong password, account pending/rejected...):
      // that's the definitive answer. Falling back to the demo dataset here
      // used to open a fake "admin" session on demo data whenever a demo
      // account's password didn't match the real database.
      if (err instanceof ApiError) {
        clearApiToken();
        return err.status === 403 && err.body?.accountStatus
          ? { ok: false, reason: err.message }
          : { ok: false };
      }
      // 2. Backend unreachable (network error): fall back to the local/demo
      // dataset so the prototype stays usable offline.
      const user = users.find(
        (u) => u.email.toLowerCase() === trimmedEmail.toLowerCase() && u.password === password
      );
      if (!user) return { ok: false };
      if (user.accountStatus === 'pending' || user.accountStatus === 'rejected') return { ok: false };
      setUsers((prev) => prev.map((u) =>
        u.id === user.id ? { ...u, active: true, lastActive: new Date().toISOString() } : u
      ));
      setCurrentUserId(user.id);
      setActiveUserIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
      try {
        window.localStorage.setItem(SESSION_KEY, user.id);
      } catch {
        // ignore
      }
      return { ok: true };
    }
  }, [users, setUsers]);

  const logout = useCallback(() => {
    if (currentUserId) {
      setActiveUserIds((prev) => prev.filter((id) => id !== currentUserId));
      setUsers((prev) => prev.map((u) => u.id === currentUserId ? { ...u, active: false } : u));
    }
    setCurrentUserId(null);
    setApiToken(null);
    clearApiToken();
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }, [currentUserId, setUsers]);

  // The JWT could not be renewed (see project-api's send()): log out for real
  // so useAuthGuard sends the user to /login, which explains why -- rather
  // than staying "logged in" on data that silently stopped refreshing.
  useEffect(() => {
    const onExpired = () => {
      try {
        window.sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
      } catch {
        // storage unavailable
      }
      logout();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const value = useMemo<SessionState>(() => ({
    currentUser, sessionInitialized, apiToken, login, logout, activeUserIds, setUserActive,
  }), [currentUser, sessionInitialized, apiToken, login, logout, activeUserIds, setUserActive]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
