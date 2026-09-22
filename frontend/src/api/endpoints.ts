import type {
  AdminResetPasswordInput,
  ArchitectureDiff,
  ArchitectureDocument,
  BillOfMaterials,
  AuthResult,
  ChangePasswordInput,
  CreateBrandInput,
  CreateClientCompanyInput,
  CreateEquipmentModelInput,
  CreateManufacturerInput,
  CreateRequestInput,
  CreateUserInput,
  ForgotPasswordInput,
  LoginInput,
  ProjectShareRight,
  ProjectStatus,
  ResetPasswordInput,
  Role,
  TransitionRequestInput,
  UpdateClientCompanyInput,
  UpdateEquipmentModelInput,
  UpdateUserInput,
  UserProfile,
} from '@archiflow/shared';
import { api } from './client';

/** Contrats de réponse de l'API. Les entrées sont typées par les schémas de packages/shared. */
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  dueDate: string | null;
  clientCompanyId: string;
  clientCompany: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignment {
  id: string;
  role: Role;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: Role };
}

export interface ProjectShare {
  id: string;
  right: ProjectShareRight;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: Role; email: string };
}

export interface ProjectDetail extends ProjectSummary {
  assignments: ProjectAssignment[];
  shares: ProjectShare[];
  request: ProjectRequest | null;
}

export interface ProjectRequest {
  location: string | null;
  projectType: string | null;
  siteCount: number | null;
  totalEmployees: number | null;
  workstationCount: number | null;
  concurrentUsers: number | null;
  serverCount: number | null;
  wifi: boolean | null;
  wifiApCount: number | null;
  voip: boolean | null;
  vpn: boolean | null;
  firewall: boolean | null;
  vlan: boolean | null;
  segmentation: boolean | null;
  vendors: string[];
  freeTextNeed: string | null;
  networkNotes: string | null;
  securityNotes: string | null;
  serverNotes: string | null;
  buildings: Array<{ id: string; name: string; areaM2: number | null; floors: number | null; description: string | null }>;
  departments: Array<{ id: string; name: string; employees: number | null; workstations: number | null; location: string | null; notes: string | null }>;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  clientCompanyId: string | null;
  mustChangePassword: boolean;
  deletedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  reference: string;
  description: string | null;
  portCount: number | null;
  portType: string | null;
  throughputMbps: number | null;
  poeBudgetW: number | null;
  powerDrawW: number | null;
  rackUnits: number | null;
  indicativePrice: string | number | null;
  currency: string | null;
  licenseInfo: string | null;
  licenseAnnualCost: string | number | null;
  availability: string | null;
  imageUrl: string | null;
  isDemoData: boolean;
  archivedAt: string | null;
  brand: { id: string; name: string; manufacturer: { id: string; name: string } };
  category: { id: string; code: string; labelKey: string };
}

export interface ManufacturerItem {
  id: string;
  name: string;
  website: string | null;
  brands: { id: string; name: string }[];
}

export interface AvailableTransition {
  to: ProjectStatus;
  labelKey: string;
  requiresReason: boolean;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: ProjectStatus;
  toStatus: ProjectStatus;
  actorId: string;
  reason: string | null;
  createdAt: string;
}

export const authApi = {
  login: (input: LoginInput) => api.post<AuthResult>('/auth/login', input, false),
  logout: () => api.post<void>('/auth/logout', undefined, false),
  me: () => api.get<UserProfile>('/auth/me'),
  changePassword: (input: ChangePasswordInput) => api.patch<AuthResult>('/auth/password', input),
  forgot: (input: ForgotPasswordInput) => api.post<{ status: 'accepted' }>('/auth/forgot', input, false),
  reset: (input: ResetPasswordInput) => api.post<void>('/auth/reset', input, false),
};

export const projectsApi = {
  create: (input: CreateRequestInput) => api.post<ProjectSummary>('/projects', input),
  list: (query: { page?: number; pageSize?: number; status?: ProjectStatus; q?: string } = {}) =>
    api.get<Page<ProjectSummary>>('/projects', query),
  get: (id: string) => api.get<ProjectDetail>(`/projects/${id}`),
  update: (id: string, input: { dueDate: string | null }) => api.patch<ProjectSummary>(`/projects/${id}`, input),
  history: (id: string) => api.get<StatusHistoryEntry[]>(`/projects/${id}/history`),
  transitions: (id: string) => api.get<AvailableTransition[]>(`/projects/${id}/transitions`),
  transition: (id: string, input: TransitionRequestInput) =>
    api.post<{ id: string; status: ProjectStatus }>(`/projects/${id}/transitions`, input),
  assign: (id: string, input: { userId: string; role: Role }) =>
    api.post<ProjectAssignment>(`/projects/${id}/assignments`, input),
  share: (id: string, input: { userId: string; right: ProjectShareRight }) =>
    api.post<ProjectShare>(`/projects/${id}/shares`, input),
  unshare: (id: string, shareId: string) => api.delete<void>(`/projects/${id}/shares/${shareId}`),
};

