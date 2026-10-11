'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { AppNotification, RequestStatus } from '@/types';
import { mockNotifications } from '@/lib/mock-data';
import { getApiToken, notificationApi, type ApiNotification } from '@/lib/project-api';

interface PushNotificationData {
  userId: string;
  type: AppNotification['type'];
  title: string;
  message: string;
  projectId?: string;
}

interface NotificationsState {
  notifications: AppNotification[];
  status: RequestStatus;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  /** @internal used by other providers (Users/Projects) to raise a notification for one recipient */
  pushNotification: (data: PushNotificationData) => void;
  /** @internal used by other providers to raise the same notification for several recipients */
  pushNotifications: (userIds: string[], data: Omit<PushNotificationData, 'userId'>) => void;
  /** @internal called by SessionProvider once authenticated, to replace local/demo notifications with the real ones */
  fetchNotifications: () => Promise<void>;
}

function mapApiNotification(n: ApiNotification): AppNotification {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type as AppNotification['type'],
    title: n.title,
    message: n.message,
    projectId: n.projectId ?? undefined,
    read: n.read,
    createdAt: n.createdAt ?? new Date().toISOString(),
  };
}

const NotificationsContext = createContext<NotificationsState | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => (getApiToken() ? [] : mockNotifications));
  const [status, setStatus] = useState<RequestStatus>(() => (getApiToken() ? 'loading' : 'success'));

  const fetchNotifications = useCallback(async () => {
    if (!getApiToken()) {
      // Logged out: reset to the demo seed, don't leave a previous user's
      // real notifications on screen.
      setNotifications(mockNotifications);
      setStatus('success');
      return;
    }
    setStatus('loading');
    try {
      const list = await notificationApi.list();
      setNotifications(list.map(mapApiNotification));
    } catch {
      // keep whatever was already shown if the backend is unreachable
    } finally {
      setStatus('success');
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) fetchNotifications(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchNotifications(); };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchNotifications]);

  // Notifications created server-side as a side effect of other actions
  // (project validated, subtask reviewed...) are picked up on the next
  // fetchNotifications() call, not pushed in real time: this app has no
  // websocket/SSE channel, so pushNotification() below remains the only
  // *immediate* feedback for the user who triggered the action themselves.
  const pushNotification = useCallback((data: PushNotificationData) => {
    if (getApiToken()) return; // the backend already persisted the real one; avoid a visible duplicate
    setNotifications((prev) => [
      { id: `n-${Date.now()}-${data.userId}-${Math.random().toString(36).slice(2, 7)}`, userId: data.userId, type: data.type, title: data.title, message: data.message, projectId: data.projectId, read: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const pushNotifications = useCallback((userIds: string[], data: Omit<PushNotificationData, 'userId'>) => {
    userIds.forEach((uid) => pushNotification({ ...data, userId: uid }));
  }, [pushNotification]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    if (getApiToken()) {
      notificationApi.markRead(id).catch(() => { /* local state already reflects "read"; retry on next fetch */ });
    }
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => n.read ? n : { ...n, read: true }));
    if (getApiToken()) {
      notificationApi.markAllRead().catch(() => { /* local state already reflects "read"; retry on next fetch */ });
    }
  }, []);

  const value = useMemo<NotificationsState>(() => ({
    notifications, status, markNotificationRead, markAllNotificationsRead, pushNotification, pushNotifications, fetchNotifications,
  }), [notifications, status, markNotificationRead, markAllNotificationsRead, pushNotification, pushNotifications, fetchNotifications]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
