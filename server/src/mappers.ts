import type { Row } from './db.js';
import { parseJson } from './util.js';
import type {
  AgencySettings,
  Approval,
  ApprovalComment,
  ApprovalStatus,
  CalendarEvent,
  Campaign,
  CampaignStatus,
  Channel,
  ChannelBreakdown,
  EventStatus,
  Frequency,
  Goal,
  KpiSnapshot,
  Lead,
  LeadActivity,
  LeadStatus,
  Priority,
  Project,
  ReportConfig,
  RequestType,
  Role,
  Task,
  TaskColumn,
  TeamMember,
  TimeSeriesPoint,
  TimelineAnnotation,
} from './types.js';

const str = (row: Row, key: string): string => String(row[key] ?? '');
const num = (row: Row, key: string): number => Number(row[key] ?? 0);
const nullableNum = (row: Row, key: string): number | null =>
  row[key] === null || row[key] === undefined ? null : Number(row[key]);
const nullableStr = (row: Row, key: string): string | null =>
  row[key] === null || row[key] === undefined || row[key] === '' ? null : String(row[key]);

export const toProject = (row: Row): Project => ({
  id: str(row, 'id'),
  name: str(row, 'name'),
  clientName: str(row, 'client_name'),
  type: str(row, 'type'),
  status: str(row, 'status'),
  brandPrimary: str(row, 'brand_primary'),
  brandAccent: str(row, 'brand_accent'),
  createdAt: str(row, 'created_at'),
  topKpiLabel: str(row, 'top_kpi_label'),
  topKpiValue: str(row, 'top_kpi_value'),
});

export const toTeamMember = (row: Row): TeamMember => ({
  id: str(row, 'id'),
  name: str(row, 'name'),
  email: str(row, 'email'),
  role: str(row, 'role') as Role,
  avatarColor: str(row, 'avatar_color'),
});

export const toKpiSnapshot = (row: Row): KpiSnapshot => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  metric: str(row, 'metric'),
  current: num(row, 'current_value'),
  previous: num(row, 'previous_value'),
  sparkline: parseJson<number[]>(str(row, 'sparkline'), []),
});

export const toTimeSeriesPoint = (row: Row): TimeSeriesPoint => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  month: str(row, 'month_start'),
  traffic: num(row, 'traffic'),
  conversions: num(row, 'conversions'),
  spend: num(row, 'spend'),
  leads: num(row, 'leads'),
});

export const toChannelBreakdown = (row: Row): ChannelBreakdown => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  channel: str(row, 'channel') as Channel,
  visits: num(row, 'visits'),
  conversions: num(row, 'conversions'),
  spend: num(row, 'spend'),
  costPerLead: num(row, 'cost_per_lead'),
});

export const toTimelineAnnotation = (row: Row): TimelineAnnotation => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  date: str(row, 'annotation_date'),
  label: str(row, 'label'),
  note: str(row, 'note'),
  author: str(row, 'author'),
});

export const toGoal = (row: Row): Goal => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  label: str(row, 'label'),
  targetValue: num(row, 'target_value'),
  currentValue: num(row, 'current_value'),
  unit: str(row, 'unit'),
  period: str(row, 'period'),
});

export const toLead = (row: Row): Lead => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  name: str(row, 'name'),
  email: str(row, 'email'),
  company: str(row, 'company'),
  phone: str(row, 'phone'),
  source: str(row, 'source'),
  status: str(row, 'status') as LeadStatus,
  estimatedValue: nullableNum(row, 'estimated_value'),
  capturedFrom: str(row, 'captured_from'),
  assignedTeamMember: str(row, 'assigned_team_member'),
  createdAt: str(row, 'created_at'),
  lastContactedAt: str(row, 'last_contacted_at'),
});

export const toLeadActivity = (row: Row): LeadActivity => ({
  id: str(row, 'id'),
  leadId: str(row, 'lead_id'),
  projectId: str(row, 'project_id'),
  activityType: str(row, 'activity_type'),
  content: str(row, 'content'),
  author: str(row, 'author'),
  createdAt: str(row, 'created_at'),
});

export const toCampaign = (row: Row): Campaign => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  name: str(row, 'name'),
  channel: str(row, 'channel') as Channel,
  status: str(row, 'status') as CampaignStatus,
  startDate: str(row, 'start_date'),
  endDate: str(row, 'end_date'),
  budget: num(row, 'budget'),
  spent: num(row, 'spent'),
  impressions: num(row, 'impressions'),
  clicks: num(row, 'clicks'),
  conversions: num(row, 'conversions'),
  owner: str(row, 'owner'),
  notes: str(row, 'notes'),
});

export const toTask = (row: Row): Task => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  title: str(row, 'title'),
  description: str(row, 'description'),
  column: str(row, 'column_name') as TaskColumn,
  assignee: str(row, 'assignee'),
  dueDate: str(row, 'due_date'),
  priority: str(row, 'priority') as Priority,
  notes: str(row, 'notes'),
});

export const toCalendarEvent = (row: Row): CalendarEvent => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  title: str(row, 'title'),
  channel: str(row, 'channel') as Channel,
  date: str(row, 'event_date'),
  status: str(row, 'status') as EventStatus,
  assignee: str(row, 'assignee'),
});

export const toApprovalComment = (row: Row): ApprovalComment => ({
  id: str(row, 'id'),
  approvalId: str(row, 'approval_id'),
  author: str(row, 'author'),
  message: str(row, 'message'),
  createdAt: str(row, 'created_at'),
});

export const toApproval = (row: Row, comments: ApprovalComment[]): Approval => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  title: str(row, 'title'),
  type: str(row, 'type'),
  requestType: str(row, 'request_type') as RequestType,
  thumbnailColor: str(row, 'thumbnail_color'),
  status: str(row, 'status') as ApprovalStatus,
  submittedBy: str(row, 'submitted_by'),
  submittedAt: str(row, 'submitted_at'),
  summary: str(row, 'summary'),
  details: str(row, 'details'),
  pros: str(row, 'pros'),
  cons: str(row, 'cons'),
  recommendation: str(row, 'recommendation'),
  attachments: str(row, 'attachments'),
  comments,
});

export const toReportConfig = (
  row: Row,
  recipients: string[],
  weeklyEngagement: ReportConfig['weeklyEngagement'],
): ReportConfig => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  includedSections: parseJson<string[]>(str(row, 'included_sections'), []),
  frequency: str(row, 'frequency') as Frequency,
  internalReviewFirst: num(row, 'internal_review_first') === 1,
  lastSentAt: nullableStr(row, 'last_sent_at'),
  engagementStats: parseJson<ReportConfig['engagementStats']>(str(row, 'engagement_stats'), {
    opens: 0,
    downloads: 0,
    lastOpenedDate: null,
  }),
  recipients,
  weeklyEngagement,
});

export const toAgencySettings = (row: Row): AgencySettings => ({
  id: str(row, 'id'),
  agencyName: str(row, 'agency_name'),
  logoPlaceholder: str(row, 'logo_placeholder'),
  notifications: parseJson<AgencySettings['notifications']>(str(row, 'notifications'), {
    approvals: true,
    reports: true,
    tasks: true,
  }),
  integrations: parseJson<AgencySettings['integrations']>(str(row, 'integrations'), []),
  updatedAt: str(row, 'updated_at'),
});
