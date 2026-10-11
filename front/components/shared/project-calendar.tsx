'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import * as df from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/status';
import type { CalendarEvent, Subtask } from '@/types';

const typeColor: Record<string, string> = {
  rendez_vous: 'bg-primary/15 text-primary border border-primary/20',
  deadline: 'bg-primary/15 text-primary border border-primary/20',
  cadrage: 'bg-info/15 text-info border border-info/20',
  design: 'bg-foreground/10 text-foreground border border-border',
  developpement: 'bg-chart-5/15 text-chart-5 border border-chart-5/20',
  recette: 'bg-warning/15 text-warning border border-warning/20',
  livraison: 'bg-success/15 text-success border border-success/20',
};

const typeLabel: Record<string, string> = {
  rendez_vous: 'Rendez-vous',
  deadline: 'Échéance',
  cadrage: 'Cadrage',
  design: 'Design',
  developpement: 'Développement',
  recette: 'Recette',
  livraison: 'Livraison',
};

const subtaskStatusLabel: Record<string, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  review: 'En révision',
  done: 'Terminée',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface ProjectCalendarProps {
  events: CalendarEvent[];
  subtasks: Subtask[];
  className?: string;
  focus?: { id: string; date: string } | null;
}

export function ProjectCalendar({ events, subtasks, className, focus }: ProjectCalendarProps) {
  const [month, setMonth] = useState(() => df.startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Quand on clique sur un événement / une sous-tâche ailleurs : aller à sa date
  useEffect(() => {
    if (!focus) return;
    const date = df.parseISO(focus.date);
    if (!df.isValid(date)) return;
    setMonth(df.startOfMonth(date));
    setSelectedDate(date);
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus]);

  const days = useMemo(
    () =>
      df.eachDayOfInterval({
        start: df.startOfWeek(df.startOfMonth(month), { weekStartsOn: 1 }),
        end: df.endOfWeek(df.endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month]
  );

  const monthEvents = useMemo(
    () => events.filter((e) => df.isSameMonth(df.parseISO(e.date), month)),
    [events, month]
  );

  const monthSubtasks = useMemo(
    () => subtasks.filter((st) => df.isSameMonth(df.parseISO(st.startDate), month)),
    [subtasks, month]
  );

  const legendTypes = useMemo(
    () => Array.from(new Set(monthEvents.map((e) => e.type))),
    [monthEvents]
  );

  const byDay = (date: Date) => {
    const dayEvents = events.filter((e) => df.isSameDay(df.parseISO(e.date), date));
    const dayTasks = subtasks.filter((st) =>
      df.isSameDay(date, df.parseISO(st.startDate)) || df.isSameDay(date, df.parseISO(st.dueDate))
    );
    return { dayEvents, dayTasks };
  };

  const dayItems = (date: Date) => {
    const { dayEvents, dayTasks } = byDay(date);
    const tasks = dayTasks.map((t) => {
      const s = df.startOfDay(df.parseISO(t.startDate));
      const d = df.endOfDay(df.parseISO(t.dueDate));
      const isStart = df.isSameDay(date, s);
      const isEnd = df.isSameDay(date, d);
      const cls = 'bg-info/15 text-info border border-info/20';
      return {
        id: `task-${t.id}`,
        title: isStart && isEnd ? t.title : isStart ? `Début · ${t.title}` : `Fin · ${t.title}`,
        cls,
        isTask: true,
      };
    });
    const evts = dayEvents.map((e) => ({
      id: `event-${e.id}`,
      title: e.title,
      cls: typeColor[e.type] ?? 'bg-primary/15 text-primary border border-primary/20',
      isTask: false,
    }));
    return {
      items: [...tasks, ...evts],
      total: tasks.length + evts.length,
    };
  };

  // Details for the selected day
  const selectedDayEvents = selectedDate
    ? events.filter((e) => df.isSameDay(df.parseISO(e.date), selectedDate))
    : [];
  const selectedDayTasks = selectedDate
    ? subtasks.filter((st) =>
        df.isSameDay(selectedDate, df.parseISO(st.startDate)) || df.isSameDay(selectedDate, df.parseISO(st.dueDate))
      )
    : [];

  return (
    <>
      <div ref={containerRef} className={cn('bg-card border border-border/40 rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.12)] scroll-mt-24', className)}>
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMonth((m) => df.addMonths(m, -1))}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMonth((m) => df.addMonths(m, 1))}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h4 className="font-display font-semibold text-base ml-1 capitalize">
              {df.format(month, 'MMMM yyyy', { locale: fr })}
            </h4>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground rounded-full bg-muted/60 px-3 py-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {monthEvents.length} événement{monthEvents.length > 1 ? 's' : ''} · {monthSubtasks.length} tâche{monthSubtasks.length > 1 ? 's' : ''} au cours du mois
          </span>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grille du mois */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const { items, total } = dayItems(d);
            const shown = Math.min(items.length, 3);
            const hidden = total - shown;
            const inMonth = df.isSameMonth(d, month);
            const today = df.isToday(d);
            const hasItems = total > 0;
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => hasItems && setSelectedDate(d)}
                className={cn(
                  'min-h-[70px] sm:min-h-[92px] rounded-[10px] border p-1.5 flex flex-col gap-1 text-left transition-all',
                  inMonth ? 'bg-muted/30 border-border/40' : 'bg-muted/20 border-transparent opacity-50',
                  hasItems
                    ? 'hover:border-primary/40 hover:shadow-sm cursor-pointer'
                    : 'cursor-default'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full',
                      today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/60'
                    )}
                  >
                    {df.format(d, 'd')}
                  </span>
                  {total > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-info rounded-md bg-info/10 px-1.5 py-0.5">
                      <ListTodo className="h-3 w-3" />{total}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {items.slice(0, 3).map((it) => (
                    <span
                      key={it.id}
                      title={it.title}
                      className={cn('block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight', it.cls)}
                    >
                      {it.title}
                    </span>
                  ))}
                  {hidden > 0 && (
                    <span className="text-[10px] font-semibold text-muted-foreground px-1">+{hidden}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Légende */}
        {legendTypes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ListTodo className="h-3 w-3 text-info" /> Sous-tâches</span>
            {legendTypes.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-[4px]', (typeColor[t] ?? 'bg-primary').split(' ')[0].replace(/\/\d+/, ''))} />
                {typeLabel[t] ?? t}
              </span>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground/70">Cliquez sur un jour pour le détail</span>
          </div>
        )}
      </div>

      {/* Jour sélectionné — détail des sous-tâches et événements */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {selectedDate ? df.format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr }) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-1 py-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                <CalendarDays className="h-4 w-4" /> Événements du jour ({selectedDayEvents.length})
              </h4>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucun événement ce jour.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3 p-3 rounded-[12px] border border-border/40 bg-muted/30">
                      <div className={cn('h-9 w-9 rounded-[12px] flex items-center justify-center flex-shrink-0', typeColor[ev.type] ?? 'bg-primary/15 text-primary border border-primary/20')}>
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{ev.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{typeLabel[ev.type] ?? ev.type} · {formatDate(ev.date)}</p>
                        {ev.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                <ListTodo className="h-4 w-4" /> Sous-tâches du jour ({selectedDayTasks.length})
              </h4>
              {selectedDayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune sous-tâche ce jour.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayTasks.map((st) => (
                    <div key={st.id} className="flex items-start gap-3 p-3 rounded-[12px] border border-border/40 bg-muted/30">
                      <div className="h-9 w-9 rounded-[12px] bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                        <ListTodo className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium line-clamp-1">{st.title}</p>
                          <Badge variant="outline" className="text-[10px]">{subtaskStatusLabel[st.status] ?? st.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(st.startDate)} → {formatDate(st.dueDate)}</p>
                        {st.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{st.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}