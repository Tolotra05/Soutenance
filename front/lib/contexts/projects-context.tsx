'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type {
  Project, Subtask, SubtaskStatus,
  ProjectStatus, Attachment, ModificationRequest, ModificationStatus,
  ModificationTarget, Role, CalendarEvent, ProjectVersion, TaskRequest, Priority,
  Requete, RequeteStatus, RequeteResponse, RequestStatus,
} from '@/types';
import { mockProjects } from '@/lib/mock-data';
import {
  projectApi, mapApiProject, type ApiProject,
  subtaskApi, attachmentApi, modificationApi, taskRequestApi, requeteApi,
} from '@/lib/project-api';
import { toast } from '@/hooks/use-toast';
import { useSession } from '@/lib/contexts/session-context';
import { useUsers } from '@/lib/contexts/users-context';
import { useNotifications } from '@/lib/contexts/notifications-context';

interface SubmitProjectData {
  title: string;
  description: string;
  category: string;
  budget: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  logoUrl?: string;
  attachments?: Attachment[];
  platformUsers?: string;
  desiredFeatures?: string;
  necessaryPages?: string;
  plannedFeatures?: string;
}

interface SuggestModificationData {
  projectId: string;
  subtaskId: string | null;
  target: ModificationTarget;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

interface RequestTaskData {
  title: string;
  description: string;
  priority: Priority;
  besoinDate?: string | null;
  photoUrl?: string | null;
  photoName?: string | null;
}

interface ProjectsState {
  projects: Project[];
  status: RequestStatus;
  submitProject: (data: SubmitProjectData) => void;
  validateProject: (projectId: string) => void;
  revertProjectValidation: (projectId: string) => void;
  rejectProject: (projectId: string, reason: string) => void;
  assignManager: (projectId: string, managerId: string) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  addProjectMember: (projectId: string, data: { userId: string; role: Role }) => void;
  removeProjectMember: (projectId: string, userId: string) => void;
  addSubtask: (projectId: string, data: Omit<Subtask, 'id' | 'projectId' | 'progress' | 'attachments' | 'comments' | 'createdAt'>) => void;
  updateSubtaskStatus: (projectId: string, subtaskId: string, status: SubtaskStatus) => void;
  approveSubtask: (projectId: string, subtaskId: string) => void;
  assignSubtask: (projectId: string, subtaskId: string, employeeId: string | null) => void;
  toggleTaskActive: (projectId: string, subtaskId: string) => void;
  suggestModification: (data: SuggestModificationData) => void;
  reviewModification: (projectId: string, modificationId: string, decision: 'approved' | 'rejected', note: string) => void;
  requestTask: (projectId: string, data: RequestTaskData) => void;
  reviewTaskRequest: (projectId: string, requestId: string, decision: 'approved' | 'rejected', note: string) => void;
  submitRequete: (projectId: string, data: { subtaskId?: string | null; content: string }) => void;
  answerRequete: (projectId: string, requeteId: string, data: { text: string; attachment?: Attachment | null }) => void;
  addSubtaskComment: (projectId: string, subtaskId: string, content: string) => void;
  addSubtaskAttachment: (projectId: string, subtaskId: string, attachment: Attachment) => void;
  validateSubtaskAttachment: (projectId: string, subtaskId: string, attachmentId: string, action: 'approve' | 'reject') => void;
  addProjectAttachment: (projectId: string, attachment: Attachment) => void;
  updateSubtaskProgress: (projectId: string, subtaskId: string, progress: number) => void;
  scheduleClientMeeting: (projectId: string, data: { date: string; note: string }) => void;
}

const ProjectsContext = createContext<ProjectsState | null>(null);

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider');
  return ctx;
}

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, apiToken } = useSession();
  // apiToken (from useSession(), a localStorage read resolved synchronously
  // on first render since SessionProvider is our ancestor) tells us on the
  // very first render whether real data is coming: if so, start empty +
  // 'loading' and never show the mock seed at all, instead of rendering it
  // optimistically and swapping it out once the fetch resolves.
  const [projects, setProjects] = useState<Project[]>(() => (apiToken ? [] : mockProjects));
  const [status, setStatus] = useState<RequestStatus>(() => (apiToken ? 'loading' : 'success'));
  const { users } = useUsers();
  const { pushNotification, pushNotifications } = useNotifications();

  // ---- Symfony Projects backend hydration
  // Cached separately from the client/manager id-resolution step below: the
  // network fetch only re-runs when the session (apiToken) changes, not every
  // time the `users` list changes (e.g. an admin creating an employee used to
  // re-trigger a full GET /api/projects for no reason).
  const [apiProjectsRaw, setApiProjectsRaw] = useState<ApiProject[] | null>(null);

  const refetchProjects = useCallback(() => {
    if (!apiToken) {
      // Logged out: reset to the demo seed, don't leave a previous user's
      // real projects on screen.
      setApiProjectsRaw(null);
      setProjects(mockProjects);
      setStatus('success');
      return;
    }
    setStatus('loading');
    // MAX_PAGE_LIMIT server-side is 200; the UI doesn't paginate yet, so pull
    // everything in one page for now while the API itself is pagination-ready.
    projectApi.list({ limit: 200 })
      .then(({ data }) => setApiProjectsRaw(data))
      .catch(() => { /* keep the existing frontend data if the backend is offline */ })
      .finally(() => setStatus('success'));
  }, [apiToken]);

  useEffect(() => {
    let cancelled = false;
    const guarded = () => { if (!cancelled) refetchProjects(); };
    guarded();
    return () => { cancelled = true; };
  }, [refetchProjects]);

  // BFCache restore (back/forward) and long-idle-tab refocus: refetch
  // instead of trusting whatever was last in memory/restored by the browser.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) refetchProjects(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') refetchProjects(); };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refetchProjects]);

  useEffect(() => {
    if (!apiProjectsRaw) return;
    setProjects((prev) => apiProjectsRaw.map((item) => {
      const existing = prev.find((p) => p.id === String(item.id));
      const mapped = mapApiProject(item, existing);
      const client = item.client ? users.find((u) => u.email.toLowerCase() === item.client!.email.toLowerCase()) : undefined;
      const manager = item.manager ? users.find((u) => u.email.toLowerCase() === item.manager!.email.toLowerCase()) : undefined;
      return { ...mapped, clientId: client?.id || mapped.clientId, managerId: manager?.id || mapped.managerId };
    }));
  }, [apiProjectsRaw, users]);

  // ---- Project actions
  const submitProject: ProjectsState['submitProject'] = useCallback(async (data) => {
    const submittedByAdmin = currentUser?.role === 'admin';
    const newProject: Project = {
      id: `p-${Date.now()}`,
      title: data.title,
      description: data.description,
      clientId: currentUser?.id ?? 'u-cli-1',
      status: submittedByAdmin ? 'validated' : 'pending',
      priority: data.priority,
      managerId: null,
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      progress: 0,
      category: data.category,
      logoUrl: data.logoUrl,
      attachments: data.attachments ?? [],
      members: [{ userId: currentUser?.id ?? 'u-cli-1', role: 'client', joinedAt: new Date().toISOString() }],
      subtasks: [],
      progressTimeline: [],
      calendarEvents: [],
      modifications: [],
      taskRequests: [],
      requetes: [],
      platformUsers: data.platformUsers,
      desiredFeatures: data.desiredFeatures,
      necessaryPages: data.necessaryPages,
      plannedFeatures: data.plannedFeatures,
      clientMeeting: null,
      createdAt: new Date().toISOString(),
    };

    let createdProjectId = newProject.id;
    if (apiToken) {
      try {
        const created = await projectApi.create(data);
        createdProjectId = String(created.id);
        setProjects((prev) => [mapApiProject(created), ...prev]);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la soumission', description: err?.message || 'Le projet n\'a pas pu être enregistré sur le serveur.' });
        return;
      }
    } else {
      setProjects((prev) => [newProject, ...prev]);
    }

    if (!submittedByAdmin) {
      pushNotification({
        userId: 'u-admin-1', type: 'project_submitted', title: 'Nouveau projet soumis',
        message: `« ${data.title} » attend validation.`, projectId: createdProjectId,
      });
    }
  }, [currentUser, apiToken, pushNotification]);

  /** Runs a Symfony call when authenticated; returns false (and toasts) on failure without touching local state. */
  const callBackend = useCallback(async (action: () => Promise<unknown>, errorTitle: string): Promise<boolean> => {
    if (!apiToken) return true; // offline/demo mode: caller applies the local-only change
    try {
      await action();
      return true;
    } catch (err: any) {
      toast({ variant: 'destructive', title: errorTitle, description: err?.message || 'Le serveur a refusé cette action.' });
      return false;
    }
  }, [apiToken]);

  /** Replaces one subtask (by id) inside its project with the server's version, or appends it if new. */
  const mergeSubtask = useCallback((projectId: string, subtask: Subtask) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const exists = p.subtasks.some((st) => st.id === subtask.id);
      const subtasks = exists ? p.subtasks.map((st) => (st.id === subtask.id ? subtask : st)) : [...p.subtasks, subtask];
      const active = subtasks.filter((st) => st.status !== 'cancelled');
      const progress = active.length > 0 ? Math.round(active.reduce((acc, st) => acc + st.progress, 0) / active.length) : p.progress;
      return { ...p, subtasks, progress };
    }));
  }, []);

  const validateProject: ProjectsState['validateProject'] = useCallback(async (projectId) => {
    if (!(await callBackend(() => projectApi.validate(projectId), 'Échec de la validation'))) return;
    setProjects((prev) => prev.map((p) =>
      p.id === projectId ? { ...p, status: 'validated' as ProjectStatus } : p
    ));
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      pushNotification({ userId: proj.clientId, type: 'project_validated', title: 'Projet validé', message: `Votre projet « ${proj.title} » a été validé.`, projectId });
    }
  }, [projects, callBackend, pushNotification]);

  const revertProjectValidation: ProjectsState['revertProjectValidation'] = useCallback(async (projectId) => {
    if (!(await callBackend(() => projectApi.updateStatus(projectId, 'pending'), 'Échec de l\'annulation'))) return;
    setProjects((prev) => prev.map((p) =>
      p.id === projectId ? { ...p, status: 'pending' as ProjectStatus, statusChangedAt: null } : p
    ));
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      pushNotification({ userId: proj.clientId, type: 'project_validation_reverted', title: 'Validation annulée', message: `La validation de « ${proj.title} » a été annulée : le projet repasse en attente de validation.`, projectId });
    }
  }, [projects, callBackend, pushNotification]);

  const rejectProject: ProjectsState['rejectProject'] = useCallback(async (projectId, reason) => {
    if (!(await callBackend(() => projectApi.reject(projectId, reason), 'Échec du rejet'))) return;
    setProjects((prev) => prev.map((p) =>
      p.id === projectId ? { ...p, status: 'rejected' as ProjectStatus, rejectionReason: reason, statusChangedAt: new Date().toISOString() } : p
    ));
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      pushNotification({ userId: proj.clientId, type: 'project_rejected', title: 'Projet rejeté', message: `Votre projet « ${proj.title} » a été rejeté.`, projectId });
    }
  }, [projects, callBackend, pushNotification]);

  const updateProjectStatus: ProjectsState['updateProjectStatus'] = useCallback(async (projectId, status) => {
    if (!(await callBackend(() => projectApi.updateStatus(projectId, status), 'Échec de la mise à jour du statut'))) return;
    setProjects((prev) => prev.map((p) =>
      p.id === projectId
        ? {
            ...p,
            status,
            statusChangedAt: (status === 'completed' || status === 'rejected')
              ? new Date().toISOString()
              : p.statusChangedAt ?? null,
          }
        : p
    ));
    const project = projects.find((p) => p.id === projectId);
    if (
      project &&
      status === 'completed' &&
      (project.status === 'in_progress' || project.status === 'assigned' || project.status === 'validated')
    ) {
      const members = project.members.map((m) => m.userId);
      if (project.managerId) members.push(project.managerId);
      pushNotifications(members, { type: 'project_completed', title: 'Projet terminé', message: `Le projet « ${project.title} » marqué comme terminé.`, projectId });
    }
  }, [projects, callBackend, pushNotifications]);

  const assignManager: ProjectsState['assignManager'] = useCallback(async (projectId, managerId) => {
    const manager = users.find((u) => u.id === managerId);
    if (!(await callBackend(() => projectApi.assign(projectId, manager?.email || managerId), 'Échec de l\'assignation'))) return;
    setProjects((prev) => prev.map((p) =>
      p.id === projectId
        ? {
            ...p,
            status: 'assigned' as ProjectStatus,
            managerId,
            members: [...p.members.filter((m) => m.role !== 'chef_de_projet'), { userId: managerId, role: 'chef_de_projet' as const, joinedAt: new Date().toISOString() }],
          }
        : p
    ));
    pushNotification({ userId: managerId, type: 'subtask_assigned', title: 'Projet assigné', message: `Un nouveau projet vous a été assigné.`, projectId });
  }, [callBackend, users, pushNotification]);

  // ---- Member management
  const addProjectMember: ProjectsState['addProjectMember'] = useCallback(async (projectId, data) => {
    const member = users.find((u) => u.id === data.userId);
    if (!(await callBackend(() => projectApi.addMember(projectId, { ...data, userId: member?.email || data.userId }), "Échec de l'ajout du membre"))) return;
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      if (p.members.some((m) => m.userId === data.userId)) return p;
      return {
        ...p,
        members: [...p.members, { userId: data.userId, role: data.role, joinedAt: new Date().toISOString() }],
      };
    }));
    pushNotification({ userId: data.userId, type: 'member_added', title: 'Ajouté à un projet', message: `Vous avez été ajouté à un projet.`, projectId });
  }, [callBackend, users, pushNotification]);

  const removeProjectMember: ProjectsState['removeProjectMember'] = useCallback(async (projectId, userId) => {
    if (!(await callBackend(() => projectApi.removeMember(projectId, userId), 'Échec du retrait du membre'))) return;
    setProjects((prev) => prev.map((p) =>
      p.id === projectId
        ? { ...p, members: p.members.filter((m) => m.userId !== userId) }
        : p
    ));
  }, [callBackend]);

  // ---- Subtask actions
  const addSubtask: ProjectsState['addSubtask'] = useCallback(async (projectId, data) => {
    if (apiToken) {
      try {
        const created = await subtaskApi.create(projectId, data);
        mergeSubtask(projectId, created);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la création de la sous-tâche', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      const newSubtask: Subtask = {
        ...data,
        id: `st-${Date.now()}`,
        projectId,
        progress: 0,
        attachments: [],
        comments: [],
        isActive: false,
        workSessions: [],
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => prev.map((p) =>
        p.id === projectId
          ? (() => {
              const subtasks = [...p.subtasks, newSubtask];
              const totalProgress = subtasks.length > 0
                ? Math.round(subtasks.filter((st) => st.status !== 'cancelled').reduce((acc, st) => acc + st.progress, 0) / subtasks.filter((st) => st.status !== 'cancelled').length)
                : 0;
              return {
                ...p,
                status: p.status === 'assigned' ? ('in_progress' as ProjectStatus) : p.status,
                subtasks,
                members: data.assignedToId && !p.members.some((m) => m.userId === data.assignedToId)
                  ? [...p.members, { userId: data.assignedToId, role: 'membre' as const, joinedAt: new Date().toISOString() }]
                  : p.members,
                progress: totalProgress,
              };
            })()
          : p
      ));
    }
    if (data.assignedToId) {
      pushNotification({ userId: data.assignedToId, type: 'subtask_assigned', title: 'Nouvelle sous-tâche', message: `Vous avez été assigné à « ${data.title} ».`, projectId });
    }
  }, [apiToken, mergeSubtask, pushNotification]);

  const updateSubtaskStatus: ProjectsState['updateSubtaskStatus'] = useCallback(async (projectId, subtaskId, status) => {
    if (apiToken) {
      try {
        const updated = await subtaskApi.updateStatus(subtaskId, status);
        mergeSubtask(projectId, updated);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la mise à jour', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      setProjects((prev) => prev.map((p) => {
        if (p.id !== projectId) return p;
        const updatedSubtasks = p.subtasks.map((st) => {
          if (st.id !== subtaskId) return st;
          let next: Subtask = { ...st, status, progress: status === 'done' ? 100 : status === 'review' ? Math.max(st.progress, 85) : st.progress };
          if (st.isActive && status !== 'in_progress') {
            const endedAt = new Date().toISOString();
            next = {
              ...next,
              isActive: false,
              workSessions: (st.workSessions ?? []).map((s) =>
                s.end === null
                  ? { ...s, end: endedAt, duration: Math.max(0, Math.floor((Date.now() - new Date(s.start).getTime()) / 1000)) }
                  : s
              ),
            };
          }
          return next;
        });
        const active = updatedSubtasks.filter((st) => st.status !== 'cancelled');
        const totalProgress = active.length > 0
          ? Math.round(active.reduce((acc, st) => acc + st.progress, 0) / active.length)
          : 0;
        const isCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.status === 'done');
        return {
          ...p,
          subtasks: updatedSubtasks,
          progress: totalProgress,
          status: isCompleted ? ('completed' as ProjectStatus) : p.status,
        };
      }));
    }
    const proj = projects.find((p) => p.id === projectId);
    const st = proj?.subtasks.find((s) => s.id === subtaskId);
    if (proj && st && status === 'review') {
      const notifyIds = [proj.managerId, 'u-admin-1'].filter((id): id is string => !!id && id !== currentUser?.id);
      notifyIds.forEach((uid) => {
        pushNotification({ userId: uid, type: 'subtask_reviewed', title: 'Sous-tâche à valider', message: `« ${st.title} » est terminée et attend votre validation.`, projectId });
      });
    }
  }, [apiToken, mergeSubtask, projects, currentUser, pushNotification]);

  const approveSubtask: ProjectsState['approveSubtask'] = useCallback(async (projectId, subtaskId) => {
    if (apiToken) {
      try {
        const updated = await subtaskApi.approve(subtaskId);
        mergeSubtask(projectId, updated);
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Échec de l'approbation", description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      setProjects((prev) => prev.map((p) => {
        if (p.id !== projectId) return p;
        const updatedSubtasks = p.subtasks.map((st) =>
          st.id === subtaskId
            ? { ...st, status: 'done' as SubtaskStatus, progress: 100 }
            : st
        );
        const active = updatedSubtasks.filter((st) => st.status !== 'cancelled');
        const totalProgress = active.length > 0
          ? Math.round(active.reduce((acc, st) => acc + st.progress, 0) / active.length)
          : 0;
        const isCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.status === 'done');
        return {
          ...p,
          subtasks: updatedSubtasks,
          progress: totalProgress,
          status: isCompleted ? ('completed' as ProjectStatus) : p.status,
        };
      }));
    }
    const proj = projects.find((p) => p.id === projectId);
    const st = proj?.subtasks.find((s) => s.id === subtaskId);
    if (proj && st) {
      const notifyIds = [st.assignedToId, proj.clientId].filter((id): id is string => !!id && id !== currentUser?.id);
      notifyIds.forEach((uid) => {
        pushNotification({ userId: uid, type: 'subtask_reviewed', title: 'Sous-tâche validée', message: `Votre sous-tâche « ${st.title} » a été validée.`, projectId });
      });
    }
  }, [apiToken, mergeSubtask, projects, currentUser, pushNotification]);

  const assignSubtask: ProjectsState['assignSubtask'] = useCallback(async (projectId, subtaskId, employeeId) => {
    if (apiToken) {
      try {
        const updated = await subtaskApi.assign(subtaskId, employeeId);
        mergeSubtask(projectId, updated);
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Échec de l'assignation", description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      setProjects((prev) => prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          subtasks: p.subtasks.map((st) => st.id === subtaskId ? { ...st, assignedToId: employeeId } : st),
          members: employeeId && !p.members.some((m) => m.userId === employeeId)
            ? [...p.members, { userId: employeeId, role: 'membre' as const, joinedAt: new Date().toISOString() }]
            : p.members,
        };
      }));
    }
    if (employeeId && employeeId !== currentUser?.id) {
      const proj = projects.find((p) => p.id === projectId);
      const st = proj?.subtasks.find((s) => s.id === subtaskId);
      pushNotification({ userId: employeeId, type: 'subtask_assigned', title: 'Tâche assignée', message: `Vous avez été assigné à « ${st?.title ?? 'une tâche'} ».`, projectId });
    }
  }, [apiToken, mergeSubtask, projects, currentUser, pushNotification]);

  // ---- Pause / Resume task (timer)
  const toggleTaskActive: ProjectsState['toggleTaskActive'] = useCallback(async (projectId, subtaskId) => {
    if (apiToken) {
      try {
        const updated = await subtaskApi.toggleTimer(subtaskId);
        mergeSubtask(projectId, updated);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec du minuteur', description: err?.message || 'Le serveur a refusé cette action.' });
      }
      return;
    }
    const now = new Date();
    setProjects((prev) => prev.map((p) =>
      p.id === projectId
        ? {
            ...p,
            subtasks: p.subtasks.map((st) => {
              if (st.id !== subtaskId) return st;
              const sessions = st.workSessions ?? [];
              // Resume: start a new session
              if (!st.isActive) {
                return {
                  ...st,
                  isActive: true,
                  status: st.status === 'done' ? st.status : 'in_progress' as SubtaskStatus,
                  workSessions: [...sessions, { start: now.toISOString(), end: null, duration: 0 }],
                };
              }
              // Pause: close the running session
              const closed = sessions.map((s) =>
                s.end === null
                  ? { ...s, end: now.toISOString(), duration: Math.max(0, Math.floor((now.getTime() - new Date(s.start).getTime()) / 1000)) }
                  : s
              );
              return {
                ...st,
                isActive: false,
                workSessions: closed,
              };
            }),
          }
        : p
    ));
  }, [apiToken, mergeSubtask]);

  // ---- Modification requests
  // The approval-chain logic (who validates after whom, when a change gets
  // applied) now lives server-side (ModificationWorkflowService) -- these
  // just call the API and reflect its authoritative response. Local-only
  // fallback (no apiToken) keeps the original client-side chain.
  const suggestModification: ProjectsState['suggestModification'] = useCallback(async (data) => {
    if (!currentUser) return;
    if (apiToken) {
      try {
        const created = await modificationApi.create(data.projectId, data);
        setProjects((prev) => prev.map((p) =>
          p.id === data.projectId ? { ...p, modifications: [created, ...p.modifications] } : p
        ));
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la demande', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      const mod: ModificationRequest = {
        id: `mod-${Date.now()}`,
        projectId: data.projectId,
        subtaskId: data.subtaskId,
        target: data.target,
        requestedById: currentUser.id,
        requestedByName: currentUser.name,
        field: data.field,
        oldValue: data.oldValue,
        newValue: data.newValue,
        reason: data.reason,
        status: 'pending',
        reviewedById: null,
        reviewNote: '',
        teamReview: null,
        clientReview: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      };
      setProjects((prev) => prev.map((p) =>
        p.id === data.projectId ? { ...p, modifications: [mod, ...p.modifications] } : p
      ));
    }
    const proj = projects.find((p) => p.id === data.projectId);
    const notifyUserId = currentUser.role === 'admin' && proj
      ? proj.clientId
      : 'u-admin-1';
    pushNotification({ userId: notifyUserId, type: 'modification_requested', title: 'Demande de modification', message: `${currentUser.name} demande une modification sur ${data.target === 'project' ? 'le projet' : 'une sous-tâche'}.`, projectId: data.projectId });
  }, [currentUser, apiToken, projects, pushNotification]);

  const reviewModification: ProjectsState['reviewModification'] = useCallback(async (projectId, modificationId, decision, note) => {
    if (!currentUser) return;
    const proj = projects.find((p) => p.id === projectId);
    const mod = proj?.modifications.find((m) => m.id === modificationId);
    if (!proj || !mod) return;

    if (apiToken) {
      let updated: ModificationRequest;
      try {
        updated = await modificationApi.review(modificationId, decision, note);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la révision', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
      setProjects((prev) => prev.map((p) => {
        if (p.id !== projectId) return p;
        const mods = p.modifications.map((m) => (m.id === modificationId ? updated : m));
        // Status "approved" means the server actually applied the change
        // (see ModificationWorkflowService::applyChange) -- mirror it locally.
        let subtasks = p.subtasks;
        let projPatch: Partial<typeof p> = {};
        if (updated.status === 'approved') {
          if (updated.subtaskId && updated.target === 'subtask') {
            subtasks = subtasks.map((st) => {
              if (st.id !== updated.subtaskId) return st;
              if (updated.field === 'title') return { ...st, title: updated.newValue };
              if (updated.field === 'description') return { ...st, description: updated.newValue };
              if (updated.field === 'dueDate') return { ...st, dueDate: new Date(updated.newValue).toISOString() };
              if (updated.field === 'priority') return { ...st, priority: updated.newValue as Subtask['priority'] };
              return st;
            });
          } else if (updated.target === 'project') {
            if (updated.field === 'title') projPatch.title = updated.newValue;
            else if (updated.field === 'description') projPatch.description = updated.newValue;
            else if (updated.field === 'endDate') projPatch.endDate = new Date(updated.newValue).toISOString();
            else if (updated.field === 'priority') projPatch.priority = updated.newValue as Project['priority'];
            else if (updated.field === 'budget') projPatch.budget = parseInt(updated.newValue) || 0;
          }
        }
        return { ...p, ...projPatch, modifications: mods, subtasks };
      }));

      if (updated.status === 'pending_client') {
        pushNotification({ userId: proj.clientId, type: 'modification_requested', title: 'Approbation requise', message: `La demande de modification (${mod.field}) a été approuvée par l'équipe et attend votre validation finale.`, projectId });
      }
      if (updated.status === 'approved' || updated.status === 'rejected') {
        pushNotification({ userId: mod.requestedById, type: 'modification_reviewed', title: updated.status === 'approved' ? 'Modification approuvée' : 'Modification rejetée', message: `Votre demande de modification (${mod.field}) a été ${updated.status === 'approved' ? 'approuvée' : 'rejetée'}.`, projectId });
      }
      return;
    }

    // ---- Offline/demo fallback: replicate the same approval chain locally.
    const approver = currentUser;
    const requester = users.find((u) => u.id === mod.requestedById);
    const requesterRole = requester?.role;
    const isAdminRequester = requesterRole === 'admin';
    const isClientApprover = approver.role === 'client';
    const isAdminApprover = approver.role === 'admin';

    let nextStatus: ModificationStatus;
    let apply = false;
    let notifyClientPending = false;

    if (decision === 'rejected') {
      nextStatus = 'rejected';
    } else if (isAdminRequester || requesterRole === 'client') {
      nextStatus = 'approved';
      apply = true;
    } else if (isAdminApprover) {
      nextStatus = 'pending_client';
      notifyClientPending = true;
    } else {
      nextStatus = 'approved';
      apply = true;
    }

    const review = { userId: approver.id, note, at: new Date().toISOString() };

    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const mods = p.modifications.map((m) =>
        m.id === modificationId
          ? {
              ...m,
              status: nextStatus,
              reviewedById: approver.id,
              reviewNote: note,
              reviewedAt: review.at,
              teamReview: (isAdminApprover && decision === 'approved' && !isAdminRequester) ? review : (m.teamReview ?? null),
              clientReview: isClientApprover ? review : (m.clientReview ?? null),
            }
          : m
      );
      let subtasks = p.subtasks;
      let projPatch: Partial<typeof p> = {};
      if (apply) {
        const m = mods.find((x) => x.id === modificationId);
        const version: ProjectVersion = {
          id: `ver-${Date.now()}`,
          title: p.title,
          description: p.description,
          startDate: p.startDate,
          endDate: p.endDate,
          budget: p.budget,
          priority: p.priority,
          category: p.category,
          subtasks: p.subtasks,
          capturedAt: new Date().toISOString(),
          reason: mod.reason,
        };
        projPatch.versions = [...(p.versions ?? []), version];
        if (m && m.subtaskId && m.target === 'subtask') {
          subtasks = subtasks.map((st) => {
            if (st.id !== m.subtaskId) return st;
            if (m.field === 'title') return { ...st, title: m.newValue };
            if (m.field === 'description') return { ...st, description: m.newValue };
            if (m.field === 'dueDate') return { ...st, dueDate: new Date(m.newValue).toISOString() };
            if (m.field === 'priority') return { ...st, priority: m.newValue as Subtask['priority'] };
            return st;
          });
        } else if (m && m.target === 'project') {
          if (m.field === 'title') projPatch.title = m.newValue;
          else if (m.field === 'description') projPatch.description = m.newValue;
          else if (m.field === 'endDate') projPatch.endDate = new Date(m.newValue).toISOString();
          else if (m.field === 'priority') projPatch.priority = m.newValue as Project['priority'];
          else if (m.field === 'budget') projPatch.budget = parseInt(m.newValue) || 0;
        }
      }
      return { ...p, ...projPatch, modifications: mods, subtasks };
    }));

    if (notifyClientPending) {
      pushNotification({ userId: proj.clientId, type: 'modification_requested', title: 'Approbation requise', message: `La demande de modification (${mod.field}) a été approuvée par l'équipe et attend votre validation finale.`, projectId });
    }
    if (nextStatus === 'approved' || nextStatus === 'rejected') {
      pushNotification({ userId: mod.requestedById, type: 'modification_reviewed', title: nextStatus === 'approved' ? 'Modification approuvée' : 'Modification rejetée', message: `Votre demande de modification (${mod.field}) a été ${nextStatus === 'approved' ? 'approuvée' : 'rejetée'}.`, projectId });
    }
  }, [currentUser, apiToken, users, projects, pushNotification]);

  // ---- Client task requests (validated by the admin)
  const requestTask: ProjectsState['requestTask'] = useCallback(async (projectId, data) => {
    if (!currentUser || currentUser.role !== 'client' || !data.title.trim()) return;
    const proj = projects.find((p) => p.id === projectId);
    if (!proj || proj.clientId !== currentUser.id) return;

    if (apiToken) {
      try {
        const created = await taskRequestApi.create(projectId, data);
        setProjects((prev) => prev.map((p) =>
          p.id === projectId ? { ...p, taskRequests: [created, ...p.taskRequests] } : p
        ));
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la demande', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      const request: TaskRequest = {
        id: `tr-${Date.now()}`,
        projectId,
        clientId: currentUser.id,
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority,
        besoinDate: data.besoinDate || null,
        photoUrl: data.photoUrl || null,
        photoName: data.photoName || null,
        status: 'pending',
        reviewedById: null,
        reviewedAt: null,
        reviewNote: '',
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => prev.map((p) =>
        p.id === projectId ? { ...p, taskRequests: [request, ...p.taskRequests] } : p
      ));
    }
    pushNotification({
      userId: 'u-admin-1',
      type: 'task_requested',
      title: 'Demande de tâche client',
      message: `« ${proj.title} » : ${currentUser.name} demande une nouvelle tâche « ${data.title.trim()} ».`,
      projectId,
    });
  }, [currentUser, apiToken, projects, pushNotification]);

  const reviewTaskRequest: ProjectsState['reviewTaskRequest'] = useCallback(async (projectId, requestId, decision, note) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'chef_de_projet')) return;
    const proj = projects.find((p) => p.id === projectId);
    const req = proj?.taskRequests.find((r) => r.id === requestId);
    if (!proj || !req || req.status !== 'pending') return;

    if (apiToken) {
      let updated: TaskRequest & { createdSubtask: Subtask | null };
      try {
        updated = await taskRequestApi.review(requestId, decision, note);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la révision', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
      setProjects((prev) => prev.map((p) => {
        if (p.id !== projectId) return p;
        const taskRequests = p.taskRequests.map((r) => (r.id === requestId ? updated : r));
        const subtasks = updated.createdSubtask ? [...p.subtasks, updated.createdSubtask] : p.subtasks;
        const active = subtasks.filter((st) => st.status !== 'cancelled');
        const progress = active.length > 0 ? Math.round(active.reduce((acc, st) => acc + st.progress, 0) / active.length) : p.progress;
        return {
          ...p,
          taskRequests,
          subtasks,
          progress,
          status: updated.createdSubtask && p.status === 'assigned' ? 'in_progress' : p.status,
        };
      }));
    } else {
      const reviewedAt = new Date().toISOString();
      setProjects((prev) => prev.map((p) => {
        if (p.id !== projectId) return p;
        let subtasks = p.subtasks;
        let projPatch: Partial<typeof p> = {};
        if (decision === 'approved') {
          const requestedEnd = req.besoinDate ? new Date(req.besoinDate).getTime() : 0;
          const projectEnd = new Date(p.endDate).getTime();
          const dueDate = req.besoinDate && requestedEnd < projectEnd
            ? new Date(req.besoinDate).toISOString()
            : p.endDate;
          const newSubtask: Subtask = {
            id: `st-${Date.now()}`,
            projectId,
            title: req.title,
            description: req.description,
            status: 'todo',
            priority: req.priority,
            assignedToId: null,
            dependsOnId: null,
            startDate: new Date().toISOString(),
            dueDate,
            progress: 0,
            attachments: [],
            comments: [],
            isActive: false,
            workSessions: [],
            createdAt: reviewedAt,
          };
          subtasks = [...p.subtasks, newSubtask];
          projPatch = { status: p.status === 'assigned' ? ('in_progress' as ProjectStatus) : p.status };
        }
        const active = subtasks.filter((st) => st.status !== 'cancelled');
        const totalProgress = active.length > 0
          ? Math.round(active.reduce((acc, st) => acc + st.progress, 0) / active.length)
          : 0;
        const taskRequests = p.taskRequests.map((r) =>
          r.id === requestId
            ? { ...r, status: decision, reviewedById: currentUser.id, reviewedAt, reviewNote: note }
            : r
        );
        return { ...p, ...projPatch, taskRequests, subtasks, progress: totalProgress };
      }));
    }
    pushNotification({
      userId: proj.clientId,
      type: decision === 'approved' ? 'task_request_approved' : 'task_request_rejected',
      title: decision === 'approved' ? 'Tâche ajoutée' : 'Demande refusée',
      message: decision === 'approved'
        ? `Votre demande « ${req.title} » a été acceptée et ajoutée au projet « ${proj.title} ».`
        : `Votre demande « ${req.title} » a été refusée${note ? ` : ${note}` : ''}.`,
      projectId,
    });
  }, [currentUser, apiToken, projects, pushNotification]);

  // ---- Requêtes (l'équipe demande au client une photo / un fichier / une information)
  const submitRequete: ProjectsState['submitRequete'] = useCallback(async (projectId, data) => {
    if (!currentUser || currentUser.role === 'client' || !data.content.trim()) return;
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;

    if (apiToken) {
      try {
        const created = await requeteApi.create(projectId, data);
        setProjects((prev) => prev.map((p) =>
          p.id === projectId ? { ...p, requetes: [created, ...p.requetes] } : p
        ));
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de l\'envoi', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      const requete: Requete = {
        id: `rq-${Date.now()}`,
        projectId,
        subtaskId: data.subtaskId || null,
        createdById: currentUser.id,
        createdByName: currentUser.name,
        content: data.content.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        respondedAt: null,
        response: null,
      };
      setProjects((prev) => prev.map((p) =>
        p.id === projectId ? { ...p, requetes: [requete, ...p.requetes] } : p
      ));
    }
    pushNotification({
      userId: proj.clientId,
      type: 'requete_created',
      title: 'Nouvelle requête',
      message: `${currentUser.name} vous demande : « ${data.content.trim()} » (projet « ${proj.title} »).`,
      projectId,
    });
  }, [currentUser, apiToken, projects, pushNotification]);

  const answerRequete: ProjectsState['answerRequete'] = useCallback(async (projectId, requeteId, data) => {
    if (!currentUser || currentUser.role !== 'client') return;
    const proj = projects.find((p) => p.id === projectId);
    const requete = proj?.requetes.find((r) => r.id === requeteId);
    if (!proj || !requete || requete.status !== 'pending' || proj.clientId !== currentUser.id) return;

    if (apiToken) {
      try {
        const updated = await requeteApi.answer(requeteId, data);
        setProjects((prev) => prev.map((p) =>
          p.id === projectId ? { ...p, requetes: p.requetes.map((r) => (r.id === requeteId ? updated : r)) } : p
        ));
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la réponse', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      const at = new Date().toISOString();
      const response: RequeteResponse = {
        text: data.text.trim(),
        ...(data.attachment
          ? {
              attachmentUrl: data.attachment.url,
              attachmentName: data.attachment.fileName,
              attachmentType: data.attachment.fileType,
            }
          : {}),
        at,
      };
      setProjects((prev) => prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              requetes: p.requetes.map((r) =>
                r.id === requeteId
                  ? { ...r, status: 'answered' as RequeteStatus, respondedAt: at, response }
                  : r
              ),
            }
          : p
      ));
    }
    pushNotification({
      userId: requete.createdById,
      type: 'requete_answered',
      title: 'Requête répondue',
      message: `Le client a répondu à votre requête sur « ${proj.title} »${data.text ? ` : « ${data.text} »` : ''}.`,
      projectId,
    });
  }, [currentUser, apiToken, projects, pushNotification]);

  // ---- Task comments
  const addSubtaskComment: ProjectsState['addSubtaskComment'] = useCallback(async (projectId, subtaskId, content) => {
    if (!currentUser || !content.trim()) return;
    const project = projects.find((p) => p.id === projectId);
    const subtask = project?.subtasks.find((st) => st.id === subtaskId);

    if (apiToken) {
      try {
        const created = await subtaskApi.addComment(subtaskId, content);
        setProjects((prev) => prev.map((p) =>
          p.id === projectId
            ? { ...p, subtasks: p.subtasks.map((st) => (st.id === subtaskId ? { ...st, comments: [...st.comments, created] } : st)) }
            : p
        ));
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Échec de l'envoi du commentaire", description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      const newComment = {
        id: `c-${Date.now()}`,
        subtaskId,
        authorId: currentUser.id,
        content,
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              subtasks: p.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, comments: [...st.comments, newComment] } : st
              ),
            }
          : p
      ));
    }
    // Notify everyone concerned by the project (members, manager, client) except the author
    if (project) {
      const concerned = new Set<string>();
      project.members.forEach((m) => concerned.add(m.userId));
      if (project.managerId) concerned.add(project.managerId);
      if (subtask?.assignedToId) concerned.add(subtask.assignedToId);
      const recipients = Array.from(concerned).filter((uid) => uid !== currentUser.id);
      pushNotifications(recipients, {
        type: 'task_comment',
        title: 'Nouveau commentaire',
        message: `${currentUser.name} a commenté « ${subtask?.title ?? 'une tâche'} » : « ${content.slice(0, 90)}${content.length > 90 ? '…' : ''} »`,
        projectId,
      });
    }
  }, [currentUser, apiToken, projects, pushNotifications]);

  // ---- Task attachments (deliverables)
  const addSubtaskAttachment: ProjectsState['addSubtaskAttachment'] = useCallback((projectId, subtaskId, attachment) => {
    setProjects((prev) => prev.map((p) =>
      p.id === projectId
        ? {
            ...p,
            subtasks: p.subtasks.map((st) =>
              st.id === subtaskId
                ? { ...st, attachments: [...st.attachments, { ...attachment, validationStatus: 'pending' }] }
                : st
            ),
          }
        : p
    ));
  }, []);

  // ---- Validate a member deliverable (admin / chef de projet)
  const validateSubtaskAttachment: ProjectsState['validateSubtaskAttachment'] = useCallback(async (projectId, subtaskId, attachmentId, action) => {
    if (!currentUser) return;

    if (apiToken) {
      try {
        const updated = await attachmentApi.validate(attachmentId, action);
        setProjects((prev) => prev.map((p) =>
          p.id === projectId
            ? { ...p, subtasks: p.subtasks.map((st) => (st.id === subtaskId ? { ...st, attachments: st.attachments.map((a) => (a.id === attachmentId ? updated : a)) } : st)) }
            : p
        ));
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la validation', description: err?.message || 'Le serveur a refusé cette action.' });
        return;
      }
    } else {
      setProjects((prev) => prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              subtasks: p.subtasks.map((st) =>
                st.id === subtaskId
                  ? {
                      ...st,
                      attachments: st.attachments.map((att) =>
                        att.id === attachmentId
                          ? { ...att, validationStatus: action === 'approve' ? 'approved' : 'rejected', validatedBy: currentUser.id, validatedAt: new Date().toISOString() }
                          : att
                      ),
                    }
                  : st
              ),
            }
          : p
      ));
    }
    const proj = projects.find((p) => p.id === projectId);
    const st = proj?.subtasks.find((s) => s.id === subtaskId);
    const att = st?.attachments.find((a) => a.id === attachmentId);
    if (!proj || !att) return;
    if (action === 'reject') {
      const recipients = Array.from(new Set([att.uploadedBy, ...(proj.managerId ? [proj.managerId] : [])].filter(Boolean)));
      pushNotifications(recipients as string[], { type: 'task_comment', title: 'Livrable refusé', message: `« ${att.fileName} » sur « ${st?.title} » a été refusé. Merci de le reprendre.`, projectId });
    } else {
      const recipients = Array.from(new Set([att.uploadedBy, ...(proj.managerId ? [proj.managerId] : [])].filter(Boolean)));
      pushNotifications(recipients as string[], { type: 'subtask_reviewed', title: 'Livrable validé', message: `« ${att.fileName} » sur « ${st?.title} » a été validé.`, projectId });
    }
  }, [currentUser, apiToken, projects, pushNotifications]);

  // ---- Project attachment (client adds a file forgot during submission)
  const addProjectAttachment: ProjectsState['addProjectAttachment'] = useCallback((projectId, attachment) => {
    setProjects((prev) => prev.map((p) =>
      p.id === projectId
        ? { ...p, attachments: [...p.attachments, attachment] }
        : p
    ));
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    const admins = users.filter((u) => u.role === 'admin').map((u) => u.id);
    const recipients = Array.from(new Set([...admins, ...(proj.managerId ? [proj.managerId] : [])]));
    pushNotifications(recipients, { type: 'project_attachment', title: 'Nouvelle pièce jointe', message: `« ${attachment.fileName} » a été ajoutée au projet « ${proj.title} » par le client.`, projectId });
  }, [projects, users, pushNotifications]);

  // ---- Manual progress update
  const updateSubtaskProgress: ProjectsState['updateSubtaskProgress'] = useCallback(async (projectId, subtaskId, progress) => {
    if (apiToken) {
      try {
        const updated = await subtaskApi.updateProgress(subtaskId, Math.min(100, Math.max(0, progress)));
        mergeSubtask(projectId, updated);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la mise à jour', description: err?.message || 'Le serveur a refusé cette action.' });
      }
      return;
    }
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const updatedSubtasks = p.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, progress: Math.min(100, Math.max(0, progress)) } : st
      );
      const totalProgress = updatedSubtasks.length > 0
        ? Math.round(updatedSubtasks.reduce((acc, st) => acc + st.progress, 0) / updatedSubtasks.length)
        : 0;
      return { ...p, subtasks: updatedSubtasks, progress: totalProgress };
    }));
  }, [apiToken, mergeSubtask]);

  // ---- Client meeting (post-framing report)
  const scheduleClientMeeting: ProjectsState['scheduleClientMeeting'] = useCallback(async (projectId, data) => {
    if (!(await callBackend(() => projectApi.createEvent(projectId, { title: 'Rendez-vous client — rapport de cadrage', date: data.date, type: 'rendez_vous', description: data.note }), 'Échec de la planification du rendez-vous'))) return;
    const nowEventId = `ev-${Date.now()}`;
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const meetingEvent: CalendarEvent = {
        id: nowEventId,
        projectId,
        title: 'Rendez-vous client — rapport de cadrage',
        date: data.date,
        type: 'rendez_vous',
        description: data.note || undefined,
      };
      const exists = p.calendarEvents.some((e) => e.id === nowEventId) || p.calendarEvents.some((e) => e.type === 'rendez_vous' && e.date === data.date);
      return {
        ...p,
        clientMeeting: { date: data.date, note: data.note },
        calendarEvents: exists ? p.calendarEvents : [...p.calendarEvents, meetingEvent],
      };
    }));
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      pushNotification({ userId: project.clientId, type: 'calendar_event', title: 'Rendez-vous client planifié', message: `Un rendez-vous de rapport a été planifié pour votre projet « ${project.title} ».`, projectId });
    }
  }, [projects, callBackend, pushNotification]);

  const value = useMemo<ProjectsState>(() => ({
    projects, status,
    submitProject, validateProject, revertProjectValidation, rejectProject, assignManager, updateProjectStatus,
    addProjectMember, removeProjectMember,
    addSubtask, updateSubtaskStatus, approveSubtask, assignSubtask, toggleTaskActive,
    suggestModification, reviewModification,
    requestTask, reviewTaskRequest,
    submitRequete, answerRequete,
    addSubtaskComment, addSubtaskAttachment, validateSubtaskAttachment, addProjectAttachment,
    updateSubtaskProgress, scheduleClientMeeting,
  }), [projects, status, submitProject, validateProject, revertProjectValidation, rejectProject, assignManager, updateProjectStatus,
      addProjectMember, removeProjectMember, addSubtask, updateSubtaskStatus, approveSubtask, assignSubtask, toggleTaskActive,
      suggestModification, reviewModification, requestTask, reviewTaskRequest, submitRequete, answerRequete,
      addSubtaskComment, addSubtaskAttachment, validateSubtaskAttachment, addProjectAttachment,
      updateSubtaskProgress, scheduleClientMeeting]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}
