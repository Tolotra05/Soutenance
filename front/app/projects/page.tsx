'use client';

import { useState, useMemo } from 'react';
import { useProjects } from '@/lib/contexts/projects-context';
import { useUsers } from '@/lib/contexts/users-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { CardGridSkeleton } from '@/components/shared/page-skeletons';
import { FilterBar } from '@/components/shared/filter-bar';
import { ViewToggle, type ViewMode } from '@/components/shared/view-toggle';
import { ProjectListView } from '@/components/shared/project-list-view';
import { ProjectKanbanBoard } from '@/components/shared/project-kanban-board';
import { projectStatusMeta } from '@/lib/status';
import { isProjectArchived } from '@/lib/status';
import { motion } from 'framer-motion';
import { FolderKanban } from 'lucide-react';

export default function ProjectsPage() {
  const { user, ready } = useAppReady();
  const { projects, updateProjectStatus } = useProjects();
  const { users } = useUsers();
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('kanban');

  const visibleProjects = useMemo(() => {
    if (!user) return [];
    let list = projects;
    if (user.role === 'client') list = list.filter((p) => p.clientId === user.id);
    else if (user.role === 'chef_de_projet') list = list.filter((p) => p.managerId === user.id);
    else if (user.role === 'membre') list = list.filter((p) => p.subtasks.some((st) => st.assignedToId === user.id));
    // Exclude archived projects (terminal status older than 24h)
    list = list.filter((p) => !isProjectArchived(p));
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((p) => p.priority === priorityFilter);
    if (search) list = list.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [user, projects, statusFilter, priorityFilter, search]);

  if (!user) return null;
  if (!ready) return <AppShell><CardGridSkeleton cards={6} /></AppShell>;

  const canManage = user.role === 'admin' || user.role === 'chef_de_projet';

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Projets</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {visibleProjects.length} projet{visibleProjects.length > 1 ? 's' : ''} visible{visibleProjects.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-card border border-border shadow-card">
              <FolderKanban className="h-3.5 w-3.5 text-primary" /> {projects.length} au total
            </span>
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>
      </motion.div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un projet..."
        filters={[
          {
            key: 'status', value: statusFilter, onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'Tous les statuts' },
              ...Object.entries(projectStatusMeta).map(([v, m]) => ({ value: v, label: m.label })),
            ],
          },
          {
            key: 'priority', value: priorityFilter, onChange: setPriorityFilter,
            options: [
              { value: 'all', label: 'Toutes priorités' },
              { value: 'low', label: 'Basse' },
              { value: 'medium', label: 'Moyenne' },
              { value: 'high', label: 'Haute' },
              { value: 'urgent', label: 'Urgente' },
            ],
          },
        ]}
      />

      {visibleProjects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun projet trouvé.</p>
        </div>
      ) : view === 'list' ? (
        <div className="mt-4">
          <ProjectListView projects={visibleProjects} />
        </div>
      ) : (
        <div className="mt-4">
          <ProjectKanbanBoard projects={visibleProjects} users={users} canManage={canManage} onMove={updateProjectStatus} />
        </div>
      )}
    </AppShell>
  );
}