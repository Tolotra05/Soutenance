'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/lib/theme-provider';
import { useEffect, useState, useRef } from 'react';
import {
  Sun, Moon, UserCircle, Mail, Briefcase, LogOut, Phone,
  Building2, MapPin, Upload, X, Check, Pencil,
} from 'lucide-react';
import { useSession } from '@/lib/contexts/session-context';
import { useUsers } from '@/lib/contexts/users-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { FormSkeleton } from '@/components/shared/page-skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/shared/user-avatar';
import { RoleBadge } from '@/components/shared/badges';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { specialtyMeta } from '@/lib/status';
import type { MemberSpecialty } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, ready } = useAppReady();
  const { logout } = useSession();
  const { users, updateProfile, specialties } = useUsers();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', address: '', bio: '', memberSpecialty: '' as MemberSpecialty | '',
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const loaded = users.find((u) => u.id === user?.id);
    if (loaded) {
      setForm({
        name: loaded.name ?? '',
        email: loaded.email ?? '',
        phone: loaded.phone ?? '',
        company: loaded.company ?? '',
        address: loaded.address ?? '',
        bio: loaded.bio ?? '',
        memberSpecialty: loaded.memberSpecialty ?? '',
      });
    }
  }, [user?.id, users, editing]);

  if (!user) return null;
  if (!ready) return <AppShell><FormSkeleton /></AppShell>;

  const loaded = users.find((u) => u.id === user.id) ?? user;
  const showCompany = user.role === 'client';

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateProfile(user?.id, { avatarUrl: url });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleSave = () => {
    updateProfile(user?.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      address: form.address.trim(),
      bio: form.bio.trim(),
      memberSpecialty: form.memberSpecialty || undefined,
    });
    setEditing(false);
    toast({ title: 'Profil mis à jour', description: 'Vos informations ont été enregistrées.' });
  };

  const handleCancel = () => {
    setEditing(false);
    const u = users.find((x) => x.id === user.id) ?? user;
    setForm({
      name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '',
      company: u.company ?? '', address: u.address ?? '', bio: u.bio ?? '',
      memberSpecialty: u.memberSpecialty ?? '',
    });
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display text-2xl font-bold tracking-tight mb-6">Paramètres</h2>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
        {/* Profile */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" /> Profil
            </h3>
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="relative group">
              <UserAvatar user={loaded} size="xl" />
              {editing && (
                <>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    title="Changer la photo"
                  >
                    <Upload className="h-5 w-5" />
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </>
              )}
            </div>
            <div>
              <p className="font-semibold text-lg">{loaded.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={loaded.role} />
              </div>
            </div>
          </div>

          {!editing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" /> {loaded.email}
              </div>
              {loaded.phone && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" /> {loaded.phone}
                </div>
              )}
              {loaded.memberSpecialty && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" /> {specialtyMeta[loaded.memberSpecialty]?.label ?? loaded.memberSpecialty}
                </div>
              )}
              {loaded.company && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" /> {loaded.company}
                </div>
              )}
              {loaded.address && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {loaded.address}
                </div>
              )}
              {loaded.bio && (
                <p className="text-sm text-muted-foreground pt-2 border-t border-border">{loaded.bio}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="p-name">Nom complet</Label>
                  <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="p-email">Email</Label>
                  <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="p-phone">Téléphone</Label>
                  <Input id="p-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex: 06 12 34 56 78" />
                </div>
                {loaded.memberSpecialty !== undefined && user.role === 'membre' && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="p-specialty">Spécialité</Label>
                    <Select value={form.memberSpecialty || undefined} onValueChange={(v) => setForm({ ...form, memberSpecialty: v as MemberSpecialty })}>
                      <SelectTrigger id="p-specialty"><SelectValue placeholder="Choisir une spécialité" /></SelectTrigger>
                      <SelectContent>
                        {specialties.map((s) => (
                          <SelectItem key={s} value={s}>{specialtyMeta[s]?.label ?? s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {showCompany && (
                  <div>
                    <Label htmlFor="p-company">Entreprise</Label>
                    <Input id="p-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Ex: TechStart SAS" />
                  </div>
                )}
                <div>
                  <Label htmlFor="p-address">Adresse</Label>
                  <Input id="p-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ex: 12 Rue de la Paix, 75002 Paris" />
                </div>
              </div>
              <div>
                <Label htmlFor="p-bio">Bio</Label>
                <Textarea id="p-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Décrivez-vous en quelques mots..." rows={3} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} className="gap-1.5 bg-success hover:bg-success/90">
                  <Check className="h-3.5 w-3.5" /> Enregistrer
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1.5">
                  <X className="h-3.5 w-3.5" /> Annuler
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <h3 className="font-semibold mb-5">Apparence</h3>
          <p className="text-sm text-muted-foreground mb-4">Choisissez le thème de l’application.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
              className="h-20 flex-col gap-2"
            >
              <Sun className="h-5 w-5" /> Clair
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
              className="h-20 flex-col gap-2"
            >
              <Moon className="h-5 w-5" /> Sombre
            </Button>
          </div>
          {mounted && (
            <p className="text-xs text-muted-foreground mt-3">
              Thème actuel : {theme === 'dark' ? 'sombre' : 'clair'}
            </p>
          )}
        </Card>
      </div>

      {/* Session */}
      <Card className="p-6 mt-4 max-w-4xl">
        <h3 className="font-semibold mb-4">Session</h3>
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/5"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
        </Button>
      </Card>
    </AppShell>
  );
}