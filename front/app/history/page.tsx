'use client';

import { useState, useMemo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  History as HistoryIcon, Search, CalendarDays, Users, ChevronRight, CheckCircle2, XCircle,
  Pencil, ArrowLeft, Eye, Clock, AlertCircle, ListTodo, GitCompare, TrendingUp,
} from 'lucide-react';
import { useUsers } from '@/lib/contexts/users-context';
import { useProjects } from '@/lib/contexts/projects-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { ListRowsSkeleton } from '@/components/shared/page-skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge, PriorityBadge } from '@/components/shared/badges';
import { ProgressBar } from '@/components/shared/progress';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ProjectCalendar } from '@/components/shared/project-calendar';
import dynamic from 'next/dynamic';

const ProgressChart = dynamic(() => import('@/components/shared/progress-chart').then((m) => m.ProgressChart), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />,
});
import {
  getUser, formatDate, formatDateTime, formatCurrency, isProjectArchived, subtaskStatusMeta, computeProgressTimeline,
} from '@/lib/status';
import { cn } from '@/lib/utils';
import type { Project, ProjectVersion, Subtask, SubtaskStatus, User as UserType } from '@/types';

const versionFilterOptions = [
  { value: 'all', label: 'Tous les projets' },
  { value: 'completed', label: 'Terminés' },
  { value: 'rejected', label: 'Rejetés' },
  { value: 'modified', label: 'Modifiés' },
] as const;

export default function HistoryPage() {
  return (
    <Suspense fallback={<AppShell><div className="py-20 text-center text-muted-foreground">Chargement...</div></AppShell>}>
      <HistoryContent />
    </Suspense>
  );
}

