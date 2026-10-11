'use client';

import { memo, useMemo, useState } from 'react';
import {
  ArrowUp, ArrowDown, ArrowUpDown, Users as UsersIcon, CircleOff, Building2, Wrench, FolderKanban,
} from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { roleMeta, specialtyMeta, formatDate, formatDateTime, timeAgo } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

type SortField = 'name' | 'role' | 'statut' | 'lastActive';

interface UserListViewProps {
  users: User[];
  activeUserIds: string[];
  projectCounts?: Record<string, number>;
  onSelect?: (user: User) => void;
}

export const UserListView = memo(function UserListView({ users, activeUserIds, projectCounts = {}, onSelect }: UserListViewProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortOrder('asc'); }
  };

  const sorted = useMemo(() => {
    const list = [...users];
    list.sort((a, b) => {
      const aActive = activeUserIds.includes(a.id);
      const bActive = activeUserIds.includes(b.id);
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'role') cmp = a.role.localeCompare(b.role);
      else if (sortField === 'statut') cmp = Number(bActive) - Number(aActive);
      else if (sortField === 'lastActive') cmp = (a.lastActive ?? a.createdAt).localeCompare(b.lastActive ?? b.createdAt);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [users, activeUserIds, sortField, sortOrder]);

  const sortBtn = (field: SortField, label: string) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortField === field ? (
        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
      )}
    </button>
  );

  const ActiveDot = ({ active }: { active: boolean }) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', active ? 'bg-success' : 'bg-muted-foreground/40')} />
      <span className={cn('text-xs font-medium', active ? 'text-success' : 'text-muted-foreground')}>
        {active ? 'Actif' : 'Déconnecté'}
      </span>
    </span>
  );

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-card overflow-hidden">
      {/* Mobile cards */}
      <div className="divide-y divide-border/60 sm:hidden">
        {sorted.map((u) => {
          const active = activeUserIds.includes(u.id);
          const rm = roleMeta[u.role];
          const projectCount = u.role === 'client' ? (projectCounts[u.id] ?? 0) : 0;
          const detail = u.role === 'client' ? (u.company ?? 'Client') : (u.memberSpecialty ? specialtyMeta[u.memberSpecialty]?.label ?? u.memberSpecialty : rm.label);
          return (
            <button
              type="button"
              key={u.id}
              onClick={() => onSelect?.(u)}
              className={cn('w-full text-left flex items-center gap-3 p-4', onSelect && 'active:bg-muted/50')}
            >
              <UserAvatar user={u} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                  {detail}
                  {projectCount > 0 && ` · ${projectCount} projet${projectCount > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ActiveDot active={active} />
                <span className="text-[11px] text-muted-foreground">{formatDate(u.lastActive ?? u.createdAt)}</span>
              </div>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UsersIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun utilisateur.</p>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
              <th className="px-6 py-3">{sortBtn('name', 'Utilisateur')}</th>
              <th className="px-6 py-3">{sortBtn('role', 'Rôle')}</th>
              <th className="px-6 py-3">Détail</th>
              <th className="px-6 py-3">Projets</th>
              <th className="px-6 py-3">{sortBtn('statut', 'Statut')}</th>
              <th className="px-6 py-3">{sortBtn('lastActive', 'Dernière activité')}</th>
              <th className="px-6 py-3">Inscrit depuis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sorted.map((u) => {
              const active = activeUserIds.includes(u.id);
              const rm = roleMeta[u.role];
              const projectCount = u.role === 'client' ? (projectCounts[u.id] ?? 0) : null;
              const detail = u.role === 'client'
                ? <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{u.company ?? 'Client'}</span>
                : <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Wrench className="h-3.5 w-3.5" />{u.memberSpecialty ? specialtyMeta[u.memberSpecialty]?.label ?? u.memberSpecialty : rm.label}</span>;
              return (
                <tr key={u.id} className={cn('transition-colors duration-150 hover:bg-muted/30', onSelect && 'cursor-pointer')} onClick={() => onSelect?.(u)}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} size="md" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', rm.bg, rm.color)}>
                      {rm.label}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm">{detail}</td>
                  <td className="px-6 py-3.5">
                    {projectCount !== null ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <FolderKanban className="h-3.5 w-3.5 text-primary" />
                        {projectCount}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <ActiveDot active={active} />
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">
                    <span className="text-xs">{active ? 'En ligne' : (u.lastActive ? timeAgo(u.lastActive) : '—')}</span>
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground text-xs">{formatDateTime(u.createdAt)}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="text-center py-12 text-muted-foreground">
                    <UsersIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun utilisateur.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export function StatusLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <CircleOff className="h-3.5 w-3.5 opacity-50" />
        Déconnecté
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-success" />
        En ligne (compte actif)
      </span>
    </div>
  );
}