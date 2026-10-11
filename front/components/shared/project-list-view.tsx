'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowUp, ArrowDown, ArrowUpDown, ArrowUpRight, CalendarDays,
  FolderKanban, Users, AlertCircle, Paperclip, ListChecks,
} from 'lucide-react';
import { useUsers } from '@/lib/contexts/users-context';
import { StatusBadge, PriorityBadge } from '@/components/shared/badges';
import { ProgressBar } from '@/components/shared/progress';
import { getUser, formatDate, daysBetween } from '@/lib/status';
import type { Project } from '@/types';

type SortField = 'title' | 'client' | 'status' | 'progress' | 'endDate';

export function ProjectListView({ projects }: { projects: Project[] }) {
  const { users } = useUsers();
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('endDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sorted = useMemo(() => {
    const list = [...projects];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'client') {
        const ca = getUser(users, a.clientId)?.name ?? '';
        const cb = getUser(users, b.clientId)?.name ?? '';
        cmp = ca.localeCompare(cb);
      } else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'progress') cmp = a.progress - b.progress;
      else if (sortField === 'endDate') cmp = Date.parse(a.endDate) - Date.parse(b.endDate);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [projects, sortField, sortOrder, users]);

  const handleSortButton = (field: SortField, label: string) => (
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

  return (
    <CardShell>
      {/* Vue cartes sur mobile */}
      <div className="divide-y divide-border/60 sm:hidden">
        {sorted.map((p) => {
          const client = getUser(users, p.clientId);
          const pendingMods = p.modifications.filter((m) => m.status === 'pending' || m.status === 'pending_client');
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="block p-4 space-y-3 hover:bg-muted/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{client?.name ?? 'Client inconnu'}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <ProgressBar value={p.progress} indicatorClassName="bg-primary" className="flex-1" />
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">{p.progress}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {formatDate(p.endDate)}
                </span>
                <div className="flex items-center gap-2">
                  {pendingMods.length > 0 && (
                    <span className="flex items-center gap-1 text-warning"><AlertCircle className="h-3 w-3" />{pendingMods.length}</span>
                  )}
                  <span className="flex items-center gap-1 font-medium text-primary">
                    Voir <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun projet.</p>
          </div>
        )}
      </div>

      {/* Vue tableau sur tablette / bureau */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
              <th className="px-6 py-3 font-semibold">{handleSortButton('title', 'Projet')}</th>
              <th className="px-6 py-3 font-semibold">{handleSortButton('client', 'Client')}</th>
              <th className="px-6 py-3 font-semibold">{handleSortButton('status', 'Statut')}</th>
              <th className="px-6 py-3 font-semibold">{handleSortButton('progress', 'Progression')}</th>
              <th className="px-6 py-3 font-semibold">{handleSortButton('endDate', 'Échéance')}</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sorted.map((p) => {
              const client = getUser(users, p.clientId);
              const teamCount = p.members.filter((m) => m.role === 'membre' || m.role === 'chef_de_projet').length;
              const pendingMods = p.modifications.filter((m) => m.status === 'pending' || m.status === 'pending_client');
              const duration = Math.max(1, daysBetween(p.startDate, p.endDate));
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="group cursor-pointer transition-colors duration-150 hover:bg-muted/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.logoUrl ? (
                        <div className="relative h-10 w-10 rounded-xl bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                          <Image src={p.logoUrl} alt="" fill sizes="40px" className="object-contain" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <span className="font-display font-bold">{p.title[0]}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground transition-colors">{p.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <PriorityBadge priority={p.priority} />
                          <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{p.subtasks.length} tâches</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{teamCount} membre{teamCount > 1 ? 's' : ''}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{client?.name ?? '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={p.progress} indicatorClassName="bg-primary" className="w-32" />
                      <span className="text-xs font-semibold tabular-nums">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/60" />
                      {formatDate(p.endDate)}
                    </span>
                    <span className="block text-xs text-muted-foreground/60 mt-0.5">{duration} jours</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {pendingMods.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-warning">
                          <AlertCircle className="h-3.5 w-3.5" />{pendingMods.length}
                        </span>
                      )}
                      {p.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Paperclip className="h-3.5 w-3.5" />{p.attachments.length}
                        </span>
                      )}
                      <span className="inline-flex rounded-lg p-2 text-muted-foreground/40 transition-all group-hover:text-primary">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun projet.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </CardShell>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {children}
    </div>
  );
}