'use client';

import { useState, useRef, useMemo, lazy, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const GanttChart = lazy(() => import('@/components/shared/gantt-chart').then(m => ({ default: m.GanttChart })));
const ProgressChart = lazy(() => import('@/components/shared/progress-chart').then(m => ({ default: m.ProgressChart })));
const KanbanBoard = lazy(() => import('@/components/shared/kanban-board').then(m => ({ default: m.KanbanBoard })));
const SubtaskDetailDialog = lazy(() => import('@/components/shared/subtask-detail-dialog').then(m => ({ default: m.SubtaskDetailDialog })));
import {
  ArrowLeft, Calendar, Euro, Users, FolderKanban, BarChart3,
  MessageSquare, GanttChartSquare, Info, UserCircle, CalendarDays, MapPin, Clock,
  CheckCircle2, XCircle, UserCog, Plus, UserPlus, Undo2,
  FileText, Image as ImageIcon, Edit3, AlertCircle,
  Check, Trash2, Download, Eye, Lock, Paperclip, Send, ListTodo, ShieldCheck,
  Phone, Mail, Building2, User as UserIcon, CalendarClock, ArrowUpRight,
  LayoutGrid, List, Upload,
  ClipboardCheck,
} from 'lucide-react';
import { useProjects } from '@/lib/contexts/projects-context';
import { useUsers } from '@/lib/contexts/users-context';
import { useSession } from '@/lib/contexts/session-context';
import { useAppReady } from '@/hooks/use-app-ready';
import { AppShell } from '@/components/shared/app-shell';
import { ProjectDetailSkeleton } from '@/components/shared/page-skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  StatusBadge, PriorityBadge, SubtaskStatusBadge, RoleBadge,
} from '@/components/shared/badges';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ModRequestCard } from '@/components/shared/mod-request-card';
import { MemberProfileDialog } from '@/components/shared/member-profile-dialog';
import { ProjectCalendar } from '@/components/shared/project-calendar';
import { ProgressBar, ProgressRing } from '@/components/shared/progress';
import { StatCard } from '@/components/shared/stat-card';
import {
  getUser, formatDate, formatDateTime, formatCurrency, daysBetween,
  specialtyMeta, subtaskStatusMeta, priorityMeta, computeProgressTimeline,
} from '@/lib/status';
import type { Priority, ModificationRequest, Role, Subtask, MemberSpecialty, User, TaskRequest } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function ProjectDetailPage() {
  const { user, ready } = useAppReady();
  const {
    projects, validateProject, rejectProject, assignManager, revertProjectValidation,
    addSubtask, addProjectMember, removeProjectMember, reviewModification,
    requestTask, reviewTaskRequest,
    suggestModification, approveSubtask, addSubtaskComment, addSubtaskAttachment,
    validateSubtaskAttachment,
    updateSubtaskStatus, updateSubtaskProgress,
    scheduleClientMeeting,
    addProjectAttachment,
  } = useProjects();
  const {
    users,
    addEmployee: addEmployeeFromContext,
    specialties,
  } = useUsers();
  const { apiToken } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') as string | null;
  const projectId = params?.id as string;
  const project = projects.find((p) => p.id === projectId);

  const [activeTab, setActiveTab] = useState<string>(initialTab && ['info', 'gantt', 'progress', 'calendar', 'tasks', 'team', 'modifications'].includes(initialTab) ? initialTab : 'info');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revertOpen, setRevertOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState('');
  const [newSubtaskOpen, setNewSubtaskOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    title: '', description: '', priority: 'medium' as Priority,
    assignedToId: '', startDate: '', dueDate: '', dependsOnId: '',
  });
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    existingUserId: '', role: 'membre' as Role,
    createNew: false, name: '', email: '', password: '', specialty: 'Designer' as string,
  });
  const [reviewDialog, setReviewDialog] = useState<{ mod: ModificationRequest; decision: 'approved' | 'rejected' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [taskReqOpen, setTaskReqOpen] = useState(false);
  const [taskReqForm, setTaskReqForm] = useState({ title: '', description: '', priority: 'medium' as Priority, besoinDate: '' });
  const [taskReqPhoto, setTaskReqPhoto] = useState<{ url: string; name: string } | null>(null);
  const taskReqPhotoRef = useRef<HTMLInputElement>(null);
  const [taskReviewDialog, setTaskReviewDialog] = useState<{ req: TaskRequest; decision: 'approved' | 'rejected' } | null>(null);
  const [taskReviewNote, setTaskReviewNote] = useState('');
  const [fileViewer, setFileViewer] = useState<{ url: string; fileName: string; fileType: string } | null>(null);
  const [modReqOpen, setModReqOpen] = useState(false);
  const [modReq, setModReq] = useState({
    target: 'project' as 'project' | 'subtask',
    subtaskId: '',
    field: 'description' as string,
    newValue: '',
    reason: '',
  });
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ date: '', note: '' });
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'list'>('kanban');
  const [detailSubtask, setDetailSubtask] = useState<Subtask | null>(null);
  const [calendarFocus, setCalendarFocus] = useState<{ id: string; date: string } | null>(null);
  const projectAttachmentRef = useRef<HTMLInputElement>(null);

  const currentModValue = useMemo(() => {
    if (!project) return '';
    if (modReq.target === 'project') {
      switch (modReq.field) {
        case 'title': return project.title;
        case 'description': return project.description || '(vide)';
        case 'endDate': return formatDate(project.endDate);
        case 'priority': return priorityMeta[project.priority as Priority]?.label ?? project.priority;
        case 'budget': return formatCurrency(project.budget);
        default: return '';
      }
    }
    const st = project.subtasks.find((s) => s.id === modReq.subtaskId);
    if (st) {
      switch (modReq.field) {
        case 'title': return st.title;
        case 'description': return st.description || '(vide)';
        case 'dueDate': return formatDate(st.dueDate);
        case 'priority': return priorityMeta[st.priority as Priority]?.label ?? st.priority;
        default: return '';
      }
    }
    return '';
  }, [modReq, project]);

  const progressChartData = useMemo(() => {
    if (!project) return [];
    return project.progressTimeline.length > 0 ? project.progressTimeline : computeProgressTimeline(project);
  }, [project]);

  if (!user) return null;
  if (!ready) return <AppShell><ProjectDetailSkeleton /></AppShell>;
  if (!project) {
    // `ready` is true (the real project list has loaded) and this id still
    // isn't in it -- this is a genuine 404, not a loading flash.
    return (
      <AppShell>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Projet introuvable.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Retour au dashboard</Button>
        </div>
      </AppShell>
    );
  }

  const client = getUser(users, project.clientId);
  const teamMembers = project.members.map((m) => ({ ...m, user: getUser(users, m.userId) })).filter((m) => m.user);
  const members = users.filter((u) => u.role === 'membre');
  const chefs = users.filter((u) => u.role === 'chef_de_projet');
  const canManage = user.role === 'admin' || user.role === 'chef_de_projet';
  const isProjectMember = project.members.some((m) => m.userId === user.id);
  const isProjectOwner = user.role === 'client' && project.clientId === user.id;
  const canViewAttachments = user.role === 'admin' || user.role === 'chef_de_projet' || isProjectMember;
  const clientMods = project.modifications.filter((m) => getUser(users, m.requestedById)?.role === 'client');
  const teamMods = project.modifications.filter((m) => getUser(users, m.requestedById)?.role !== 'client');
  const pendingMods = project.modifications.filter((m) => m.status === 'pending' || m.status === 'pending_client');
  const reviewCount = project.subtasks.filter((st) => st.status === 'review').length;
  const availableEmployees = members.filter((e) => !project.members.some((m) => m.userId === e.id));

  const canApproveMod = (mod: { status: string; requestedById: string }) => {
    if (mod.status === 'pending_client') return isProjectOwner;
    if (mod.status !== 'pending') return false;
    const requesterRole = getUser(users, mod.requestedById)?.role;
    if (requesterRole === 'admin') return isProjectOwner;
    return user.role === 'admin';
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      rejectProject(project.id, rejectReason.trim());
      toast({ title: 'Projet rejeté', description: `« ${project.title} » a été rejeté.` });
      setRejectOpen(false);
      setRejectReason('');
    }
  };

  const handleRequestTask = () => {
    if (!taskReqForm.title.trim()) return;
    requestTask(project.id, {
      title: taskReqForm.title,
      description: taskReqForm.description,
      priority: taskReqForm.priority,
      besoinDate: taskReqForm.besoinDate || null,
      photoUrl: taskReqPhoto?.url ?? null,
      photoName: taskReqPhoto?.name ?? null,
    });
    setTaskReqOpen(false);
    setTaskReqForm({ title: '', description: '', priority: 'medium', besoinDate: '' });
    setTaskReqPhoto(null);
    if (taskReqPhotoRef.current) taskReqPhotoRef.current.value = '';
    toast({ title: 'Demande envoyée', description: 'Votre demande de tâche sera examinée par l\'administrateur.' });
  };

  const handleTaskReqPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTaskReqPhoto({ url: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  };

  const handleReviewTaskRequest = () => {
    if (!taskReviewDialog) return;
    reviewTaskRequest(project.id, taskReviewDialog.req.id, taskReviewDialog.decision, taskReviewNote.trim());
    setTaskReviewDialog(null);
    setTaskReviewNote('');
    toast({
      title: taskReviewDialog.decision === 'approved' ? 'Demande approuvée' : 'Demande refusée',
      description: taskReviewDialog.decision === 'approved'
        ? 'La tâche a été créée dans le projet et le client en a été notifié.'
        : 'Le client a été notifié du refus.',
    });
  };

  const handleCreateSubtask = () => {
    if (!newSubtask.title || !newSubtask.startDate || !newSubtask.dueDate) return;
    addSubtask(project.id, {
      title: newSubtask.title,
      description: newSubtask.description,
      status: 'todo',
      priority: newSubtask.priority,
      assignedToId: newSubtask.assignedToId || null,
      dependsOnId: newSubtask.dependsOnId || null,
      startDate: newSubtask.startDate,
      dueDate: newSubtask.dueDate,
    });
    setNewSubtaskOpen(false);
    setNewSubtask({ title: '', description: '', priority: 'medium', assignedToId: '', startDate: '', dueDate: '', dependsOnId: '' });
    toast({ title: 'Sous-tâche créée', description: `« ${newSubtask.title} » a été ajoutée au projet.` });
  };

  const handleAddMember = () => {
    if (memberForm.createNew) {
      if (!memberForm.name || !memberForm.email || !memberForm.password) return;
      // Create a new user account then add as member
      addEmployeeFromContext({
        name: memberForm.name, email: memberForm.email, password: memberForm.password,
        phone: '',
        role: memberForm.role as 'admin' | 'chef_de_projet' | 'membre',
        memberSpecialty: memberForm.role === 'membre' ? memberForm.specialty as MemberSpecialty : undefined,
      }, apiToken);
      setAddMemberOpen(false);
      setMemberForm({ existingUserId: '', role: 'membre', createNew: false, name: '', email: '', password: '', specialty: 'Designer' });
    } else {
      if (!memberForm.existingUserId) return;
      addProjectMember(project.id, { userId: memberForm.existingUserId, role: memberForm.role });
      setAddMemberOpen(false);
      setMemberForm({ existingUserId: '', role: 'membre', createNew: false, name: '', email: '', password: '', specialty: 'Designer' });
    }
    toast({ title: 'Membre ajouté', description: `${memberForm.createNew ? memberForm.name : getUser(users, memberForm.existingUserId)?.name} a rejoint l'équipe du projet.` });
  };

  const handleProjectAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const att = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        url: URL.createObjectURL(file),
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
      };
      addProjectAttachment(project.id, att);
      toast({ title: 'Pièce jointe ajoutée', description: `« ${file.name} » a été ajoutée au projet.` });
    });
    if (projectAttachmentRef.current) projectAttachmentRef.current.value = '';
  };

  const handleReview = () => {
    if (!reviewDialog) return;
    const { mod, decision } = reviewDialog;
    reviewModification(project.id, mod.id, decision, reviewNote);
    const requesterRole = getUser(users, mod.requestedById)?.role;
    const appliedNow = user.role === 'client' || requesterRole === 'client' || requesterRole === 'admin';
    toast({
      title: decision === 'approved' ? (user.role === 'client' && appliedNow ? 'Modification validée' : 'Modification approuvée') : 'Modification rejetée',
      description: decision === 'approved'
        ? (appliedNow ? 'La nouvelle valeur a été appliquée.' : 'La demande a été transmise au client pour validation finale.')
        : 'La modification proposée a été refusée.',
    });
    setReviewDialog(null);
    setReviewNote('');
  };

  const handleAddMeeting = () => {
    if (!meetingForm.date) return;
    scheduleClientMeeting(project.id, {
      date: new Date(meetingForm.date).toISOString(),
      note: meetingForm.note.trim(),
    });
    setMeetingOpen(false);
    setMeetingForm({ date: '', note: '' });
    toast({ title: 'Rendez-vous planifié', description: 'Le client sera notifié de la réunion.' });
  };

  const fileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const fieldLabels: Record<string, string> = {
    title: 'Titre', description: 'Description', dueDate: 'Date de fin', priority: 'Priorité',
    endDate: 'Date de fin', budget: 'Budget',
  };

  const projectFields = [
    { value: 'title', label: 'Titre' },
    { value: 'description', label: 'Description' },
    { value: 'endDate', label: 'Date de fin' },
    { value: 'priority', label: 'Priorité' },
    { value: 'budget', label: 'Budget' },
  ];

  const subtaskFields = [
    { value: 'title', label: 'Titre' },
    { value: 'description', label: 'Description' },
    { value: 'dueDate', label: 'Date de fin' },
    { value: 'priority', label: 'Priorité' },
  ];

  const handleSubmitModification = () => {
    if (!modReq.newValue || !modReq.reason) return;
    const target = modReq.target as 'project' | 'subtask';
    const subtaskId = target === 'subtask' ? modReq.subtaskId : null;
    let oldValue = '';
    if (target === 'project') {
      if (modReq.field === 'title') oldValue = project.title;
      else if (modReq.field === 'description') oldValue = project.description;
      else if (modReq.field === 'endDate') oldValue = project.endDate;
      else if (modReq.field === 'priority') oldValue = project.priority;
      else if (modReq.field === 'budget') oldValue = String(project.budget);
    } else {
      const st = project.subtasks.find((s) => s.id === modReq.subtaskId);
      if (st) {
        if (modReq.field === 'title') oldValue = st.title;
        else if (modReq.field === 'description') oldValue = st.description;
        else if (modReq.field === 'dueDate') oldValue = st.dueDate;
        else if (modReq.field === 'priority') oldValue = st.priority;
      }
    }
    suggestModification({
      projectId: project.id, subtaskId, target, field: modReq.field,
      oldValue, newValue: modReq.newValue, reason: modReq.reason,
    });
setModReqOpen(false);
    setModReq({ target: 'project', subtaskId: '', field: 'description', newValue: '', reason: '' });
toast({ title: 'Demande envoyée', description: `Votre demande de modification (${modReq.field}) attend la validation.` });
  };

  const handleModificationRequestFromDetail = (subtaskId: string) => {
    setDetailSubtask(null);
    setModReq({ target: 'subtask', subtaskId, field: 'title', newValue: '', reason: '' });
    setModReqOpen(true);
  };

  // Compute duration in weeks
  const durationDays = Math.max(0, daysBetween(project.startDate, project.endDate));
  const durationWeeks = Math.ceil(durationDays / 7);

  return (
    <AppShell>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* Header with logo */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {project.logoUrl ? (
              <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-border bg-muted/30 flex items-center justify-center flex-shrink-0">
                <Image src={project.logoUrl} alt="Logo" fill sizes="56px" className="object-contain" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-xl">{project.title[0]}</span>
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{project.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
                <span className="text-sm text-muted-foreground">{project.category}</span>
                {pendingMods.length > 0 && (
                  <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20">
                    <AlertCircle className="h-3 w-3 mr-1" />{pendingMods.length} modif. en attente
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-muted-foreground mt-3 max-w-2xl">{project.description}</p>
        </div>

        <div className="flex flex-col gap-3 flex-shrink-0">
          <Card className="p-5 flex items-center gap-4">
            <ProgressRing value={project.progress} size={64} strokeWidth={5} />
            <div>
              <p className="text-sm text-muted-foreground">Avancement global</p>
              <p className="text-xs text-muted-foreground mt-1">
                {project.subtasks.length} sous-tâche{project.subtasks.length > 1 ? 's' : ''}
              </p>
            </div>
          </Card>
          {project.status !== 'pending' && project.status !== 'rejected' && (
            <Button variant="outline" onClick={() => setModReqOpen(true)}>
              <Edit3 className="h-4 w-4 mr-2" /> Demander une modification
            </Button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Euro} label="Budget" value={formatCurrency(project.budget)} color="text-info" />
        <StatCard icon={Clock} label="Durée" value={`${durationDays} j · ${durationWeeks} sem.`} color="text-warning" />
        <StatCard icon={ListTodo} label="Sous-tâches" value={project.subtasks.length} color="text-primary" />
        <StatCard icon={Users} label="Équipe" value={teamMembers.length} color="text-accent" />
      </div>

      {/* Admin actions */}
      <AnimatePresence>
        {user.role === 'admin' && project.status === 'pending' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6">
            <Card className="p-5 border-warning/30 bg-warning/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-warning" /> Action requise — Validation du projet
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => { validateProject(project.id); toast({ title: 'Projet validé', description: `« ${project.title} » est désormais en cours.` }); }} className="bg-success hover:bg-success/90">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Valider le projet
                </Button>
                <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" /> Rejeter
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {user.role === 'admin' && project.status === 'validated' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="p-5 border-primary/30 bg-primary/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" /> Assigner un chef de projet
            </h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Choisir un chef de projet..." />
                </SelectTrigger>
                <SelectContent>
                  {chefs.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => { if (selectedManager) { assignManager(project.id, selectedManager); toast({ title: 'Chef de projet assigné', description: `${getUser(users, selectedManager)?.name} pilote désormais le projet.` }); } }} disabled={!selectedManager}>
                Assigner
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-primary/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-md">
                <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                <p>Vous avez validé ce projet par erreur ? Annulez la validation pour le faire repasser en attente et re-décider.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setRevertOpen(true)} className="border-destructive/40 text-destructive hover:bg-destructive/10">
                <Undo2 className="h-4 w-4 mr-2" /> Annuler la validation
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {project.status === 'rejected' && project.rejectionReason && (
        <Card className="p-5 mb-6 border-destructive/30 bg-destructive/5">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" /> Motif du rejet
          </h3>
          <p className="text-sm text-muted-foreground">{project.rejectionReason}</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="info" className="gap-1.5"><Info className="h-4 w-4" /> Informations</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Calendrier</TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1.5"><GanttChartSquare className="h-4 w-4" /> Gantt</TabsTrigger>
          <TabsTrigger value="progress" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Avancement</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><ListTodo className="h-4 w-4" /> Tâches</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><UserCircle className="h-4 w-4" /> Équipe</TabsTrigger>
          {/* Modifications du client (validées par l'admin / chef de projet) */}
          <TabsTrigger value="modifications" className="gap-1.5">
            <Edit3 className="h-4 w-4" /> Modifications
            {pendingMods.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-warning text-warning-foreground">
                {pendingMods.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---- Info tab ---- */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-semibold mb-4">Détails du projet</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Calendar} label="Date de début" value={formatDate(project.startDate)} />
                <InfoRow icon={Calendar} label="Date de fin" value={formatDate(project.endDate)} />
                <InfoRow icon={Clock} label="Durée" value={`${durationDays} jours (${durationWeeks} semaine${durationWeeks > 1 ? 's' : ''})`} />
                <InfoRow icon={Euro} label="Budget" value={formatCurrency(project.budget)} />
                <InfoRow icon={FolderKanban} label="Semaines de réalisation" value={`${durationWeeks} semaine${durationWeeks > 1 ? 's' : ''}`} />
                <InfoRow icon={CalendarClock} label="Mise à jour" value={formatDate(project.createdAt)} />
              </div>

              {/* Submission detail fields */}
              {(project.platformUsers || project.desiredFeatures || project.necessaryPages || project.plannedFeatures) && (
                <div className="mt-5 pt-5 border-t border-border space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Détails du projet
                  </h4>
                  {project.platformUsers && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Utilisateurs de la plateforme</p>
                      <ul className="space-y-1">
                        {project.platformUsers.split(/[\n,]/).map((u) => u.trim()).filter(Boolean).map((u) => (
                          <li key={u} className="flex items-center gap-2 text-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {project.desiredFeatures && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Fonctionnalités souhaitées</p>
                      <ul className="space-y-1">
                        {project.desiredFeatures.split(/[\n,]/).map((u) => u.trim()).filter(Boolean).map((u) => (
                          <li key={u} className="flex items-center gap-2 text-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {project.necessaryPages && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Pages nécessaires pour le projet</p>
                      <ul className="space-y-1">
                        {project.necessaryPages.split(/[\n,]/).map((u) => u.trim()).filter(Boolean).map((u) => (
                          <li key={u} className="flex items-center gap-2 text-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {project.plannedFeatures && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Fonctionnalités prévues</p>
                      <ul className="space-y-1">
                        {project.plannedFeatures.split(/[\n,]/).map((u) => u.trim()).filter(Boolean).map((u) => (
                          <li key={u} className="flex items-center gap-2 text-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {client && (
                <div className="mt-5 pt-5 border-t border-border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Client</h4>
                  <button onClick={() => setProfileUser(client)} className="flex items-center gap-3 mb-3 w-full text-left p-1 -m-1 rounded-2xl hover:bg-muted/40 transition-colors group">
                    <UserAvatar user={client} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                  </button>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <a href={`mailto:${client.email}`} className="hover:text-primary transition-colors">{client.email}</a>
                    </div>
                    {client.whatsapp && (
                      <a
                        href={`https://wa.me/${client.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-sm hover:text-[#25D366] transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <span>{client.whatsapp}</span>
                      </a>
                    )}
                    {client.company && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{client.company}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Calendrier du projet
              </h3>
              <div className="space-y-2 mb-4">
                {project.calendarEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun événement planifié pour l’instant.</p>
                ) : (
                  project.calendarEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-[10px] border border-border/40 bg-muted/30">
                      <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(ev.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Client meeting after framing */}
              {project.clientMeeting ? (
                <div className="p-3 rounded-[10px] bg-success/10 border border-success/30">
                  <p className="text-sm font-medium flex items-center gap-1.5 text-success">
                    <CheckCircle2 className="h-4 w-4" /> Rendez-vous client planifié
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(project.clientMeeting.date)}</p>
                  {project.clientMeeting.note && (
                    <p className="text-xs text-muted-foreground mt-1">« {project.clientMeeting.note} »</p>
                  )}
                </div>
              ) : canManage && project.subtasks.length > 0 ? (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setMeetingOpen(true)}>
                  <CalendarDays className="h-4 w-4 mr-2" /> Planifier un rendez-vous client (rapport)
                </Button>
              ) : null}
            </Card>
          </div>
        </TabsContent>

        {/* ---- Calendar tab ---- */}
        <TabsContent value="calendar">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Calendrier synchronisé avec le cadrage des tâches
              </h3>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => setMeetingOpen(true)}>
                  <CalendarDays className="h-4 w-4 mr-2" /> Planifier un rendez-vous client
                </Button>
              )}
            </div>

            {project.calendarEvents.length === 0 && project.subtasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucun événement de cadrage planifié. Le calendrier se remplira une fois le cadrage des tâches effectué.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
                {/* Calendrier mensuel */}
                <ProjectCalendar events={project.calendarEvents} subtasks={project.subtasks} className="w-full xl:sticky xl:top-24" focus={calendarFocus} />

                {/* Événements du projet + sous-tâches (cadrage) — colonne de droite sur écran large */}
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Événements du projet</h4>
                    <div className="space-y-2">
                      {project.calendarEvents.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setCalendarFocus({ id: ev.id, date: ev.date })}
                          className="w-full flex items-center gap-3 p-3 rounded-[12px] border border-border/40 bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition-all text-left group"
                        >
                          <div className={cn('h-9 w-9 rounded-[12px] flex items-center justify-center flex-shrink-0',
                            ev.type === 'rendez_vous' ? 'bg-primary text-primary-foreground' : ev.type === 'cadrage' ? 'bg-info text-info-foreground' : ev.type === 'livraison' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground')}>
                            <CalendarDays className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(ev.date)}</p>
                            {ev.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>}
                          </div>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Sous-tâches (cadrage)</h4>
                    <div className="space-y-2">
                      {project.subtasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune sous-tâche définie.</p>
                      ) : project.subtasks.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setCalendarFocus({ id: st.id, date: st.startDate })}
                          className="w-full flex items-center gap-3 p-3 rounded-[12px] border border-border/40 bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition-all text-left group"
                        >
                          <div className="h-9 w-9 rounded-[12px] bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                            <ListTodo className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{st.title}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(st.startDate)} → {formatDate(st.dueDate)}</p>
                          </div>
                          <SubtaskStatusBadge status={st.status} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ---- Gantt tab ---- */}
        <TabsContent value="gantt">
          <div>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Diagramme de Gantt</h3>
                {canManage && project.subtasks.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setNewSubtaskOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une sous-tâche
                  </Button>
                )}
              </div>
              <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Chargement du diagramme...</div>}>
                <GanttChart subtasks={project.subtasks} />
              </Suspense>
            </Card>
          </div>
        </TabsContent>

        {/* ---- Progress tab ---- */}
        <TabsContent value="progress">
          <div>
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Courbe d’avancement</h3>
              <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Chargement du graphique...</div>}>
                <ProgressChart data={progressChartData} />
              </Suspense>
            </Card>
          </div>
        </TabsContent>

        {/* ---- Tasks tab (with comments) ---- */}
        <TabsContent value="tasks">
          <div>
            {/* Client task requests (validated by admin / chef de projet) */}
            {(isProjectOwner || canManage || isProjectMember) && (
              <div className="mb-5 rounded-xl border border-border bg-card">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Demandes de tâche</h3>
                    <span className="text-xs text-muted-foreground">({project.taskRequests.length})</span>
                  </div>
                  {isProjectOwner ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Une nouvelle tâche se demande depuis le <button type="button" onClick={() => router.push('/dashboard')} className="text-primary font-medium hover:underline">tableau de bord</button>.</span>
                    </div>
                  ) : null}
                </div>
                {project.taskRequests.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune demande de tâche pour le moment.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {project.taskRequests.map((req) => (
                      <div key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{req.title}</p>
                            <PriorityBadge priority={req.priority} />
                            <TaskRequestStatusBadge status={req.status} />
                          </div>
                          {req.description && (
                            <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" /> Demande : {formatDate(req.createdAt)}
                            </span>
                            {req.besoinDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Nécessité : {formatDate(req.besoinDate)}
                              </span>
                            )}
                            {(req.status === 'approved' || req.status === 'rejected') && req.reviewNote && (
                              <span> · Note : « {req.reviewNote} »</span>
                            )}
                          </p>
                        </div>
                        {req.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setFileViewer({ url: req.photoUrl!, fileName: req.photoName ?? 'photo_demande', fileType: 'image/*' })}
                            className="flex-shrink-0 group flex items-center gap-2 p-1.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                            title={req.photoName ?? 'Voir la photo'}
                          >
                            <img src={req.photoUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                            <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                          </button>
                        )}
                        {canManage && req.status === 'pending' && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={() => { setTaskReviewDialog({ req, decision: 'rejected' }); setTaskReviewNote(''); }}>
                              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Refuser
                            </Button>
                            <Button size="sm" onClick={() => { setTaskReviewDialog({ req, decision: 'approved' }); setTaskReviewNote(''); }}>
                              <Check className="h-3.5 w-3.5 mr-1.5" /> Approuver
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Project attachment delivery */}
            {(project.attachments.length > 0 || isProjectOwner) && (
              <div className="mb-5 rounded-xl border border-border bg-card">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Livraison des pièces jointes</h3>
                    <span className="text-xs text-muted-foreground">({project.attachments.length})</span>
                  </div>
                  {!canViewAttachments && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <Lock className="h-3 w-3" /> Accès restreint
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {project.attachments.map((att) => (
                      <div
                        key={att.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 transition-all ${
                          canViewAttachments
                            ? 'hover:bg-primary/5 hover:border-primary/30 border border-transparent cursor-pointer'
                            : 'opacity-60 border border-transparent'
                        }`}
                        onClick={() => canViewAttachments && setFileViewer({ url: att.url, fileName: att.fileName, fileType: att.fileType })}
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          {fileIcon(att.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{att.fileName}</p>
                          {canViewAttachments && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Eye className="h-2.5 w-2.5" /> Cliquer pour ouvrir
                            </p>
                          )}
                        </div>
                        {canViewAttachments && <Download className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                        {!canViewAttachments && <Lock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {isProjectOwner && (
                    <div className="mt-3">
                      <input ref={projectAttachmentRef} type="file" multiple className="hidden" onChange={handleProjectAttachment} />
                      <button
                        type="button"
                        onClick={() => projectAttachmentRef.current?.click()}
                        className="w-full rounded-xl border-2 border-dashed border-border py-5 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-sm font-medium">Ajouter un document</span>
                        <span className="text-xs">Vous avez oublié un document lors de la soumission ? Envoyez-le ici.</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                {project.subtasks.length > 0 && (
                  <>
                    <button
                      onClick={() => setTaskViewMode('kanban')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        taskViewMode === 'kanban'
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" /> Kanban
                    </button>
                    <button
                      onClick={() => setTaskViewMode('list')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        taskViewMode === 'list'
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      <List className="h-4 w-4" /> Liste
                    </button>
                  </>
                )}
              </div>
              {canManage && project.status !== 'pending' && project.status !== 'rejected' && (
                <Button onClick={() => setNewSubtaskOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Ajouter une sous-tâche
                </Button>
              )}
            </div>

            {canManage && reviewCount > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-warning" />
                <p className="text-sm text-muted-foreground flex-1 min-w-0">
                  <span className="font-semibold text-foreground">
                    {reviewCount} sous-tâche{reviewCount > 1 ? 's' : ''} en attente de validation.
                  </span>{' '}
                  Validez-les ci-dessous.
                </p>
              </div>
            )}

            {project.subtasks.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucune sous-tâche définie. Le chef de projet ou l&apos;admin doit cadrer les tâches.</p>
              </Card>
            ) : taskViewMode === 'kanban' ? (
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Chargement du Kanban...</div>}>
                <KanbanBoard
                  subtasks={project.subtasks}
                  users={users}
                  canManage={canManage}
                  currentUserId={user.id}
                  onStatusChange={(subtaskId, status) => { updateSubtaskStatus(project.id, subtaskId, status); toast({ title: 'Statut mis à jour', description: status === 'review' ? 'La sous-tâche attend la validation.' : `Statut passé à « ${subtaskStatusMeta[status].label} ».` }); }}
                  onOpenDetail={(st) => { setDetailSubtask(st); }}
                  onAddDeliverable={(subtaskId, attachment) => { addSubtaskAttachment(project.id, subtaskId, attachment); toast({ title: 'Livrable ajouté', description: attachment.fileName }); }}
                />
              </Suspense>
            ) : (
              <div className="space-y-3">
                {project.subtasks.map((st) => {
                  const assignee = getUser(users, st.assignedToId);
                  const deliverables = st.attachments ?? [];
                  return (
                    <Card key={st.id} className="p-4 hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer" onClick={() => setDetailSubtask(st)}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{st.title}</p>
                            <SubtaskStatusBadge status={st.status} />
                            <PriorityBadge priority={st.priority} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{st.description}</p>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(st.startDate)} → {formatDate(st.dueDate)}</span>
                            <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" /> {assignee?.name ?? 'Non assigné'}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {st.comments.length} commentaire{st.comments.length > 1 ? 's' : ''}</span>
                            {deliverables.length > 0 && (
                              <span className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {deliverables.length} livrable{deliverables.length > 1 ? 's' : ''}</span>
                            )}
                          </div>

                          {/* Deliverables preview */}
                          {deliverables.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {deliverables.slice(0, 4).map((att) => (
                                <div
                                  key={att.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/5 border border-primary/15 text-[10px] font-medium text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); setFileViewer({ url: att.url, fileName: att.fileName, fileType: att.fileType }); }}
                                >
                                  {att.fileType.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                  <span className="truncate max-w-[80px]">{att.fileName}</span>
                                </div>
                              ))}
                              {deliverables.length > 4 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-muted/50 text-[10px] text-muted-foreground">
                                  +{deliverables.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-3 w-48">
                            <ProgressBar value={st.progress} indicatorClassName={st.progress < 33 ? 'bg-destructive' : st.progress < 66 ? 'bg-warning' : 'bg-success'} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={(e) => { e.stopPropagation(); setDetailSubtask(st); }}>
                            <MessageSquare className="h-3.5 w-3.5" /> Discussion
                          </Button>
                          {canManage && st.status === 'review' && (
                            <Button size="sm" className="h-8 text-xs gap-1 bg-success hover:bg-success/90" onClick={(e) => { e.stopPropagation(); approveSubtask(project.id, st.id); toast({ title: 'Sous-tâche validée', description: `« ${st.title} » est terminée.` }); }}>
                              <Check className="h-3.5 w-3.5" /> Valider
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Inline comments preview */}
                      {st.comments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          {st.comments.slice(0, 2).map((c) => {
                            const author = getUser(users, c.authorId);
                            return (
                              <div key={c.id} className="flex items-start gap-2">
                                <UserAvatar user={author} size="sm" />
                                <div className="flex-1">
                                  <p className="text-xs"><span className="font-semibold">{author?.name}</span> <span className="text-muted-foreground">· {formatDate(c.createdAt)}</span></p>
                                  <p className="text-sm mt-0.5">{c.content}</p>
                                </div>
                              </div>
                            );
                          })}
                          {st.comments.length > 2 && (
                            <button className="text-xs text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setDetailSubtask(st); }}>
                              Voir les {st.comments.length} commentaires
                            </button>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ---- Team tab ---- */}
        <TabsContent value="team">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-lg font-bold tracking-tight">Équipe du projet</h3>
                <span className="inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {teamMembers.length}
                </span>
              </div>
              {canManage && project.status !== 'pending' && project.status !== 'rejected' && (
                <Button onClick={() => setAddMemberOpen(true)} className="rounded-full gap-1.5">
                  <UserPlus className="h-4 w-4" /> Ajouter un membre
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {teamMembers.map((m) => {
                  const memberTasks = project.subtasks.filter((st) => st.assignedToId === m.userId);
                  const total = memberTasks.length;
                  const doneCount = memberTasks.filter((t) => t.status === 'done').length;
                  const activeCount = memberTasks.filter((t) => t.status === 'in_progress' || t.status === 'review').length;
                  const ratio = total ? doneCount / total : 0;
                  const filled = total ? Math.max(1, Math.round(ratio * 5)) : 0;
                  const dotColor = ratio >= 0.75 ? 'bg-success' : ratio >= 0.4 ? 'bg-warning' : 'bg-destructive';
                  const removable = canManage && m.role !== 'client' && m.role !== 'admin' && m.userId !== user.id;
                  return (
                    <motion.div key={m.userId} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Card
                        className="group relative cursor-pointer overflow-hidden rounded-[24px] border-border/60 bg-card p-6 shadow-card hover:-translate-y-1 hover:shadow-card-hover hover:border-primary/30 transition-all duration-300"
                        onClick={() => m.user && setProfileUser(m.user)}
                      >
                        <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                        <div className="flex items-start gap-4">
                          <UserAvatar user={m.user} className="h-14 w-14 rounded-[18px] shadow-soft-lg flex-shrink-0" />
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="font-display font-semibold text-[15px] leading-tight truncate group-hover:text-primary transition-colors">{m.user?.name}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <RoleBadge role={m.role} />
                              {m.user?.memberSpecialty && (
                                <span className="inline-flex items-center rounded-full bg-muted/70 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                  {specialtyMeta[m.user.memberSpecialty]?.label ?? m.user.memberSpecialty}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="relative flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="flex items-center justify-center h-9 w-9 rounded-full border border-border/70 bg-muted/60 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                              <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </span>
                            {removable && (
                              <button
                                onClick={(e) => { e.stopPropagation(); removeProjectMember(project.id, m.userId); }}
                                className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Contacts</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {m.user?.email && (
                              <a href={`mailto:${m.user.email}`} className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 max-w-[180px] transition-colors">
                                <Mail className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{m.user.email}</span>
                              </a>
                            )}
                            {m.user?.phone && (
                              <a href={`tel:${m.user.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                                <Phone className="h-3 w-3" /> {m.user.phone}
                              </a>
                            )}
                          </div>
                        </div>

                        {m.user?.company && (
                          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{m.user.company}</span>
                          </p>
                        )}

                        <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Tâches {total > 0 ? `· ${total}` : ''}</span>
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
                              {total ? `${doneCount}/${total} terminée${doneCount > 1 ? 's' : ''}${activeCount > 0 ? ` · ${activeCount} en cours` : ''}` : 'Aucune tâche'}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {teamMembers.length === 0 && (
              <Card className="p-10 text-center text-muted-foreground rounded-[24px]">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucun membre dans l’équipe pour le moment.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ---- Modifications tab (demandes de changement, validées par l'admin / chef de projet) ---- */}
        <TabsContent value="modifications">
          <div>
            <div className="mb-5 rounded-xl border border-border bg-muted/20 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Edit3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Demandes de modification</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      Les changements proposés sur le projet (titre, description, délai, priorité, budget) ou sur une sous-tâche,
                      soit par le client, soit par l&apos;équipe. Chaque demande est examinée puis validée ou rejetée
                      par l&apos;admin / le chef de projet.
                    </p>
                  </div>
                </div>
                {project.status !== 'pending' && project.status !== 'rejected' && (
                  <Button size="sm" onClick={() => setModReqOpen(true)} className="flex-shrink-0">
                    <Plus className="h-4 w-4 mr-2" /> Nouvelle demande
                  </Button>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground bg-background/50">
                <span className="font-medium text-foreground">Comprendre les statuts :</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> En attente — pas encore examinée</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info" /> Validation client — en attente de la validation du client</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Approuvée — le changement est appliqué</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Rejetée — un motif est indiqué</span>
              </div>
            </div>

            {project.modifications.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Edit3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucune demande de modification pour ce projet.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {teamMods.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-info flex-shrink-0" />
                      <h4 className="text-sm font-semibold">Demandes de l&apos;équipe</h4>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">admin · chef de projet · employé</span>
                      <span className="text-xs text-muted-foreground tabular-nums">({teamMods.length})</span>
                    </div>
                    {teamMods.map((mod) => (
                      <motion.div key={mod.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        <ModRequestCard
                          mod={mod}
                          projectId={project.id}
                          projectTitle={project.title}
                          requester={getUser(users, mod.requestedById)}
                          reviewer={mod.reviewedById ? getUser(users, mod.reviewedById) : null}
                          users={users}
                          fieldLabel={(f) => fieldLabels[f] ?? f}
                          subtaskTitle={mod.subtaskId ? project.subtasks.find((st) => st.id === mod.subtaskId)?.title : undefined}
                          canApprove={canApproveMod(mod)}
                          onApprove={() => { setReviewDialog({ mod, decision: 'approved' }); setReviewNote(''); }}
                          onReject={() => { setReviewDialog({ mod, decision: 'rejected' }); setReviewNote(''); }}
                        />
                      </motion.div>
                    ))}
                  </section>
                )}
                {clientMods.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-chart-5 flex-shrink-0" />
                      <h4 className="text-sm font-semibold">Demandes du client</h4>
                      <span className="text-xs text-muted-foreground tabular-nums">({clientMods.length})</span>
                    </div>
                    {clientMods.map((mod) => (
                      <motion.div key={mod.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        <ModRequestCard
                          mod={mod}
                          projectId={project.id}
                          projectTitle={project.title}
                          requester={getUser(users, mod.requestedById)}
                          reviewer={mod.reviewedById ? getUser(users, mod.reviewedById) : null}
                          users={users}
                          fieldLabel={(f) => fieldLabels[f] ?? f}
                          subtaskTitle={mod.subtaskId ? project.subtasks.find((st) => st.id === mod.subtaskId)?.title : undefined}
                          canApprove={canApproveMod(mod)}
                          onApprove={() => { setReviewDialog({ mod, decision: 'approved' }); setReviewNote(''); }}
                          onReject={() => { setReviewDialog({ mod, decision: 'rejected' }); setReviewNote(''); }}
                        />
                      </motion.div>
                    ))}
                  </section>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Revert validation dialog */}
      <Dialog open={revertOpen} onOpenChange={setRevertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-warning" /> Annuler la validation ?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p>
                Le projet « {project.title} » repassera en <strong className="text-foreground">attente de validation</strong>.
                Vous pourrez alors le valider de nouveau ou le rejeter. Le client sera notifié de l&rsquo;annulation.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmez-vous l&rsquo;annulation de la validation de ce projet ?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertOpen(false)}>Non, garder la validation</Button>
            <Button onClick={() => {
              revertProjectValidation(project.id);
              setRevertOpen(false);
              toast({ title: 'Validation annulée', description: `« ${project.title} » repasse en attente de validation.` });
            }} variant="destructive">
              <Undo2 className="h-4 w-4 mr-2" /> Oui, annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="reason">Motif du rejet</Label>
            <Textarea id="reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Expliquez la raison du rejet..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Rejeter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New subtask dialog */}
      <Dialog open={newSubtaskOpen} onOpenChange={setNewSubtaskOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle sous-tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-1 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
            <div>
              <Label htmlFor="st-title">Titre</Label>
              <Input id="st-title" value={newSubtask.title} onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })} placeholder="Titre de la sous-tâche" />
            </div>
            <div>
              <Label htmlFor="st-desc">Description</Label>
              <Textarea id="st-desc" value={newSubtask.description} onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })} placeholder="Description..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priorité</Label>
                <Select value={newSubtask.priority} onValueChange={(v) => setNewSubtask({ ...newSubtask, priority: v as Priority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigner à</Label>
                <Select value={newSubtask.assignedToId} onValueChange={(v) => setNewSubtask({ ...newSubtask, assignedToId: v })}>
                  <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                  <SelectContent>
                    {members.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} — {emp.memberSpecialty ? (specialtyMeta[emp.memberSpecialty]?.label ?? emp.memberSpecialty) : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de début</Label>
                <Input type="date" value={newSubtask.startDate ? new Date(newSubtask.startDate).toISOString().split('T')[0] : ''} onChange={(e) => setNewSubtask({ ...newSubtask, startDate: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input type="date" value={newSubtask.dueDate ? new Date(newSubtask.dueDate).toISOString().split('T')[0] : ''} onChange={(e) => setNewSubtask({ ...newSubtask, dueDate: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
              </div>
            </div>
            {project.subtasks.length > 0 && (
              <div>
                <Label>Dépend de</Label>
                <Select value={newSubtask.dependsOnId} onValueChange={(v) => setNewSubtask({ ...newSubtask, dependsOnId: v })}>
                  <SelectTrigger><SelectValue placeholder="Aucune dépendance" /></SelectTrigger>
                  <SelectContent>
                    {project.subtasks.map((st) => (
                      <SelectItem key={st.id} value={st.id}>{st.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSubtaskOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateSubtask} disabled={!newSubtask.title || !newSubtask.startDate || !newSubtask.dueDate}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add member dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Ajouter un membre au projet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMemberForm({ ...memberForm, createNew: false })} className={cn('p-3 rounded-lg border text-sm font-medium transition-all', !memberForm.createNew ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground')}>
                Sélectionner un membre existant
              </button>
              <button type="button" onClick={() => setMemberForm({ ...memberForm, createNew: true })} className={cn('p-3 rounded-lg border text-sm font-medium transition-all', memberForm.createNew ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground')}>
                Créer un nouveau compte
              </button>
            </div>

            {memberForm.createNew ? (
              <div className="space-y-3">
                <div>
                  <Label>Nom complet *</Label>
                  <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Ex: Marie Dupont" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="marie@entreprise.com" />
                </div>
                <div>
                  <Label>Mot de passe *</Label>
                  <Input type="text" value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} placeholder="Mot de passe du compte" />
                </div>
                <div>
                  <Label>Rôle dans le projet</Label>
                  <Select value={memberForm.role} onValueChange={(v) => setMemberForm({ ...memberForm, role: v as Role })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membre">Membre du projet</SelectItem>
                      <SelectItem value="chef_de_projet">Chef de projet</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {memberForm.role === 'membre' && (
                  <div>
                    <Label>Spécialité</Label>
                    <Select value={memberForm.specialty} onValueChange={(v) => setMemberForm({ ...memberForm, specialty: v })}>
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
            ) : (
              <div className="space-y-3">
                {availableEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Tous les membres sont déjà dans ce projet.</p>
                ) : (
                  <>
                    <div>
                      <Label>Choisir un membre existant</Label>
                      <Select value={memberForm.existingUserId} onValueChange={(v) => setMemberForm({ ...memberForm, existingUserId: v })}>
                        <SelectTrigger><SelectValue placeholder="Choisir un membre..." /></SelectTrigger>
                        <SelectContent>
                          {availableEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name} — {emp.memberSpecialty ? (specialtyMeta[emp.memberSpecialty]?.label ?? emp.memberSpecialty) : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Rôle dans le projet</Label>
                      <Select value={memberForm.role} onValueChange={(v) => setMemberForm({ ...memberForm, role: v as Role })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="membre">Membre du projet</SelectItem>
                          <SelectItem value="chef_de_projet">Chef de projet</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Annuler</Button>
            <Button onClick={handleAddMember} disabled={memberForm.createNew ? (!memberForm.name || !memberForm.email || !memberForm.password) : !memberForm.existingUserId}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task request dialog (client) */}
      <Dialog open={taskReqOpen} onOpenChange={setTaskReqOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" /> Demander une tâche
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20 text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
              <p>Votre demande sera examinée par l’administrateur. Si elle est acceptée, elle deviendra une sous-tâche du projet.</p>
            </div>
            <div>
              <Label htmlFor="tr-title">Titre de la tâche *</Label>
              <Input id="tr-title" value={taskReqForm.title} onChange={(e) => setTaskReqForm((f) => ({ ...f, title: e.target.value }))} placeholder="ex. Ajouter une page FAQ" />
            </div>
            <div>
              <Label htmlFor="tr-desc">Description</Label>
              <Textarea id="tr-desc" value={taskReqForm.description} onChange={(e) => setTaskReqForm((f) => ({ ...f, description: e.target.value }))} placeholder="Décrivez le besoin..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tr-need">Date de nécessité</Label>
                <Input
                  id="tr-need"
                  type="date"
                  className="mt-1"
                  value={taskReqForm.besoinDate}
                  onChange={(e) => setTaskReqForm((f) => ({ ...f, besoinDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Priorité</Label>
                <Select value={taskReqForm.priority} onValueChange={(v) => setTaskReqForm((f) => ({ ...f, priority: v as Priority }))}>
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
              <input ref={taskReqPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleTaskReqPhoto} />
              {taskReqPhoto ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                  <img src={taskReqPhoto.url} alt="aperçu" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{taskReqPhoto.name}</p>
                    <button type="button" className="text-[11px] text-destructive hover:underline" onClick={() => { setTaskReqPhoto(null); if (taskReqPhotoRef.current) taskReqPhotoRef.current.value = ''; }}>
                      Retirer la photo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => taskReqPhotoRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-border py-3 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="text-xs font-medium">Ajouter une photo (optionnel)</span>
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskReqOpen(false)}>Annuler</Button>
            <Button onClick={handleRequestTask} disabled={!taskReqForm.title.trim()}>
              <Send className="h-4 w-4 mr-2" /> Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review task request dialog (admin) */}
      <Dialog open={!!taskReviewDialog} onOpenChange={(open) => { if (!open) setTaskReviewDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {taskReviewDialog?.decision === 'approved' ? (
                <><CheckCircle2 className="h-5 w-5 text-success" /> Approuver la demande</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> Refuser la demande</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {taskReviewDialog && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <div className="flex items-start gap-3">
                  {taskReviewDialog.req.photoUrl && (
                    <img src={taskReviewDialog.req.photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">{taskReviewDialog.req.title}</p>
                    {taskReviewDialog.req.description && <p className="text-xs text-muted-foreground">{taskReviewDialog.req.description}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <PriorityBadge priority={taskReviewDialog.req.priority} /> demandée par le client
                      {taskReviewDialog.req.besoinDate && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> nécessaire le {formatDate(taskReviewDialog.req.besoinDate)}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {taskReviewDialog?.decision === 'approved' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20 text-xs text-muted-foreground">
                <Info className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
                <p>Une sous-tâche sera créée automatiquement dans le projet et le client en sera notifié.</p>
              </div>
            )}
            <div>
              <Label htmlFor="task-review-note">Note (facultatif)</Label>
              <Textarea id="task-review-note" value={taskReviewNote} onChange={(e) => setTaskReviewNote(e.target.value)} placeholder="Motif / commentaire transmis au client..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskReviewDialog(null)}>Annuler</Button>
            <Button onClick={handleReviewTaskRequest} className={taskReviewDialog?.decision === 'approved' ? 'bg-success hover:bg-success/90' : ''} variant={taskReviewDialog?.decision === 'rejected' ? 'destructive' : 'default'}>
              {taskReviewDialog?.decision === 'approved' ? 'Confirmer l\'approbation' : 'Confirmer le refus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review modification dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) setReviewDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDialog?.decision === 'approved' ? (
                <><CheckCircle2 className="h-5 w-5 text-success" /> Approuver la modification</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> Rejeter la modification</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {reviewDialog && (
              <div className="p-3 rounded-lg bg-info/10 border border-info/20 text-xs text-muted-foreground flex items-start gap-2">
                <Info className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
                <p>
                  {reviewDialog.mod.status === 'pending_client'
                    ? 'Dernière étape : une fois validée par vous, la modification sera appliquée au projet.'
                    : reviewDialog.mod.status === 'pending' && getUser(users, reviewDialog.mod.requestedById)?.role === 'admin'
                      ? 'Cette demande vient de l’administrateur : votre validation l’appliquera directement.'
                      : reviewDialog.decision === 'approved'
                        ? 'Après votre approbation, la demande sera transmise au client pour validation finale.'
                        : 'La demande sera close avec votre décision.'}
                </p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <p className="text-xs text-muted-foreground">Champ: <span className="font-medium text-foreground">{fieldLabels[reviewDialog?.mod.field ?? ''] ?? reviewDialog?.mod.field}</span></p>
              <p className="text-xs text-muted-foreground">Demandé par: <span className="font-medium text-foreground">{reviewDialog?.mod.requestedByName}</span></p>
            </div>
            <div>
              <Label htmlFor="review-note">Note (facultatif)</Label>
              <Textarea id="review-note" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Ajouter un commentaire sur votre décision..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Annuler</Button>
            <Button onClick={handleReview} className={reviewDialog?.decision === 'approved' ? 'bg-success hover:bg-success/90' : ''} variant={reviewDialog?.decision === 'rejected' ? 'destructive' : 'default'}>
              {reviewDialog?.decision === 'approved'
                ? (reviewDialog.mod.status === 'pending_client' ? 'Valider la modification' : 'Confirmer l\'approbation')
                : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modification request dialog */}
      <Dialog open={modReqOpen} onOpenChange={setModReqOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" /> Demander une modification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-1 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {user.role !== 'admin' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
                <p>Votre demande suivra le circuit d’approbation : examinée par l’admin puis, si nécessaire, validée par le client. Vous recevrez une notification à chaque étape.</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">1. Choisissez ce que vous souhaitez modifier</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setModReq({ ...modReq, target: 'project', subtaskId: '' })} className={cn('p-3 rounded-lg border text-sm font-medium transition-all text-left', modReq.target === 'project' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-border/80 text-muted-foreground')}>
                  <FolderKanban className="h-4 w-4 mb-1.5" />
                  Le projet
                </button>
                <button type="button" onClick={() => setModReq({ ...modReq, target: 'subtask' })} disabled={project.subtasks.length === 0} className={cn('p-3 rounded-lg border text-sm font-medium transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed', modReq.target === 'subtask' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-border/80 text-muted-foreground')}>
                  <ListTodo className="h-4 w-4 mb-1.5" />
                  Une sous-tâche
                </button>
              </div>
              {modReq.target === 'subtask' && (
                <Select value={modReq.subtaskId} onValueChange={(v) => setModReq({ ...modReq, subtaskId: v, field: 'title' })}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Choisir une sous-tâche..." /></SelectTrigger>
                  <SelectContent>
                    {project.subtasks.map((st) => (
                      <SelectItem key={st.id} value={st.id}>{st.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">2. Indiquez le champ à modifier</p>
              <Select value={modReq.field} onValueChange={(v) => setModReq({ ...modReq, field: v, newValue: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(modReq.target === 'project' ? projectFields : subtaskFields).map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentModValue && (
                <div className="mt-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                  <p className="text-xs text-muted-foreground mb-1">
                    Valeur actuelle du champ « {fieldLabels[modReq.field] ?? (modReq.target === 'project' ? projectFields : subtaskFields).find((f) => f.value === modReq.field)?.label ?? modReq.field} »
                  </p>
                  <p className="text-sm">{currentModValue}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">3. Proposez la nouvelle valeur</p>
              {(modReq.field === 'priority') ? (
                <Select value={modReq.newValue} onValueChange={(v) => setModReq({ ...modReq, newValue: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              ) : (modReq.field === 'endDate' || modReq.field === 'dueDate') ? (
                <Input type="date" value={modReq.newValue} onChange={(e) => setModReq({ ...modReq, newValue: e.target.value })} />
              ) : modReq.field === 'budget' ? (
                <Input type="number" value={modReq.newValue} onChange={(e) => setModReq({ ...modReq, newValue: e.target.value })} placeholder="Ex: 50000" />
              ) : modReq.field === 'description' ? (
                <Textarea value={modReq.newValue} onChange={(e) => setModReq({ ...modReq, newValue: e.target.value })} placeholder="Nouvelle description..." rows={3} />
              ) : (
                <Input value={modReq.newValue} onChange={(e) => setModReq({ ...modReq, newValue: e.target.value })} placeholder="Nouvelle valeur..." />
              )}
            </div>
            <div>
              <Label>Raison de la modification *</Label>
              <Textarea value={modReq.reason} onChange={(e) => setModReq({ ...modReq, reason: e.target.value })} placeholder="Expliquez pourquoi cette modification est nécessaire..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModReqOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitModification} disabled={!modReq.newValue || !modReq.reason || (modReq.target === 'subtask' && !modReq.subtaskId)}>
              <Send className="h-4 w-4 mr-2" /> Soumettre la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client meeting dialog */}
      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Planifier un rendez-vous client (rapport)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-xs text-muted-foreground">
              Une fois le cadrage des tâches terminé, planifiez un rendez-vous avec le client pour présenter le rapport et valider le périmètre.
            </p>
            <div>
              <Label>Date et heure du rendez-vous</Label>
              <Input type="datetime-local" value={meetingForm.date} onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Note (facultatif)</Label>
              <Textarea value={meetingForm.note} onChange={(e) => setMeetingForm({ ...meetingForm, note: e.target.value })} rows={3} placeholder="Ex: Présentation du rapport de cadrage et validation du périmètre" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingOpen(false)}>Annuler</Button>
            <Button onClick={handleAddMeeting} disabled={!meetingForm.date}>Planifier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File viewer dialog */}
      <Dialog open={!!fileViewer} onOpenChange={(open) => !open && setFileViewer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" /> {fileViewer?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {fileViewer && fileViewer.fileType.startsWith('image/') && fileViewer.fileType !== 'image/svg+xml' ? (
              <div>
                <div className="flex justify-center mb-3">
                  <a
                    href={fileViewer.url}
                    download={fileViewer.fileName}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium px-4 py-2 hover:bg-primary/90 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger
                  </a>
                </div>
                <div className="flex items-center justify-center rounded-xl bg-muted/30 p-4 max-h-[60vh] overflow-hidden">
                  <img src={fileViewer.url} alt={fileViewer.fileName} className="max-h-[55vh] max-w-full rounded-lg object-contain" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-8 gap-3">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium">{fileViewer?.fileName}</p>
                <p className="text-xs text-muted-foreground">Ce type de fichier ne peut pas être prévisualisé.</p>
                <a
                  href={fileViewer?.url}
                  download={fileViewer?.fileName}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium px-4 py-2 hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger le fichier
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Member profile dialog */}
      <MemberProfileDialog
        user={profileUser}
        open={!!profileUser}
        onOpenChange={(o) => { if (!o) setProfileUser(null); }}
        canEdit={user.role === 'admin'}
      />

      {/* Subtask detail dialog */}
      <Suspense fallback={null}>
        <SubtaskDetailDialog
          subtask={detailSubtask ? (project.subtasks.find((st) => st.id === detailSubtask.id) ?? detailSubtask) : null}
          users={users}
          canManage={canManage}
          isProjectMember={isProjectMember}
          currentUserId={user.id}
          open={!!detailSubtask}
          allSubtasks={project.subtasks}
          onClose={() => setDetailSubtask(null)}
          onStatusChange={(subtaskId, status) => { updateSubtaskStatus(project.id, subtaskId, status); setDetailSubtask(null); }}
          onProgressChange={(subtaskId, progress) => updateSubtaskProgress(project.id, subtaskId, progress)}
          onAddComment={(subtaskId, content) => addSubtaskComment(project.id, subtaskId, content)}
          onAddDeliverable={(subtaskId, attachment) => addSubtaskAttachment(project.id, subtaskId, attachment)}
          onValidateAttachment={(subtaskId, attachmentId, action) => validateSubtaskAttachment(project.id, subtaskId, attachmentId, action)}
          onModificationRequest={handleModificationRequestFromDetail}
        />
      </Suspense>
    </AppShell>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-muted/50 text-muted-foreground flex-shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function TaskRequestStatusBadge({ status }: { status: TaskRequest['status'] }) {
  const config = {
    pending: { label: 'En attente', className: 'bg-warning/15 text-warning border-warning/30' },
    approved: { label: 'Acceptée', className: 'bg-success/15 text-success border-success/30' },
    rejected: { label: 'Refusée', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  };
  const c = config[status];
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}
