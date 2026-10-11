'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCheck, FolderKanban, CheckCircle2, XCircle, CheckSquare,
  AlarmClock, PartyPopper, Pencil, SearchCheck, UserPlus, BadgeCheck, User, CalendarPlus,
  MessageSquare, Paperclip, SlidersHorizontal, Undo2, Inbox, ClipboardCheck,
  MessageSquareQuote, Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNotifications } from '@/lib/contexts/notifications-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { ListRowsSkeleton } from '@/components/shared/page-skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { timeAgo } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

const notificationMeta: Record<AppNotification['type'], { icon: LucideIcon; color: string }> = {
  project_submitted: { icon: FolderKanban, color: 'text-warning bg-warning/10' },
  project_validated: { icon: CheckCircle2, color: 'text-info bg-info/10' },
  project_validation_reverted: { icon: Undo2, color: 'text-warning bg-warning/10' },
  project_rejected: { icon: XCircle, color: 'text-destructive bg-destructive/10' },
  subtask_assigned: { icon: CheckSquare, color: 'text-primary bg-primary/10' },
  delay_detected: { icon: AlarmClock, color: 'text-destructive bg-destructive/10' },
  project_completed: { icon: PartyPopper, color: 'text-success bg-success/10' },
  modification_requested: { icon: Pencil, color: 'text-warning bg-warning/10' },
  modification_reviewed: { icon: SearchCheck, color: 'text-info bg-info/10' },
  member_added: { icon: UserPlus, color: 'text-success bg-success/10' },
  subtask_reviewed: { icon: BadgeCheck, color: 'text-success bg-success/10' },
  member_created: { icon: User, color: 'text-primary bg-primary/10' },
  calendar_event: { icon: CalendarPlus, color: 'text-accent bg-accent/10' },
  task_comment: { icon: MessageSquare, color: 'text-primary bg-primary/10' },
  project_attachment: { icon: Paperclip, color: 'text-info bg-info/10' },
  task_requested: { icon: Inbox, color: 'text-warning bg-warning/10' },
  task_request_approved: { icon: ClipboardCheck, color: 'text-info bg-info/10' },
  task_request_rejected: { icon: XCircle, color: 'text-destructive bg-destructive/10' },
  requete_created: { icon: MessageSquareQuote, color: 'text-info bg-info/10' },
  requete_answered: { icon: Send, color: 'text-success bg-success/10' },
  account_created: { icon: Inbox, color: 'text-warning bg-warning/10' },
  account_validated: { icon: BadgeCheck, color: 'text-success bg-success/10' },
  account_rejected: { icon: XCircle, color: 'text-destructive bg-destructive/10' },
};

const notificationFilters: { value: AppNotification['type'] | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'project_submitted', label: 'Soumissions' },
  { value: 'project_validated', label: 'Validations' },
  { value: 'project_rejected', label: 'Rejets' },
  { value: 'project_completed', label: 'Terminés' },
  { value: 'subtask_assigned', label: 'Assignations' },
  { value: 'subtask_reviewed', label: 'Révisions' },
  { value: 'modification_requested', label: 'Modifications' },
  { value: 'modification_reviewed', label: 'Modifs révisées' },
  { value: 'delay_detected', label: 'Retards' },
  { value: 'calendar_event', label: 'Rendez-vous' },
  { value: 'task_comment', label: 'Commentaires' },
  { value: 'project_attachment', label: 'Pièces jointes' },
  { value: 'task_requested', label: 'Demandes de tâches' },
  { value: 'task_request_approved', label: 'Tâches acceptées' },
  { value: 'task_request_rejected', label: 'Tâches refusées' },
  { value: 'member_added', label: 'Membres ajoutés' },
  { value: 'member_created', label: 'Comptes créés' },
];

export default function NotificationsPage() {
  const { user, ready } = useAppReady();
  const { notifications, status: notificationsStatus, markNotificationRead, markAllNotificationsRead } = useNotifications();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<AppNotification['type'] | 'all'>('all');

  const userNotifs = useMemo(
    () => (user
      ? notifications.filter((n) => n.userId === user.id && (typeFilter === 'all' || n.type === typeFilter))
      : []),
    [notifications, user, typeFilter],
  );
  const unreadCount = user ? notifications.filter((n) => n.userId === user.id && !n.read).length : 0;

  if (!user) return null;
  // This page's main content *is* the notifications list, unlike every
  // other page (where notifications are just the topbar bell) -- so here we
  // also gate on notificationsStatus specifically, not just useAppReady()'s
  // session+projects+users check.
  if (!ready || notificationsStatus !== 'success') return <AppShell><ListRowsSkeleton rows={8} /></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllNotificationsRead} className="gap-1.5">
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AppNotification['type'] | 'all')}>
          <SelectTrigger className="w-full sm:w-72 h-11 rounded-full bg-card border border-border/60 px-5 gap-2 shadow-card">
            <SlidersHorizontal className="h-4 w-4 text-primary flex-shrink-0" />
            <SelectValue placeholder="Filtrer par type" />
          </SelectTrigger>
          <SelectContent>
            {notificationFilters.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {userNotifs.length} notification{userNotifs.length > 1 ? 's' : ''} affichée{userNotifs.length > 1 ? 's' : ''}
        </p>
      </div>

      {userNotifs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucune notification.</p>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {userNotifs.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2) }}
            >
              <Card
                className={cn(
                  'p-4 flex items-start gap-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-300',
                  !n.read && 'border-primary/30 bg-primary/5',
                )}
                onClick={() => {
                  markNotificationRead(n.id);
                  if (n.projectId) router.push(`/projects/${n.projectId}`);
                }}
              >
                <span className={cn('flex items-center justify-center h-10 w-10 rounded-xl flex-shrink-0', notificationMeta[n.type].color)}>
                  {(() => { const Icon = notificationMeta[n.type].icon; return <Icon className="h-5 w-5" />; })()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
