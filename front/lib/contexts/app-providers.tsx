'use client';

import React from 'react';
import { NotificationsProvider } from '@/lib/contexts/notifications-context';
import { UsersProvider } from '@/lib/contexts/users-context';
import { SessionProvider } from '@/lib/contexts/session-context';
import { ProjectsProvider } from '@/lib/contexts/projects-context';

/**
 * Composes the app's contexts, split by domain so a change in one (e.g. a new
 * notification) doesn't re-render components that only read another (e.g. the
 * project list). Nesting order matters: each provider may read from the ones
 * declared above it via their hooks.
 *   Notifications -> Users -> Session (derives currentUser from users) -> Projects
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <UsersProvider>
        <SessionProvider>
          <ProjectsProvider>{children}</ProjectsProvider>
        </SessionProvider>
      </UsersProvider>
    </NotificationsProvider>
  );
}
