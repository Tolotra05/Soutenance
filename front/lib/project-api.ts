import type {
  Attachment, CalendarEvent, ModificationRequest, Project, ProjectMember, ProjectStatus,
  Priority, Requete, Role, Subtask, SubtaskComment, SubtaskStatus, TaskRequest,
} from '@/types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const TOKEN_KEY = 'taskManagerJwt';

export function getApiToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setApiToken(token: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearApiToken() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
}

/** Thrown for any non-2xx API response: keeps the HTTP status and parsed body (still an Error, message unchanged). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getApiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body?.message || body?.error || `Erreur API (${response.status})`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

/** Like request(), but for multipart/form-data: the browser sets its own Content-Type (with boundary). */
async function requestMultipart<T>(path: string, formData: FormData, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getApiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, method: init.method || 'POST', headers, body: formData });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body?.message || body?.error || `Erreur API (${response.status})`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

export async function loginApi(email: string, password: string) {
  const result = await request<{ token: string }>('/api/login_check', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setApiToken(result.token);
  return result;
}

export type JwtPayload = { username?: string; roles?: string[]; exp?: number; iat?: number };

/** Decodes a JWT's payload (no signature check — the token was already verified by the server). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Maps Symfony security roles (ROLE_ADMIN, ROLE_CHEF_DE_PROJET, ROLE_USER...) to the app's Role type. */
export function mapJwtRolesToAppRole(roles: string[] | undefined, fallback: Role = 'client'): Role {
  if (!roles) return fallback;
  if (roles.includes('ROLE_ADMIN')) return 'admin';
  if (roles.includes('ROLE_CHEF_DE_PROJET')) return 'chef_de_projet';
  return fallback;
}

export type ApiProject = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  category: string;
  createdAt: string | null;
  statusChangedAt?: string | null;
  client?: { id: string; name: string; email: string } | null;
  manager?: { id: string; name: string; email: string } | null;
  members?: Array<{ userId: string; role: string; joinedAt: string }>;
  attachments?: Attachment[];
  subtasks?: Subtask[];
  calendarEvents?: CalendarEvent[];
  modifications?: ModificationRequest[];
  taskRequests?: TaskRequest[];
  requetes?: Requete[];
};

export function mapApiProject(api: ApiProject, existing?: Project): Project {
  return {
    id: api.id,
    title: api.title,
    description: api.description || '',
    clientId: existing?.clientId || (api.client?.id ?? ''),
    status: api.status,
    priority: api.priority,
    managerId: existing?.managerId || (api.manager ? api.manager.id : null),
    startDate: api.startDate || existing?.startDate || new Date().toISOString(),
    endDate: api.endDate || existing?.endDate || new Date().toISOString(),
    budget: api.budget ?? 0,
    progress: api.progress ?? 0,
    category: api.category || '',
    logoUrl: existing?.logoUrl,
    attachments: api.attachments ?? existing?.attachments ?? [],
    members: (api.members as ProjectMember[] | undefined) ?? existing?.members ?? [],
    subtasks: api.subtasks ?? existing?.subtasks ?? [],
    progressTimeline: existing?.progressTimeline ?? [],
    calendarEvents: api.calendarEvents ?? existing?.calendarEvents ?? [],
    modifications: api.modifications ?? existing?.modifications ?? [],
    taskRequests: api.taskRequests ?? existing?.taskRequests ?? [],
    requetes: api.requetes ?? existing?.requetes ?? [],
    platformUsers: existing?.platformUsers,
    desiredFeatures: existing?.desiredFeatures,
    necessaryPages: existing?.necessaryPages,
    plannedFeatures: existing?.plannedFeatures,
    clientMeeting: existing?.clientMeeting ?? null,
    createdAt: api.createdAt || existing?.createdAt || new Date().toISOString(),
    statusChangedAt: api.statusChangedAt ?? existing?.statusChangedAt ?? null,
  };
}

