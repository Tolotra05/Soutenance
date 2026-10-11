'use client';

import { useState, useEffect } from 'react';
import {
  Mail, Phone, Building2, MapPin, Pencil, Check, X, KeyRound, FolderKanban, ListTodo,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/shared/user-avatar';
import { specialtyMeta, formatCurrency, projectStatusMeta, subtaskStatusMeta } from '@/lib/status';
import { useUsers } from '@/lib/contexts/users-context';
import { useProjects } from '@/lib/contexts/projects-context';
import { useSession } from '@/lib/contexts/session-context';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { User, Role, MemberSpecialty } from '@/types';

const roleLabel: Record<Role, string> = {
  admin: 'Admin',
  chef_de_projet: 'Chef de projet',
  membre: 'Membre',
  client: 'Client',
};

interface MemberProfileDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
}

export function MemberProfileDialog({ user, open, onOpenChange, canEdit = false }: MemberProfileDialogProps) {
  const { users, updateUser, specialties } = useUsers();
  const { projects } = useProjects();
  const { currentUser } = useSession();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', address: '', bio: '',
    role: 'membre' as Role, memberSpecialty: '' as MemberSpecialty | '', password: '',
  });

  useEffect(() => {
    if (open && user) {
      setEditing(false);
      setForm({
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        company: user.company ?? '',
        address: user.address ?? '',
        bio: user.bio ?? '',
        role: user.role,
        memberSpecialty: user.memberSpecialty ?? '',
        password: '',
      });
    }
  }, [open, user]);

  const fresh = open ? (users.find((u) => u.id === user?.id) ?? user) : null;
  const view: User | undefined = fresh ?? user ?? undefined;

  const memberProjects = (fresh ? projects.filter((p) =>
    fresh.role === 'client'
      ? p.clientId === fresh.id
      : p.members.some((m) => m.userId === fresh.id) || p.managerId === fresh.id
  ) : []);

  const assignedTasks = fresh && fresh.role !== 'client'
    ? memberProjects.flatMap((p) => p.subtasks.filter((st) => st.assignedToId === fresh.id).map((task) => ({ task, project: p })))
    : [];

  const doneTasks = assignedTasks.filter((r) => r.task.status === 'done').length;
  const activeTasks = assignedTasks.filter((r) => r.task.status === 'in_progress' || r.task.status === 'review').length;
  const avgProgress = assignedTasks.length
    ? Math.round(assignedTasks.reduce((acc, r) => acc + r.task.progress, 0) / assignedTasks.length)
    : 0;

  const clientProjects = fresh && fresh.role === 'client' ? memberProjects : [];
  const totalBudget = clientProjects.reduce((acc, p) => acc + p.budget, 0);
  const pendingMods = clientProjects.reduce((acc, p) => acc + p.modifications.filter((m) => m.status === 'pending' || m.status === 'pending_client').length, 0);
  const clientAvgProgress = clientProjects.length
    ? Math.round(clientProjects.reduce((acc, p) => acc + p.progress, 0) / clientProjects.length)
    : 0;

  const isClient = fresh?.role === 'client';
  const stats = fresh ? (isClient ? [
    { label: 'Projets', value: clientProjects.length },
    { label: 'Budget', value: formatCurrency(totalBudget) },
    { label: 'Progression', value: `${clientAvgProgress}%` },
    { label: 'Modifs en attente', value: pendingMods },
  ] : [
    { label: 'Projets', value: memberProjects.length },
    { label: 'Tâches assignées', value: assignedTasks.length },
    { label: 'Terminées', value: doneTasks },
    { label: 'En cours', value: activeTasks },
  ]) : [];

  const editable = canEdit && !!view && (view.role === 'membre' || view.role === 'chef_de_projet' || isClient);

  const handleSave = () => {
    if (!user) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: 'Champs requis', description: 'Le nom et l\u2019email sont obligatoires.', variant: 'destructive' });
      return;
    }
    updateUser(currentUser?.role, user.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      company: form.company.trim() || undefined,
      address: form.address.trim() || undefined,
      bio: form.bio.trim() || undefined,
      role: form.role,
      memberSpecialty: form.role === 'membre' && form.memberSpecialty ? (form.memberSpecialty as MemberSpecialty) : undefined,
      password: form.password.trim() || undefined,
    });
    setEditing(false);
    toast({ title: 'Profil mis à jour', description: 'Les informations du profil ont été enregistrées.' });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); setEditing(false); } }}>
      <DialogContent className="max-w-xl sm:rounded-[28px] border-0 p-0 gap-0 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <DialogTitle className="sr-only">Profil de {view?.name}</DialogTitle>

        {!view ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Profil introuvable.</p>
        ) : (
          <div className="relative max-h-[85vh] overflow-y-auto scrollbar-thin">
            {/* Halo lumineux */}
            <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            {/* Identité */}
            <div className="relative p-8 pb-4">
              <div className="flex items-start gap-5">
                <UserAvatar
                  user={view}
                  size="xl"
                  className="h-24 w-24 rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                />
                <div className="min-w-0 flex-1 pt-1">
                  <p className="font-display text-2xl font-bold tracking-tight leading-tight truncate">{view.name}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {roleLabel[view.role]}
                    </span>
                    {view.memberSpecialty && (
                      <span className="inline-flex items-center rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                        {specialtyMeta[view.memberSpecialty]?.label ?? view.memberSpecialty}
                      </span>
                    )}
                  </div>
                  {editable && !editing && (
                    <Button size="sm" className="h-8 rounded-full px-4 mt-4" onClick={() => setEditing(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
                    </Button>
                  )}
                </div>
              </div>

              {view.bio && (
                <p className="mt-6 text-sm text-muted-foreground leading-relaxed max-w-md">{view.bio}</p>
              )}

              {/* Coordonnées en capsules */}
              <div className="mt-6 flex flex-wrap gap-2">
                {view.email && (
                  <a href={`mailto:${view.email}`} className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                    <Mail className="h-3.5 w-3.5" /> <span className="truncate max-w-[220px]">{view.email}</span>
                  </a>
                )}
                {view.phone && (
                  <a href={`tel:${view.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                    <Phone className="h-3.5 w-3.5" /> {view.phone}
                  </a>
                )}
                {view.whatsapp && (
                  <a href={`https://wa.me/${view.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {view.whatsapp}
                  </a>
                )}
                {view.company && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> {view.company}
                  </span>
                )}
                {view.address && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {view.address}
                  </span>
                )}
              </div>
            </div>

            {/* Statistiques minimales */}
            {stats.length > 0 && (
              <div className="relative px-8 py-4">
                <div className="grid grid-cols-4 gap-2">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-[20px] bg-muted py-4 px-2 text-center min-w-0">
                      <p className="font-display text-xl font-bold truncate">{s.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Carte sombre d'activité */}
            <div className="relative px-8 pb-8 pt-2">
              <div className="rounded-[28px] bg-[#2D2D2D] text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-display font-semibold text-[15px]">
                    {isClient ? 'Vos projets' : 'Tâches récentes'}
                  </h4>
                  <span className="inline-flex items-center rounded-full bg-[#2E98FF] px-3 py-1 text-[11px] font-semibold text-white">
                    {isClient ? `${clientAvgProgress}%` : `${avgProgress}%`}
                  </span>
                </div>

                {isClient ? (
                  clientProjects.length === 0 ? (
                    <p className="text-white/50 text-sm py-6 text-center">Aucun projet pour l’instant.</p>
                  ) : clientProjects.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-3 border-b border-white/[0.08] last:border-0">
                      <span className="flex items-center justify-center h-9 w-9 rounded-full bg-white/10 text-white/60 flex-shrink-0">
                        <FolderKanban className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-[11px] text-white/50 mt-0.5 truncate">
                          {projectStatusMeta[p.status]?.label} · {formatCurrency(p.budget)}
                        </p>
                      </div>
                      <div className="w-24 flex-shrink-0">
                        <div className="h-1.5 rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[#2E98FF]" style={{ width: `${p.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : assignedTasks.length === 0 ? (
                  <p className="text-white/50 text-sm py-6 text-center">Aucune tâche assignée pour l’instant.</p>
                ) : assignedTasks.slice(0, 4).map((r) => {
                  const done = r.task.status === 'done';
                  return (
                    <div key={r.task.id} className="flex items-center gap-3 py-3 border-b border-white/[0.08] last:border-0">
                      <span className={cn('flex items-center justify-center h-9 w-9 rounded-full flex-shrink-0', done ? 'bg-[#2E98FF] text-white' : 'bg-white/10 text-white/50')}>
                        {done ? <Check className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.task.title}</p>
                        <p className="text-[11px] text-white/50 mt-0.5 truncate">
                          {subtaskStatusMeta[r.task.status]?.label} · {r.project.title}
                        </p>
                      </div>
                      {!done && (
                        <div className="w-24 flex-shrink-0">
                          <div className="h-1.5 rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-[#2E98FF]" style={{ width: `${r.task.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mode édition */}
            {editing && (
              <div className="relative px-8 pb-8">
                <div className="rounded-[24px] bg-muted p-5 space-y-4">
                  <div className="flex items-start gap-2 -mt-1">
                    <KeyRound className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Vous pouvez modifier les informations de ce profil. Laissez le mot de passe vide pour ne pas le changer.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Nom complet *</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    {!isClient && (
                      <>
                        <div>
                          <Label>Rôle</Label>
                          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="membre">Membre</SelectItem>
                              <SelectItem value="chef_de_projet">Chef de projet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {form.role === 'membre' && (
                          <div>
                            <Label>Spécialité</Label>
                            <Select value={form.memberSpecialty || undefined} onValueChange={(v) => setForm({ ...form, memberSpecialty: v as MemberSpecialty })}>
                              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                              <SelectContent>
                                {specialties.map((s) => (
                                  <SelectItem key={s} value={s}>{specialtyMeta[s]?.label ?? s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <Label>Téléphone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex: 06 12 34 56 78" />
                    </div>
                    <div>
                      <Label>{isClient ? 'Entreprise' : 'Entreprise'}</Label>
                      <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Ex: TechStart SAS" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Adresse</Label>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ex: 12 Rue de la Paix, 75002 Paris" />
                    </div>
                    {!isClient && (
                      <div className="sm:col-span-2">
                        <Label>Mot de passe (laissez vide pour ne pas changer)</Label>
                        <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Nouveau mot de passe" />
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <Label>Bio</Label>
                      <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(false)}>
                    <X className="h-3.5 w-3.5 mr-1.5" /> Annuler
                  </Button>
                  <Button size="sm" className="rounded-full" onClick={handleSave}>
                    <Check className="h-3.5 w-3.5 mr-1.5" /> Enregistrer
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}