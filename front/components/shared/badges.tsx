'use client';

import { cn } from '@/lib/utils';
import { projectStatusMeta, subtaskStatusMeta, priorityMeta, roleMeta, availabilityMeta } from '@/lib/status';
import type { ProjectStatus, SubtaskStatus, Priority, Role } from '@/types';

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const meta = projectStatusMeta[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.bg, meta.color, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

export function SubtaskStatusBadge({ status, className }: { status: SubtaskStatus; className?: string }) {
  const meta = subtaskStatusMeta[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.bg, meta.color, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const meta = priorityMeta[priority];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', meta.bg, meta.color, meta.ring, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const meta = roleMeta[role];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', meta.bg, meta.color, className)}>
      {meta.label}
    </span>
  );
}

export function AvailabilityBadge({ availability, className }: { availability: string; className?: string }) {
  const meta = availabilityMeta[availability];
  if (!meta) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.color, 'bg-transparent', className)}>
      <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}
