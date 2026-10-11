// ============================================================
// Type definitions — mirror the shape of the future Laravel API
// ============================================================

/**
 * Unified loading-state pattern used by every data context (Users,
 * Projects, Notifications): 'loading' means "do not render data yet",
 * even if a previous (possibly stale) value is still sitting in state.
 * Components must gate on this, never on "is the array non-empty".
 */
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export type Role = 'admin' | 'chef_de_projet' | 'client' | 'membre';

export type MemberSpecialty = 'Designer' | 'DevOps' | 'Frontend' | 'Backend' | 'Fullstack' | 'QA' | 'Chef de projet junior' | 'Autre';

export type ProjectStatus =
  | 'pending'      // En attente
  | 'validated'    // Validé
  | 'rejected'     // Rejeté
  | 'assigned'     // Assigné
  | 'in_progress'  // En cours
  | 'completed';   // Terminé

export type SubtaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

export type ModificationStatus = 'pending' | 'pending_client' | 'approved' | 'rejected';

export type TaskRequestStatus = 'pending' | 'approved' | 'rejected';

export type ModificationTarget = 'subtask' | 'project';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// ------------------------------------ User
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  memberSpecialty?: MemberSpecialty;  // specialty for 'membre' role
  avatarUrl: string;
  password?: string;         // demo auth (frontend-only prototype)
  phone?: string;
  whatsapp?: string;
  company?: string;         // for clients
  address?: string;
  bio?: string;
  createdAt: string;        // ISO
  active?: boolean;         // true when the user is currently connected
  lastActive?: string;      // ISO — last login timestamp
  accountStatus?: 'pending' | 'active' | 'rejected';  // accounts created by employees/clients wait for admin approval (admin-created accounts are 'active')
}

// ------------------------------------ Attachment
export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;         // mime type
  url: string;
  uploadedBy: string;       // user id
  uploadedAt: string;       // ISO
  attachmentType?: 'project' | 'subtask_deliverable' | 'comment';  // source
  validationStatus?: 'pending' | 'approved' | 'rejected';  // admin validation for comment attachments
  validatedBy?: string;     // user id who validated
  validatedAt?: string;     // ISO
}

// ------------------------------------ Subtask Comment (discussion per task)
export interface SubtaskComment {
  id: string;
  subtaskId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

// ------------------------------------ Work session (pause/resume tracking)
export interface WorkSession {
  start: string;       // ISO when the session started
  end: string | null;  // null = session currently running
  duration: number;    // seconds (set when session ends)
}

// ------------------------------------ Subtask
export interface Subtask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: SubtaskStatus;
  priority: Priority;
  assignedToId: string | null;
  dependsOnId: string | null;  // dependency on another subtask
  startDate: string;           // ISO
  dueDate: string;             // ISO
  progress: number;            // 0-100
  attachments: Attachment[];
  comments: SubtaskComment[];  // task-level comments
  isActive?: boolean;          // a work session is currently running (timer on)
  workSessions?: WorkSession[]; // completed + running sessions (elapsed time)
  createdAt: string;
}

// ------------------------------------ Modification request
export interface ModificationRequest {
  id: string;
  projectId: string;
  subtaskId: string | null;   // null = project-level modification
  target: ModificationTarget;
  requestedById: string;
  requestedByName: string;
  field: string;              // which field is being modified
  oldValue: string;
  newValue: string;
  reason: string;
  status: ModificationStatus;
  reviewedById: string | null;
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
  teamReview?: { userId: string; note: string; at: string } | null;   // admin review (first stage)
  clientReview?: { userId: string; note: string; at: string } | null; // client validation (final stage)
}

// ------------------------------------ Client task request (validated by the admin)
export interface TaskRequest {
  id: string;
  projectId: string;
  clientId: string;
  title: string;
  description: string;
  priority: Priority;
  besoinDate: string | null;     // date pour sa nécessité (deadline souhaitée)
  photoUrl: string | null;       // photo/pièce jointe jointe à la demande
  photoName: string | null;
  status: TaskRequestStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string;
  createdAt: string;
}

