import { httpApi, isHttpMode } from '@/lib/api/http';
import { getRepository } from '@/lib/db';
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

export type {
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
};

/**
 * The single data surface every hook uses.
 *
 * By default it runs against the database embedded in the app (expo-sqlite), which is what
 * makes a standalone APK work with no server. Setting EXPO_PUBLIC_API_URL switches the whole
 * app to the HTTP backend in `server/` instead — same contract, shared data across devices.
 *
 * Repository calls are synchronous; they are wrapped in promises so both modes present one
 * async interface to React Query.
 */
const local = {
  signIn: (email: string, password: string) => getRepository().signIn(email, password),

  getProjects: () => getRepository().getProjects(),
  getProject: (projectId: string) => getRepository().getProject(projectId),
  createProject: (input: CreateProjectInput) => getRepository().createProject(input),
  updateProject: (projectId: string, input: Partial<CreateProjectInput & { status: string }>) =>
    getRepository().updateProject(projectId, input),
  getProjectOverview: (projectId: string) => getRepository().getProjectOverview(projectId),
  getClientView: (projectId: string) => getRepository().getClientView(projectId),

  getProjectLeads: (projectId: string) => getRepository().getProjectLeads(projectId),
  getLead: (leadId: string) => getRepository().getLead(leadId),
  createLead: (projectId: string, input: CreateLeadInput) => getRepository().createLead(projectId, input),
  updateLead: (leadId: string, input: Partial<CreateLeadInput> & { author?: string }) =>
    getRepository().updateLead(leadId, input),
  updateLeadStatus: (leadId: string, status: LeadStatus, author: string) =>
    getRepository().updateLead(leadId, { status, author }),
  addLeadNote: (leadId: string, content: string, author: string) => getRepository().addLeadNote(leadId, content, author),
  deleteLead: (leadId: string) => getRepository().deleteLead(leadId),

  getProjectTasks: (projectId: string) => getRepository().getProjectTasks(projectId),
  createTask: (projectId: string, input: CreateTaskInput) => getRepository().createTask(projectId, input),
  updateTask: (taskId: string, input: Partial<CreateTaskInput>) => getRepository().updateTask(taskId, input),
  moveTask: (taskId: string, column: TaskColumn) => getRepository().updateTask(taskId, { column }),
  deleteTask: (taskId: string) => getRepository().deleteTask(taskId),

  getProjectCampaigns: (projectId: string) => getRepository().getProjectCampaigns(projectId),
  getCampaign: (campaignId: string) => getRepository().getCampaign(campaignId),
  createCampaign: (projectId: string, input: CreateCampaignInput) => getRepository().createCampaign(projectId, input),
  updateCampaign: (campaignId: string, input: Partial<CreateCampaignInput>) =>
    getRepository().updateCampaign(campaignId, input),
  deleteCampaign: (campaignId: string) => getRepository().deleteCampaign(campaignId),

  getProjectCalendar: (projectId: string) => getRepository().getProjectCalendar(projectId),
  createCalendarEvent: (projectId: string, input: CreateCalendarEventInput) =>
    getRepository().createCalendarEvent(projectId, input),
  updateCalendarEvent: (eventId: string, input: Partial<CreateCalendarEventInput>) =>
    getRepository().updateCalendarEvent(eventId, input),
  deleteCalendarEvent: (eventId: string) => getRepository().deleteCalendarEvent(eventId),

  getProjectApprovals: (projectId: string) => getRepository().getProjectApprovals(projectId),
  createApproval: (projectId: string, input: CreateApprovalInput) => getRepository().createApproval(projectId, input),
  updateApprovalStatus: (approvalId: string, status: ApprovalStatus) =>
    getRepository().updateApprovalStatus(approvalId, status),
  addApprovalComment: (approvalId: string, author: string, message: string) =>
    getRepository().addApprovalComment(approvalId, author, message),
  deleteApproval: (approvalId: string) => getRepository().deleteApproval(approvalId),

  getProjectReport: (projectId: string) => getRepository().getProjectReport(projectId),
  updateReportConfig: (
    projectId: string,
    input: { frequency?: Frequency; internalReviewFirst?: boolean; includedSections?: string[] },
  ) => getRepository().updateReportConfig(projectId, input),
  sendReport: (projectId: string) => getRepository().sendReport(projectId),
  addReportRecipient: (projectId: string, email: string) => getRepository().addReportRecipient(projectId, email),
  removeReportRecipient: (projectId: string, email: string) => getRepository().removeReportRecipient(projectId, email),

  getAgencyTeam: () => getRepository().getAgencyTeam(),
  getTeamMember: (memberId: string) => getRepository().getTeamMember(memberId),
  getProjectTeam: (projectId: string) => getRepository().getProjectTeam(projectId),
  toggleTeamMemberAssignment: (projectId: string, memberId: string, force = false) =>
    getRepository().toggleTeamMemberAssignment(projectId, memberId, force),

  getAgencySettings: () => getRepository().getAgencySettings(),
  updateAgencySettings: (input: { agencyName?: string; logoPlaceholder?: string }) =>
    getRepository().updateAgencySettings(input),
  toggleNotification: (key: keyof AgencySettings['notifications'], enabled: boolean) =>
    getRepository().toggleNotification(key, enabled),
  toggleIntegration: (integrationId: string, connected: boolean) => getRepository().toggleIntegration(integrationId, connected),

  getInbox: () => getRepository().getInbox(),
};

