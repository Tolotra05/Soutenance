'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, Users, CheckSquare,
  FileText, Settings, LogOut, ChevronLeft, Layers, Bell, UserCog, History, MessageSquareQuote,
} from 'lucide-react';
import { useSession } from '@/lib/contexts/session-context';
import { useNotifications } from '@/lib/contexts/notifications-context';
import { LogoutConfirmDialog } from '@/components/shared/logout-confirm-dialog';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',     icon: LayoutDashboard, roles: ['admin', 'chef_de_projet', 'membre', 'client'] },
  { label: 'Projets',      href: '/projects',      icon: FolderKanban,    roles: ['admin', 'chef_de_projet', 'membre', 'client'] },
  { label: 'Historique',   href: '/history',       icon: History,         roles: ['admin', 'chef_de_projet', 'membre', 'client'] },
  { label: 'Tâches',      href: '/tasks',         icon: CheckSquare,     roles: ['admin', 'chef_de_projet', 'membre'] },
  { label: 'Requêtes',    href: '/requetes',       icon: MessageSquareQuote, roles: ['admin', 'chef_de_projet', 'membre', 'client'] },
  { label: 'Équipe',       href: '/employees',     icon: Users,           roles: ['admin', 'chef_de_projet', 'membre'] },
  { label: 'Soumettre',    href: '/submit',        icon: FileText,        roles: ['client', 'admin'] },
  { label: 'Notifications',href: '/notifications', icon: Bell,            roles: ['admin', 'chef_de_projet', 'membre', 'client'] },
];

const adminNavItems: NavItem[] = [
  { label: 'Utilisateurs', href: '/admin/users', icon: UserCog, roles: ['admin'] },
];

export const Sidebar = memo(function Sidebar({ collapsed, onToggle, mobileOpen }: { collapsed: boolean; onToggle: () => void; mobileOpen?: boolean }) {
  const pathname = usePathname();
  const { currentUser, logout } = useSession();
  const { notifications } = useNotifications();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  if (!currentUser) return null;

  const items = navItems.filter((item) => item.roles.includes(currentUser.role));
  const unreadCount = notifications.filter((n) => n.userId === currentUser.id && !n.read).length;
  const isCollapsed = collapsed && !mobileOpen;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 264 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground border-r border-border flex flex-col overflow-hidden transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground flex-shrink-0 shadow-sm">
          <Layers className="h-4 w-4" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-hidden"
            >
              <h1 className="font-sans text-[15px] font-bold tracking-tight">ProFlow</h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={isCollapsed} unreadCount={item.href === '/notifications' ? unreadCount : 0} />
        ))}

        {currentUser.role === 'admin' && (
          <>
            <div className="flex items-center gap-2 pt-4 pb-2 px-3">
              {isCollapsed ? (
                <span className="h-px flex-1 bg-border" />
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Administration</span>
              )}
            </div>
            {adminNavItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} collapsed={isCollapsed} />
            ))}
          </>
        )}

        <Link href="/settings" className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 transition-all mt-2 relative overflow-hidden',
          pathname === '/settings' ? 'bg-white/10 text-white font-medium' : 'text-sidebar-foreground/70 hover:text-white hover:bg-white/5',
        )}>
          {pathname === '/settings' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
          <Settings className={cn("h-[18px] w-[18px] flex-shrink-0", pathname === '/settings' ? "text-primary" : "text-sidebar-foreground/50")} />
          {!isCollapsed && <span className="flex-1 truncate text-sm">Paramètres</span>}
        </Link>
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-3 space-y-1 flex-shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className={cn('h-[18px] w-[18px] transition-transform text-sidebar-foreground/50', isCollapsed && 'rotate-180')} />
          {!isCollapsed && <span>Réduire</span>}
        </button>
        <button
          onClick={() => setLogoutConfirmOpen(true)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-[18px] w-[18px] text-sidebar-foreground/50" />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        onConfirm={logout}
      />
    </motion.aside>
  );
});

const NavLink = memo(function NavLink({ item, pathname, collapsed, unreadCount = 0 }: {
  item: NavItem;
  pathname: string | null;
  collapsed: boolean;
  unreadCount?: number;
}) {
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
  const showBadge = unreadCount > 0;
  return (
    <Link href={item.href} className={cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2 transition-all relative overflow-hidden',
      isActive
        ? 'bg-white/10 text-white font-medium'
        : 'text-sidebar-foreground/70 hover:text-white hover:bg-white/5',
    )}>
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
      )}
      <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80")} />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 truncate text-sm"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {showBadge && !collapsed && (
        <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
      {showBadge && collapsed && (
        <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </Link>
  );
});
