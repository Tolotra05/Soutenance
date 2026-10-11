'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Euro, Paperclip, AlertCircle, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/shared/badges';
import { ProgressBar } from '@/components/shared/progress';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useUsers } from '@/lib/contexts/users-context';
import { getUser, formatCurrency, daysUntil, timeAgo } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

const statusBar: Record<string, string> = {
  pending: 'bg-warning',
  validated: 'bg-info',
  rejected: 'bg-destructive',
  assigned: 'bg-chart-5',
  in_progress: 'bg-primary',
  completed: 'bg-success',
};

export const ProjectCard = memo(function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const { users } = useUsers();
  const teamMembers = project.members.filter((m) => m.role === 'membre' || m.role === 'chef_de_projet');
  const daysLeft = daysUntil(project.endDate);
  const isLate = daysLeft < 0 && project.status === 'in_progress';
  const pendingMods = project.modifications.filter((m) => m.status === 'pending' || m.status === 'pending_client');
  const bar = statusBar[project.status] ?? 'bg-primary';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link href={`/projects/${project.id}`}>
        <Card className="group relative h-full overflow-hidden p-6 cursor-pointer hover:shadow-soft-lg hover:border-border/80">
          {/* Ruban vertical gauche — couleur du projet */}
          <span className={cn('absolute left-0 top-0 bottom-0 w-1', bar)} />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {project.logoUrl ? (
                <div className="relative h-11 w-11 rounded-xl bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <Image src={project.logoUrl} alt="Logo" fill sizes="44px" className="object-contain" />
                </div>
              ) : (
                <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center text-primary-foreground flex-shrink-0', bar)}>
                  <span className="font-display font-bold text-base">{project.title[0]}</span>
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-[15px] leading-tight truncate group-hover:text-primary transition-colors">{project.title}</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <StatusBadge status={project.status} />
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn('h-2 w-2 rounded-full', bar)} />
                    {project.category}
                  </span>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground/60">{timeAgo(project.createdAt)}</span>
                </div>
              </div>
            </div>
            <PriorityBadge priority={project.priority} />
          </div>

          <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{project.description}</p>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Avancement</span>
              <span className="text-xs font-bold">{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} indicatorClassName={project.progress < 33 ? 'bg-destructive' : project.progress < 66 ? 'bg-warning' : 'bg-success'} />
          </div>

          <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between gap-3">
            <div className="flex items-center -space-x-2 flex-shrink-0">
              {teamMembers.length === 0 ? (
                <span className="text-xs text-muted-foreground">Aucun membre</span>
              ) : (
                <>
                  {teamMembers.slice(0, 3).map((m) => (
                    <UserAvatar
                      key={m.userId}
                      user={getUser(users, m.userId)}
                      size="sm"
                      className="h-8 w-8 rounded-full border-2 border-card shadow-sm"
                    />
                  ))}
                  {teamMembers.length > 3 && (
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground border-2 border-card">
                      +{teamMembers.length - 3}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
              {pendingMods.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-warning font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />{pendingMods.length}
                </span>
              )}
              {project.attachments.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Pièces jointes">
                  <Paperclip className="h-3.5 w-3.5" />{project.attachments.length}
                </span>
              )}
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground" title="Budget">
                <Euro className="h-3.5 w-3.5" />{formatCurrency(project.budget)}
              </span>
              <span className={cn('text-xs font-medium', isLate ? 'text-destructive' : 'text-muted-foreground')}>
                {isLate ? `Retard ${Math.abs(daysLeft)} j` : daysLeft > 0 ? `${daysLeft} j restants` : "Échéance aujourd'hui"}
              </span>
              <span className="flex items-center justify-center h-8 w-8 rounded-full border border-border/70 text-muted-foreground group-hover:border-primary/40 group-hover:text-primary group-hover:bg-primary/5 transition-all flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
});