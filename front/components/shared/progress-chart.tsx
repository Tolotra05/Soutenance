'use client';

import { useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart,
} from 'recharts';
import type { ProgressPoint } from '@/types';
import { formatDateShort } from '@/lib/status';

export function ProgressChart({ data }: { data: ProgressPoint[] }) {
  const chartData = useMemo(() =>
    data.map((p) => ({
      date: formatDateShort(p.date),
      planned: p.planned,
      actual: p.actual,
    })),
  [data]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Aucune donnée d’avancement disponible.</p>
        <p className="text-sm mt-1">Les courbes apparaîtront une fois le projet en cours.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Avancement prévu</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-accent" />
          <span className="text-muted-foreground">Avancement réel</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}%`, '']}
          />
          <Area
            type="monotone"
            dataKey="planned"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            strokeDasharray="6 3"
            fill="url(#colorPlanned)"
            name="Prévu"
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="hsl(var(--accent))"
            strokeWidth={2.5}
            fill="url(#colorActual)"
            name="Réel"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
