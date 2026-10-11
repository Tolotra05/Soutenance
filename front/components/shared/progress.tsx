'use client';

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export function ProgressBar({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  return (
    <div className={cn('w-full', className)}>
      <Progress value={value} className="h-2" indicatorClassName={indicatorClassName} />
    </div>
  );
}

export function ProgressRing({ value, size = 48, strokeWidth = 4, className }: { value: number; size?: number; strokeWidth?: number; className?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  let color = 'hsl(var(--success))';
  if (value < 33) color = 'hsl(var(--destructive))';
  else if (value < 66) color = 'hsl(var(--warning))';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-semibold">{value}%</span>
    </div>
  );
}
