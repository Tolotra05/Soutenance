'use client';

import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Send, FolderKanban, ListTodo, MessageSquareQuote,
  Paperclip, Upload, CheckCircle2, Clock, FileText,
} from 'lucide-react';
import { useProjects } from '@/lib/contexts/projects-context';
import { useUsers } from '@/lib/contexts/users-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { ListRowsSkeleton } from '@/components/shared/page-skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { getUser, formatDateTime } from '@/lib/status';
import type { Attachment } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function RequetesPage() {
  const { user, ready } = useAppReady();
  const { projects, submitRequete, answerRequete } = useProjects();
  const { users } = useUsers();

  const [projectId, setProjectId] = useState('');
  const [subtaskId, setSubtaskId] = useState('');
  const [content, setContent] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerAttachment, setAnswerAttachment] = useState<Attachment | null>(null);
  const answerRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const accessibleProjects = useMemo(() => {
    if (!user) return [];
    return projects.filter((p) => {
      if (user.role === 'admin' || user.role === 'chef_de_projet') return true;
      if (user.role === 'client') return p.clientId === user.id;
      return p.members.some((m) => m.userId === user.id);
    });
  }, [user, projects]);

  const formProjects = useMemo(() => accessibleProjects.filter((p) => p.status !== 'pending' && p.status !== 'rejected'), [accessibleProjects]);
  const selectedProject = projects.find((p) => p.id === projectId);

  const list = useMemo(() => {
    if (!user) return [];
    return accessibleProjects
      .flatMap((p) => p.requetes.map((r) => ({ requete: r, project: p })))
      .sort((a, b) => b.requete.createdAt.localeCompare(a.requete.createdAt));
  }, [user, accessibleProjects]);

  if (!user) return null;
  if (!ready) return <AppShell><ListRowsSkeleton rows={6} /></AppShell>;

  const handleSubmit = () => {
    if (!projectId || !content.trim()) return;
    submitRequete(projectId, { subtaskId: subtaskId || null, content });
    const proj = projects.find((p) => p.id === projectId);
    toast({ title: 'Requête envoyée', description: `Votre requête a été transmise au client de « ${proj?.title ?? ''} ».` });
    setProjectId('');
    setSubtaskId('');
    setContent('');
  };

  const clearAnswerInput = (requeteId: string) => {
    const el = answerRefs.current[requeteId];
    if (el) el.value = '';
  };

  const handleAnswerFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const att: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        url: String(reader.result),
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
      };
      setAnswerAttachment(att);
    };
    reader.readAsDataURL(file);
  };

  const handleAnswer = (projectId: string, requeteId: string) => {
    answerRequete(projectId, requeteId, { text: answerText, attachment: answerAttachment });
    toast({ title: 'Réponse envoyée', description: 'Votre réponse a été transmise à l’équipe.' });
    setAnsweringId(null);
    setAnswerText('');
    setAnswerAttachment(null);
    clearAnswerInput(requeteId);
  };

  const isTeam = user.role !== 'client';
  const pendingForMe = list.filter(({ requete, project }) => requete.status === 'pending' && project.clientId === user.id);

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">Requêtes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {user.role === 'client'
            ? `Les requêtes demandées par l’équipe — ${pendingForMe.length > 0 ? `${pendingForMe.length} en attente de votre réponse.` : 'aucune requête en attente.'}`
            : 'Envoyez une requête au client (photo, fichier, information) et suivez ses réponses.'}
        </p>
      </motion.div>

      {isTeam && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Envoyer une requête au client</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Précisez le projet concerné, éventuellement la sous-tâche, puis rédigez votre demande.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs">Projet concerné *</Label>
              <Select value={projectId} onValueChange={(v) => { setProjectId(v); setSubtaskId(''); }}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                <SelectContent>
                  {formProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sous-tâche concernée (optionnel)</Label>
              <Select value={subtaskId} onValueChange={setSubtaskId} disabled={!selectedProject || selectedProject.subtasks.length === 0}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder={selectedProject?.subtasks.length ? 'Sélectionner une sous-tâche' : 'Aucune sous-tâche'} /></SelectTrigger>
                <SelectContent>
                  {selectedProject?.subtasks.map((st) => (
                    <SelectItem key={st.id} value={st.id}>{st.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subtaskId && <button type="button" onClick={() => setSubtaskId('')} className="text-[11px] text-muted-foreground underline mt-1">Retirer la sous-tâche</button>}
            </div>
          </div>
          <div className="mb-4">
            <Label className="text-xs">Votre requête au client *</Label>
            <Textarea
              className="mt-1.5"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ex : Pouvez-vous nous envoyer une photo du local commercial actuel ? / Merci de transmettre le numéro de TVA de votre société."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!projectId || !content.trim()} className="gap-1.5">
              <Send className="h-4 w-4" /> Envoyer la requête
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          {user.role === 'client' ? 'Requêtes demandées par l’équipe' : 'Requêtes envoyées'}
          <span className="text-xs font-medium text-muted-foreground tabular-nums">({list.length})</span>
        </h3>
      </div>

      {list.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground rounded-[24px]">
          <MessageSquareQuote className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune requête pour le moment.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map(({ requete, project }) => {
            const requester = getUser(users, requete.createdById);
            const subtask = requete.subtaskId ? project.subtasks.find((st) => st.id === requete.subtaskId) : null;
            const isMine = requete.createdById === user.id;
            const canAnswer = user.role === 'client' && project.clientId === user.id && requete.status === 'pending';
            const isAnswering = answeringId === requete.id;
            return (
              <motion.div key={requete.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={cn('p-5', requete.status === 'pending' ? 'border-warning/30' : 'border-success/30')}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      {requester && <UserAvatar user={requester} size="md" className="flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{requete.createdByName}</p>
                          {isMine && <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">votre requête</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate font-medium">{project.title}</span>
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{formatDateTime(requete.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('flex-shrink-0', requete.status === 'pending' ? 'bg-warning/15 text-warning border-warning/30' : 'bg-success/15 text-success border-success/30')}>
                      {requete.status === 'pending' ? 'En attente de réponse' : 'Répondu'}
                    </Badge>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-[11px] font-semibold text-primary mb-1.5">Requête</p>
                    <p className="text-sm font-medium text-foreground">{requete.content}</p>
                  </div>

                  {requete.subtaskId && (
                    <Badge variant="outline" className="mt-3 gap-1.5 text-[11px] text-muted-foreground">
                      <ListTodo className="h-3 w-3" /> sous-tâche « {subtask?.title ?? 'supprimée'} »
                    </Badge>
                  )}

                  {requete.response ? (
                    <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
                      <p className="text-[11px] font-semibold text-success mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Réponse du client — {formatDateTime(requete.response.at)}
                      </p>
                      {requete.response.text && <p className="text-sm text-foreground">{requete.response.text}</p>}
                      {requete.response.attachmentName && (
                        <a
                          href={requete.response.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-success hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" /> {requete.response.attachmentName}
                        </a>
                      )}
                    </div>
                  ) : canAnswer ? (
                    <div className="mt-4">
                      {!isAnswering ? (
                        <Button size="sm" onClick={() => { setAnsweringId(requete.id); setAnswerText(''); setAnswerAttachment(null); }} className="gap-1.5">
                          <Send className="h-3.5 w-3.5" /> Répondre
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Votre réponse *</Label>
                            <Textarea
                              className="mt-1.5"
                              rows={3}
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="Ex : Voici le document demandé, vous trouverez la pièce jointe ci-dessous."
                            />
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <input
                              ref={(el) => { answerRefs.current[requete.id] = el; }}
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAnswerFile(file);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => answerRefs.current[requete.id]?.click()}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              {answerAttachment ? answerAttachment.fileName : 'Joindre un fichier / une photo'}
                            </Button>
                            {answerAttachment && (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                                <Paperclip className="h-3.5 w-3.5" /> {answerAttachment.fileName}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="gap-1.5 bg-success hover:bg-success/90" onClick={() => handleAnswer(project.id, requete.id)} disabled={!answerText.trim() && !answerAttachment}>
                              <Send className="h-3.5 w-3.5" /> Envoyer la réponse
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setAnsweringId(null); setAnswerText(''); setAnswerAttachment(null); clearAnswerInput(requete.id); }}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    canAnswer === false && requete.status === 'pending' && (
                      <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> En attente de la réponse du client.
                      </p>
                    )
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}