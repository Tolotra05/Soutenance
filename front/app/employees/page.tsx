'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, Mail, Phone, UserPlus, Upload, X, Building2, MapPin, KeyRound, ArrowUpRight, Search, Briefcase } from 'lucide-react';
import { useUsers } from '@/lib/contexts/users-context';
import { useProjects } from '@/lib/contexts/projects-context';
import { useSession } from '@/lib/contexts/session-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { CardGridSkeleton } from '@/components/shared/page-skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';
import { RoleBadge } from '@/components/shared/badges';
import { MemberProfileDialog } from '@/components/shared/member-profile-dialog';
import { specialtyMeta } from '@/lib/status';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { MemberSpecialty, User } from '@/types';

export default function EmployeesPage() {
  const { user, ready } = useAppReady();
  const { users, addEmployee, specialties, addSpecialty } = useUsers();
  const { projects } = useProjects();
  const { apiToken } = useSession();
  const router = useRouter();
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [posteOpen, setPosteOpen] = useState(false);
  const [posteName, setPosteName] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (user && user.role === 'client') router.replace('/projects');
  }, [user, router]);

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    role: 'membre' as 'chef_de_projet' | 'membre',
    memberSpecialty: 'Designer' as MemberSpecialty,
  });
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const canManage = user?.role === 'admin' || user?.role === 'chef_de_projet';

  const visibleUsers = useMemo(() => {
    try {
      if (!user) return [];
      const q = debouncedSearch.trim().toLowerCase();
      let list = users.filter((u) => u.role === 'membre' || u.role === 'chef_de_projet');
      // Clients and membres only see members assigned to their projects
      if (user.role === 'client' || user.role === 'membre') {
        const projectMemberIds = new Set<string>();
        projects.forEach((p) => {
          const isMyProject = p.clientId === user.id || p.subtasks.some((st) => st.assignedToId === user.id) || p.members?.some((m) => m.userId === user.id);
          if (isMyProject) {
            p.members?.forEach((m) => projectMemberIds.add(m.userId));
            p.subtasks.forEach((st) => { if (st.assignedToId) projectMemberIds.add(st.assignedToId); });
            if (p.managerId) projectMemberIds.add(p.managerId);
          }
        });
        list = list.filter((u) => projectMemberIds.has(u.id));
      }
      if (specialtyFilter !== 'all') list = list.filter((u) => u.memberSpecialty === specialtyFilter);
      if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || (u.memberSpecialty ?? '').toLowerCase().includes(q));
      return list;
    } catch {
      return [];
    }
  }, [user, users, projects, specialtyFilter, debouncedSearch]);

  const teamStats = useMemo(() => {
    const team = users.filter((u) => u.role === 'membre' || u.role === 'chef_de_projet');
    const byUser: Record<string, { total: number; done: number; active: number; review: number }> = {};
    projects.forEach((p) => {
      p.subtasks.forEach((st) => {
        if (!st.assignedToId) return;
        const rec = byUser[st.assignedToId] ?? { total: 0, done: 0, active: 0, review: 0 };
        rec.total += 1;
        if (st.status === 'done') rec.done += 1;
        if (st.status === 'in_progress') rec.active += 1;
        if (st.status === 'review') rec.review += 1;
        byUser[st.assignedToId] = rec;
      });
    });
    const activePersons = team.filter((u) => (byUser[u.id]?.active ?? 0) > 0).length;
    const reviewPersons = team.filter((u) => (byUser[u.id]?.review ?? 0) > 0).length;
    const activeTasks = team.reduce((acc, u) => acc + (byUser[u.id]?.active ?? 0), 0);
    const reviewTasks = team.reduce((acc, u) => acc + (byUser[u.id]?.review ?? 0), 0);
    return {
      byUser,
      activePersons,
      reviewPersons,
      activeTasks,
      reviewTasks,
      teamCount: team.length,
    };
  }, [users, projects]);

  if (!user) return null;
  if (!ready) return <AppShell><CardGridSkeleton cards={6} /></AppShell>;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleAddMember = () => {
    if (!form.name || !form.email || !form.password) return;
    addEmployee({
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      role: form.role,
      memberSpecialty: form.role === 'membre' ? form.memberSpecialty : undefined,
      avatarUrl: photoPreview,
    }, apiToken);
    setAddOpen(false);
    setForm({ name: '', email: '', password: '', phone: '', role: 'membre', memberSpecialty: 'Designer' });
    setPhotoPreview(undefined);
  };

  const handleAddPoste = () => {
    if (!posteName.trim()) return;
    addSpecialty(posteName);
    setSpecialtyFilter(posteName.trim());
    setPosteOpen(false);
    setPosteName('');
  };

  const stats = [
    { badge: 'Équipe', badgeCls: 'bg-primary/10 text-primary', value: teamStats.teamCount, label: 'membres & chefs de projet' },
    { badge: 'En activité', badgeCls: 'bg-success/10 text-success', value: teamStats.activePersons, label: 'membres avec des tâches en cours' },
    { badge: 'En révision', badgeCls: 'bg-warning/10 text-warning', value: teamStats.reviewPersons, label: 'membres avec des tâches en révision' },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-none">
            {user.role === 'admin' || user.role === 'chef_de_projet'
              ? 'Tous les membres de l’entreprise'
              : 'Tous les membres du projet'}<span className="text-primary"> ·</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {visibleUsers.length} membre{visibleUsers.length > 1 ? 's' : ''} affiché{visibleUsers.length > 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-col items-end gap-2">
            <Button onClick={() => setAddOpen(true)} className="rounded-full gap-1.5 shadow-[0_8px_20px_rgba(46,152,255,0.35)]">
              <UserPlus className="h-4 w-4" /> Ajouter un membre
            </Button>
            <Button
              variant="outline"
              onClick={() => setPosteOpen(true)}
              className="rounded-full gap-1.5 border-primary/25 bg-card text-foreground hover:bg-primary/5 hover:border-primary/40 shadow-[0_6px_18px_rgba(46,152,255,0.12)]"
            >
              <Briefcase className="h-4 w-4" /> Créer un poste
            </Button>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.badge} className="relative overflow-hidden rounded-xl bg-card border border-border shadow-sm p-6">
            <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
            <span className={cn('relative inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest', s.badgeCls)}>
              {s.badge}
            </span>
            <p className="relative mt-4 font-display text-5xl font-bold tracking-tight leading-none">{s.value}</p>
            <p className="relative mt-2.5 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-8">
        <div className="relative w-full lg:w-[560px] lg:shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            name="employee-search"
            placeholder="Rechercher une personne ou un poste…"
            className="w-full h-12 pl-12 pr-10 rounded-full bg-card border border-border/60 text-sm text-foreground caret-primary shadow-card outline-none placeholder:text-muted-foreground focus:border-primary/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="w-full sm:w-72 lg:w-auto lg:shrink-0">
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="h-12 rounded-full bg-card border border-border/60 px-5 gap-2 shadow-card">
              <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les postes</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s} value={s}>{specialtyMeta[s]?.label ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section membres */}
      {visibleUsers.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card border border-border shadow-sm text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucune personne trouvée.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-lg font-bold tracking-tight">Membres</h3>
              <span className="inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {visibleUsers.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">Cliquer sur une carte pour ouvrir le profil</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {visibleUsers.map((u, i) => {
                const stats = teamStats.byUser[u.id];
                const total = stats?.total ?? 0;
                const done = stats?.done ?? 0;
                const active = stats?.active ?? 0;
                const ratio = total ? done / total : 0;
                const filled = total ? Math.max(1, Math.round(ratio * 5)) : 0;
                const dotColor = ratio >= 0.75 ? 'bg-success' : ratio >= 0.4 ? 'bg-warning' : 'bg-destructive';
                return (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                  >
                    <Card
                      className="group relative cursor-pointer overflow-hidden p-6 hover:-translate-y-1 hover:shadow-soft-lg hover:border-border/80 transition-all duration-300"
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                      <div className="flex items-start gap-4">
                        <UserAvatar user={u} className="h-16 w-16 rounded-[20px] shadow-soft-lg flex-shrink-0" />
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="font-display font-semibold text-[15px] leading-tight truncate group-hover:text-primary transition-colors">{u.name}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <RoleBadge role={u.role} />
                            {(u.role === 'membre' || u.role === 'chef_de_projet') && u.memberSpecialty && (
                              <span className="inline-flex items-center rounded-full bg-muted/70 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                {specialtyMeta[u.memberSpecialty]?.label ?? u.memberSpecialty}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="relative flex items-center justify-center h-9 w-9 rounded-full border border-border/70 bg-muted/60 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 group-hover:bg-primary/5 flex-shrink-0 transition-all">
                          <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </span>
                      </div>

                      <div className="mt-5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Contacts</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <a
                            href={`mailto:${u.email}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 max-w-[200px] transition-colors"
                          >
                            <Mail className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{u.email}</span>
                          </a>
                          {u.phone && (
                            <a
                              href={`tel:${u.phone.replace(/\s/g, '')}`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                            >
                              <Phone className="h-3 w-3" /> {u.phone}
                            </a>
                          )}
                          {u.whatsapp && (
                            <a
                              href={`https://wa.me/${u.whatsapp.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                            >
                              <svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              {u.whatsapp}
                            </a>
                          )}
                        </div>
                      </div>

                      {(u.company || u.address) && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {u.company && (
                            <>
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{u.company}</span>
                            </>
                          )}
                          {u.company && u.address && <span className="text-muted-foreground/50">·</span>}
                          {u.address && (
                            <>
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{u.address}</span>
                            </>
                          )}
                        </p>
                      )}

                      <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Activité</span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <span
                                key={i}
                                className={cn('h-2 w-2 rounded-full transition-colors', i < filled ? (total > 0 ? dotColor : 'bg-border') : 'bg-border')}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {total ? `${done}/${total} terminée${done > 1 ? 's' : ''}${active > 0 ? ` · ${active} en cours` : ''}` : 'Aucune tâche'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Ajouter un membre et créer son compte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-1 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
              <KeyRound className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                En ajoutant un membre, vous créez son compte (email + mot de passe). Il pourra ensuite se connecter à la plateforme. Vous pouvez aussi définir manuellement sa spécialité.
              </p>
            </div>

            {/* Photo upload */}
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative group">
                  <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border bg-muted/30 flex items-center justify-center">
                    <img src={photoPreview} alt="Photo" className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(undefined)}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center transition-colors shadow-md"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="h-20 w-20 rounded-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Photo</span>
                </button>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">Photo de profil</p>
                <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG.</p>
                <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={() => photoInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> {photoPreview ? 'Changer la photo' : 'Télécharger'}
                </Button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emp-name">Nom complet *</Label>
                <Input id="emp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Marie Dupont" />
              </div>
              <div>
                <Label htmlFor="emp-email">Email *</Label>
                <Input id="emp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="marie@entreprise.com" />
              </div>
              <div>
                <Label htmlFor="emp-password">Mot de passe *</Label>
                <Input id="emp-password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mot de passe du compte" />
              </div>
              <div>
                <Label htmlFor="emp-phone">Téléphone</Label>
                <Input id="emp-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex: 06 12 34 56 78" />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as 'chef_de_projet' | 'membre' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membre">Membre du projet</SelectItem>
                    <SelectItem value="chef_de_projet">Chef de projet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'membre' && (
                <div>
                  <Label>Spécialité</Label>
                  <Select value={form.memberSpecialty} onValueChange={(v) => setForm({ ...form, memberSpecialty: v as MemberSpecialty })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => (
                        <SelectItem key={s} value={s}>{specialtyMeta[s]?.label ?? s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAddMember} disabled={!form.name || !form.email || !form.password}>
              <UserPlus className="h-4 w-4 mr-2" /> Créer & ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create poste dialog */}
      <Dialog open={posteOpen} onOpenChange={setPosteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Créer un poste
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              Le poste sera ajouté au filtre de l’équipe et pourra être attribué aux membres.
            </p>
            <div>
              <Label htmlFor="poste-name">Nom du poste *</Label>
              <Input
                id="poste-name"
                value={posteName}
                onChange={(e) => setPosteName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPoste(); }}
                placeholder="Ex: Commercial, Graphiste, Référent SEO…"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPosteOpen(false); setPosteName(''); }}>Annuler</Button>
            <Button onClick={handleAddPoste} disabled={!posteName.trim()}>
              <Briefcase className="h-4 w-4 mr-2" /> Créer le poste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    {/* Member detail dialog */}
      <MemberProfileDialog
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(o) => { if (!o) setSelectedUser(null); }}
        canEdit={user.role === 'admin'}
      />
    </AppShell>
  );
}