import type {
  ProjectStatus, SubtaskStatus, Priority, Role, User, Project, ProgressPoint,
} from '@/types';

// How long a project stays visible in the "Terminé / Rejeté" section before being archived
export const HISTORY_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24h

export function isTerminalStatus(status: ProjectStatus): boolean {
  return status === 'completed' || status === 'rejected';
}

// A terminal project is "archived" once its status hasn't changed for more than 24h
export function isProjectArchived(project: Project, now = Date.now()): boolean {
  if (!isTerminalStatus(project.status)) return false;
  const changedAt = project.statusChangedAt;
  if (!changedAt) return true; // unknown date → treat as archived
  return now - new Date(changedAt).getTime() >= HISTORY_GRACE_PERIOD_MS;
}

/**
 * "Avancement" tab's planned-vs-actual curve. `progressTimeline` was never a
 * real persisted history -- even in the original mock-data.ts it was just
 * this same formula precomputed once (10 evenly-spaced points between
 * start/end, `planned` ramping linearly, `actual` ramping toward the
 * project's current progress). The real API has no such field, so compute
 * it here from fields it already returns (startDate/endDate/progress)
 * instead of always showing an empty chart.
 */
export function computeProgressTimeline(project: Pick<Project, 'startDate' | 'endDate' | 'progress'>): ProgressPoint[] {
  const s = new Date(project.startDate).getTime();
  const e = new Date(project.endDate).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return [];

  const today = Date.now();
  const steps = 10;
  const points: ProgressPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = s + ((e - s) * i) / steps;
    const planned = Math.round((100 * i) / steps);
    let actual = 0;
    if (t <= today) {
      const ratio = Math.min(1, (t - s) / (today - s));
      actual = Math.round(project.progress * ratio);
    }
    points.push({ date: new Date(t).toISOString(), planned, actual });
  }
  if (today <= e) {
    const past = points.filter((p) => new Date(p.date).getTime() <= today);
    if (past.length > 0) past[past.length - 1].actual = project.progress;
  }
  return points;
}

export function getUser(users: User[], id: string | null | undefined): User | undefined {
  if (!id) return undefined;
  return users.find((u) => u.id === id);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ---- Status metadata
export const projectStatusMeta: Record<ProjectStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:     { label: 'En attente',  color: 'text-warning',              bg: 'bg-warning/10 dark:bg-warning/15',   dot: 'bg-warning' },
  validated:   { label: 'Validé',      color: 'text-info',                 bg: 'bg-info/10 dark:bg-info/15',         dot: 'bg-info' },
  rejected:    { label: 'Rejeté',      color: 'text-destructive',          bg: 'bg-destructive/10 dark:bg-destructive/15', dot: 'bg-destructive' },
  assigned:    { label: 'Assigné',     color: 'text-chart-5',              bg: 'bg-chart-5/10 dark:bg-chart-5/15',   dot: 'bg-chart-5' },
  in_progress: { label: 'En cours',    color: 'text-primary',              bg: 'bg-primary/10 dark:bg-primary/15',   dot: 'bg-primary' },
  completed:   { label: 'Terminé',     color: 'text-success',              bg: 'bg-success/10 dark:bg-success/15',   dot: 'bg-success' },
};

export const subtaskStatusMeta: Record<SubtaskStatus, { label: string; color: string; bg: string; dot: string }> = {
  todo:        { label: 'À faire',    color: 'text-muted-foreground',      bg: 'bg-muted dark:bg-muted',              dot: 'bg-muted-foreground' },
  in_progress: { label: 'En cours',   color: 'text-primary',               bg: 'bg-primary/10 dark:bg-primary/15',    dot: 'bg-primary' },
  review:      { label: 'En révision',color: 'text-chart-5',               bg: 'bg-chart-5/10 dark:bg-chart-5/15',    dot: 'bg-chart-5' },
  done:        { label: 'Terminé',    color: 'text-success',               bg: 'bg-success/10 dark:bg-success/15',    dot: 'bg-success' },
  cancelled:   { label: 'Annulé',     color: 'text-destructive',           bg: 'bg-destructive/10 dark:bg-destructive/15', dot: 'bg-destructive' },
};

export const priorityMeta: Record<Priority, { label: string; color: string; bg: string; dot: string; ring: string }> = {
  low:    { label: 'Basse',   color: 'text-muted-foreground',           bg: 'bg-muted dark:bg-muted',             dot: 'bg-muted-foreground', ring: 'ring-border' },
  medium: { label: 'Moyenne', color: 'text-info',                       bg: 'bg-info/10 dark:bg-info/15',         dot: 'bg-info',             ring: 'ring-info/20' },
  high:   { label: 'Haute',   color: 'text-warning',                    bg: 'bg-warning/10 dark:bg-warning/15',   dot: 'bg-warning',          ring: 'ring-warning/20' },
  urgent: { label: 'Urgente', color: 'text-destructive',                bg: 'bg-destructive/10 dark:bg-destructive/15', dot: 'bg-destructive', ring: 'ring-destructive/20' },
};

export const roleMeta: Record<Role, { label: string; color: string; bg: string }> = {
  admin:         { label: 'Admin',         color: 'text-destructive', bg: 'bg-destructive/10 dark:bg-destructive/15' },
  chef_de_projet:{ label: 'Chef de projet',color: 'text-primary',     bg: 'bg-primary/10 dark:bg-primary/15' },
  membre:        { label: 'Membre',        color: 'text-info',        bg: 'bg-info/10 dark:bg-info/15' },
  client:        { label: 'Client',        color: 'text-chart-5',     bg: 'bg-chart-5/10 dark:bg-chart-5/15' },
};

export const specialtyMeta: Record<string, { label: string; color: string; bg: string }> = {
  'Designer':               { label: 'Designer',               color: 'text-chart-5', bg: 'bg-chart-5/10 dark:bg-chart-5/15' },
  'DevOps':                 { label: 'DevOps',                 color: 'text-info',    bg: 'bg-info/10 dark:bg-info/15' },
  'Frontend':               { label: 'Développeur Frontend',   color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/15' },
  'Backend':                { label: 'Développeur Backend',    color: 'text-success', bg: 'bg-success/10 dark:bg-success/15' },
  'Fullstack':              { label: 'Développeur Fullstack',  color: 'text-warning', bg: 'bg-warning/10 dark:bg-warning/15' },
  'QA':                     { label: 'QA / Testeur',           color: 'text-muted-foreground', bg: 'bg-muted' },
  'Chef de projet junior':  { label: 'Chef de projet junior',  color: 'text-info',    bg: 'bg-info/10 dark:bg-info/15' },
  'Autre':                  { label: 'Autre',                  color: 'text-muted-foreground', bg: 'bg-muted' },
};

export const availabilityMeta: Record<string, { label: string; color: string; dot: string }> = {
  available:   { label: 'Disponible',     color: 'text-success',     dot: 'bg-success' },
  busy:        { label: 'Occupé',         color: 'text-warning',     dot: 'bg-warning' },
  unavailable: { label: 'Indisponible',   color: 'text-destructive', dot: 'bg-destructive' },
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return formatDate(iso);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function daysBetween(start: string, end: string): number {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
}

export function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
