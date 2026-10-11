'use client';

import { memo, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectStatusMeta } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

const SubtaskProgressLineChart = dynamic(
  () => import('@/components/shared/dashboard-charts').then((m) => m.SubtaskProgressLineChart),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" /> }
);

/**
 * "Progression d'un projet" card on the client dashboard. Owns the selected-
 * project state locally so switching projects doesn't re-render the rest of
 * the dashboard.
 */
export const DashboardProjectProgressSelector = memo(function DashboardProjectProgressSelector({ clientProjects }: { clientProjects: Project[] }) {
  const [selectedProgressProjectId, setSelectedProgressProjectId] = useState('');

  const selectedProgressProject = useMemo(
    () => clientProjects.find((p) => p.id === selectedProgressProjectId) ?? clientProjects[0] ?? null,
    [clientProjects, selectedProgressProjectId],
  );

  const selectedSubtaskLines = useMemo(() => {
    if (!selectedProgressProject) return null;
    const subtasks = (selectedProgressProject.subtasks ?? []).filter((s) => s.status !== 'cancelled');
    if (subtasks.length === 0) return null;
    const day = (iso: string) => String(iso).slice(0, 10);
    const keys = Array.from(
      new Set(subtasks.flatMap((s) => [day(s.startDate), day(s.dueDate)])),
    ).sort();
    const rows: Array<Record<string, string | number>> = keys.map((key) => ({ key }));
    subtasks.forEach((s) => {
      const si = keys.indexOf(day(s.startDate));
      const ei = keys.indexOf(day(s.dueDate));
      for (let i = Math.min(si, ei); i <= Math.max(si, ei); i++) {
        const row = rows[i];
        if (!row) continue;
        const t = si === ei ? 1 : (i - si) / (ei - si);
        row[s.id] = Math.round(s.progress * t);
      }
    });
    return {
      rows,
      series: subtasks.map((s) => ({ id: s.id, title: s.title, status: s.status })),
    };
  }, [selectedProgressProject]);

  if (!selectedProgressProject) return null;

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Progression d{'\''}un projet
        </h3>
        <Select value={selectedProgressProject.id} onValueChange={setSelectedProgressProjectId}>
          <SelectTrigger className="sm:w-80 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {clientProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">{selectedProgressProject.title}</span>
        <span className="text-xs font-semibold text-primary">Avancement actuel : {selectedProgressProject.progress}%</span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border',
            projectStatusMeta[selectedProgressProject.status]?.color === 'success'
              ? 'bg-success/15 text-success border-success/30'
              : projectStatusMeta[selectedProgressProject.status]?.color === 'warning'
                ? 'bg-warning/15 text-warning border-warning/30'
                : projectStatusMeta[selectedProgressProject.status]?.color === 'destructive'
                  ? 'bg-destructive/15 text-destructive border-destructive/30'
                  : 'bg-info/15 text-info border-info/30',
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {projectStatusMeta[selectedProgressProject.status]?.label}
        </span>
      </div>
      <div className="h-64 sm:h-72">
        {selectedSubtaskLines && selectedSubtaskLines.rows.length > 0 ? (
          <SubtaskProgressLineChart rows={selectedSubtaskLines.rows} series={selectedSubtaskLines.series} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Aucune sous-tâche pour ce projet.
          </div>
        )}
      </div>
    </Card>
  );
});
