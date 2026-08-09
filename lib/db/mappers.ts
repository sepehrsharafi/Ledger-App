import type { SqlRow } from './driver';
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
  RequestType,
  Role,
  Task,
  TaskColumn,
  TeamMember,
  TimeSeriesPoint,
  TimelineAnnotation,
} from '@/types/models';

const str = (row: SqlRow, key: string): string => String(row[key] ?? '');
const num = (row: SqlRow, key: string): number => Number(row[key] ?? 0);
const nullableNum = (row: SqlRow, key: string): number | null =>
  row[key] === null || row[key] === undefined ? null : Number(row[key]);
const nullableStr = (row: SqlRow, key: string): string | null =>
  row[key] === null || row[key] === undefined || row[key] === '' ? null : String(row[key]);

export function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const toProject = (row: SqlRow): Project => ({
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

export const toTeamMember = (row: SqlRow): TeamMember => ({
  id: str(row, 'id'),
  name: str(row, 'name'),
  email: str(row, 'email'),
  role: str(row, 'role') as Role,
  avatarColor: str(row, 'avatar_color'),
});

export const toKpiSnapshot = (row: SqlRow): KpiSnapshot => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  metric: str(row, 'metric'),
  current: num(row, 'current_value'),
  previous: num(row, 'previous_value'),
  sparkline: parseJson<number[]>(str(row, 'sparkline'), []),
});

export const toTimeSeriesPoint = (row: SqlRow): Omit<TimeSeriesPoint, 'label'> => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  month: str(row, 'month_start'),
  traffic: num(row, 'traffic'),
  conversions: num(row, 'conversions'),
  spend: num(row, 'spend'),
  leads: num(row, 'leads'),
});

export const toChannelBreakdown = (row: SqlRow): ChannelBreakdown => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  channel: str(row, 'channel') as Channel,
  visits: num(row, 'visits'),
  conversions: num(row, 'conversions'),
  spend: num(row, 'spend'),
  costPerLead: num(row, 'cost_per_lead'),
});

export const toTimelineAnnotation = (row: SqlRow): TimelineAnnotation => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  date: str(row, 'annotation_date'),
  label: str(row, 'label'),
  note: str(row, 'note'),
  author: str(row, 'author'),
});

export const toGoal = (row: SqlRow): Goal => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  label: str(row, 'label'),
  targetValue: num(row, 'target_value'),
  currentValue: num(row, 'current_value'),
  unit: str(row, 'unit'),
  period: str(row, 'period'),
});

export const toLead = (row: SqlRow): Lead => ({
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

export const toLeadActivity = (row: SqlRow): LeadActivity => ({
  id: str(row, 'id'),
  leadId: str(row, 'lead_id'),
  projectId: str(row, 'project_id'),
  activityType: str(row, 'activity_type'),
  content: str(row, 'content'),
  author: str(row, 'author'),
  createdAt: str(row, 'created_at'),
});

export const toCampaign = (row: SqlRow): Campaign => ({
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

export const toTask = (row: SqlRow): Task => ({
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

export const toCalendarEvent = (row: SqlRow): CalendarEvent => ({
  id: str(row, 'id'),
  projectId: str(row, 'project_id'),
  title: str(row, 'title'),
  channel: str(row, 'channel') as Channel,
  date: str(row, 'event_date'),
  status: str(row, 'status') as EventStatus,
  assignee: str(row, 'assignee'),
});

export const toApprovalComment = (row: SqlRow): ApprovalComment => ({
  id: str(row, 'id'),
  approvalId: str(row, 'approval_id'),
  author: str(row, 'author'),
  message: str(row, 'message'),
  createdAt: str(row, 'created_at'),
});

export const toApproval = (row: SqlRow, comments: ApprovalComment[]): Approval => ({
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

export const toFrequency = (row: SqlRow): Frequency => str(row, 'frequency') as Frequency;
export const readNullableString = nullableStr;
export const readNumber = num;
export const readString = str;

export const toAgencySettings = (row: SqlRow): AgencySettings => ({
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
