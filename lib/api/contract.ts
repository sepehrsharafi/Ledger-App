import type {
  Approval,
  ApprovalStatus,
  CalendarEvent,
  Campaign,
  CampaignStatus,
  CampaignTotals,
  Channel,
  EventStatus,
  Lead,
  LeadActivity,
  LeadStatus,
  LeadSummary,
  Priority,
  Task,
  TaskColumn,
  UnassignConflict,
} from '@/types/models';

/**
 * The data contract every screen codes against. Both the embedded SQLite repository and the
 * HTTP client satisfy it, so swapping the source is invisible to the UI.
 */

export interface LeadListPayload {
  leads: Lead[];
  summary: LeadSummary;
  sources: string[];
  owners: string[];
}

export interface LeadDetailPayload {
  lead: Lead;
  activities: LeadActivity[];
}

export interface TaskListPayload {
  tasks: Task[];
  counts: Record<TaskColumn, number>;
  overdueIds: string[];
  assignees: string[];
}

export interface CampaignListPayload {
  campaigns: Campaign[];
  totals: CampaignTotals;
}

export interface CampaignDetailPayload {
  campaign: Campaign;
  weeklyPerformance: { label: string; clicks: number; conversions: number }[];
}

export interface CalendarPayload {
  events: CalendarEvent[];
  overdueIds: string[];
}

export interface ApprovalListPayload {
  approvals: Approval[];
  counts: Record<ApprovalStatus, number>;
}

export interface CreateProjectInput {
  name: string;
  clientName: string;
  type: string;
  brandPrimary: string;
  brandAccent: string;
}

export interface CreateLeadInput {
  name: string;
  email: string;
  company: string;
  phone: string;
  source: string;
  status: LeadStatus;
  estimatedValue: number | null;
  capturedFrom: string;
  assignedTeamMember: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  column: TaskColumn;
  assignee: string;
  dueDate: string;
  priority: Priority;
  notes?: string;
}

export interface CreateCampaignInput {
  name: string;
  channel: Channel;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  owner: string;
  notes?: string;
}

export interface CreateCalendarEventInput {
  title: string;
  channel: Channel;
  date: string;
  status: EventStatus;
  assignee: string;
}

export interface CreateApprovalInput {
  title: string;
  requestType: Approval['requestType'];
  submittedBy: string;
  summary: string;
  details: string;
  pros: string;
  cons: string;
  recommendation: string;
}

export type ToggleAssignmentResult =
  | { assigned: boolean; memberId: string; releasedTaskCount?: number }
  | UnassignConflict;
