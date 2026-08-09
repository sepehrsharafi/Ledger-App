export const ROLES = ['Admin', 'Manager', 'Member'] as const;
export const CHANNELS = ['Search', 'Social', 'Email', 'Paid'] as const;
export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'] as const;
export const CAMPAIGN_STATUSES = ['Active', 'Scheduled', 'Ended'] as const;
export const TASK_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'] as const;
export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const EVENT_STATUSES = ['Draft', 'Scheduled', 'Published'] as const;
export const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export const REQUEST_TYPES = ['Creative', 'Copy', 'Budget', 'Strategy', 'Video'] as const;
export const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'] as const;
export const PROJECT_STATUSES = ['Active', 'Paused', 'Archived'] as const;

export type Role = (typeof ROLES)[number];
export type Channel = (typeof CHANNELS)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type TaskColumn = (typeof TASK_COLUMNS)[number];
export type Priority = (typeof PRIORITIES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
export type Frequency = (typeof FREQUENCIES)[number];

export interface Project {
  id: string;
  name: string;
  clientName: string;
  type: string;
  status: string;
  brandPrimary: string;
  brandAccent: string;
  createdAt: string;
  topKpiLabel: string;
  topKpiValue: string;
}

export interface ProjectSummary extends Project {
  leadCount: number;
  campaignCount: number;
  taskCount: number;
  teamCount: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

export interface KpiSnapshot {
  id: string;
  projectId: string;
  metric: string;
  current: number;
  previous: number;
  sparkline: number[];
}

export interface TimeSeriesPoint {
  id: string;
  projectId: string;
  month: string;
  traffic: number;
  conversions: number;
  spend: number;
  leads: number;
}

export interface ChannelBreakdown {
  id: string;
  projectId: string;
  channel: Channel;
  visits: number;
  conversions: number;
  spend: number;
  costPerLead: number;
}

export interface TimelineAnnotation {
  id: string;
  projectId: string;
  date: string;
  label: string;
  note: string;
  author: string;
}

export interface Goal {
  id: string;
  projectId: string;
  label: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  period: string;
}

export interface Lead {
  id: string;
  projectId: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  source: string;
  status: LeadStatus;
  estimatedValue: number | null;
  capturedFrom: string;
  assignedTeamMember: string;
  createdAt: string;
  lastContactedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  projectId: string;
  activityType: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  projectId: string;
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
  notes: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  column: TaskColumn;
  assignee: string;
  dueDate: string;
  priority: Priority;
  notes: string;
}

export interface CalendarEvent {
  id: string;
  projectId: string;
  title: string;
  channel: Channel;
  date: string;
  status: EventStatus;
  assignee: string;
}

export interface Approval {
  id: string;
  projectId: string;
  title: string;
  type: string;
  requestType: RequestType;
  thumbnailColor: string;
  status: ApprovalStatus;
  submittedBy: string;
  submittedAt: string;
  summary: string;
  details: string;
  pros: string;
  cons: string;
  recommendation: string;
  attachments: string;
  comments: ApprovalComment[];
}

export interface ApprovalComment {
  id: string;
  approvalId: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface ReportConfig {
  id: string;
  projectId: string;
  includedSections: string[];
  frequency: Frequency;
  internalReviewFirst: boolean;
  lastSentAt: string | null;
  engagementStats: {
    opens: number;
    downloads: number;
    lastOpenedDate: string | null;
  };
  recipients: string[];
  weeklyEngagement: { label: string; opens: number; downloads: number }[];
}

export interface AgencySettings {
  id: string;
  agencyName: string;
  logoPlaceholder: string;
  notifications: { approvals: boolean; reports: boolean; tasks: boolean };
  integrations: { id: string; name: string; connected: boolean }[];
  updatedAt: string;
}
