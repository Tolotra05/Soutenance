'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  FolderKanban, Clock, CheckCircle2, Users,
  TrendingUp, FileText, CheckSquare, Briefcase, Layers,
  Edit3, ArrowUpRight, MessageSquareQuote, Send,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useUsers } from '@/lib/contexts/users-context';
import { useProjects } from '@/lib/contexts/projects-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { DashboardSkeleton } from '@/components/shared/page-skeletons';
import { isProjectArchived } from '@/lib/status';
import { AppShell } from '@/components/shared/app-shell';
import { StatCard } from '@/components/shared/stat-card';
import { PriorityBadge, SubtaskStatusBadge } from '@/components/shared/badges';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardRequestTaskForm } from '@/components/shared/dashboard-request-task-form';
import { DashboardProjectProgressSelector } from '@/components/shared/dashboard-project-progress-selector';
import { DashboardProjectsSection } from '@/components/shared/dashboard-projects-section';
import { projectStatusMeta, getUser, formatDate } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/types';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const STATUS_CHART_COLORS: Record<ProjectStatus, string> = {
  pending: 'hsl(var(--warning))',
  validated: 'hsl(var(--info))',
  rejected: 'hsl(var(--destructive))',
  assigned: 'hsl(var(--chart-5))',
  in_progress: 'hsl(var(--primary))',
  completed: 'hsl(var(--success))',
};

const chartLoading = () => <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />;

const ActivityLineChart = dynamic(() => import('@/components/shared/dashboard-charts').then((m) => m.ActivityLineChart), { ssr: false, loading: chartLoading });
const StatusPieChart = dynamic(() => import('@/components/shared/dashboard-charts').then((m) => m.StatusPieChart), { ssr: false, loading: chartLoading });
const ClientProgressLineChart = dynamic(() => import('@/components/shared/dashboard-charts').then((m) => m.ClientProgressLineChart), { ssr: false, loading: chartLoading });
const StatusDistributionBarChart = dynamic(() => import('@/components/shared/dashboard-charts').then((m) => m.StatusDistributionBarChart), { ssr: false, loading: chartLoading });

