'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Users, CalendarDays, AlertCircle, ShieldCheck, UserCog, GripVertical, Check } from 'lucide-react';
import { projectStatusMeta, getUser, formatDate } from '@/lib/status';
import { PriorityBadge } from '@/components/shared/badges';
import { ProgressBar } from '@/components/shared/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useProjects } from '@/lib/contexts/projects-context';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Project, ProjectStatus, User as UserType } from '@/types';

const ORDER: ProjectStatus[] = ['pending', 'validated', 'assigned', 'in_progress', 'completed', 'rejected'];

interface ColumnDef {
  id: ProjectStatus;
  label: string;
  hint?: string;
  className?: string;
  dot?: string;
  text?: string;
}

function getColumns(validationColumn: boolean): ColumnDef[] {
  const statuses = validationColumn ? ORDER.filter((s) => s !== 'pending') : ORDER;
  return statuses.map((s) => {
    const meta = projectStatusMeta[s];
    return {
      id: s,
      label: s === 'validated' && validationColumn ? 'Validés' : meta.label,
      className: meta.bg,
      dot: meta.dot,
      text: meta.color,
    };
  });
}

const VALIDATION_COLUMN: Omit<ColumnDef, 'id'> & { id: 'validation' } = {
  id: 'validation',
  label: 'À valider',
  hint: 'Projets soumis en attente de validation',
  className: 'bg-warning/10',
  dot: 'bg-warning',
  text: 'text-warning',
};

interface ProjectKanbanBoardProps {
  projects: Project[];
  users: UserType[];
  canManage: boolean;
  onMove: (projectId: string, status: ProjectStatus) => void;
  validationColumn?: boolean;
}