// ------------------------------------ Requête (the team asks the client for a photo / file / info)
export type RequeteStatus = 'pending' | 'answered';

export interface RequeteResponse {
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  at: string;
}

export interface Requete {
  id: string;
  projectId: string;
  subtaskId: string | null;       // optional — requête linked to a specific subtask
  createdById: string;
  createdByName: string;
  content: string;                // what is asked from the client
  status: RequeteStatus;
  createdAt: string;
  respondedAt: string | null;
  response: RequeteResponse | null;
}

// ------------------------------------ Progress timeline point (for the curve chart)
export interface ProgressPoint {
  date: string;          // ISO date
  planned: number;       // %
  actual: number;        // %
}

// ------------------------------------ Project member
export interface ProjectMember {
  userId: string;
  role: Role;
  joinedAt: string;
}

// ------------------------------------ Calendar Event
export interface CalendarEvent {
  id: string;
  projectId: string;
  title: string;
  date: string;           // ISO date
  type: 'cadrage' | 'design' | 'developpement' | 'recette' | 'livraison' | 'rendez_vous' | 'deadline';
  description?: string;
}

// ------------------------------------ Project version (history archive)
export interface ProjectVersion {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  priority: Priority;
  category: string;
  subtasks: Subtask[];
  capturedAt: string;      // ISO — when the version was snapshotted
  reason: string;          // modification reason that triggered the snapshot
}

// ------------------------------------ Project
export interface Project {
  id: string;
  title: string;
  description: string;
  clientId: string;
  status: ProjectStatus;
  priority: Priority;
  managerId: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  progress: number;            // auto-calculated from subtasks
  rejectionReason?: string;
  category: string;
  logoUrl?: string;
  attachments: Attachment[];   // files attached during submission
  members: ProjectMember[];
  subtasks: Subtask[];
  progressTimeline: ProgressPoint[];
  calendarEvents: CalendarEvent[];
  modifications: ModificationRequest[];
  taskRequests: TaskRequest[];
  requetes: Requete[];
  // Submission detail fields
  platformUsers?: string;      // utilisateurs de la plateforme
  desiredFeatures?: string;    // fonctionnalités souhaitées
  necessaryPages?: string;     // pages nécessaires pour le projet
  plannedFeatures?: string;    // fonctionnalités prévues
  // Client meeting after framing
  clientMeeting?: { date: string; note: string } | null;
  createdAt: string;
  // History / archive
  statusChangedAt?: string | null;  // ISO — when the project reached completed/rejected
  versions?: ProjectVersion[];      // archived snapshots of modified projects
}

// ------------------------------------ Notification
export interface AppNotification {
  id: string;
  userId: string;       // recipient
  type: 'project_submitted' | 'project_validated' | 'project_validation_reverted' | 'project_rejected'
      | 'subtask_assigned' | 'delay_detected'
      | 'project_completed' | 'modification_requested' | 'modification_reviewed'
      | 'member_added' | 'subtask_reviewed' | 'member_created' | 'calendar_event'
      | 'task_comment' | 'project_attachment'
      | 'task_requested' | 'task_request_approved' | 'task_request_rejected'
      | 'requete_created' | 'requete_answered'
      | 'account_created' | 'account_validated' | 'account_rejected';
  title: string;
  message: string;
  projectId?: string;
  read: boolean;
  createdAt: string;
}

// ------------------------------------ Filter / sort
export interface ProjectFilters {
  status: ProjectStatus | 'all';
  priority: Priority | 'all';
  search: string;
}

export interface SubtaskFilters {
  status: SubtaskStatus | 'all';
  priority: Priority | 'all';
  assignedToId: string | 'all';
  search: string;
}

export interface EmployeeFilters {
  specialty: MemberSpecialty | 'all';
  search: string;
}
