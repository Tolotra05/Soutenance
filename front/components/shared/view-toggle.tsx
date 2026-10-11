'use client';

import { LayoutGrid, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'kanban' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  labels?: { kanban?: string; list?: string };
}

export function ViewToggle({ value, onChange, labels }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-border/60 bg-card p-1 shadow-card">
      <button
        type="button"
        onClick={() => onChange('kanban')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
          value === 'kanban' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        {labels?.kanban ?? 'Kanban'}
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
          value === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Rows3 className="h-3.5 w-3.5" />
        {labels?.list ?? 'Liste'}
      </button>
    </div>
  );
}