export const usersApi = {
  count: () => api.get<Page<unknown>>('/users', { pageSize: 1 }),
  list: (query: { page?: number; pageSize?: number; q?: string; role?: Role; includeInactive?: boolean } = {}) =>
    api.get<Page<UserSummary>>('/users', query),
  create: (input: CreateUserInput) => api.post<{ status: 'accepted' }>('/users', input),
  update: (id: string, input: UpdateUserInput) => api.patch<UserSummary>(`/users/${id}`, input),
  changeRole: (id: string, role: Role) => api.patch<UserSummary>(`/users/${id}/role`, { role }),
  resetPassword: (id: string, input: AdminResetPasswordInput) => api.post<UserSummary>(`/users/${id}/reset-password`, input),
  deactivate: (id: string) => api.post<UserSummary>(`/users/${id}/deactivate`),
  reactivate: (id: string) => api.post<UserSummary>(`/users/${id}/reactivate`),
};

export interface ClientCompanyItem {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  deletedAt: string | null;
}

export const clientCompaniesApi = {
  list: (query: { includeArchived?: boolean } = {}) => api.get<ClientCompanyItem[]>('/client-companies', query),
  create: (input: CreateClientCompanyInput) => api.post<ClientCompanyItem>('/client-companies', input),
  update: (id: string, input: UpdateClientCompanyInput) => api.patch<ClientCompanyItem>(`/client-companies/${id}`, input),
  archive: (id: string) => api.post<ClientCompanyItem>(`/client-companies/${id}/archive`),
};

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  projectId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string } | null;
}

export const auditApi = {
  list: (query: { page?: number; pageSize?: number; action?: string; projectId?: string } = {}) =>
    api.get<Page<AuditLogEntry>>('/audit-logs', query),
};

export const catalogApi = {
  equipment: (query: { page?: number; pageSize?: number; q?: string; category?: string; includeArchived?: boolean } = {}) =>
    api.get<Page<EquipmentItem>>('/catalog/equipment', query),
  createModel: (input: CreateEquipmentModelInput) => api.post<EquipmentItem>('/catalog/equipment', input),
  updateModel: (id: string, input: UpdateEquipmentModelInput) => api.patch<EquipmentItem>(`/catalog/equipment/${id}`, input),
  archiveModel: (id: string) => api.post<EquipmentItem>(`/catalog/equipment/${id}/archive`),
  manufacturers: () => api.get<ManufacturerItem[]>('/catalog/manufacturers'),
  createManufacturer: (input: CreateManufacturerInput) => api.post<ManufacturerItem>('/catalog/manufacturers', input),
  createBrand: (input: CreateBrandInput) => api.post<{ id: string; name: string; manufacturerId: string }>('/catalog/brands', input),
};

export interface ArchitectureVersionSummary {
  number: number;
  comment: string | null;
  restoredFromVersion: number | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string } | null;
}

export const architectureApi = {
  get: (projectId: string) => api.get<ArchitectureDocument>(`/projects/${projectId}/architecture`),
  save: (projectId: string, input: ArchitectureDocument) => api.put<ArchitectureDocument>(`/projects/${projectId}/architecture`, input),
  versions: (projectId: string) => api.get<ArchitectureVersionSummary[]>(`/projects/${projectId}/architecture/versions`),
  version: (projectId: string, number: number) => api.get<ArchitectureDocument>(`/projects/${projectId}/architecture/versions/${number}`),
  diff: (projectId: string, from: number, to: number) =>
    api.get<ArchitectureDiff>(`/projects/${projectId}/architecture/versions/diff`, { from, to }),
  restore: (projectId: string, number: number) =>
    api.post<ArchitectureDocument>(`/projects/${projectId}/architecture/versions/${number}/restore`),
};

export const bomApi = {
  get: (projectId: string) => api.get<BillOfMaterials>(`/projects/${projectId}/bom`),
};

export const reportsApi = {
  downloadPdf: (projectId: string) => api.getBlob(`/projects/${projectId}/report/pdf`),
};

export interface ChatAnswer {
  key: string;
  params?: Record<string, string | number>;
  steps: { key: string; params?: Record<string, string | number> }[];
  shouldEscalate: boolean;
}

export const chatbotApi = {
  ask: (projectId: string, message: string) => api.post<ChatAnswer>(`/projects/${projectId}/chat`, { message }),
  escalate: (projectId: string, message: string) => api.post<{ escalated: true }>(`/projects/${projectId}/chat/escalate`, { message }),
};
