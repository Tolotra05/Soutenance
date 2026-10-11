'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { Bell, Search, Menu, CheckCheck, User as UserIcon, Settings, LogOut, Sun, Moon, ChevronDown, Phone, Building2 } from 'lucide-react';
import { useSession } from '@/lib/contexts/session-context';
import { useNotifications } from '@/lib/contexts/notifications-context';
import { useProjects } from '@/lib/contexts/projects-context';
import { UserAvatar } from '@/components/shared/user-avatar';
import { RoleBadge } from '@/components/shared/badges';
import { LogoutConfirmDialog } from '@/components/shared/logout-confirm-dialog';
import { timeAgo } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

const notificationIcon: Record<AppNotification['type'], string> = {
  project_submitted: '📂',
  project_validated: '✅',
  project_validation_reverted: '↩️',
  project_rejected: '❌',
  subtask_assigned: '📌',
  delay_detected: '⏰',
  project_completed: '🎉',
  modification_requested: '📝',
  modification_reviewed: '🔍',
  member_added: '👥',
  subtask_reviewed: '✅',
  member_created: '👤',
  calendar_event: '📅',
  task_comment: '💬',
  project_attachment: '📎',
  task_requested: '📥',
  task_request_approved: '✅',
  task_request_rejected: '❌',
  requete_created: '✉️',
  requete_answered: '📨',
  account_created: '🆕',
  account_validated: '✅',
  account_rejected: '⛔',
};

export const Topbar = memo(function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { currentUser, logout } = useSession();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useNotifications();
  const { projects } = useProjects();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const userNotifs = notifications.filter((n) => n.userId === currentUser.id);
  const unreadCount = userNotifs.filter((n) => !n.read).length;

  // Search across all projects the user can see
  const visibleProjects = projects.filter((p) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'chef_de_projet') return p.managerId === currentUser.id || p.status !== 'rejected';
    if (currentUser.role === 'client') return p.clientId === currentUser.id;
    return p.members.some((m) => m.userId === currentUser.id);
  });

  const searchResults = searchQuery.length > 1
    ? visibleProjects.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleLogout = () => {
    setUserMenuOpen(false);
    setLogoutConfirmOpen(true);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-4 px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
        <Menu className="h-5 w-5" />
      </button>

      {/* Search — pill large */}
      <div className="flex-1 max-w-xl" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="w-full h-9 pl-9 pr-4 text-sm rounded-lg bg-muted/50 border border-transparent focus:border-border focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-muted-foreground shadow-sm"
          />
          <AnimatePresence>
            {searchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-full mt-2 w-full rounded-lg border border-border bg-popover shadow-soft-lg overflow-hidden"
              >
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { router.push(`/projects/${p.id}`); setSearchOpen(false); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                  >
                    {p.logoUrl ? (
                      <div className="relative h-8 w-8 rounded-md border border-border overflow-hidden bg-muted/20 flex items-center justify-center flex-shrink-0">
                        <Image src={p.logoUrl} alt="Logo" fill sizes="32px" className="object-contain" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{p.title[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.category}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
            {searchOpen && searchQuery.length > 1 && searchResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-full mt-2 w-full rounded-lg border border-border bg-popover shadow-soft-lg px-4 py-6 text-center text-sm text-muted-foreground"
              >
                Aucun projet trouvé pour « {searchQuery} »
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Dark mode toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border border-border bg-popover shadow-soft-lg overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllNotificationsRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <CheckCheck className="h-3.5 w-3.5" /> Tout marquer lu
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {userNotifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification</div>
                  ) : (
                    userNotifs.slice(0, 10).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { markNotificationRead(n.id); if (n.projectId) { router.push(`/projects/${n.projectId}`); setNotifOpen(false); } }}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50',
                          !n.read && 'bg-primary/5',
                        )}
                      >
                        <span className="text-lg flex-shrink-0">{notificationIcon[n.type]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-border py-1 rounded-full hover:bg-secondary/70 transition-colors pr-2"
          >
            <UserAvatar user={currentUser} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-tight">{currentUser.name}</p>
              <div className="mt-0.5">
                <RoleBadge role={currentUser.role} />
              </div>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', userMenuOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-popover shadow-soft-lg overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{currentUser.email}</p>
                  {currentUser.phone && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 flex-shrink-0" />{currentUser.phone}
                    </p>
                  )}
                  {currentUser.company && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                      <Building2 className="h-3 w-3 flex-shrink-0" />{currentUser.company}
                    </p>
                  )}
                </div>
                <div className="py-1.5">
                  <button
                    onClick={() => { router.push('/dashboard'); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                  >
                    <UserIcon className="h-4 w-4 text-muted-foreground" /> Tableau de bord
                  </button>
                  <button
                    onClick={() => { router.push('/settings'); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" /> Paramètres
                  </button>
                  {mounted && (
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                    >
                      {theme === 'dark' ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
                      {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                    </button>
                  )}
                </div>
                <div className="border-t border-border py-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        onConfirm={logout}
      />
    </header>
  );
});
