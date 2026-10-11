'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, CheckCircle2, Paperclip, X, Image as ImageIcon,
  Upload, FileText,
} from 'lucide-react';
import { useProjects } from '@/lib/contexts/projects-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { FormSkeleton } from '@/components/shared/page-skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/shared/date-picker';
import { ProgressBar } from '@/components/shared/progress';
import { cn } from '@/lib/utils';
import type { Priority, Attachment } from '@/types';

const priorityConfig: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  low:    { label: 'Basse',   color: 'text-muted-foreground',   bg: 'bg-muted',             dot: 'bg-muted-foreground' },
  medium: { label: 'Moyenne', color: 'text-info',               bg: 'bg-info/10',           dot: 'bg-info' },
  high:   { label: 'Haute',   color: 'text-warning',            bg: 'bg-warning/10',        dot: 'bg-warning' },
  urgent: { label: 'Urgente', color: 'text-destructive',        bg: 'bg-destructive/10',    dot: 'bg-destructive' },
};

export default function SubmitProjectPage() {
  const { user, ready } = useAppReady();
  const { submitProject } = useProjects();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    priority: 'medium' as Priority,
    startDate: '',
    endDate: '',
  });
  const [platformUsers, setPlatformUsers] = useState<string[]>([]);
  const [platformUserInput, setPlatformUserInput] = useState('');
  const [desiredFeatures, setDesiredFeatures] = useState<string[]>([]);
  const [necessaryPages, setNecessaryPages] = useState<string[]>([]);
  const [plannedFeatures, setPlannedFeatures] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined);

  if (!user) return null;
  if (!ready) return <AppShell><FormSkeleton /></AppShell>;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const att: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        fileType: file.type,
        url: URL.createObjectURL(file),
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
      };
      setAttachments((prev) => [...prev, att]);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    setLogoUrl(url);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const addPlatformUser = () => {
    const value = platformUserInput.trim();
    if (!value) return;
    if (platformUsers.some((u) => u.toLowerCase() === value.toLowerCase())) return;
    setPlatformUsers((prev) => [...prev, value]);
    setPlatformUserInput('');
  };

  const removePlatformUser = (value: string) => {
    setPlatformUsers((prev) => prev.filter((u) => u !== value));
  };

  const removeLogo = () => {
    setLogoUrl(undefined);
    setLogoPreview(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.startDate || !form.endDate) return;
    submitProject({
      title: form.title,
      description: form.description,
      category: form.category || 'Non catégorisé',
      budget: parseInt(form.budget) || 0,
      priority: form.priority,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      logoUrl,
      attachments,
      platformUsers: platformUsers.join('\n'),
      desiredFeatures: desiredFeatures.join(', '),
      necessaryPages: necessaryPages.join(', '),
      plannedFeatures: plannedFeatures.join(', '),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AppShell>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center py-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-success/10 mb-6"
          >
            <CheckCircle2 className="h-10 w-10 text-success" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold mb-2">Projet soumis avec succès !</h2>
          <p className="text-muted-foreground mb-6">
            Votre projet « {form.title} » a été envoyé. Un administrateur l’examinera et vous recevrez une notification dès qu’il sera validé.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push('/dashboard')}>Retour au dashboard</Button>
            <Button variant="outline" onClick={() => {
              setSubmitted(false);
              setForm({ title: '', description: '', category: '', budget: '', priority: 'medium', startDate: '', endDate: '' });
              setPlatformUsers([]);
              setPlatformUserInput('');
              setDesiredFeatures([]);
              setNecessaryPages([]);
              setPlannedFeatures([]);
              setAttachments([]);
              setLogoUrl(undefined);
              setLogoPreview(undefined);
            }}>
              Soumettre un autre
            </Button>
          </div>
        </motion.div>
      </AppShell>
    );
  }

  const fileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const completion = Math.min(100, Math.round((
    [
      form.title, form.description, form.startDate, form.endDate, form.budget, form.category,
      (platformUsers.length > 0 ? 'x' : ''),
      (desiredFeatures.length > 0 ? 'x' : ''),
      (necessaryPages.length > 0 ? 'x' : ''),
      (plannedFeatures.length > 0 ? 'x' : ''),
    ].filter(Boolean).length / 10
  ) * 100));

  const postSteps = [
    { title: 'Examen par l’administrateur', desc: 'Votre projet est analysé, puis validé ou rejeté avec un motif.' },
    { title: 'Notification de la décision', desc: 'Vous êtes averti dès que l’examen est terminé.' },
    { title: 'Assignation d’un chef de projet', desc: 'Un chef pilote ensuite la réalisation du projet.' },
    { title: 'Suivi de l’avancement', desc: 'Consultez le planning, les tâches et les rapports en temps réel.' },
  ];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Soumettre un nouveau projet</h2>
          <p className="text-muted-foreground mb-6">Décrivez votre projet en détail. Un administrateur l’examinera avant validation.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Card className="p-6 lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Logo section */}
            <div>
              <Label>Logo du projet (facultatif)</Label>
              <div className="mt-2 flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative group">
                    <div className="h-20 w-20 rounded-xl border-2 border-border overflow-hidden bg-muted/30 flex items-center justify-center">
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-md"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="h-20 w-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Logo</span>
                  </button>
                )}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Ajoutez un logo pour personnaliser votre projet. Formats acceptés: PNG, JPG, SVG.
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> {logoPreview ? 'Changer le logo' : 'Télécharger un logo'}
                  </Button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Titre du projet *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Plateforme E-commerce" required />
            </div>

            <div>
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez vos besoins, vos objectifs, les fonctionnalités attendues..." rows={5} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Catégorie</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: E-commerce, Site vitrine..." />
              </div>
              <div>
                <Label htmlFor="budget">Budget (€)</Label>
                <Input id="budget" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="Ex: 30000" />
              </div>
            </div>

            <div>
              <Label htmlFor="platformUsers">Utilisateurs de la plateforme</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  id="platformUsers"
                  value={platformUserInput}
                  onChange={(e) => setPlatformUserInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPlatformUser(); } }}
                  placeholder="Ex: Administrateurs"
                />
                <Button type="button" variant="outline" onClick={addPlatformUser} disabled={!platformUserInput.trim()}>
                  Ajouter
                </Button>
              </div>
              {platformUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {platformUsers.map((u) => (
                    <span
                      key={u}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {u}
                      <button
                        type="button"
                        onClick={() => removePlatformUser(u)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Retirer ${u}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">Ajoutez un à un les types d’utilisateurs qui utiliseront votre plateforme (Ex: Clients, livreurs, gestionnaires de stock…).</p>
            </div>

            <div>
              <ChipListInput
                id="desiredFeatures"
                label="Fonctionnalités souhaitées"
                values={desiredFeatures}
                onChange={setDesiredFeatures}
                placeholder="Ex: Catalogue produits"
                helper="Tapez un élément puis une virgule pour l'ajouter (Ex: panier, paiement en ligne, espace client…)."
              />
            </div>

            <div>
              <ChipListInput
                id="necessaryPages"
                label="Pages nécessaires pour le projet"
                values={necessaryPages}
                onChange={setNecessaryPages}
                placeholder="Ex: Accueil"
                helper="Ajoutez chaque page en la séparant par une virgule (Ex: Catalogue, Fiche produit, Panier, Checkout…)."
              />
            </div>

            <div>
              <ChipListInput
                id="plannedFeatures"
                label="Fonctionnalités prévues"
                values={plannedFeatures}
                onChange={setPlannedFeatures}
                placeholder="Ex: Gestion multi-boutique"
                helper="Ajoutez vos éléments séparés par des virgules pour les voir s'afficher en liste."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Date de début souhaitée *</Label>
                <DatePicker
                  value={form.startDate}
                  onChange={(date) => setForm({ ...form, startDate: date })}
                  placeholder="Choisir une date de début"
                />
              </div>
              <div>
                <Label>Date de fin souhaitée *</Label>
                <DatePicker
                  value={form.endDate}
                  onChange={(date) => setForm({ ...form, endDate: date })}
                  placeholder="Choisir une date de fin"
                  minDate={form.startDate || undefined}
                />
              </div>
            </div>

            <div>
              <Label>Priorité</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                {(Object.keys(priorityConfig) as Priority[]).map((key) => {
                  const config = priorityConfig[key];
                  const isActive = form.priority === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, priority: key })}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                        isActive
                          ? cn(config.bg, config.color, 'border-transparent shadow-sm ring-2 ring-current/20')
                          : 'border-border text-muted-foreground hover:bg-muted/30',
                      )}
                    >
                      <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', config.dot)} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attachments section */}
            <div>
              <Label>Pièces jointes</Label>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl py-6 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                >
                  <Paperclip className="h-6 w-6" />
                  <span className="text-sm font-medium">Cliquez pour ajouter des fichiers</span>
                  <span className="text-xs">PDF, images, documents... (glissez-déposez ou sélectionnez)</span>
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} />
              </div>

              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2 overflow-hidden"
                  >
                    {attachments.map((att) => (
                      <motion.div
                        key={att.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          {fileIcon(att.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">{(att.fileType || 'fichier')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" size="lg">
                <Send className="h-4 w-4 mr-2" /> Soumettre le projet
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Après la soumission</h3>
            <ol className="space-y-4">
              {postSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Complétude du formulaire</h3>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="text-muted-foreground">Champs renseignés</span>
              <span className="font-bold">{completion}%</span>
            </div>
            <ProgressBar
              value={completion}
              indicatorClassName={completion < 50 ? 'bg-warning' : completion < 90 ? 'bg-info' : 'bg-success'}
            />
            {completion === 100 && (
              <p className="text-xs text-success font-medium mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Tout est prêt, vous pouvez soumettre !
              </p>
            )}
          </Card>
        </div>
        </div>
      </div>
    </AppShell>
  );
}

interface ChipListInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  helper?: string;
}

function ChipListInput({ id, label, values, onChange, placeholder, helper }: ChipListInputProps) {
  const [draft, setDraft] = useState('');

  const commitDraft = () => {
    const parts = draft.split(',');
    if (parts.every((p) => !p.trim())) { setDraft(''); return; }
    const next = [...values];
    parts.forEach((p) => {
      const v = p.trim();
      if (!v) return;
      if (!next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v);
    });
    onChange(next);
    setDraft('');
  };

  const removeChip = (chip: string) => onChange(values.filter((v) => v !== chip));

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === ',' || e.key === 'Enter') {
              e.preventDefault();
              commitDraft();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
            const next = [...values];
            parts.forEach((v) => { if (!next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v); });
            onChange(next);
          }}
          onBlur={commitDraft}
          placeholder={placeholder}
        />
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="group inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              {v}
              <button
                type="button"
                onClick={() => removeChip(v)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Retirer ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {helper && <p className="text-xs text-muted-foreground mt-1.5">{helper}</p>}
    </div>
  );
}