/** Lifts the synchronous repository into the promise-returning shape hooks expect. */
function asAsync<T extends Record<string, (...args: never[]) => unknown>>(source: T): AsyncApi {
  const wrapped: Record<string, unknown> = {};
  for (const [key, fn] of Object.entries(source)) {
    wrapped[key] = (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        try {
          resolve((fn as (...inner: unknown[]) => unknown)(...args));
        } catch (error) {
          reject(error);
        }
      });
  }
  return wrapped as unknown as AsyncApi;
}

export interface AsyncApi {
  signIn: (email: string, password: string) => Promise<{ token: string; user: SessionUser }>;
  getProjects: () => Promise<ProjectSummary[]>;
  getProject: (projectId: string) => Promise<Project>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (projectId: string, input: Partial<CreateProjectInput & { status: string }>) => Promise<Project>;
  getProjectOverview: (projectId: string) => Promise<ProjectOverview>;
  getClientView: (projectId: string) => Promise<ClientView>;
  getProjectLeads: (projectId: string) => Promise<LeadListPayload>;
  getLead: (leadId: string) => Promise<LeadDetailPayload>;
  createLead: (projectId: string, input: CreateLeadInput) => Promise<LeadDetailPayload>;
  updateLead: (leadId: string, input: Partial<CreateLeadInput> & { author?: string }) => Promise<LeadDetailPayload>;
  updateLeadStatus: (leadId: string, status: LeadStatus, author: string) => Promise<LeadDetailPayload>;
  addLeadNote: (leadId: string, content: string, author: string) => Promise<LeadDetailPayload>;
  deleteLead: (leadId: string) => Promise<{ ok: true; id: string }>;
  getProjectTasks: (projectId: string) => Promise<TaskListPayload>;
  createTask: (projectId: string, input: CreateTaskInput) => Promise<Task>;
  updateTask: (taskId: string, input: Partial<CreateTaskInput>) => Promise<Task>;
  moveTask: (taskId: string, column: TaskColumn) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<{ ok: true; id: string }>;
  getProjectCampaigns: (projectId: string) => Promise<CampaignListPayload>;
  getCampaign: (campaignId: string) => Promise<CampaignDetailPayload>;
  createCampaign: (projectId: string, input: CreateCampaignInput) => Promise<Campaign>;
  updateCampaign: (campaignId: string, input: Partial<CreateCampaignInput>) => Promise<CampaignDetailPayload>;
  deleteCampaign: (campaignId: string) => Promise<{ ok: true; id: string }>;
  getProjectCalendar: (projectId: string) => Promise<CalendarPayload>;
  createCalendarEvent: (projectId: string, input: CreateCalendarEventInput) => Promise<CalendarEvent>;
  updateCalendarEvent: (eventId: string, input: Partial<CreateCalendarEventInput>) => Promise<CalendarEvent>;
  deleteCalendarEvent: (eventId: string) => Promise<{ ok: true; id: string }>;
  getProjectApprovals: (projectId: string) => Promise<ApprovalListPayload>;
  createApproval: (projectId: string, input: CreateApprovalInput) => Promise<Approval>;
  updateApprovalStatus: (approvalId: string, status: ApprovalStatus) => Promise<Approval>;
  addApprovalComment: (approvalId: string, author: string, message: string) => Promise<Approval>;
  deleteApproval: (approvalId: string) => Promise<{ ok: true; id: string }>;
  getProjectReport: (projectId: string) => Promise<ReportConfig>;
  updateReportConfig: (
    projectId: string,
    input: { frequency?: Frequency; internalReviewFirst?: boolean; includedSections?: string[] },
  ) => Promise<ReportConfig>;
  sendReport: (projectId: string) => Promise<ReportConfig>;
  addReportRecipient: (projectId: string, email: string) => Promise<ReportConfig>;
  removeReportRecipient: (projectId: string, email: string) => Promise<ReportConfig>;
  getAgencyTeam: () => Promise<TeamMemberWithAssignments[]>;
  getTeamMember: (memberId: string) => Promise<TeamMemberDetail>;
  getProjectTeam: (projectId: string) => Promise<ProjectTeamPayload>;
  toggleTeamMemberAssignment: (projectId: string, memberId: string, force?: boolean) => Promise<ToggleAssignmentResult>;
  getAgencySettings: () => Promise<AgencySettings>;
  updateAgencySettings: (input: { agencyName?: string; logoPlaceholder?: string }) => Promise<AgencySettings>;
  toggleNotification: (key: keyof AgencySettings['notifications'], enabled: boolean) => Promise<AgencySettings>;
  toggleIntegration: (integrationId: string, connected: boolean) => Promise<AgencySettings>;
  getInbox: () => Promise<InboxPayload>;
}

export const api: AsyncApi = isHttpMode ? httpApi : asAsync(local as never);

export const dataSource: 'embedded' | 'http' = isHttpMode ? 'http' : 'embedded';
