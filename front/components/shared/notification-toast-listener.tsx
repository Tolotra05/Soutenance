'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/contexts/session-context';
import { useNotifications } from '@/lib/contexts/notifications-context';
import { useToast } from '@/hooks/use-toast';
import { timeAgo } from '@/lib/status';

export function NotificationToastListener() {
  const { currentUser } = useSession();
  const { notifications, markNotificationRead } = useNotifications();
  const { toast } = useToast();
  const router = useRouter();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const mine = notifications.filter((n) => n.userId === currentUser.id);

    // First run: seed the seen-set with existing notifications (no toasts for history)
    if (seen.current === null) {
      seen.current = new Set(mine.map((n) => n.id));
      return;
    }

    const fresh = mine.filter((n) => !seen.current!.has(n.id));
    if (fresh.length === 0) return;

    fresh.forEach((n) => seen.current!.add(n.id));
    // Show the most recent new notification as a toast
    const latest = fresh[0];
    if (latest) {
      toast({
        title: latest.title,
        description: `${latest.message} — ${timeAgo(latest.createdAt)}`,
        onClick: () => {
          markNotificationRead(latest.id);
          if (latest.projectId) router.push(`/projects/${latest.projectId}`);
        },
      });
    }
  }, [notifications, currentUser, toast, markNotificationRead, router]);

  return null;
}