export default function DashboardPage() {
  const { user, ready } = useAppReady();
  const { projects } = useProjects();
  const { users } = useUsers();
  const router = useRouter();

  const clientProjects = useMemo(
    () => user ? projects.filter((p) => p.clientId === user.id && !isProjectArchived(p)) : [],
    [user, projects],
  );

  const clientProgressData = useMemo(() => {
    const byDate = new Map<string, { planned: number; actual: number; count: number }>();
    clientProjects.forEach((p) => {
      const pts = p.progressTimeline && p.progressTimeline.length > 0
        ? p.progressTimeline
        : [{ date: p.startDate, planned: 0, actual: 0 }, { date: p.endDate, planned: p.progress, actual: p.progress }];
      pts.forEach((pt) => {
        const key = String(pt.date).slice(0, 7);
        const cur = byDate.get(key) ?? { planned: 0, actual: 0, count: 0 };
        cur.planned += pt.planned;
        cur.actual += pt.actual;
        cur.count += 1;
        byDate.set(key, cur);
      });
    });
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, planned: Math.round(v.planned / v.count), actual: Math.round(v.actual / v.count) }));
  }, [clientProjects]);

  // ---- Charts data (adapted from suivi-Projet: activit. mensuelle + répartition par statut)
  const activityData = useMemo(() => {
    const created = MONTHS.map((_, mi) => ({ month: MONTHS[mi], created: 0, delivered: 0 }));
    projects.forEach((p) => {
      const c = new Date(p.createdAt).getMonth();
      created[c].created += 1;
      if (p.status === 'completed') {
        const e = new Date(p.endDate).getMonth();
        created[e].delivered += 1;
      }
    });
    return created;
  }, [projects]);

  const statusDistribution = useMemo(() => {
    return (Object.keys(projectStatusMeta) as ProjectStatus[])
      .map((k) => ({
        name: projectStatusMeta[k].label,
        value: projects.filter((p) => p.status === k).length,
        color: STATUS_CHART_COLORS[k],
      }))
      .filter((d) => d.value > 0);
  }, [projects]);

  // ---- Demandes de modification (admin / chef de projet)
  const incomingClientMods = useMemo(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'chef_de_projet')) return [];
    const targets = user.role === 'admin' ? projects : projects.filter((p) => p.managerId === user.id);
    return targets
      .flatMap((p) =>
        p.modifications
          .filter((m) => (m.status === 'pending' || m.status === 'pending_client') && getUser(users, m.requestedById)?.role === 'client')
          .map((m) => ({ ...m, projectId: p.id, projectTitle: p.title }))
      )
      .slice(0, 4);
  }, [user, projects, users]);

  const myMods = useMemo(() => {
    if (!user) return [];
    return projects.flatMap((p) =>
      p.modifications.filter((m) => m.requestedById === user.id).map((m) => ({ ...m, projectId: p.id, projectTitle: p.title }))
    );
  }, [user, projects]);

  // ---- Requêtes envoyées par l'équipe (admin / chef / membre)
  const myRequetes = useMemo(() => {
    if (!user || user.role === 'client') return [];
    return projects.flatMap((p) =>
      p.requetes.filter((r) => r.createdById === user.id).map((r) => ({ ...r, projectId: p.id, projectTitle: p.title }))
    );
  }, [user, projects]);
  const myRequetesPending = myRequetes.filter((r) => r.status === 'pending');

  if (!user) return null;
  if (!ready) return <AppShell><DashboardSkeleton /></AppShell>;

  // ---- Role-specific stats
  const role = user.role;
  const pendingProjects = projects.filter((p) => p.status === 'pending');
  const inProgressProjects = projects.filter((p) => p.status === 'in_progress');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const allEmployees = users.filter((u) => u.role === 'membre' || u.role === 'chef_de_projet');
  const myTasks = role === 'membre'
    ? projects.flatMap((p) => p.subtasks.filter((st) => st.assignedToId === user.id).map((st) => ({ ...st, projectTitle: p.title })))
    : [];

  const canManage = role === 'admin' || role === 'chef_de_projet';

  // ---- Requêtes demandées au client par l'équipe
  const clientRequetes = role === 'client'
    ? projects.flatMap((p) =>
        p.clientId === user.id
          ? p.requetes.map((r) => ({ ...r, projectId: p.id, projectTitle: p.title }))
          : []
      )
    : [];
  const clientRequetesPending = clientRequetes.filter((r) => r.status === 'pending');

  // ---- Stats per role
  let stats: { label: string; value: string | number; icon: any; color?: string; trend?: { value: string; positive: boolean }; onClick?: () => void }[] = [];
  let greeting = `Bonjour, ${user.name.split(' ')[0]}`;

  if (role === 'admin') {
    stats = [
      { label: 'Projets en attente', value: pendingProjects.length, icon: Clock, color: 'text-warning', trend: pendingProjects.length > 3 ? { value: 'Action requise', positive: false } : undefined, onClick: () => router.push('/projects') },
      { label: 'Projets en cours', value: inProgressProjects.length, icon: TrendingUp, color: 'text-primary', onClick: () => router.push('/projects') },
      { label: 'Équipe', value: allEmployees.length, icon: Users, color: 'text-accent', onClick: () => router.push('/employees') },
      { label: 'Projets terminés', value: completedProjects.length, icon: CheckCircle2, color: 'text-success', onClick: () => router.push('/projects') },
    ];
  } else if (role === 'chef_de_projet') {
    const myProjects = projects.filter((p) => p.managerId === user.id);
    stats = [
      { label: 'Mes projets', value: myProjects.length, icon: FolderKanban, color: 'text-primary', onClick: () => router.push('/projects') },
      { label: 'En cours', value: myProjects.filter((p) => p.status === 'in_progress').length, icon: TrendingUp, color: 'text-accent', onClick: () => router.push('/projects') },
      { label: 'Tâches totales', value: myProjects.flatMap((p) => p.subtasks).length, icon: CheckSquare, color: 'text-warning', onClick: () => router.push('/projects') },
      { label: 'Terminés', value: myProjects.filter((p) => p.status === 'completed').length, icon: CheckCircle2, color: 'text-success', onClick: () => router.push('/projects') },
    ];
  } else if (role === 'membre') {
    stats = [
      { label: 'Mes tâches', value: myTasks.length, icon: CheckSquare, color: 'text-primary', onClick: () => router.push('/tasks') },
      { label: 'À faire', value: myTasks.filter((t) => t.status === 'todo').length, icon: Clock, color: 'text-warning', onClick: () => router.push('/tasks') },
      { label: 'En cours', value: myTasks.filter((t) => t.status === 'in_progress').length, icon: TrendingUp, color: 'text-accent', onClick: () => router.push('/tasks') },
      { label: 'Terminées', value: myTasks.filter((t) => t.status === 'done').length, icon: CheckCircle2, color: 'text-success', onClick: () => router.push('/tasks') },
    ];
  } else {
    const myProjects = projects.filter((p) => p.clientId === user.id);
    stats = [
      { label: 'Mes projets', value: myProjects.length, icon: FolderKanban, color: 'text-primary', onClick: () => router.push('/projects') },
      { label: 'En cours', value: myProjects.filter((p) => p.status === 'in_progress').length, icon: TrendingUp, color: 'text-accent', onClick: () => router.push('/projects') },
      { label: 'En attente', value: myProjects.filter((p) => p.status === 'pending').length, icon: Clock, color: 'text-warning', onClick: () => router.push('/projects') },
      { label: 'Terminés', value: myProjects.filter((p) => p.status === 'completed').length, icon: CheckCircle2, color: 'text-success', onClick: () => router.push('/projects') },
      { label: 'Requêtes demandées', value: clientRequetesPending.length, icon: MessageSquareQuote, color: 'text-info', onClick: () => router.push('/requetes') },
    ];
  }

  return (
    <AppShell>
      {/* Header Banner */}
      <div className="relative mb-8 rounded-2xl overflow-hidden bg-slate-900 shadow-md">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=2070&auto=format&fit=crop"
            alt="Mountain landscape"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent" />
        </div>
        
        <div className="relative z-10 p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div className="text-white">
            <h2 className="font-display text-3xl font-bold tracking-tight mb-2">
              {greeting}
            </h2>
            <p className="text-white/80 max-w-lg">
              {role === 'admin' && 'Vue d\'ensemble de tous les projets et de l\'équipe.'}
              {role === 'chef_de_projet' && 'Suivez et gérez vos projets assignés.'}
              {role === 'membre' && 'Voici un aperçu de votre activité aujourd\'hui.'}
              {role === 'client' && 'Suivez l\'avancement de vos projets.'}
            </p>
          </div>
          {role === 'client' && (
            <Button size="lg" onClick={() => router.push('/submit')} className="shadow-soft-lg hover:scale-105 transition-transform">
              <FileText className="h-4 w-4 mr-2" /> Soumettre un projet
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={cn('grid grid-cols-2 gap-3 mb-6', role === 'client' ? 'sm:grid-cols-3 lg:grid-cols-5' : 'lg:grid-cols-4')}>
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.06} />
        ))}
      </div>

      {/* Charts row — adapted from suivi-Projet: line (activité mensuelle) + doughnut (répartition par statut) */}
      {(role === 'admin' || role === 'chef_de_projet') && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"
        >
          {/* Activité mensuelle */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Activité mensuelle
              </h3>
              <span className="text-xs text-muted-foreground">12 derniers mois</span>
            </div>
            <div className="h-64 sm:h-72">
              <ActivityLineChart data={activityData} />
            </div>
          </Card>

          {/* Répartition par statut */}
          <Card className="p-5">
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" /> Répartition par statut
              </h3>
              <span className="text-xs text-muted-foreground">{projects.length} projets</span>
            </div>
            <div className="relative h-64 sm:h-72 flex items-center justify-center">
              <StatusPieChart data={statusDistribution} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-7">
                <span className="text-2xl font-bold tabular-nums text-foreground">{projects.length}</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Projets</span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Demandes de modification — par le client / par moi */}
      {(role === 'admin' || role === 'chef_de_projet') && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"
        >
          {/* Par le client */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-warning" /> Demandes de modification — client
              </h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/modifications')}>Voir tout</Button>
            </div>
            {incomingClientMods.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune demande de modification client en attente.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {incomingClientMods.map((m) => {
                  const requester = getUser(users, m.requestedById);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => router.push(`/projects/${m.projectId}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {requester?.name ?? m.requestedByName} — {m.projectTitle}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {m.field} : « {m.newValue} »
                        </p>
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-warning">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                          {m.status === 'pending_client' ? 'Validation client attendue' : 'En attente de votre avis'}
                        </span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Par moi */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Mes demandes de modification
              </h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/modifications')}>Voir tout</Button>
            </div>
            {myMods.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Vous n&apos;avez pas encore envoyé de demande.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myMods.slice(0, 4).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => router.push(`/projects/${m.projectId}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.projectTitle}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{m.field} : « {m.newValue} »</p>
                      <span className="text-[10px] text-muted-foreground">{formatDate(m.createdAt)}</span>
                    </div>
                    <ModStatusBadge status={m.status} />
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Requêtes envoyées (admin / chef / membre) */}
      {(role === 'admin' || role === 'chef_de_projet' || role === 'membre') && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mb-6"
        >
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-primary" /> Mes requêtes envoyées
                {myRequetesPending.length > 0 && (
                  <span className="rounded-full bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                    {myRequetesPending.length} en attente de réponse
                  </span>
                )}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/requetes')}>Voir tout</Button>
            </div>
            {myRequetes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Vous n&apos;avez pas encore envoyé de requête au client.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myRequetes.slice(0, 4).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => router.push('/requetes')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.projectTitle}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{r.content}</p>
                      <span className="text-[10px] text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.status === 'pending' ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 flex-shrink-0">
                        En attente
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 flex-shrink-0">
                        Répondu
                      </span>
                    )}
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Client: progression globale (courbe) + demande de tâche */}
      {role === 'client' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"
        >
          {/* Progression globale — courbe prévu vs réel */}
          <Card className="p-5 lg:col-span-2 flex flex-col">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Progression globale de mes projets
              </h3>
              <span className="text-xs text-muted-foreground">Moyenne prévu vs réel</span>
            </div>
            <div className="flex-1 min-h-64 sm:min-h-72">
              <ClientProgressLineChart data={clientProgressData} />
            </div>
          </Card>

          <DashboardRequestTaskForm clientProjects={clientProjects} />
        </motion.div>
      )}

      {/* Client: progression d'un projet sélectionné */}
      {role === 'client' && clientProjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.22 }}
          className="mb-6"
        >
          <DashboardProjectProgressSelector clientProjects={clientProjects} />
        </motion.div>
      )}

      {/* Client: chart of their projects by status */}
      {role === 'client' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mb-6"
        >
          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Répartition de mes projets par statut
            </h3>
            <div className="h-56">
              <StatusDistributionBarChart data={statusDistribution} />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Client: requêtes demandées par l'équipe */}
      {role === 'client' && clientRequetes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mb-6"
        >
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-info" /> Requêtes demandées
                {clientRequetesPending.length > 0 && (
                  <span className="rounded-full bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                    {clientRequetesPending.length} à répondre
                  </span>
                )}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/requetes')}>Voir tout</Button>
            </div>
            <div className="space-y-2.5">
              {clientRequetes.slice(0, 4).map((r) => {
                const requester = getUser(users, r.createdById);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => router.push('/requetes')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {requester?.name ?? r.createdByName} · {r.projectTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{r.content}</p>
                    </div>
                    {r.status === 'pending' ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 flex-shrink-0">
                        À répondre
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 flex-shrink-0">
                        Répondu
                      </span>
                    )}
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Employee: quick task overview */}
      {role === 'membre' && myTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mb-6"
        >
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Mes tâches en cours</h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')}>Voir tout</Button>
            </div>
            <div className="space-y-3">
              {myTasks.filter((t) => t.status !== 'done').slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/projects/${t.projectId}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.projectTitle}</p>
                  </div>
                  <SubtaskStatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Main content: projects with integrated "À valider" section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <DashboardProjectsSection role={role} userId={user.id} projects={projects} users={users} canManage={canManage} />
      </motion.div>
    </AppShell>
  );
}

function ModStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Envoyée', className: 'bg-warning/15 text-warning border-warning/30' },
    pending_client: { label: 'Validation client', className: 'bg-info/15 text-info border-info/30' },
    approved: { label: 'Acceptée', className: 'bg-success/15 text-success border-success/30' },
    rejected: { label: 'Rejetée', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  };
  const c = config[status];
  if (!c) return null;
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', c.className)}>{c.label}</span>;
}