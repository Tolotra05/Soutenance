'use client';

import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useProjects } from '@/lib/contexts/projects-context';
import { useUsers } from '@/lib/contexts/users-context';

/**
 * Single source of truth for "is there real data to render yet". Combines:
 *  - session restore (useAuthGuard: null while resolving or redirecting to /login)
 *  - the Users and Projects contexts' fetch status (RequestStatus)
 *
 * Pages must never render their data-bearing content before `ready` is
 * true -- show a page-shaped skeleton instead (see page-skeletons.tsx).
 * Notifications are deliberately NOT included here: they're a secondary
 * widget (topbar bell), not a page's main content, so they resolve in the
 * background without blocking the rest of the UI.
 */
export function useAppReady() {
  const user = useAuthGuard();
  const { status: projectsStatus } = useProjects();
  const { status: usersStatus } = useUsers();

  const ready = !!user && projectsStatus === 'success' && usersStatus === 'success';

  return { user, ready };
}