export const projectApi = {
  list: (params: { limit?: number; offset?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString();
    return request<{ data: ApiProject[]; meta: { total: number; limit: number; offset: number } }>(`/api/projects${qs ? `?${qs}` : ''}`);
  },
  create: (data: object) => request<ApiProject>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  validate: (id: string) => request<any>(`/api/projects/${id}/validate`, { method: 'POST', body: JSON.stringify({}) }),
  reject: (id: string, reason: string) => request<any>(`/api/projects/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  assign: (id: string, managerId: string) => request<any>(`/api/projects/${id}/assign`, { method: 'POST', body: JSON.stringify({ managerId }) }),
  updateStatus: (id: string, status: ProjectStatus) => request<any>(`/api/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  addMember: (id: string, data: { userId: string; role: string }) => request<any>(`/api/projects/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeMember: (id: string, userId: string) => request<any>(`/api/projects/${id}/members/${userId}`, { method: 'DELETE' }),
  events: (id: string) => request<CalendarEvent[]>(`/api/projects/${id}/events`),
  createEvent: (id: string, data: { title: string; date: string; type: string; description?: string }) => request<CalendarEvent>(`/api/projects/${id}/events`, { method: 'POST', body: JSON.stringify(data) }),
};

export type ApiEmployee = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  memberSpecialty: string | null;
  avatarUrl: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  bio: string | null;
  createdAt: string | null;
};

export const employeeApi = {
  create: (data: object) => request<ApiEmployee>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
};

export const subtaskApi = {
  create: (projectId: string, data: object) => request<Subtask>(`/api/projects/${projectId}/subtasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: SubtaskStatus) => request<Subtask>(`/api/subtasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  approve: (id: string) => request<Subtask>(`/api/subtasks/${id}/approve`, { method: 'POST', body: JSON.stringify({}) }),
  assign: (id: string, employeeId: string | null) => request<Subtask>(`/api/subtasks/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ employeeId }) }),
  updateProgress: (id: string, progress: number) => request<Subtask>(`/api/subtasks/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ progress }) }),
  toggleTimer: (id: string) => request<Subtask>(`/api/subtasks/${id}/timer`, { method: 'POST', body: JSON.stringify({}) }),
  addComment: (id: string, content: string) => request<SubtaskComment>(`/api/subtasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
};

export const attachmentApi = {
  upload: (file: File, target: { projectId?: string; subtaskId?: string }, attachmentType: string) => {
    const form = new FormData();
    form.append('file', file);
    if (target.projectId) form.append('projectId', target.projectId);
    if (target.subtaskId) form.append('subtaskId', target.subtaskId);
    form.append('attachmentType', attachmentType);
    return requestMultipart<Attachment>('/api/attachments', form);
  },
  validate: (id: string, action: 'approve' | 'reject') => request<Attachment>(`/api/attachments/${id}/validate`, { method: 'PATCH', body: JSON.stringify({ action }) }),
};

export const modificationApi = {
  create: (projectId: string, data: object) => request<ModificationRequest>(`/api/projects/${projectId}/modifications`, { method: 'POST', body: JSON.stringify(data) }),
  review: (id: string, decision: 'approved' | 'rejected', note: string) => request<ModificationRequest>(`/api/modifications/${id}/review`, { method: 'PATCH', body: JSON.stringify({ decision, note }) }),
};

export const taskRequestApi = {
  create: (projectId: string, data: object) => request<TaskRequest>(`/api/projects/${projectId}/task-requests`, { method: 'POST', body: JSON.stringify(data) }),
  review: (id: string, decision: 'approved' | 'rejected', note: string) =>
    request<TaskRequest & { createdSubtask: Subtask | null }>(`/api/task-requests/${id}/review`, { method: 'PATCH', body: JSON.stringify({ decision, note }) }),
};

export const requeteApi = {
  create: (projectId: string, data: { subtaskId?: string | null; content: string }) => request<Requete>(`/api/projects/${projectId}/requetes`, { method: 'POST', body: JSON.stringify(data) }),
  answer: (id: string, data: { text: string; attachment?: Attachment | null }) => request<Requete>(`/api/requetes/${id}/answer`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export type ApiNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  projectId?: string | null;
  read: boolean;
  createdAt: string | null;
};

export const notificationApi = {
  list: () => request<ApiNotification[]>('/api/notifications'),
  markRead: (id: string) => request<ApiNotification>(`/api/notifications/${id}/read`, { method: 'PATCH', body: JSON.stringify({}) }),
  markAllRead: () => request<{ message: string }>('/api/notifications/read-all', { method: 'POST', body: JSON.stringify({}) }),
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  memberSpecialty: string | null;
  avatarUrl: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  bio: string | null;
  accountStatus?: string;
  createdAt: string | null;
};

export const userApi = {
  list: () => request<ApiUser[]>('/api/users'),
  me: () => request<ApiUser>('/api/users/me'),
  updateMe: (data: object) => request<ApiUser>('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  update: (id: string, data: object) => request<ApiUser>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  review: (id: string, decision: 'approved' | 'rejected') => request<ApiUser>(`/api/users/${id}/review`, { method: 'PATCH', body: JSON.stringify({ decision }) }),
  /** Admin only: number of accounts waiting for validation (sidebar badge). */
  pendingCount: () => request<{ count: number }>('/api/users/pending/count'),
};

export const authApi = {
  register: (data: object) => request<ApiUser>('/api/register', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (email: string) => request<{ message: string; devCode?: string }>('/api/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, newPassword: string) => request<{ message: string }>('/api/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) }),
};

export const uploadApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return requestMultipart<{ url: string; fileName: string; fileType: string }>('/api/uploads', form);
  },
};
