'use client';

import { memo } from 'react';
import { FolderKanban } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { roleMeta, specialtyMeta, timeAgo } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

interface UserKanbanBoardProps {
  users: User[];
  activeUserIds: string[];
  projectCounts?: Record<string, number>;
  onSelect?: (user: User) => void;
}

export const UserKanbanBoard = memo(function UserKanbanBoard({ users, activeUserIds, projectCounts = {}, onSelect }: UserKanbanBoardProps) {
  const active = users.filter((u) => activeUserIds.includes(u.id));
  const inactive = users.filter((u) => !activeUserIds.includes(u.id));

  const columns = [
    { key: 'active', label: 'Actifs', hint: 'Comptes actuellement connectés', dot: 'bg-success', list: active, color: 'text-success', bgCol: 'bg-success/5' },
    { key: 'inactive', label: 'Déconnectés', hint: 'Pas de session ouverte', dot: 'bg-muted-foreground/40', list: inactive, color: 'text-muted-foreground', bgCol: 'bg-muted/30' },
  ] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {columns.map((col) => (
        <div key={col.key} className="min-w-0">
          <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3', col.bgCol)}>
            <span className={cn('h-2.5 w-2.5 rounded-full', col.dot)} />
            <h3 className={cn('text-sm font-semibold', col.color)}>{col.label}</h3>
            <span className="ml-auto inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-background/80 text-xs font-bold text-muted-foreground">
              {col.list.length}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground px-1 -mt-1 mb-3">{col.hint}</p>

          <div className="space-y-3 min-h-[200px]">
            {col.list.map((u) => {
              const rm = roleMeta[u.role];
              const projectCount = u.role === 'client' ? (projectCounts[u.id] ?? 0) : null;
              const detail = u.role === 'client' ? (u.company ?? rm.label) : (u.memberSpecialty ? specialtyMeta[u.memberSpecialty]?.label ?? u.memberSpecialty : rm.label);
              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => onSelect?.(u)}
                  className={cn(
                    'w-full text-left rounded-xl border border-border/60 bg-card p-3.5 shadow-card hover:shadow-card-hover hover:border-primary/25 transition-all',
                    onSelect && 'cursor-pointer'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={u} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium', rm.bg, rm.color)}>
                      {rm.label}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] text-muted-foreground bg-muted/50">
                      {detail}
                    </span>
                    {projectCount !== null && projectCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-primary bg-primary/10">
                        <FolderKanban className="h-3 w-3" /> {projectCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-[11px] text-muted-foreground">
                    {col.key === 'active'
                      ? <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> En ligne</span>
                      : (u.lastActive ? `Dernière activité : ${timeAgo(u.lastActive)}` : 'Jamais connecté')}
                  </p>
                </button>
              );
            })}
            {col.list.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border/50 p-6 text-center">
                <p className="text-xs text-muted-foreground">Aucun utilisateur</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});