function HistoryContent() {
  const { user, ready } = useAppReady();
  const { projects } = useProjects();
  const { users } = useUsers();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams?.get('filter') as string | null;

  const [filter, setFilter] = useState<string>(initialFilter === 'completed' || initialFilter === 'rejected' || initialFilter === 'modified' ? initialFilter : 'all');
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [historyTab, setHistoryTab] = useState('apercu');

  // Only show archived projects (completed/rejected with statusChangedAt > 24h ago)
  const archivedProjects = useMemo(() => {
    if (!user) return [];
    let list = projects.filter((p) => isProjectArchived(p));
    // Role filter
    if (user.role === 'client') list = list.filter((p) => p.clientId === user.id);
    else if (user.role === 'chef_de_projet') list = list.filter((p) => p.managerId === user.id);
    else if (user.role === 'membre') list = list.filter((p) => p.subtasks.some((st) => st.assignedToId === user.id));
    // Status filter
    if (filter === 'completed') list = list.filter((p) => p.status === 'completed');
    else if (filter === 'rejected') list = list.filter((p) => p.status === 'rejected');
    else if (filter === 'modified') list = list.filter((p) => (p.versions?.length ?? 0) > 0);
    // Search by title, client name
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const client = getUser(users, p.clientId);
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (client?.name.toLowerCase().includes(q)) ||
          (client?.company?.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [projects, users, user, filter, search]);

  const stats = useMemo(() => {
    const all = projects.filter((p) => isProjectArchived(p));
    return {
      total: all.length,
      completed: all.filter((p) => p.status === 'completed').length,
      rejected: all.filter((p) => p.status === 'rejected').length,
      modified: all.filter((p) => (p.versions?.length ?? 0) > 0).length,
    };
  }, [projects]);

  if (!user) return null;
  if (!ready) return <AppShell><ListRowsSkeleton rows={8} /></AppShell>;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/projects')} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="font-display text-2xl font-bold tracking-tight">Historique des projets</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              Projets terminés ou rejetés depuis plus de 24h
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Terminés', value: stats.completed, color: 'text-success', icon: CheckCircle2 },
          { label: 'Rejetés', value: stats.rejected, color: 'text-destructive', icon: XCircle },
          { label: 'Modifiés', value: stats.modified, color: 'text-warning', icon: Pencil },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-4">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {s.icon && <s.icon className="h-3 w-3" />}
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, client ou entreprise..."
            className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl bg-card border border-border focus:border-primary/40 transition-all outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {versionFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium transition-all',
                filter === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {archivedProjects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground rounded-xl bg-card border border-border">
          <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun projet dans l&apos;historique{filter !== 'all' ? ' pour ce filtre' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {archivedProjects.map((p, i) => {
            const client = getUser(users, p.clientId);
            const hasVersions = (p.versions?.length ?? 0) > 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
              >
                <Card
                  className="p-5 hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer group"
                  onClick={() => { setSelectedProject(p); setShowOriginal(false); setHistoryTab('apercu'); }}
                >
                  <div className="flex items-start gap-4">
                    {p.logoUrl ? (
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center flex-shrink-0">
                        <Image src={p.logoUrl} alt="" fill sizes="48px" className="object-contain" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <span className="font-display font-bold text-lg">{p.title[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm leading-tight">{p.title}</p>
                        <StatusBadge status={p.status} />
                        <PriorityBadge priority={p.priority} />
                        {hasVersions && (
                          <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">
                            <Pencil className="h-2.5 w-2.5 mr-0.5" /> Modifié
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{p.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {client?.name ?? 'Client inconnu'}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(p.startDate)} → {formatDate(p.endDate)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Archivé le {formatDate(p.statusChangedAt ?? p.createdAt)}</span>
                        {hasVersions && (
                          <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> {p.versions?.length} version{(p.versions?.length ?? 0) > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => { if (!open) { setSelectedProject(null); setSelectedVersion(null); setShowOriginal(false); setHistoryTab('apercu'); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5 text-primary" />
                  {showOriginal ? `Version originale — ${selectedProject.title}` : selectedProject.title}
                </DialogTitle>
              </DialogHeader>

              <Tabs value={historyTab} onValueChange={setHistoryTab} className="py-1">
                <TabsList className="w-full justify-start gap-1 overflow-x-auto">
                  <TabsTrigger value="apercu" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Aperçu</TabsTrigger>
                  <TabsTrigger value="taches" className="gap-1.5"><ListTodo className="h-3.5 w-3.5" /> Tâches ({selectedProject.subtasks.length})</TabsTrigger>
                  <TabsTrigger value="calendrier" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Calendrier ({selectedProject.calendarEvents.length})</TabsTrigger>
                  <TabsTrigger value="avancement" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Avancement</TabsTrigger>
                  <TabsTrigger value="modifications" className="gap-1.5"><GitCompare className="h-3.5 w-3.5" /> Modifications ({selectedProject.modifications.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="apercu" className="mt-4 space-y-5">
                  {/* Status & Meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selectedProject.status} />
                    <PriorityBadge priority={selectedProject.priority} />
                    <Badge variant="outline" className="text-xs">{selectedProject.category}</Badge>
                    {(selectedProject.versions?.length ?? 0) > 0 && (
                      <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">
                        <Pencil className="h-2.5 w-2.5 mr-0.5" /> {selectedProject.versions?.length} version{(selectedProject.versions?.length ?? 0) > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {/* Project info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-muted/30">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Client</p>
                      <p className="text-sm">{getUser(users, selectedProject.clientId)?.name ?? 'Inconnu'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Budget</p>
                      <p className="text-sm">{formatCurrency(selectedProject.budget)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Période</p>
                      <p className="text-sm">{formatDate(selectedProject.startDate)} → {formatDate(selectedProject.endDate)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Archivé le</p>
                      <p className="text-sm">{formatDate(selectedProject.statusChangedAt ?? selectedProject.createdAt)}</p>
                    </div>
                  </div>

                  {/* Description (or original description if viewing original version) */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Description</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {showOriginal && selectedVersion
                        ? selectedVersion.description
                        : selectedProject.description}
                    </p>
                  </div>

                  {/* Rejection reason */}
                  {selectedProject.status === 'rejected' && selectedProject.rejectionReason && !showOriginal && (
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                      <p className="text-xs font-semibold text-destructive flex items-center gap-1 mb-1">
                        <AlertCircle className="h-3 w-3" /> Motif du rejet
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedProject.rejectionReason}</p>
                    </div>
                  )}

                  {/* Team */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Équipe ({selectedProject.members.length})
                    </p>
                    {selectedProject.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun membre affecté.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.members.map((m) => {
                          const member = getUser(users, m.userId);
                          return (
                            <span key={m.userId} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium">
                              <UserAvatar user={member} size="sm" className="h-5 w-5" />
                              {member?.name ?? 'Ancien membre'}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Versions Archive */}
                  {(selectedProject.versions?.length ?? 0) > 0 && !showOriginal && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                        <Pencil className="h-3 w-3" /> Historique des versions
                      </p>
                      <div className="space-y-2">
                        {[...(selectedProject.versions ?? [])].reverse().map((v, i) => (
                          <button
                            key={v.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedVersion(v); setShowOriginal(true); }}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/30 transition-all"
                          >
                            <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', i === 0 ? 'bg-success' : 'bg-muted-foreground/30')} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{v.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDateTime(v.capturedAt)} · {v.reason}
                              </p>
                            </div>
                            {i === 0 && <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Originale</Badge>}
                            <Eye className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View current version button when viewing original */}
                  {showOriginal && (
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); setShowOriginal(false); setSelectedVersion(null); }} className="w-full gap-1.5">
                      <ArrowLeft className="h-4 w-4" /> Retour à la version actuelle
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="taches" className="mt-4 space-y-5">
                  {selectedProject.subtasks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucune sous-tâche définie sur ce projet.</p>
                    </div>
                  ) : (
                    <ArchiveTaskBoard subtasks={selectedProject.subtasks} users={users} />
                  )}

                  {selectedProject.taskRequests.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Demandes de tâche ({selectedProject.taskRequests.length})
                      </p>
                      <div className="space-y-2">
                        {selectedProject.taskRequests.map((req) => (
                          <div key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{req.title}</p>
                                <PriorityBadge priority={req.priority} />
                                <TaskReqStatusBadge status={req.status} />
                              </div>
                              {req.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>}
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Demandée le {formatDate(req.createdAt)}
                                {req.besoinDate && ` · nécessaire le ${formatDate(req.besoinDate)}`}
                                {(req.status === 'approved' || req.status === 'rejected') && req.reviewNote && ` · note : « ${req.reviewNote} »`}
                              </p>
                            </div>
                            {req.photoUrl && (
                              <img src={req.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="calendrier" className="mt-4">
                  {selectedProject.calendarEvents.length === 0 && selectedProject.subtasks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucun événement ni sous-tâche à afficher sur le calendrier.</p>
                    </div>
                  ) : (
                    <ProjectCalendar events={selectedProject.calendarEvents} subtasks={selectedProject.subtasks} />
                  )}
                </TabsContent>

                <TabsContent value="avancement" className="mt-4">
                  <div className="rounded-xl border border-border bg-muted/10 p-3">
                    <ProgressChart data={selectedProject.progressTimeline.length > 0 ? selectedProject.progressTimeline : computeProgressTimeline(selectedProject)} />
                  </div>
                </TabsContent>

                <TabsContent value="modifications" className="mt-4 space-y-3">
                  {selectedProject.modifications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <GitCompare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucune demande de modification sur ce projet.</p>
                    </div>
                  ) : (
                    [...selectedProject.modifications].reverse().map((mod) => {
                      const reviewer = getUser(users, mod.reviewedById);
                      const targetSubtask = mod.subtaskId ? selectedProject.subtasks.find((s) => s.id === mod.subtaskId) : undefined;
                      return (
                        <div
                          key={mod.id}
                          className={cn(
                            'rounded-xl border p-4',
                            mod.status === 'pending' ? 'border-warning/30' : mod.status === 'pending_client' ? 'border-info/30' : mod.status === 'approved' ? 'border-success/30' : 'border-destructive/30'
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <ModStatusBadge status={mod.status} />
                            <Badge variant="outline" className="text-[10px]">
                              {mod.target === 'project' ? 'Projet' : `Sous-tâche : ${targetSubtask?.title ?? 'supprimée'}`}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">{modFieldLabels[mod.field] ?? mod.field}</Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            <div className="p-2 rounded-lg bg-muted/30">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Valeur actuelle</p>
                              <p className="text-sm line-clamp-2 break-words">{mod.oldValue || '—'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/30">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Nouvelle valeur</p>
                              <p className="text-sm line-clamp-2 break-words">{mod.newValue || '—'}</p>
                            </div>
                          </div>
                          {mod.reason && (
                            <p className="text-xs text-muted-foreground mb-2">Raison : « {mod.reason} »</p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                            <span>Demandée par {mod.requestedByName}</span>
                            <span>{formatDate(mod.createdAt)}</span>
                            {mod.status !== 'pending' && mod.status !== 'pending_client' && reviewer && (
                              <span>Review : {reviewer.name}</span>
                            )}
                          </div>
                          {mod.teamReview && (
                            <p className="text-[11px] text-muted-foreground mt-1">Avis équipe : {mod.teamReview.note}</p>
                          )}
                          {mod.clientReview && (
                            <p className="text-[11px] text-muted-foreground mt-1">Avis client : {mod.clientReview.note}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// Local helpers (archive history)

const subtaskColumnOrder: SubtaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'cancelled'];

function ArchiveTaskBoard({ subtasks, users }: { subtasks: Subtask[]; users: UserType[] }) {
  return (
    <div className="flex flex-wrap gap-4 items-start">
      {subtaskColumnOrder.map((status) => {
        const meta = subtaskStatusMeta[status];
        const list = subtasks.filter((s) => s.status === status);
        return (
          <div key={status} className="flex-1 min-w-[240px]">
            <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3', meta.bg)}>
              <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
              <h4 className={cn('text-sm font-semibold', meta.color)}>{meta.label}</h4>
              <span className="ml-auto inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-background/80 text-xs font-bold text-muted-foreground">
                {list.length}
              </span>
            </div>
            <div className="space-y-2">
              {list.length === 0 && (
                <p className="text-[11px] text-muted-foreground px-1 py-2">Aucune tâche</p>
              )}
              {list.map((st) => {
                const assignee = getUser(users, st.assignedToId);
                return (
                  <div key={st.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium leading-tight line-clamp-2">{st.title}</p>
                      <PriorityBadge priority={st.priority} className="flex-shrink-0" />
                    </div>
                    {st.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{st.description}</p>
                    )}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <ProgressBar value={st.progress} indicatorClassName="bg-primary" className="h-1.5" />
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{st.progress}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 min-w-0">
                        <UserAvatar user={assignee} size="sm" className="h-4 w-4" />
                        <span className="truncate">{assignee?.name ?? 'Non assigné'}</span>
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <CalendarDays className="h-3 w-3" /> {formatDate(st.startDate)} → {formatDate(st.dueDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModStatusBadge({ status }: { status: 'pending' | 'pending_client' | 'approved' | 'rejected' }) {
  const config = {
    pending: { label: 'En attente', className: 'bg-warning/15 text-warning border-warning/30' },
    pending_client: { label: 'Validation client', className: 'bg-info/15 text-info border-info/30' },
    approved: { label: 'Approuvée', className: 'bg-success/15 text-success border-success/30' },
    rejected: { label: 'Rejetée', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  } as const;
  return <Badge variant="outline" className={config[status].className}>{config[status].label}</Badge>;
}

function TaskReqStatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const config = {
    pending: { label: 'En attente', className: 'bg-warning/15 text-warning border-warning/30' },
    approved: { label: 'Acceptée', className: 'bg-success/15 text-success border-success/30' },
    rejected: { label: 'Refusée', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  } as const;
  return <Badge variant="outline" className={config[status].className}>{config[status].label}</Badge>;
}

const modFieldLabels: Record<string, string> = {
  title: 'Titre', description: 'Description', dueDate: 'Date de fin', priority: 'Priorité',
  endDate: 'Date de fin', budget: 'Budget',
};