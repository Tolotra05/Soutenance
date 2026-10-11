'use client';

import { useCallback, useState } from 'react';
import { Sidebar } from '@/components/shared/sidebar';
import { Topbar } from '@/components/shared/topbar';
import { NotificationToastListener } from '@/components/shared/notification-toast-listener';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);

  return (
    <div className="min-h-screen bg-background">
      <NotificationToastListener />
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} mobileOpen={mobileOpen} />

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={closeMobile} />
      )}

      <div
        className={cn(
          "transition-all duration-300",
          "pl-0 lg:pl-[264px]", // Base padding: 0 on mobile, 264 on lg by default
          collapsed && "lg:pl-[72px]" // If collapsed, 72 on lg
        )}
      >
        <Topbar onMenuClick={openMobile} />
        <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
