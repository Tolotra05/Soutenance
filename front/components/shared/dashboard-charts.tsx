'use client';

import { memo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import type { SubtaskStatus } from '@/types';

/**
 * recharts (+ its d3 dependencies) is one of the heaviest libraries pulled
 * in by /dashboard and /history. Isolating every chart here lets the pages
 * load them via next/dynamic({ ssr: false }), so the chart code only
 * downloads/parses once the page is idle instead of blocking first paint.
 */

const tooltipStyle = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };
const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const axisLine = { stroke: 'hsl(var(--border))' };

export function subtaskBarColor(status: SubtaskStatus): string {
  switch (status) {
    case 'done':
      return 'hsl(var(--success))';
    case 'in_progress':
      return 'hsl(var(--primary))';
    case 'review':
      return 'hsl(var(--chart-5))';
    case 'cancelled':
      return 'hsl(var(--destructive))';
    default:
      return 'hsl(var(--muted-foreground))';
  }
}

export const ActivityLineChart = memo(function ActivityLineChart({ data }: { data: { month: string; created: number; delivered: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis dataKey="month" tick={axisTick} axisLine={axisLine} />
        <YAxis tick={axisTick} axisLine={axisLine} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="created" name="Projets créés" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorCreated)" fillOpacity={0.15} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="delivered" name="Projets livrés" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
});

export const StatusPieChart = memo(function StatusPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="88%" paddingAngle={2} strokeWidth={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="bottom" />
      </PieChart>
    </ResponsiveContainer>
  );
});

export const ClientProgressLineChart = memo(function ClientProgressLineChart({ data }: { data: { month: string; planned: number; actual: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis dataKey="month" tick={axisTick} axisLine={axisLine} />
        <YAxis tick={axisTick} axisLine={axisLine} domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="actual" name="Avancement réel (%)" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorActual)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="planned" name="Prévu (%)" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 4" fill="url(#colorPlanned)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
});

export const SubtaskProgressLineChart = memo(function SubtaskProgressLineChart({ rows, series }: {
  rows: Array<Record<string, string | number>>;
  series: Array<{ id: string; title: string; status: SubtaskStatus }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis
          dataKey="key"
          tickFormatter={(v: string) => new Date(`${v}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          tick={axisTick}
          axisLine={axisLine}
          tickLine={axisLine}
        />
        <YAxis domain={[0, 100]} tick={axisTick} axisLine={axisLine} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value}%`]}
          labelFormatter={(v) => new Date(`${v}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
        {series.map((s) => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.title}
            stroke={subtaskBarColor(s.status)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});

export const StatusDistributionBarChart = memo(function StatusDistributionBarChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis dataKey="name" tick={axisTick} />
        <YAxis tick={axisTick} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Projets" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});
