'use client';

import { memo, useRef, useState } from 'react';
import { Briefcase, CalendarDays, Send, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useProjects } from '@/lib/contexts/projects-context';
import type { Project, Priority } from '@/types';

/**
 * Self-contained "request a task" form for the client dashboard. Its local
 * state (form fields, photo preview) used to live directly in
 * DashboardPage, so every keystroke re-rendered the entire dashboard
 * (hero banner, stats, charts...). Extracted so typing here only re-renders
 * this card.
 */
export const DashboardRequestTaskForm = memo(function DashboardRequestTaskForm({ clientProjects }: { clientProjects: Project[] }) {
  const { requestTask } = useProjects();
  const [reqForm, setReqForm] = useState<{ projectId: string; title: string; description: string; priority: Priority; besoinDate: string }>({
    projectId: '', title: '', description: '', priority: 'medium', besoinDate: '',
  });
  const [reqPhoto, setReqPhoto] = useState<{ url: string; name: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReqPhoto({ url: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  };

  const handleRequestTask = () => {
    const pid = reqForm.projectId || clientProjects[0]?.id || '';
    if (!pid || !reqForm.title.trim()) return;
    requestTask(pid, {
      title: reqForm.title,
      description: reqForm.description,
      priority: reqForm.priority,
      besoinDate: reqForm.besoinDate || null,
      photoUrl: reqPhoto?.url ?? null,
      photoName: reqPhoto?.name ?? null,
    });
    setReqForm((f) => ({ ...f, projectId: pid, title: '', description: '', priority: 'medium', besoinDate: '' }));
    setReqPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    toast({ title: 'Demande envoyée', description: 'Votre demande de tâche sera examinée par l\'équipe.' });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">Demander une tâche</h3>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium">Projet concerné *</Label>
          <Select
            value={reqForm.projectId || clientProjects[0]?.id || ''}
            onValueChange={(v) => setReqForm((f) => ({ ...f, projectId: v }))}
          >
            <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {clientProjects.length === 0 && <SelectItem value="_none" disabled>Aucun projet</SelectItem>}
              {clientProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium">Titre de la tâche *</Label>
          <Input
            className="mt-1"
            value={reqForm.title}
            onChange={(e) => setReqForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="ex. Ajouter un module de paiement"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Description</Label>
          <Textarea
            className="mt-1 resize-none"
            rows={3}
            value={reqForm.description}
            onChange={(e) => setReqForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Décrivez votre besoin..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date de nécessité</Label>
            <Input
              type="date"
              className="mt-1"
              value={reqForm.besoinDate}
              onChange={(e) => setReqForm((f) => ({ ...f, besoinDate: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Priorité</Label>
            <Select value={reqForm.priority} onValueChange={(v) => setReqForm((f) => ({ ...f, priority: v as Priority }))}>
              <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Basse</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          {reqPhoto ? (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
              <img src={reqPhoto.url} alt="aperçu" className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{reqPhoto.name}</p>
                <button type="button" className="text-[11px] text-destructive hover:underline" onClick={() => { setReqPhoto(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}>
                  Retirer la photo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border py-3 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
            >
              <Upload className="h-4 w-4" />
              <span className="text-xs font-medium">Ajouter une photo (optionnel)</span>
            </button>
          )}
        </div>
        <Button className="w-full" onClick={handleRequestTask} disabled={!reqForm.title.trim() || clientProjects.length === 0}>
          <Send className="h-4 w-4 mr-2" /> Envoyer la demande
        </Button>
      </div>
    </Card>
  );
});
