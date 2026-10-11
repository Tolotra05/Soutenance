'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subtaskStatusMeta, formatDateShort, getUser } from '@/lib/status';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useUsers } from '@/lib/contexts/users-context';
import type { Subtask } from '@/types';

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_FILL: Record<string, string> = {
  todo: 'hsl(var(--muted-foreground))',
  in_progress: 'hsl(var(--primary))',
  review: 'hsl(var(--chart-5))',
  done: 'hsl(var(--success))',
};

const STATUS_LABEL: Record<string, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  review: 'En revue',
  done: 'Terminé',
};

export function GanttChart({ subtasks }: { subtasks: Subtask[] }) {
  const { users } = useUsers();

  const { timelineStart, days, rows, weekends, monthMarkers, weekMarkers, todayOffset, completedCount, inProgressCount, reviewCount, todoCount, avgProgress } = useMemo(() => {
    if (subtasks.length === 0) {
      return { timelineStart: 0, days: 0, rows: [] as Subtask[], weekends: [] as { left: number; width: number }[], monthMarkers: [] as { label: string; offset: number }[], weekMarkers: [] as { label: string; offset: number }[], todayOffset: -1, completedCount: 0, inProgressCount: 0, reviewCount: 0, todoCount: 0, avgProgress: 0 };
    }
    const start = Math.min(...subtasks.map((s) => new Date(s.startDate).getTime()));
    const end = Math.max(...subtasks.map((s) => new Date(s.dueDate).getTime()));
    const totalDays = Math.max(1, Math.ceil((end - start) / DAY_MS));
    const paddedStart = start - 2 * DAY_MS;
    const totalPaddedDays = totalDays + 4;

    const sorted = [...subtasks].sort((a, b) => {
      if (a.dependsOnId && a.dependsOnId === b.id) return 1;
      if (b.dependsOnId && b.dependsOnId === a.id) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    // Weekends — week starts on Monday
    const weekends = Array.from({ length: totalPaddedDays }).flatMap((_, d) => {
      const day = new Date(paddedStart + d * DAY_MS).getDay();
      if (day === 0 || day === 6) return [{ left: d, width: 1 }];
      return [];
    });

    // Month markers
    let prevMonth = -1;
    const monthMarkers: { label: string; offset: number }[] = [];
    for (let d = 0; d <= totalPaddedDays; d++) {
      const dt = new Date(paddedStart + d * DAY_MS);
      const m = dt.getMonth();
      if (m !== prevMonth) {
        monthMarkers.push({ label: MONTHS[m], offset: d });
        prevMonth = m;
      }
    }

    // Week markers (every Monday)
    const weekMarkers: { label: string; offset: number }[] = [];
    for (let d = 0; d <= totalPaddedDays; d += 7) {
      const date = new Date(paddedStart + d * DAY_MS);
      weekMarkers.push({ label: formatDateShort(date.toISOString()), offset: d });
    }

    const now = new Date();
    const todayOffset = Math.round((now.getTime() - paddedStart) / DAY_MS);

    return {
      timelineStart: paddedStart,
      days: totalPaddedDays,
      rows: sorted,
      weekends,
      monthMarkers,
      weekMarkers,
      todayOffset,
      completedCount: subtasks.filter((s) => s.status === 'done').length,
      inProgressCount: subtasks.filter((s) => s.status === 'in_progress').length,
      reviewCount: subtasks.filter((s) => s.status === 'review').length,
      todoCount: subtasks.filter((s) => s.status === 'todo').length,
      avgProgress: Math.round(subtasks.reduce((acc, s) => acc + s.progress, 0) / Math.max(1, subtasks.length)),
    };
  }, [subtasks]);

  if (subtasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Aucune sous-tâche à afficher dans le Gantt.</p>
        <p className="text-sm mt-1">Le manager doit créer des sous-tâches pour ce projet.</p>
      </div>
    );
  }

  const showToday = todayOffset >= 0 && todayOffset <= days;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="min-w-[760px]">
        {/* Summary + legend */}
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            {subtasks.length} sous-tâches · {avgProgress}% d&apos;avancement moyen
          </span>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {(Object.keys(STATUS_LABEL) as Subtask['status'][]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', subtaskStatusMeta[s].dot)} />
                {STATUS_LABEL[s]}
                <span className="font-semibold text-foreground">
                  {s === 'todo' ? todoCount : s === 'in_progress' ? inProgressCount : s === 'review' ? reviewCount : completedCount}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Timeline header */}
        <div className="flex border-b border-border pb-2 mb-3 sticky top-0 bg-card z-10">
          <div className="w-72 flex-shrink-0 text-xs font-medium text-muted-foreground">Sous-tâche</div>
          <div className="flex-1 relative">
            {/* Month scale */}
            <div className="h-5 border-b border-border/40 mb-1">
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute text-[9px] text-muted-foreground/80 font-medium"
                  style={{ left: `${(m.offset / days) * 100}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            {/* Week scale */}
            <div className="h-5 relative">
              {weekMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute text-[10px] text-muted-foreground font-medium"
                  style={{ left: `${(m.offset / days) * 100}%`, transform: 'translateX(-50%)' }}
                >
                  {m.label}
                </div>
              ))}
              {/* Today marker in header */}
              {showToday && (
                <div
                  className="absolute top-0 bottom-0 border-l border-dashed border-primary/70"
                  style={{ left: `${(todayOffset / days) * 100}%` }}
                >
                  <span className="absolute -top-0.5 left-1 bg-primary text-primary-foreground text-[9px] font-semibold rounded px-1 py-px">Auj</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {rows.map((st, i) => {
            const startOffset = (new Date(st.startDate).getTime() - timelineStart) / DAY_MS;
            const duration = Math.max(1, Math.ceil((new Date(st.dueDate).getTime() - new Date(st.startDate).getTime()) / DAY_MS));
            const leftPct = (startOffset / days) * 100;
            const widthPct = (duration / days) * 100;
            const fillPct = Math.max(0, Math.min(100, st.progress)) / 100;
            const meta = subtaskStatusMeta[st.status];
            const assignee = getUser(users, st.assignedToId);
            const dependency = st.dependsOnId ? subtasks.find((s) => s.id === st.dependsOnId) : null;
            const fillColor = STATUS_FILL[st.status] ?? 'hsl(var(--muted-foreground))';

            return (
              <div key={st.id} className="flex items-center group">
                {/* Task info */}
                <div className="w-72 flex-shrink-0 pr-3 flex items-center gap-2.5">
                  {assignee ? (
                    <UserAvatar user={assignee} size="sm" className="h-7 w-7 flex-shrink-0" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-muted flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{st.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{assignee?.name ?? 'Non assigné'}</p>
                  </div>
                </div>

                <div className="flex-1 relative h-10 rounded-md">
                  {/* Weekend shading */}
                  {weekends.map((w, j) => (
                    <div
                      key={j}
                      className="absolute inset-y-0 bg-muted/40 border-r border-border/10"
                      style={{ left: `${(w.left / days) * 100}%`, width: `${(w.width / days) * 100}%` }}
                    />
                  ))}

                  {/* Week grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: Math.ceil(days / 7) }).map((_, j) => (
                      <div key={j} className="flex-1 border-l border-border/25 first:border-l-0" />
                    ))}
                  </div>

                  {/* Today line */}
                  {showToday && (
                    <div className="absolute inset-y-0 border-l border-dashed border-primary/70 pointer-events-none" style={{ left: `${(todayOffset / days) * 100}%` }} />
                  )}

                  {/* Bar */}
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: `${widthPct}%`, opacity: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                    className={cn('absolute top-1/2 -translate-y-1/2 h-8 rounded-md border overflow-hidden cursor-pointer shadow-sm', meta.bg, 'border-border/40')}
                    style={{ left: `${leftPct}%` }}
                    title={`${st.title} — ${formatDateShort(st.startDate)} → ${formatDateShort(st.dueDate)}\n${assignee?.name ?? 'Non assigné'} · ${meta.label} · ${st.progress}%`}
                  >
                    {/* Progress fill */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${fillPct * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 + 0.2, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0"
                      style={{ background: fillColor, opacity: 0.35 }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 w-[2px] bg-foreground/40"
                      style={{ left: `${fillPct * 100}%` }}
                    />

                    {/* Label */}
                    <div className="relative z-[1] h-full flex items-center gap-1.5 px-2 text-[11px] font-medium">
                      {dependency && (
                        <span title={`Dépend de : ${dependency.title}`} className="flex-shrink-0 flex items-center">
                          <Link2 className={cn('h-3 w-3', meta.color)} />
                        </span>
                      )}
                      <span className="truncate">{st.title}</span>
                      {st.status === 'done' ? (
                        <span className="ml-auto text-[10px] font-bold text-success flex-shrink-0">100%</span>
                      ) : st.progress > 0 ? (
                        <span className="ml-auto text-[10px] font-bold text-muted-foreground flex-shrink-0">{st.progress}%</span>
                      ) : null}
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}