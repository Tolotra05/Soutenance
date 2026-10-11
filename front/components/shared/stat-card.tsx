'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: string;
  delay?: number;
  onClick?: () => void;
}

const cardMeta: Record<string, { bg: string; chip: string }> = {
  'text-primary':     { bg: 'bg-primary/5 border-primary/20',     chip: 'bg-primary/10 text-primary' },
  'text-accent':      { bg: 'bg-accent/5 border-accent/20',       chip: 'bg-accent/10 text-accent' },
  'text-warning':     { bg: 'bg-warning/5 border-warning/20',     chip: 'bg-warning/10 text-warning' },
  'text-success':     { bg: 'bg-success/5 border-success/20',     chip: 'bg-success/10 text-success' },
  'text-info':        { bg: 'bg-info/5 border-info/20',           chip: 'bg-info/10 text-info' },
  'text-destructive': { bg: 'bg-destructive/5 border-destructive/20', chip: 'bg-destructive/10 text-destructive' },
};

export function StatCard({ label, value, icon: Icon, trend, color = 'text-primary', delay = 0, onClick }: StatCardProps) {
  const Component = onClick ? 'button' : 'div';
  const meta = cardMeta[color] ?? cardMeta['text-primary'];
  const TrendIcon = trend ? (trend.positive ? ArrowUpRight : ArrowDownRight) : ArrowUpRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Component
        onClick={onClick}
        className={cn(
          'group relative w-full rounded-xl p-5 text-left bg-card transition-all duration-300 border border-border',
          onClick && 'hover:shadow-soft-lg hover:border-border/80 cursor-pointer'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn('inline-flex items-center justify-center h-8 w-8 rounded-md flex-shrink-0', meta.chip)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold font-display tracking-tight text-foreground">{value}</p>
          {trend && (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              trend.positive ? 'text-success' : 'text-destructive'
            )}>
              <TrendIcon className="h-3 w-3" /> {trend.value}
            </span>
          )}
        </div>
      </Component>
    </motion.div>
  );
}