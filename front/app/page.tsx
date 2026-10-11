'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/contexts/session-context';

export default function Home() {
  const { currentUser } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.replace(currentUser ? '/dashboard' : '/login');
  }, [currentUser, router]);

  return null;
}