export const ProjectKanbanBoard = memo(function ProjectKanbanBoard({ projects, users, canManage, onMove, validationColumn = false }: ProjectKanbanBoardProps) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [assignProject, setAssignProject] = useState<Project | null>(null);
  const allColumns = getColumns(validationColumn);
  const visibleColumns = allColumns.filter((col) => projects.some((p) => p.status === col.id));
  const toValidate = validationColumn
    ? projects.filter((p) => p.status === 'pending')
    : [];

  const handleStatusChange = useCallback((projectId: string, status: ProjectStatus) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === status) return;
    if (status === 'assigned' && !project.managerId) {
      setAssignProject(project);
      return;
    }
    onMove(projectId, status);
  }, [projects, onMove]);

  const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const projectId = e.dataTransfer.getData('text/plain');
    if (projectId && canManage) handleStatusChange(projectId, status);
  };

  const handleDragStart = useCallback((id: string) => setDraggingId(id), []);
  const handleDragEnd = useCallback(() => setDraggingId(null), []);
  const handleOpenProject = useCallback((id: string) => router.push(`/projects/${id}`), [router]);

  return (
    <>
      {canManage && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-[11px] text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
          Glissez-déposez les projets entre les colonnes pour changer leur statut.
        </p>
      )}

      <div className="flex flex-wrap gap-4 items-start">
        {validationColumn && toValidate.length > 0 && (
          <div className="flex-1 min-w-[240px]">
            <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3', VALIDATION_COLUMN.className)}>
              <ShieldCheck className={cn('h-4 w-4', VALIDATION_COLUMN.text)} />
              <h3 className={cn('text-sm font-semibold', VALIDATION_COLUMN.text)}>{VALIDATION_COLUMN.label}</h3>
              <span className="ml-auto inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-background/80 text-xs font-bold text-muted-foreground">
                {toValidate.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground px-1 -mt-1 mb-3">{VALIDATION_COLUMN.hint}</p>

            <div className="space-y-3 min-h-[160px]">
              {toValidate.map((p) => {
                return (
                  <ValidationCard
                    key={p.id}
                    project={p}
                    users={users}
                    canManage={canManage}
                    dragging={draggingId === p.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onOpen={handleOpenProject}
                  />
                );
              })}
            </div>
          </div>
        )}

        {visibleColumns.map((col) => {
          const list = projects.filter((p) => p.status === col.id);
          return (
            <div
              key={col.id}
              onDragEnter={(e) => { if (canManage) { e.preventDefault(); setDragOverCol(col.id); } }}
              onDragOver={(e) => { if (canManage) e.preventDefault(); }}
              onDragLeave={(e) => {
                if (canManage && !e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol((c) => (c === col.id ? null : c));
                }
              }}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                'flex-1 min-w-[240px] rounded-2xl transition-colors',
                dragOverCol === col.id && 'bg-primary/5 ring-2 ring-primary/40'
              )}
            >
              <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3', col.className)}>
                <span className={cn('h-2.5 w-2.5 rounded-full', col.dot)} />
                <h3 className={cn('text-sm font-semibold', col.text)}>{col.label}</h3>
                <span className="ml-auto inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-background/80 text-xs font-bold text-muted-foreground">
                  {list.length}
                </span>
              </div>
              {col.hint && <p className="text-[11px] text-muted-foreground px-1 -mt-1 mb-3">{col.hint}</p>}

              <div className="space-y-3 min-h-[160px]">
                {list.map((p) => (
                  <KanbanProjectCard
                    key={p.id}
                    project={p}
                    users={users}
                    canManage={canManage}
                    onStatusChange={handleStatusChange}
                    dragging={draggingId === p.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {assignProject && (
        <AssignManagerDialog
          project={assignProject}
          users={users}
          onDone={() => setAssignProject(null)}
        />
      )}
    </>
  );
});

interface ValidationCardProps {
  project: Project;
  users: UserType[];
  canManage: boolean;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onOpen: (id: string) => void;
}

const ValidationCard = memo(function ValidationCard({ project, users, canManage, dragging, onDragStart, onDragEnd, onOpen }: ValidationCardProps) {
  const client = getUser(users, project.clientId);
  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      draggable={canManage}
      onDragStart={(e) => { if (canManage) { e.dataTransfer.setData('text/plain', project.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(project.id); } }}
      onDragEnd={onDragEnd}
      className={cn(
        'w-full text-left rounded-xl border border-warning/25 bg-card p-3.5 shadow-sm hover:shadow-soft-lg hover:border-warning/50 transition-all cursor-pointer group',
        canManage && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{project.title}</p>
        <PriorityBadge priority={project.priority} className="flex-shrink-0" />
      </div>
      <p className="text-xs text-muted-foreground mb-2 truncate">{client?.name ?? 'Client inconnu'}</p>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning px-2 py-0.5 text-[10px] font-medium">
          <ShieldCheck className="h-3 w-3" /> Projet à valider
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3" /> Soumis le {formatDate(project.createdAt)}
      </p>
    </button>
  );
});

interface KanbanProjectCardProps {
  project: Project;
  users: UserType[];
  canManage: boolean;
  onStatusChange: (projectId: string, status: ProjectStatus) => void;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

const KanbanProjectCard = memo(function KanbanProjectCard({ project, users, canManage, onStatusChange, dragging, onDragStart, onDragEnd }: KanbanProjectCardProps) {
  const router = useRouter();
  const client = getUser(users, project.clientId);
  const manager = getUser(users, project.managerId);
  const idx = ORDER.indexOf(project.status);
  const pendingMods = project.modifications.filter((m) => m.status === 'pending' || m.status === 'pending_client').length;

  const move = (dir: -1 | 1) => {
    const target = ORDER[idx + dir];
    if (target && target !== 'pending') onStatusChange(project.id, target);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/projects/${project.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/projects/${project.id}`); } }}
      draggable={canManage}
      onDragStart={(e) => { if (canManage) { e.dataTransfer.setData('text/plain', project.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(project.id); } }}
      onDragEnd={onDragEnd}
      className={cn(
        'w-full text-left rounded-xl border border-border bg-card p-3.5 shadow-sm hover:shadow-soft-lg hover:border-border/80 transition-all cursor-pointer group',
        canManage && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{project.title}</p>
        <PriorityBadge priority={project.priority} className="flex-shrink-0" />
      </div>
      <p className="text-xs text-muted-foreground mb-2.5 truncate">{client?.name ?? 'Client inconnu'}</p>

      <div className="flex items-center justify-between gap-2 mb-1">
        <ProgressBar value={project.progress} indicatorClassName="bg-primary" className="h-1.5" />
        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{project.progress}%</span>
      </div>

      <div className="space-y-1 mb-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5 truncate">
          <Users className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{manager ? manager.name : 'Chef non assigné'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" />
          {formatDate(project.endDate)}
        </span>
        {pendingMods > 0 && (
          <span className="flex items-center gap-1.5 text-warning">
            <AlertCircle className="h-3 w-3" /> {pendingMods} modif. en attente
          </span>
        )}
      </div>

      {canManage && (
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/40">
          {idx > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); move(-1); }}
              className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {idx < ORDER.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); move(1); }}
              className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] text-primary hover:bg-primary/10 transition-colors font-medium"
            >
              Avancer <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

interface AssignManagerDialogProps {
  project: Project;
  users: UserType[];
  onDone: () => void;
}

function AssignManagerDialog({ project, users, onDone }: AssignManagerDialogProps) {
  const { assignManager } = useProjects();
  const managers = useMemo(() => users.filter((u) => u.role === 'chef_de_projet'), [users]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (managers.length > 0 && !managers.some((m) => m.id === selected)) {
      setSelected(managers[0].id);
    }
  }, [managers, selected]);

  const confirm = () => {
    if (!selected) return;
    assignManager(project.id, selected);
    toast({
      title: 'Chef de projet assigné',
      description: `${getUser(users, selected)?.name} pilote désormais « ${project.title} ».`,
    });
    onDone();
  };

  return (
    <Dialog open onOpenChange={onDone}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" /> Assigner un chef de projet
          </DialogTitle>
          <DialogDescription>
            Sélectionnez le chef de projet qui pilotera « {project.title} ». Le statut passera à « Assigné ».
          </DialogDescription>
        </DialogHeader>

        {managers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun chef de projet disponible. Créez d&apos;abord un compte avec le rôle « Chef de projet ».
          </p>
        ) : (
          <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
            {managers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  selected === m.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <UserAvatar user={m} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                {selected === m.id && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onDone}>Annuler</Button>
          <Button onClick={confirm} disabled={!selected}>Assigner</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}