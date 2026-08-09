import { API_BASE_URL, request } from '@/lib/api/client';
import type {
  ApprovalListPayload,
  CalendarPayload,
  CampaignDetailPayload,
  CampaignListPayload,
  CreateApprovalInput,
  CreateCalendarEventInput,
  CreateCampaignInput,
  CreateLeadInput,
  CreateProjectInput,
  CreateTaskInput,
  LeadDetailPayload,
  LeadListPayload,
  TaskListPayload,
  ToggleAssignmentResult,
} from '@/lib/api/contract';
import type {
  AgencySettings,
  Approval,
  ApprovalStatus,
  CalendarEvent,
  Campaign,
  ClientView,
  Frequency,
  InboxPayload,
  LeadStatus,
  Project,
  ProjectOverview,
  ProjectSummary,
  ProjectTeamPayload,
  ReportConfig,
  SessionUser,
  Task,
  TaskColumn,
  TeamMemberDetail,
  TeamMemberWithAssignments,
} from '@/types/models';

/** True when EXPO_PUBLIC_API_URL points the app at the Express backend instead of the embedded DB. */
export const isHttpMode = API_BASE_URL.length > 0;

/** Talks to `server/`. Same contract as the embedded repository. */
export const httpApi = {
  signIn: (email: string, password: string) =>
    request<{ token: string; user: SessionUser }>('/auth/sign-in', { method: 'POST', body: { email, password } }),

  getProjects: () => request<ProjectSummary[]>('/projects'),
  getProject: (projectId: string) => request<Project>(`/projects/${projectId}`),
  createProject: (input: CreateProjectInput) => request<Project>('/projects', { method: 'POST', body: input }),
  updateProject: (projectId: string, input: Partial<CreateProjectInput & { status: string }>) =>
    request<Project>(`/projects/${projectId}`, { method: 'PATCH', body: input }),
  getProjectOverview: (projectId: string) => request<ProjectOverview>(`/projects/${projectId}/overview`),
  getClientView: (projectId: string) => request<ClientView>(`/projects/${projectId}/client-view`),

  getProjectLeads: (projectId: string) => request<LeadListPayload>(`/projects/${projectId}/leads`),
  getLead: (leadId: string) => request<LeadDetailPayload>(`/leads/${leadId}`),
  createLead: (projectId: string, input: CreateLeadInput) =>
    request<LeadDetailPayload>(`/projects/${projectId}/leads`, { method: 'POST', body: input }),
  updateLead: (leadId: string, input: Partial<CreateLeadInput> & { author?: string }) =>
    request<LeadDetailPayload>(`/leads/${leadId}`, { method: 'PATCH', body: input }),
  updateLeadStatus: (leadId: string, status: LeadStatus, author: string) =>
    request<LeadDetailPayload>(`/leads/${leadId}`, { method: 'PATCH', body: { status, author } }),
  addLeadNote: (leadId: string, content: string, author: string) =>
    request<LeadDetailPayload>(`/leads/${leadId}/notes`, { method: 'POST', body: { content, author } }),
  deleteLead: (leadId: string) => request<{ ok: true; id: string }>(`/leads/${leadId}`, { method: 'DELETE' }),

  getProjectTasks: (projectId: string) => request<TaskListPayload>(`/projects/${projectId}/tasks`),
  createTask: (projectId: string, input: CreateTaskInput) =>
    request<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: input }),
  updateTask: (taskId: string, input: Partial<CreateTaskInput>) =>
    request<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: input }),
  moveTask: (taskId: string, column: TaskColumn) => request<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: { column } }),
  deleteTask: (taskId: string) => request<{ ok: true; id: string }>(`/tasks/${taskId}`, { method: 'DELETE' }),

  getProjectCampaigns: (projectId: string) => request<CampaignListPayload>(`/projects/${projectId}/campaigns`),
  getCampaign: (campaignId: string) => request<CampaignDetailPayload>(`/campaigns/${campaignId}`),
  createCampaign: (projectId: string, input: CreateCampaignInput) =>
    request<Campaign>(`/projects/${projectId}/campaigns`, { method: 'POST', body: input }),
  updateCampaign: (campaignId: string, input: Partial<CreateCampaignInput>) =>
    request<CampaignDetailPayload>(`/campaigns/${campaignId}`, { method: 'PATCH', body: input }),
  deleteCampaign: (campaignId: string) => request<{ ok: true; id: string }>(`/campaigns/${campaignId}`, { method: 'DELETE' }),

  getProjectCalendar: (projectId: string) => request<CalendarPayload>(`/projects/${projectId}/calendar`),
  createCalendarEvent: (projectId: string, input: CreateCalendarEventInput) =>
    request<CalendarEvent>(`/projects/${projectId}/calendar`, { method: 'POST', body: input }),
  updateCalendarEvent: (eventId: string, input: Partial<CreateCalendarEventInput>) =>
    request<CalendarEvent>(`/calendar-events/${eventId}`, { method: 'PATCH', body: input }),
  deleteCalendarEvent: (eventId: string) =>
    request<{ ok: true; id: string }>(`/calendar-events/${eventId}`, { method: 'DELETE' }),

  getProjectApprovals: (projectId: string) => request<ApprovalListPayload>(`/projects/${projectId}/approvals`),
  createApproval: (projectId: string, input: CreateApprovalInput) =>
    request<Approval>(`/projects/${projectId}/approvals`, { method: 'POST', body: input }),
  updateApprovalStatus: (approvalId: string, status: ApprovalStatus) =>
    request<Approval>(`/approvals/${approvalId}`, { method: 'PATCH', body: { status } }),
  addApprovalComment: (approvalId: string, author: string, message: string) =>
    request<Approval>(`/approvals/${approvalId}/comments`, { method: 'POST', body: { author, message } }),
  deleteApproval: (approvalId: string) => request<{ ok: true; id: string }>(`/approvals/${approvalId}`, { method: 'DELETE' }),

  getProjectReport: (projectId: string) => request<ReportConfig>(`/projects/${projectId}/report`),
  updateReportConfig: (
    projectId: string,
    input: { frequency?: Frequency; internalReviewFirst?: boolean; includedSections?: string[] },
  ) => request<ReportConfig>(`/projects/${projectId}/report`, { method: 'PATCH', body: input }),
  sendReport: (projectId: string) => request<ReportConfig>(`/projects/${projectId}/report/send`, { method: 'POST' }),
  addReportRecipient: (projectId: string, email: string) =>
    request<ReportConfig>(`/projects/${projectId}/report/recipients`, { method: 'POST', body: { email } }),
  removeReportRecipient: (projectId: string, email: string) =>
    request<ReportConfig>(`/projects/${projectId}/report/recipients/${encodeURIComponent(email)}`, { method: 'DELETE' }),

  getAgencyTeam: () => request<TeamMemberWithAssignments[]>('/team'),
  getTeamMember: (memberId: string) => request<TeamMemberDetail>(`/team/${memberId}`),
  getProjectTeam: (projectId: string) => request<ProjectTeamPayload>(`/projects/${projectId}/team`),
  toggleTeamMemberAssignment: (projectId: string, memberId: string, force = false) =>
    request<ToggleAssignmentResult>(`/projects/${projectId}/team/${memberId}/toggle`, { method: 'POST', body: { force } }),

  getAgencySettings: () => request<AgencySettings>('/settings'),
  updateAgencySettings: (input: { agencyName?: string; logoPlaceholder?: string }) =>
    request<AgencySettings>('/settings', { method: 'PATCH', body: input }),
  toggleNotification: (key: keyof AgencySettings['notifications'], enabled: boolean) =>
    request<AgencySettings>(`/settings/notifications/${key}`, { method: 'POST', body: { enabled } }),
  toggleIntegration: (integrationId: string, connected: boolean) =>
    request<AgencySettings>(`/settings/integrations/${integrationId}`, { method: 'POST', body: { connected } }),

  getInbox: () => request<InboxPayload>('/inbox'),
};
