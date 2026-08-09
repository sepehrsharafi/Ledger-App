import type {
  APPROVAL_STATUSES,
  CAMPAIGN_STATUSES,
  CHANNELS,
  EVENT_STATUSES,
  FREQUENCIES,
  LEAD_STATUSES,
  PRIORITIES,
  REQUEST_TYPES,
  ROLES,
  TASK_COLUMNS,
} from '@/constants/enums';

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

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

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

export interface TeamMemberWithAssignments extends TeamMember {
  assignmentCount: number;
  projects: { id: string; name: string; clientName: string }[];
}

export interface TeamMemberDetail extends TeamMemberWithAssignments {
  openTaskCount: number;
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
  label: string;
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

export interface LeadSummary {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
  conversionRate: number;
  valueByStatus: Record<LeadStatus, number>;
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

export interface CampaignTotals {
  count: number;
  budget: number;
  spent: number;
  conversions: number;
  clicks: number;
  impressions: number;
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

export interface ApprovalComment {
  id: string;
  approvalId: string;
  author: string;
  message: string;
  createdAt: string;
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

export interface ReportConfig {
  id: string;
  projectId: string;
  includedSections: string[];
  frequency: Frequency;
  internalReviewFirst: boolean;
  lastSentAt: string | null;
  engagementStats: { opens: number; downloads: number; lastOpenedDate: string | null };
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

export type KpiFormat = 'number' | 'currency' | 'multiple' | 'percent';

export interface OverviewKpi {
  metric: string;
  format: KpiFormat;
  current: number;
  previous: number;
  sparkline: number[];
  caption: string;
  lowerIsBetter?: boolean;
}

export interface FunnelStage {
  stage: string;
  count: number;
  shareOfTotal: number;
  shareOfPrevious: number;
}

export interface ProjectOverview {
  project: Project;
  reportingPeriod: { label: string; comparisonLabel: string };
  kpis: OverviewKpi[];
  totals: { leadCount: number; conversions: number; spend: number; costPerLead: number; campaignCount: number };
  funnel: FunnelStage[];
  leadStatusCounts: Record<LeadStatus, number>;
  conversionRate: number;
  timeSeries: TimeSeriesPoint[];
  channels: ChannelBreakdown[];
  annotations: TimelineAnnotation[];
  topCampaigns: Campaign[];
  upcomingTasks: Task[];
  overdueTaskCount: number;
  recentActivity: LeadActivity[];
  team: TeamMember[];
}

export interface ClientView {
  project: Project;
  traffic: number;
  conversions: number;
  costPerLead: number;
  returnOnSpend: number;
  timeSeries: TimeSeriesPoint[];
  goals: Goal[];
  generatedAt: string;
}

export interface InboxItem {
  id: string;
  kind: 'approval' | 'task';
  title: string;
  subtitle: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  destination: string;
  entityId: string;
}

export interface InboxPayload {
  items: InboxItem[];
  unreadCount: number;
  pendingApprovals: number;
  tasksInReview: number;
}

export interface ProjectTeamPayload {
  assigned: TeamMember[];
  available: TeamMember[];
  counts: { onProject: number; available: number; agencyTotal: number };
}

/** 409 body returned when unassigning a member who still owns open tasks. */
export interface UnassignConflict {
  requiresConfirmation: true;
  memberId: string;
  memberName: string;
  taskCount: number;
  sampleTasks: { id: string; title: string; dueDate: string }[];
}
