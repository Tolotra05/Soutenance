'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Check, XCircle } from 'lucide-react';
import { useProjects } from '@/lib/contexts/projects-context';
import { useUsers } from '@/lib/contexts/users-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { ListRowsSkeleton } from '@/components/shared/page-skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ModRequestCard } from '@/components/shared/mod-request-card';
import { getUser } from '@/lib/status';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ModificationRequest } from '@/types';

type ModFilter = 'all' | 'pending' | 'pending_client' | 'approved' | 'rejected';

const FILTERS: { id: ModFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'Envoyée' },
  { id: 'pending_client', label: 'Validation client' },
  { id: 'approved', label: 'Acceptée' },
  { id: 'rejected', label: 'Rejetée' },
];

const FIELD_LABELS: Record<string, string> = {
  title: 'Titre', description: 'Description', priority: 'Priorité', budget: 'Budget',
  startDate: 'Date de début', endDate: 'Date de fin', dueDate: 'Date de fin',
};
const getFieldLabel = (field: string) => FIELD_LABELS[field] ?? field;

export default function ModificationsPage() {
  const { user, ready } = useAppReady();
  const { projects, reviewModification } = useProjects();
  const { users } = useUsers();
  const [filter, setFilter] = useState<ModFilter>('all');
  const [reviewTarget, setReviewTarget] = useState<{ mod: ModificationRequest; projectId: string; decision: 'approved' | 'rejected' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const handleApprove = useCallback((mod: ModificationRequest, projectId: string) => setReviewTarget({ mod, projectId, decision: 'approved' }), []);
  const handleReject = useCallback((mod: ModificationRequest, projectId: string) => setReviewTarget({ mod, projectId, decision: 'rejected' }), []);

  const canApprove = useMemo(() => (mod: ModificationRequest) => {
    if (!user) return false;
    const project = projects.find((p) => p.id === mod.projectId);
    const isOwner = user.role === 'client' && project?.clientId === user.id;
    if (mod.status === 'pending_client') return isOwner;
    if (mod.status !== 'pending') return false;
    const requesterRole = getUser(users, mod.requestedById)?.role;
    if (requesterRole === 'admin') return isOwner;
    return user.role === 'admin';
  }, [user, projects, users]);

  const visible = useMemo(() => {
    if (!user) return [] as { mod: ModificationRequest; projectId: string; projectTitle: string }[];
    const accessible = projects.filter((p) => {
      if (user.role === 'admin' || user.role === 'chef_de_projet') return true;
      if (user.role === 'client') return p.clientId === user.id;
      return p.members.some((m) => m.userId === user.id);
    });
    return accessible.flatMap((p) =>
      p.modifications.map((mod) => ({ mod, projectId: p.id, projectTitle: p.title }))
    );
  }, [user, projects]);

  const filtered = visible.filter((m) => filter === 'all' || m.mod.status === filter);
  const counts = useMemo(() => {
    const c: Record<ModFilter, number> = { all: visible.length, pending: 0, pending_client: 0, approved: 0, rejected: 0 };
    visible.forEach((m) => { c[m.mod.status] += 1; });
    return c;
  }, [visible]);

  if (!user) return null;
  if (!ready) return <AppShell><ListRowsSkeleton rows={6} /></AppShell>;

  const handleReview = () => {
    if (!reviewTarget) return;
    const { mod, projectId, decision } = reviewTarget;
    reviewModification(projectId, mod.id, decision, reviewNote.trim());
    const requesterRole = getUser(users, mod.requestedById)?.role;
    toast({
      title: decision === 'approved' ? 'Modification approuvée' : 'Modification rejetée',
      description: decision === 'approved'
        ? (user.role === 'client' || requesterRole === 'client' || requesterRole === 'admin'
            ? 'La nouvelle valeur a été appliquée au projet.'
            : 'La demande a été transmise au client pour validation finale.')
        : 'La modification proposée a été refusée.',
    });
    setReviewTarget(null);
    setReviewNote('');
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">Demandes de modification</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Suivez l&apos;état des demandes émises sur vos projets — {filtered.length} demande{filtered.length > 1 ? 's' : ''}.
        </p>
      </motion.div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.98]',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {f.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                active ? 'bg-white/15 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Edit3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune demande de modification à afficher.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ mod, projectId, projectTitle }) => {
            const project = projects.find((p) => p.id === projectId);
            const requester = getUser(users, mod.requestedById);
            const reviewer = mod.reviewedById ? getUser(users, mod.reviewedById) : null;
            const subtask = project?.subtasks.find((st) => st.id === mod.subtaskId);
            return (
              <motion.div key={mod.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <ModRequestCard
                  mod={mod}
                  projectId={projectId}
                  projectTitle={projectTitle}
                  requester={requester}
                  reviewer={reviewer}
                  users={users}
                  fieldLabel={getFieldLabel}
                  subtaskTitle={subtask?.title}
                  canApprove={canApprove(mod)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!reviewTarget} onOpenChange={(o) => { if (!o) { setReviewTarget(null); setReviewNote(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewTarget?.decision === 'approved' ? <Check className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
              {reviewTarget?.decision === 'approved' ? 'Approuver la modification' : 'Rejeter la modification'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {reviewTarget?.decision === 'approved'
                ? 'Selon l’émetteur, la modification sera appliquée immédiatement ou transmise au client pour validation finale.'
                : 'Un motif de refus sera transmis à l’auteur de la demande.'}
            </p>
            <div>
              <Label htmlFor="reviewNote" className="text-xs">Note de révision {reviewTarget?.decision === 'rejected' && <span className="text-destructive">(obligatoire)</span>}</Label>
              <Textarea
                id="reviewNote"
                className="mt-1.5"
                rows={3}
                placeholder={reviewTarget?.decision === 'approved' ? 'Commentaire (optionnel)' : 'Expliquez pourquoi vous refusez cette modification'}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewTarget(null); setReviewNote(''); }}>Annuler</Button>
            <Button
              variant={reviewTarget?.decision === 'rejected' ? 'destructive' : 'default'}
              onClick={handleReview}
              disabled={!!(reviewTarget?.decision === 'rejected' && !reviewNote.trim())}
            >
              {reviewTarget?.decision === 'approved' ? 'Approuver' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}