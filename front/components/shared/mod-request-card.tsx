'use client';

import { memo } from 'react';
import { FolderKanban, ArrowUpRight, Clock, AlertCircle, Check, XCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';
import { getUser, formatDate, roleMeta } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { ModificationRequest, User } from '@/types';

const MOD_STATUS: Record<ModificationRequest['status'], { label: string; className: string; card: string }> = {
  pending: { label: 'En attente', className: 'bg-warning/15 text-warning border-warning/30', card: 'border-warning/30' },
  pending_client: { label: 'Validation client', className: 'bg-info/15 text-info border-info/30', card: 'border-info/30' },
  approved: { label: 'Approuvée', className: 'bg-success/15 text-success border-success/30', card: 'border-success/30' },
  rejected: { label: 'Rejetée', className: 'bg-destructive/15 text-destructive border-destructive/30', card: 'border-destructive/30' },
};

interface ModRequestCardProps {
  mod: ModificationRequest;
  projectId: string;
  projectTitle: string;
  requester?: User;
  reviewer?: User | null;
  users: User[];
  fieldLabel: (field: string) => string;
  subtaskTitle?: string;
  canApprove?: boolean;
  onApprove?: (mod: ModificationRequest, projectId: string) => void;
  onReject?: (mod: ModificationRequest, projectId: string) => void;
  hideProject?: boolean;
}

export const ModRequestCard = memo(function ModRequestCard({
  mod,
  projectId,
  projectTitle,
  requester,
  reviewer,
  users,
  fieldLabel,
  subtaskTitle,
  canApprove = false,
  onApprove,
  onReject,
  hideProject = false,
}: ModRequestCardProps) {
  const router = useRouter();
  const status = MOD_STATUS[mod.status];

  return (
    <Card className={cn('p-5', status.card)}>
      <div className="flex flex-col gap-4">
        {/* ---- Qui + projet concerné ---- */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {requester && <UserAvatar user={requester} size="md" className="flex-shrink-0" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{mod.requestedByName}</p>
                {requester?.role && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {roleMeta[requester.role]?.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                {!hideProject && (
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${projectId}`)}
                    className="inline-flex items-center gap-1.5 min-w-0 hover:text-primary transition-colors font-medium"
                  >
                    <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{projectTitle}</span>
                    <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                  </button>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" /> {formatDate(mod.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={cn('flex-shrink-0', status.className)}>{status.label}</Badge>
        </div>

        {/* ---- Cible ---- */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Modification sur :</span>
          <span className="font-semibold text-foreground">{fieldLabel(mod.field) ?? mod.field}</span>
          {subtaskTitle && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              sous-tâche « {subtaskTitle} »
            </Badge>
          )}
        </div>

        {/* ---- Contenu ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Avant</p>
            <p className="text-sm text-muted-foreground line-clamp-3">{mod.oldValue || '(vide)'}</p>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[11px] font-semibold text-primary mb-1.5">Nouvelle valeur proposée</p>
            <p className="text-sm font-medium text-foreground line-clamp-3">{mod.newValue}</p>
          </div>
        </div>

        {/* ---- Motif ---- */}
        {mod.reason && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p className="min-w-0">{mod.reason}</p>
          </div>
        )}

        {/* ---- Suivi (validation équipe / décision) ---- */}
        {(mod.status === 'pending_client' && mod.teamReview) || (reviewer && mod.status !== 'pending' && mod.status !== 'pending_client') ? (
          <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {mod.status === 'pending_client' && mod.teamReview && (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-success" />
                Approuvée par {getUser(users, mod.teamReview.userId)?.name ?? 'l’équipe'} — en attente de la validation du client
              </span>
            )}
            {reviewer && (
              <span className="inline-flex items-center gap-1.5">
                {mod.status === 'approved'
                  ? <Check className="h-3.5 w-3.5 text-success" />
                  : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                {mod.status === 'approved' ? 'Approuvée' : 'Rejetée'} par {reviewer.name}
                {mod.reviewNote && <span className="italic">— « {mod.reviewNote} »</span>}
              </span>
            )}
          </div>
        ) : null}

        {/* ---- Actions ---- */}
        {canApprove && (
          <div className="flex gap-2 pt-3 border-t border-border/50">
            <Button size="sm" className="bg-success hover:bg-success/90 h-8 gap-1.5" onClick={() => onApprove?.(mod, projectId)}>
              <Check className="h-3.5 w-3.5" /> {mod.status === 'pending_client' ? 'Valider' : 'Approuver'}
            </Button>
            <Button size="sm" variant="destructive" className="h-8 gap-1.5" onClick={() => onReject?.(mod, projectId)}>
              <XCircle className="h-3.5 w-3.5" /> Rejeter
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
});