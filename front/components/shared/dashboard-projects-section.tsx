'use client';

import { memo, useMemo, useState } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { FolderKanban, ListChecks, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/shared/filter-bar';
import { ViewToggle, type ViewMode } from '@/components/shared/view-toggle';
import { ProjectListView } from '@/components/shared/project-list-view';
import { ProjectKanbanBoard } from '@/components/shared/project-kanban-board';
import { useProjects } from '@/lib/contexts/projects-context';
import { isProjectArchived, projectStatusMeta } from '@/lib/status';
import type { Project, Role, User } from '@/types';

/**
 * The project list/kanban + its filters at the bottom of the dashboard.
 * Owns the filter/search/view-mode state locally: previously these lived on
 * DashboardPage itself, so every keystroke in the search box re-rendered the
 * hero banner, stat cards and every chart above it too.
 */
export const DashboardProjectsSection = memo(function DashboardProjectsSection({
  role, userId, projects, users, canManage,
}: {
  role: Role;
  userId: string;
  projects: Project[];
  users: User[];
  canManage: boolean;
}) {
  const { updateProjectStatus } = useProjects();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('kanban');

  const visibleProjects = useMemo(() => {
    let list = projects;
    if (role === 'client') {
      list = list.filter((p) => p.clientId === userId);
    } else if (role === 'chef_de_projet') {
      list = list.filter((p) => p.managerId === userId);
    } else if (role === 'membre') {
      list = list.filter((p) => p.subtasks.some((st) => st.assignedToId === userId) || p.members.some((m) => m.userId === userId));
    }
    // Exclude archived projects (terminal status older than 24h)
    list = list.filter((p) => !isProjectArchived(p));
    if (dateFilter !== 'all') {
      const now = new Date();
      let refStart: Date;
      let refEnd: Date;
      if (dateFilter === 'today') { refStart = startOfDay(now); refEnd = endOfDay(now); }
      else if (dateFilter === 'this_week') { refStart = startOfWeek(now, { weekStartsOn: 1 }); refEnd = endOfWeek(now, { weekStartsOn: 1 }); }
      else { refStart = startOfMonth(now); refEnd = endOfMonth(now); }
      list = list.filter((p) => {
        const s = parseISO(p.startDate);
        const e = parseISO(p.endDate);
        return s <= refEnd && e >= refStart;
      });
    }
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((p) => p.priority === priorityFilter);
    if (search) list = list.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [role, userId, projects, statusFilter, priorityFilter, dateFilter, search]);

  // Projets soumis en attente de validation (les sous-tâches en révision se gèrent dans le projet)
  const toValidateList = useMemo(
    () => visibleProjects.filter((p) => p.status === 'pending'),
    [visibleProjects],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">
          {role === 'admin' ? 'Tous les projets' : role === 'membre' ? 'Mes projets' : 'Projets'}
        </h3>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un projet..."
        filters={[
          {
            key: 'date', value: dateFilter, onChange: setDateFilter,
            options: [
              { value: 'all', label: 'Toutes les dates' },
              { value: 'today', label: "Aujourd'hui" },
              { value: 'this_week', label: 'Cette semaine' },
              { value: 'this_month', label: 'Ce mois-ci' },
            ],
          },
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
        <>
          {toValidateList.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-warning" />
              <p className="text-sm text-muted-foreground flex-1 min-w-0">
                <span className="font-semibold text-foreground">À valider :</span>{' '}
                {toValidateList.length} projet{toValidateList.length > 1 ? 's' : ''} en attente
              </p>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setView('kanban')}>
                <ListChecks className="h-3.5 w-3.5 mr-1.5" /> Afficher
              </Button>
            </div>
          )}
          <ProjectListView projects={visibleProjects} />
        </>
      ) : (
        <ProjectKanbanBoard
          projects={visibleProjects}
          users={users}
          canManage={canManage}
          onMove={updateProjectStatus}
          validationColumn
        />
      )}
    </div>
  );
});
