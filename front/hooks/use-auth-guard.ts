'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/contexts/session-context';

export function useAuthGuard() {
  const { currentUser, sessionInitialized } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!currentUser && sessionInitialized) {
      router.replace('/login');
    }
  }, [currentUser, sessionInitialized, router]);
  return currentUser;
}
