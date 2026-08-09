import {
  APPROVAL_STATUSES,
  CAMPAIGN_STATUSES,
  CHANNELS,
  EVENT_STATUSES,
  FREQUENCIES,
  LEAD_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  REQUEST_TYPES,
  TASK_COLUMNS,
} from '@/constants/enums';
import { ApiError } from '@/lib/api/error';
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
import { transaction, type SqlDriver, type SqlValue } from './driver';
import {
  parseJson,
  toAgencySettings,
  toApproval,
  toApprovalComment,
  toCalendarEvent,
  toCampaign,
  toChannelBreakdown,
  toGoal,
  toKpiSnapshot,
  toLead,
  toLeadActivity,
  toProject,
  toTask,
  toTeamMember,
  toTimeSeriesPoint,
  toTimelineAnnotation,
} from './mappers';
import {
  badRequest,
  dayMonth,
  id,
  monthLabel,
  notFound,
  nowIso,
  optionalString,
  reportingPeriod,
  requireDate,
  requireEmail,
  requireEnum,
  requireHexColor,
  requireString,
  toNullableNumber,
  toNumber,
  todayIso,
} from './support';
import type {
  AgencySettings,
  Approval,
  ApprovalStatus,
  CalendarEvent,
  Campaign,
  ClientView,
  Frequency,
  InboxItem,
  InboxPayload,
  Lead,
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
  TimeSeriesPoint,
  UnassignConflict,
} from '@/types/models';

/** 409 carrying the conflict body, so the unassign flow behaves the same as over HTTP. */
class ApiConflict extends ApiError {
  constructor(body: UnassignConflict) {
    super(409, `${body.memberName} still owns ${body.taskCount} open task(s) on this project`, body);
  }
}

const DEFAULT_REPORT_SECTIONS = [
  'Executive summary',
  'Channel performance',
  'Lead pipeline',
  'Campaign detail',
  'Content calendar',
  'Next steps',
];

const THUMBNAIL_COLORS = ['#1F4BC5', '#E4756A', '#2CB1A6', '#7C4DFF', '#F2A33C'];

/**
 * Every read and write the app performs, expressed against a `SqlDriver`. This is the single
 * implementation of the data layer: the app injects `expo-sqlite`, the test script injects
 * Node's SQLite, and payload shapes match the HTTP API exactly so screens are unaware which
 * source is in use.
 */
export function createRepository(driver: SqlDriver) {
  const all = <T extends Record<string, SqlValue> = Record<string, SqlValue>>(sql: string, ...params: SqlValue[]) =>
    driver.all<T>(sql, params);
  const get = <T extends Record<string, SqlValue> = Record<string, SqlValue>>(sql: string, ...params: SqlValue[]) =>
    driver.get<T>(sql, params);
  const run = (sql: string, ...params: SqlValue[]) => driver.run(sql, params);
  const count = (sql: string, ...params: SqlValue[]) => Number(get<{ c: number }>(sql, ...params)?.c ?? 0);

  function findProject(projectId: string): Project {
    const row = get('SELECT * FROM projects WHERE id = ?', projectId);
    if (!row) throw notFound(`Project ${projectId} was not found`);
    return toProject(row);
  }

  function findLead(leadId: string): Lead {
    const row = get('SELECT * FROM leads WHERE id = ?', leadId);
    if (!row) throw notFound(`Lead ${leadId} was not found`);
    return toLead(row);
  }

  function findTask(taskId: string): Task {
    const row = get('SELECT * FROM tasks WHERE id = ?', taskId);
    if (!row) throw notFound(`Task ${taskId} was not found`);
    return toTask(row);
  }

  function findCampaign(campaignId: string): Campaign {
    const row = get('SELECT * FROM campaigns WHERE id = ?', campaignId);
    if (!row) throw notFound(`Campaign ${campaignId} was not found`);
    return toCampaign(row);
  }

  function findEvent(eventId: string): CalendarEvent {
    const row = get('SELECT * FROM calendar_events WHERE id = ?', eventId);
    if (!row) throw notFound(`Calendar item ${eventId} was not found`);
    return toCalendarEvent(row);
  }

  function approvalComments(approvalId: string) {
    return all('SELECT * FROM approval_comments WHERE approval_id = ? ORDER BY created_at', approvalId).map(
      toApprovalComment,
    );
  }

  function findApproval(approvalId: string): Approval {
    const row = get('SELECT * FROM approvals WHERE id = ?', approvalId);
    if (!row) throw notFound(`Approval ${approvalId} was not found`);
    return toApproval(row, approvalComments(approvalId));
  }

  function leadActivities(leadId: string) {
    return all('SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC', leadId).map(toLeadActivity);
  }

  function logActivity(lead: Lead, activityType: string, content: string, author: string): void {
    run(
      'INSERT INTO lead_activities (id, lead_id, project_id, activity_type, content, author, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id('act'),
      lead.id,
      lead.projectId,
      activityType,
      content,
      author,
      nowIso(),
    );
  }

  function projectMembers(projectId: string) {
    return all(
      `SELECT t.* FROM team_members t
       JOIN project_members pm ON pm.member_id = t.id
       WHERE pm.project_id = ? ORDER BY t.name`,
      projectId,
    ).map(toTeamMember);
  }

  function projectTasks(projectId: string): Task[] {
    return all('SELECT * FROM tasks WHERE project_id = ? ORDER BY due_date', projectId).map(toTask);
  }

  function timeSeries(projectId: string): TimeSeriesPoint[] {
    const currentMonth = todayIso().slice(0, 7);
    const currentMonthLeadCount = Number(
      get('SELECT COUNT(*) AS count FROM leads WHERE project_id = ? AND created_at >= ?', projectId, `${currentMonth}-01`)?.count ?? 0,
    );
    return all('SELECT * FROM time_series WHERE project_id = ? ORDER BY month_start', projectId)
      .map(toTimeSeriesPoint)
      .map((point) => (point.month.startsWith(currentMonth) ? { ...point, leads: currentMonthLeadCount } : point))
      .map((point) => ({ ...point, label: monthLabel(point.month) }));
  }

  /** Six trailing weeks of report engagement, derived from the stored totals. */
  function weeklyEngagement(opens: number, downloads: number): ReportConfig['weeklyEngagement'] {
    return [0.11, 0.13, 0.16, 0.18, 0.2, 0.22].map((weight, index) => ({
      label: `W${index + 1}`,
      opens: Math.round(opens * weight),
      downloads: Math.round(downloads * weight),
    }));
  }

  function findReportConfig(projectId: string): ReportConfig {
    const row = get('SELECT * FROM report_configs WHERE project_id = ?', projectId);
    if (!row) throw notFound(`Report config for ${projectId} was not found`);
    const configId = String(row.id);
    const recipients = all('SELECT email FROM report_recipients WHERE report_config_id = ? ORDER BY email', configId).map(
      (entry) => String(entry.email),
    );
    const stats = parseJson<ReportConfig['engagementStats']>(String(row.engagement_stats), {
      opens: 0,
      downloads: 0,
      lastOpenedDate: null,
    });
    return {
      id: configId,
      projectId: String(row.project_id),
      includedSections: parseJson<string[]>(String(row.included_sections), []),
      frequency: String(row.frequency) as Frequency,
      internalReviewFirst: Number(row.internal_review_first) === 1,
      lastSentAt: row.last_sent_at === null || row.last_sent_at === undefined ? null : String(row.last_sent_at),
      engagementStats: stats,
      recipients,
      weeklyEngagement: weeklyEngagement(stats.opens, stats.downloads),
    };
  }

  function loadSettings(): AgencySettings {
    const row = get('SELECT * FROM agency_settings LIMIT 1');
    if (!row) throw notFound('Agency settings have not been initialised');
    return toAgencySettings(row);
  }

  function persistSettings(settings: AgencySettings): AgencySettings {
    run(
      'UPDATE agency_settings SET agency_name = ?, logo_placeholder = ?, notifications = ?, integrations = ?, updated_at = ? WHERE id = ?',
      settings.agencyName,
      settings.logoPlaceholder,
      JSON.stringify(settings.notifications),
      JSON.stringify(settings.integrations),
      nowIso(),
      settings.id,
    );
    return loadSettings();
  }

  function buildInbox(): InboxItem[] {
    const approvals = all(
      `SELECT a.*, p.name AS project_name FROM approvals a
       JOIN projects p ON p.id = a.project_id
       WHERE a.status = 'Pending' ORDER BY a.submitted_at DESC`,
    );
    const tasks = all(
      `SELECT t.*, p.name AS project_name FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.column_name = 'Review' ORDER BY t.due_date`,
    );

    const approvalItems: InboxItem[] = approvals.map((row) => {
      const approval = toApproval(row, []);
      return {
        id: `approval:${approval.id}`,
        kind: 'approval',
        title: approval.title,
        subtitle: `${approval.requestType} · submitted by ${approval.submittedBy}`,
        projectId: approval.projectId,
        projectName: String(row.project_name),
        timestamp: approval.submittedAt,
        destination: `/project/${approval.projectId}/approvals`,
        entityId: approval.id,
      };
    });

    const taskItems: InboxItem[] = tasks.map((row) => {
      const task = toTask(row);
      return {
        id: `task:${task.id}`,
        kind: 'task',
        title: task.title,
        subtitle: `In review · ${task.assignee} · due ${dayMonth(task.dueDate)}`,
        projectId: task.projectId,
        projectName: String(row.project_name),
        timestamp: task.dueDate,
        destination: `/project/${task.projectId}/tasks`,
        entityId: task.id,
      };
    });

    return [...approvalItems, ...taskItems];
  }

  return {
    /** Demo-only: any non-empty credentials are accepted and no token is verified. */
    signIn(email: string, password: string): { token: string; user: SessionUser } {
      const normalized = requireString(email, 'Email', 200).toLowerCase();
      requireString(password, 'Password', 200);
      const row = get('SELECT * FROM team_members WHERE lower(email) = ?', normalized);
      const user: SessionUser = row
        ? toTeamMember(row)
        : {
            id: id('tm'),
            name: normalized
              .split('@')[0]!
              .split(/[._-]/)
              .filter(Boolean)
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' '),
            email: normalized,
            role: 'Admin',
            avatarColor: '#1F4BC5',
          };
      return { token: `demo.${id('sess')}`, user };
    },

    getProjects(): ProjectSummary[] {
      return all('SELECT * FROM projects ORDER BY created_at DESC')
        .map(toProject)
        .map((project) => ({
          ...project,
          leadCount: count('SELECT COUNT(*) AS c FROM leads WHERE project_id = ?', project.id),
          campaignCount: count('SELECT COUNT(*) AS c FROM campaigns WHERE project_id = ?', project.id),
          taskCount: count('SELECT COUNT(*) AS c FROM tasks WHERE project_id = ?', project.id),
          teamCount: count('SELECT COUNT(*) AS c FROM project_members WHERE project_id = ?', project.id),
        }));
    },

    getProject: findProject,

    createProject(input: CreateProjectInput): Project {
      const name = requireString(input.name, 'Project name', 120);
      const clientName = requireString(input.clientName, 'Client name', 120);
      const type = requireString(input.type, 'Type', 160);
      const brandPrimary = requireHexColor(input.brandPrimary, 'Primary colour');
      const brandAccent = requireHexColor(input.brandAccent, 'Accent colour');
      const projectId = id('prj');

      transaction(driver, () => {
        run(
          `INSERT INTO projects (id, name, client_name, type, status, brand_primary, brand_accent, created_at, top_kpi_label, top_kpi_value)
           VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, 'Leads', '0')`,
          projectId,
          name,
          clientName,
          type,
          brandPrimary,
          brandAccent,
          todayIso(),
        );
        // Every new project starts with a default weekly report config.
        run(
          `INSERT INTO report_configs (id, project_id, included_sections, frequency, internal_review_first, last_sent_at, engagement_stats)
           VALUES (?, ?, ?, 'Weekly', 1, NULL, ?)`,
          id('rpt'),
          projectId,
          JSON.stringify(DEFAULT_REPORT_SECTIONS),
          JSON.stringify({ opens: 0, downloads: 0, lastOpenedDate: null }),
        );
      });

      return findProject(projectId);
    },

    updateProject(projectId: string, input: Partial<CreateProjectInput & { status: string }>): Project {
      const project = findProject(projectId);
      const next = {
        name: input.name === undefined ? project.name : requireString(input.name, 'Project name', 120),
        clientName: input.clientName === undefined ? project.clientName : requireString(input.clientName, 'Client name', 120),
        type: input.type === undefined ? project.type : requireString(input.type, 'Type', 160),
        status: input.status === undefined ? project.status : requireEnum(input.status, 'Status', PROJECT_STATUSES),
        brandPrimary:
          input.brandPrimary === undefined ? project.brandPrimary : requireHexColor(input.brandPrimary, 'Primary colour'),
        brandAccent:
          input.brandAccent === undefined ? project.brandAccent : requireHexColor(input.brandAccent, 'Accent colour'),
      };
      run(
        'UPDATE projects SET name = ?, client_name = ?, type = ?, status = ?, brand_primary = ?, brand_accent = ? WHERE id = ?',
        next.name,
        next.clientName,
        next.type,
        next.status,
        next.brandPrimary,
        next.brandAccent,
        project.id,
      );
      return findProject(project.id);
    },

    /**
     * Fully derived from live rows so any write shows up immediately. Only "Return on spend"
     * falls back to the stored snapshot — it needs revenue the schema does not model.
     */
    getProjectOverview(projectId: string): ProjectOverview {
      const project = findProject(projectId);
      const campaigns = all('SELECT * FROM campaigns WHERE project_id = ?', project.id).map(toCampaign);
      const statusRows = all<{ status: string; c: number }>(
        'SELECT status, COUNT(*) AS c FROM leads WHERE project_id = ? GROUP BY status',
        project.id,
      );
      const snapshots = all('SELECT * FROM kpi_snapshots WHERE project_id = ?', project.id).map(toKpiSnapshot);
      const tasks = projectTasks(project.id);

      const leadCount = statusRows.reduce((total, row) => total + Number(row.c), 0);
      const statusCount = (status: string) => Number(statusRows.find((row) => row.status === status)?.c ?? 0);
      const spend = campaigns.reduce((total, campaign) => total + campaign.spent, 0);
      const conversions = campaigns.reduce((total, campaign) => total + campaign.conversions, 0);
      const costPerLead = leadCount > 0 ? spend / leadCount : 0;
      const snapshotFor = (metric: string) => snapshots.find((snapshot) => snapshot.metric === metric);
      const spendLabel = Math.round(spend).toLocaleString('en-US');

      const kpis: ProjectOverview['kpis'] = [
        {
          metric: 'Leads',
          format: 'number',
          current: leadCount,
          previous: snapshotFor('Leads')?.previous ?? leadCount,
          sparkline: snapshotFor('Leads')?.sparkline ?? [],
          caption: `${statusCount('New')} new this period`,
        },
        {
          metric: 'Conversions',
          format: 'number',
          current: conversions,
          previous: snapshotFor('Conversions')?.previous ?? conversions,
          sparkline: snapshotFor('Conversions')?.sparkline ?? [],
          caption: `across ${campaigns.length} attributed campaigns`,
        },
        {
          metric: 'Cost per lead',
          format: 'currency',
          current: Math.round(costPerLead),
          previous: snapshotFor('Cost per lead')?.previous ?? Math.round(costPerLead),
          sparkline: snapshotFor('Cost per lead')?.sparkline ?? [],
          caption: `$${spendLabel} spend across ${campaigns.length} campaigns`,
          lowerIsBetter: true,
        },
        {
          metric: 'Return on spend',
          format: 'multiple',
          current: snapshotFor('Return on spend')?.current ?? 0,
          previous: snapshotFor('Return on spend')?.previous ?? 0,
          sparkline: snapshotFor('Return on spend')?.sparkline ?? [],
          caption: `$${spendLabel} spend to date`,
        },
      ];

      const stages = ['New', 'Contacted', 'Qualified', 'Won'] as const;
      const funnel = stages.map((stage, index) => {
        const stageCount = statusCount(stage);
        const previousCount = index === 0 ? leadCount : statusCount(stages[index - 1]!);
        return {
          stage,
          count: stageCount,
          shareOfTotal: leadCount > 0 ? stageCount / leadCount : 0,
          shareOfPrevious: previousCount > 0 ? stageCount / previousCount : 0,
        };
      });

      const today = todayIso();

      return {
        project,
        reportingPeriod: reportingPeriod(),
        kpis,
        totals: { leadCount, conversions, spend, costPerLead, campaignCount: campaigns.length },
        funnel,
        leadStatusCounts: Object.fromEntries(LEAD_STATUSES.map((status) => [status, statusCount(status)])) as Record<
          LeadStatus,
          number
        >,
        conversionRate: leadCount > 0 ? statusCount('Won') / leadCount : 0,
        timeSeries: timeSeries(project.id),
        channels: all('SELECT * FROM channel_breakdowns WHERE project_id = ? ORDER BY visits DESC', project.id).map(
          toChannelBreakdown,
        ),
        annotations: all(
          'SELECT * FROM timeline_annotations WHERE project_id = ? ORDER BY annotation_date DESC',
          project.id,
        ).map(toTimelineAnnotation),
        topCampaigns: [...campaigns].sort((a, b) => b.spent - a.spent).slice(0, 4),
        upcomingTasks: tasks.filter((task) => task.column !== 'Done').slice(0, 6),
        overdueTaskCount: tasks.filter((task) => task.column !== 'Done' && task.dueDate < today).length,
        recentActivity: all(
          'SELECT * FROM lead_activities WHERE project_id = ? ORDER BY created_at DESC LIMIT 6',
          project.id,
        ).map(toLeadActivity),
        team: projectMembers(project.id),
      };
    },

    getClientView(projectId: string): ClientView {
      const project = findProject(projectId);
      const campaigns = all('SELECT * FROM campaigns WHERE project_id = ?', project.id).map(toCampaign);
      const points = timeSeries(project.id);
      const leadCount = count('SELECT COUNT(*) AS c FROM leads WHERE project_id = ?', project.id);
      const spend = campaigns.reduce((total, campaign) => total + campaign.spent, 0);
      const snapshot = all('SELECT * FROM kpi_snapshots WHERE project_id = ?', project.id)
        .map(toKpiSnapshot)
        .find((entry) => entry.metric === 'Return on spend');

      return {
        project,
        traffic: points.reduce((total, point) => total + point.traffic, 0),
        conversions: campaigns.reduce((total, campaign) => total + campaign.conversions, 0),
        costPerLead: leadCount > 0 ? spend / leadCount : 0,
        returnOnSpend: snapshot?.current ?? 0,
        timeSeries: points,
        goals: all('SELECT * FROM goals WHERE project_id = ? ORDER BY label', project.id).map(toGoal),
        generatedAt: nowIso(),
      };
    },

    getProjectLeads(projectId: string): LeadListPayload {
      const project = findProject(projectId);
      const leads = all('SELECT * FROM leads WHERE project_id = ? ORDER BY created_at DESC', project.id).map(toLead);
      const byStatus = (status: string) => leads.filter((lead) => lead.status === status);
      const won = byStatus('Won').length;

      return {
        leads,
        summary: {
          total: leads.length,
          new: byStatus('New').length,
          contacted: byStatus('Contacted').length,
          qualified: byStatus('Qualified').length,
          won,
          lost: byStatus('Lost').length,
          conversionRate: leads.length > 0 ? won / leads.length : 0,
          valueByStatus: Object.fromEntries(
            LEAD_STATUSES.map((status) => [
              status,
              byStatus(status).reduce((total, lead) => total + (lead.estimatedValue ?? 0), 0),
            ]),
          ) as Record<LeadStatus, number>,
        },
        sources: [...new Set(leads.map((lead) => lead.source))].sort(),
        owners: [...new Set(leads.map((lead) => lead.assignedTeamMember))].sort(),
      };
    },

    getLead(leadId: string): LeadDetailPayload {
      const lead = findLead(leadId);
      return { lead, activities: leadActivities(lead.id) };
    },

    createLead(projectId: string, input: CreateLeadInput): LeadDetailPayload {
      const project = findProject(projectId);
      const lead: Lead = {
        id: id('lead'),
        projectId: project.id,
        name: requireString(input.name, 'Name', 120),
        email: requireEmail(input.email, 'Email'),
        company: optionalString(input.company, 'Individual customer') || 'Individual customer',
        phone: optionalString(input.phone),
        source: requireString(input.source, 'Source', 80),
        status: requireEnum(input.status ?? 'New', 'Status', LEAD_STATUSES),
        estimatedValue: toNullableNumber(input.estimatedValue),
        capturedFrom: requireString(input.capturedFrom, 'Captured from', 160),
        assignedTeamMember: requireString(input.assignedTeamMember, 'Owner', 120),
        createdAt: nowIso(),
        lastContactedAt: nowIso(),
      };

      transaction(driver, () => {
        run(
          `INSERT INTO leads (id, project_id, name, email, company, phone, source, status, estimated_value, captured_from, assigned_team_member, created_at, last_contacted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          lead.id,
          lead.projectId,
          lead.name,
          lead.email,
          lead.company,
          lead.phone,
          lead.source,
          lead.status,
          lead.estimatedValue,
          lead.capturedFrom,
          lead.assignedTeamMember,
          lead.createdAt,
          lead.lastContactedAt,
        );
        logActivity(lead, 'Lead created', `${lead.name} was added from ${lead.capturedFrom}.`, lead.assignedTeamMember);
      });

      return { lead, activities: leadActivities(lead.id) };
    },

    updateLead(leadId: string, input: Partial<CreateLeadInput> & { author?: string }): LeadDetailPayload {
      const lead = findLead(leadId);
      const author = optionalString(input.author, 'Alex Morgan') || 'Alex Morgan';
      const next: Lead = {
        ...lead,
        name: input.name === undefined ? lead.name : requireString(input.name, 'Name', 120),
        email: input.email === undefined ? lead.email : requireEmail(input.email, 'Email'),
        company: input.company === undefined ? lead.company : optionalString(input.company, lead.company),
        phone: input.phone === undefined ? lead.phone : optionalString(input.phone),
        source: input.source === undefined ? lead.source : requireString(input.source, 'Source', 80),
        status: input.status === undefined ? lead.status : requireEnum(input.status, 'Status', LEAD_STATUSES),
        estimatedValue: input.estimatedValue === undefined ? lead.estimatedValue : toNullableNumber(input.estimatedValue),
        capturedFrom:
          input.capturedFrom === undefined ? lead.capturedFrom : requireString(input.capturedFrom, 'Captured from', 160),
        assignedTeamMember:
          input.assignedTeamMember === undefined
            ? lead.assignedTeamMember
            : requireString(input.assignedTeamMember, 'Owner', 120),
      };

      // A status change counts as contact, so lastContactedAt moves with it.
      const statusChanged = next.status !== lead.status;
      next.lastContactedAt = statusChanged ? nowIso() : lead.lastContactedAt;

      transaction(driver, () => {
        run(
          `UPDATE leads SET name = ?, email = ?, company = ?, phone = ?, source = ?, status = ?, estimated_value = ?,
           captured_from = ?, assigned_team_member = ?, last_contacted_at = ? WHERE id = ?`,
          next.name,
          next.email,
          next.company,
          next.phone,
          next.source,
          next.status,
          next.estimatedValue,
          next.capturedFrom,
          next.assignedTeamMember,
          next.lastContactedAt,
          next.id,
        );
        if (statusChanged) logActivity(next, 'Status change', `Lead moved to ${next.status}.`, author);
      });

      return { lead: findLead(next.id), activities: leadActivities(next.id) };
    },

    addLeadNote(leadId: string, content: string, author: string): LeadDetailPayload {
      const lead = findLead(leadId);
      logActivity(lead, 'Note', requireString(content, 'Note', 1000), optionalString(author, 'Alex Morgan') || 'Alex Morgan');
      return { lead, activities: leadActivities(lead.id) };
    },

    deleteLead(leadId: string): { ok: true; id: string } {
      const lead = findLead(leadId);
      transaction(driver, () => {
        run('DELETE FROM lead_activities WHERE lead_id = ?', lead.id);
        run('DELETE FROM leads WHERE id = ?', lead.id);
      });
      return { ok: true, id: lead.id };
    },

    getProjectTasks(projectId: string): TaskListPayload {
      const project = findProject(projectId);
      const tasks = projectTasks(project.id);
      const today = todayIso();
      return {
        tasks,
        counts: Object.fromEntries(
          TASK_COLUMNS.map((column) => [column, tasks.filter((task) => task.column === column).length]),
        ) as Record<TaskColumn, number>,
        overdueIds: tasks.filter((task) => task.column !== 'Done' && task.dueDate < today).map((task) => task.id),
        assignees: [...new Set(tasks.map((task) => task.assignee))].sort(),
      };
    },

    createTask(projectId: string, input: CreateTaskInput): Task {
      const project = findProject(projectId);
      const task: Task = {
        id: id('tsk'),
        projectId: project.id,
        title: requireString(input.title, 'Title', 160),
        description: requireString(input.description, 'Description', 1000),
        column: requireEnum(input.column ?? 'To Do', 'Column', TASK_COLUMNS),
        assignee: requireString(input.assignee, 'Assignee', 120),
        dueDate: requireDate(input.dueDate, 'Due date'),
        priority: requireEnum(input.priority ?? 'Medium', 'Priority', PRIORITIES),
        notes: optionalString(input.notes),
      };
      run(
        `INSERT INTO tasks (id, project_id, title, description, column_name, assignee, due_date, priority, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        task.id,
        task.projectId,
        task.title,
        task.description,
        task.column,
        task.assignee,
        task.dueDate,
        task.priority,
        task.notes,
      );
      return task;
    },

    updateTask(taskId: string, input: Partial<CreateTaskInput>): Task {
      const task = findTask(taskId);
      const next: Task = {
        ...task,
        title: input.title === undefined ? task.title : requireString(input.title, 'Title', 160),
        description:
          input.description === undefined ? task.description : requireString(input.description, 'Description', 1000),
        column: input.column === undefined ? task.column : requireEnum(input.column, 'Column', TASK_COLUMNS),
        assignee: input.assignee === undefined ? task.assignee : requireString(input.assignee, 'Assignee', 120),
        dueDate: input.dueDate === undefined ? task.dueDate : requireDate(input.dueDate, 'Due date'),
        priority: input.priority === undefined ? task.priority : requireEnum(input.priority, 'Priority', PRIORITIES),
        notes: input.notes === undefined ? task.notes : optionalString(input.notes),
      };
      run(
        'UPDATE tasks SET title = ?, description = ?, column_name = ?, assignee = ?, due_date = ?, priority = ?, notes = ? WHERE id = ?',
        next.title,
        next.description,
        next.column,
        next.assignee,
        next.dueDate,
        next.priority,
        next.notes,
        next.id,
      );
      return next;
    },

    deleteTask(taskId: string): { ok: true; id: string } {
      const task = findTask(taskId);
      run('DELETE FROM tasks WHERE id = ?', task.id);
      return { ok: true, id: task.id };
    },

    getProjectCampaigns(projectId: string): CampaignListPayload {
      const project = findProject(projectId);
      const campaigns = all('SELECT * FROM campaigns WHERE project_id = ? ORDER BY spent DESC', project.id).map(toCampaign);
      return {
        campaigns,
        totals: {
          count: campaigns.length,
          budget: campaigns.reduce((total, campaign) => total + campaign.budget, 0),
          spent: campaigns.reduce((total, campaign) => total + campaign.spent, 0),
          conversions: campaigns.reduce((total, campaign) => total + campaign.conversions, 0),
          clicks: campaigns.reduce((total, campaign) => total + campaign.clicks, 0),
          impressions: campaigns.reduce((total, campaign) => total + campaign.impressions, 0),
        },
      };
    },

    getCampaign(campaignId: string): CampaignDetailPayload {
      const campaign = findCampaign(campaignId);
      return { campaign, weeklyPerformance: weeklyCampaignPerformance(campaign) };
    },

    createCampaign(projectId: string, input: CreateCampaignInput): Campaign {
      const project = findProject(projectId);
      const campaign: Campaign = {
        id: id('cmp'),
        projectId: project.id,
        name: requireString(input.name, 'Campaign name', 120),
        channel: requireEnum(input.channel ?? 'Paid', 'Channel', CHANNELS),
        status: requireEnum(input.status ?? 'Scheduled', 'Status', CAMPAIGN_STATUSES),
        startDate: requireDate(input.startDate, 'Start date'),
        endDate: requireDate(input.endDate, 'End date'),
        budget: Math.max(0, toNumber(input.budget)),
        spent: Math.max(0, toNumber(input.spent)),
        impressions: Math.max(0, Math.round(toNumber(input.impressions))),
        clicks: Math.max(0, Math.round(toNumber(input.clicks))),
        conversions: Math.max(0, Math.round(toNumber(input.conversions))),
        owner: requireString(input.owner, 'Owner', 120),
        notes: optionalString(input.notes),
      };
      run(
        `INSERT INTO campaigns (id, project_id, name, channel, status, start_date, end_date, budget, spent, impressions, clicks, conversions, owner, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        campaign.id,
        campaign.projectId,
        campaign.name,
        campaign.channel,
        campaign.status,
        campaign.startDate,
        campaign.endDate,
        campaign.budget,
        campaign.spent,
        campaign.impressions,
        campaign.clicks,
        campaign.conversions,
        campaign.owner,
        campaign.notes,
      );
      return campaign;
    },

    updateCampaign(campaignId: string, input: Partial<CreateCampaignInput>): CampaignDetailPayload {
      const campaign = findCampaign(campaignId);
      const next: Campaign = {
        ...campaign,
        name: input.name === undefined ? campaign.name : requireString(input.name, 'Campaign name', 120),
        channel: input.channel === undefined ? campaign.channel : requireEnum(input.channel, 'Channel', CHANNELS),
        status: input.status === undefined ? campaign.status : requireEnum(input.status, 'Status', CAMPAIGN_STATUSES),
        startDate: input.startDate === undefined ? campaign.startDate : requireDate(input.startDate, 'Start date'),
        endDate: input.endDate === undefined ? campaign.endDate : requireDate(input.endDate, 'End date'),
        budget: input.budget === undefined ? campaign.budget : Math.max(0, toNumber(input.budget)),
        spent: input.spent === undefined ? campaign.spent : Math.max(0, toNumber(input.spent)),
        impressions:
          input.impressions === undefined ? campaign.impressions : Math.max(0, Math.round(toNumber(input.impressions))),
        clicks: input.clicks === undefined ? campaign.clicks : Math.max(0, Math.round(toNumber(input.clicks))),
        conversions:
          input.conversions === undefined ? campaign.conversions : Math.max(0, Math.round(toNumber(input.conversions))),
        owner: input.owner === undefined ? campaign.owner : requireString(input.owner, 'Owner', 120),
        notes: input.notes === undefined ? campaign.notes : optionalString(input.notes),
      };
      run(
        `UPDATE campaigns SET name = ?, channel = ?, status = ?, start_date = ?, end_date = ?, budget = ?, spent = ?,
         impressions = ?, clicks = ?, conversions = ?, owner = ?, notes = ? WHERE id = ?`,
        next.name,
        next.channel,
        next.status,
        next.startDate,
        next.endDate,
        next.budget,
        next.spent,
        next.impressions,
        next.clicks,
        next.conversions,
        next.owner,
        next.notes,
        next.id,
      );
      return { campaign: next, weeklyPerformance: weeklyCampaignPerformance(next) };
    },

    deleteCampaign(campaignId: string): { ok: true; id: string } {
      const campaign = findCampaign(campaignId);
      run('DELETE FROM campaigns WHERE id = ?', campaign.id);
      return { ok: true, id: campaign.id };
    },

    getProjectCalendar(projectId: string): CalendarPayload {
      const project = findProject(projectId);
      const events = all('SELECT * FROM calendar_events WHERE project_id = ? ORDER BY event_date', project.id).map(
        toCalendarEvent,
      );
      const today = todayIso();
      return {
        events,
        overdueIds: events.filter((event) => event.date < today && event.status !== 'Published').map((event) => event.id),
      };
    },

    createCalendarEvent(projectId: string, input: CreateCalendarEventInput): CalendarEvent {
      const project = findProject(projectId);
      const event: CalendarEvent = {
        id: id('evt'),
        projectId: project.id,
        title: requireString(input.title, 'Title', 160),
        channel: requireEnum(input.channel ?? 'Social', 'Channel', CHANNELS),
        date: requireDate(input.date, 'Date'),
        status: requireEnum(input.status ?? 'Draft', 'Status', EVENT_STATUSES),
        assignee: requireString(input.assignee, 'Assignee', 120),
      };
      run(
        'INSERT INTO calendar_events (id, project_id, title, channel, event_date, status, assignee) VALUES (?, ?, ?, ?, ?, ?, ?)',
        event.id,
        event.projectId,
        event.title,
        event.channel,
        event.date,
        event.status,
        event.assignee,
      );
      return event;
    },

    updateCalendarEvent(eventId: string, input: Partial<CreateCalendarEventInput>): CalendarEvent {
      const event = findEvent(eventId);
      const next: CalendarEvent = {
        ...event,
        title: input.title === undefined ? event.title : requireString(input.title, 'Title', 160),
        channel: input.channel === undefined ? event.channel : requireEnum(input.channel, 'Channel', CHANNELS),
        date: input.date === undefined ? event.date : requireDate(input.date, 'Date'),
        status: input.status === undefined ? event.status : requireEnum(input.status, 'Status', EVENT_STATUSES),
        assignee: input.assignee === undefined ? event.assignee : requireString(input.assignee, 'Assignee', 120),
      };
      run(
        'UPDATE calendar_events SET title = ?, channel = ?, event_date = ?, status = ?, assignee = ? WHERE id = ?',
        next.title,
        next.channel,
        next.date,
        next.status,
        next.assignee,
        next.id,
      );
      return next;
    },

    deleteCalendarEvent(eventId: string): { ok: true; id: string } {
      const event = findEvent(eventId);
      run('DELETE FROM calendar_events WHERE id = ?', event.id);
      return { ok: true, id: event.id };
    },

    getProjectApprovals(projectId: string): ApprovalListPayload {
      const project = findProject(projectId);
      const approvals = all('SELECT * FROM approvals WHERE project_id = ? ORDER BY submitted_at DESC', project.id).map(
        (row) => toApproval(row, approvalComments(String(row.id))),
      );
      return {
        approvals,
        counts: Object.fromEntries(
          APPROVAL_STATUSES.map((status) => [status, approvals.filter((approval) => approval.status === status).length]),
        ) as Record<ApprovalStatus, number>,
      };
    },

    createApproval(projectId: string, input: CreateApprovalInput): Approval {
      const project = findProject(projectId);
      const requestType = requireEnum(input.requestType ?? 'Creative', 'Request type', REQUEST_TYPES);
      const title = requireString(input.title, 'Title', 160);
      const approvalId = id('apv');

      run(
        `INSERT INTO approvals (id, project_id, title, type, request_type, thumbnail_color, status, submitted_by, submitted_at, summary, details, pros, cons, recommendation, attachments)
         VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
        approvalId,
        project.id,
        title,
        `${requestType} request`,
        requestType,
        THUMBNAIL_COLORS[Math.floor(Math.random() * THUMBNAIL_COLORS.length)]!,
        requireString(input.submittedBy, 'Submitted by', 120),
        nowIso(),
        requireString(input.summary, 'Summary', 500),
        requireString(input.details, 'Details', 2000),
        optionalString(input.pros),
        optionalString(input.cons),
        optionalString(input.recommendation),
        `${title} — working file, reference export`,
      );

      return findApproval(approvalId);
    },

    updateApprovalStatus(approvalId: string, status: ApprovalStatus): Approval {
      const approval = findApproval(approvalId);
      run('UPDATE approvals SET status = ? WHERE id = ?', requireEnum(status, 'Status', APPROVAL_STATUSES), approval.id);
      return findApproval(approval.id);
    },

    addApprovalComment(approvalId: string, author: string, message: string): Approval {
      const approval = findApproval(approvalId);
      run(
        'INSERT INTO approval_comments (id, approval_id, author, message, created_at) VALUES (?, ?, ?, ?, ?)',
        id('cmt'),
        approval.id,
        requireString(author, 'Author', 120),
        requireString(message, 'Comment', 1000),
        nowIso(),
      );
      return findApproval(approval.id);
    },

    deleteApproval(approvalId: string): { ok: true; id: string } {
      const approval = findApproval(approvalId);
      transaction(driver, () => {
        run('DELETE FROM approval_comments WHERE approval_id = ?', approval.id);
        run('DELETE FROM approvals WHERE id = ?', approval.id);
      });
      return { ok: true, id: approval.id };
    },

    getProjectReport(projectId: string): ReportConfig {
      return findReportConfig(findProject(projectId).id);
    },

    updateReportConfig(
      projectId: string,
      input: { frequency?: Frequency; internalReviewFirst?: boolean; includedSections?: string[] },
    ): ReportConfig {
      const project = findProject(projectId);
      const config = findReportConfig(project.id);
      const frequency =
        input.frequency === undefined ? config.frequency : requireEnum(input.frequency, 'Frequency', FREQUENCIES);
      const internalReviewFirst =
        input.internalReviewFirst === undefined ? config.internalReviewFirst : Boolean(input.internalReviewFirst);
      const includedSections = Array.isArray(input.includedSections)
        ? input.includedSections.map((section) => String(section)).filter(Boolean)
        : config.includedSections;

      run(
        'UPDATE report_configs SET frequency = ?, internal_review_first = ?, included_sections = ? WHERE id = ?',
        frequency,
        internalReviewFirst ? 1 : 0,
        JSON.stringify(includedSections),
        config.id,
      );
      return findReportConfig(project.id);
    },

    /** No delivery integration: this records the send so Activity stays truthful. */
    sendReport(projectId: string): ReportConfig {
      const project = findProject(projectId);
      const config = findReportConfig(project.id);
      run('UPDATE report_configs SET last_sent_at = ? WHERE id = ?', nowIso(), config.id);
      return findReportConfig(project.id);
    },

    addReportRecipient(projectId: string, email: string): ReportConfig {
      const project = findProject(projectId);
      const config = findReportConfig(project.id);
      run(
        'INSERT OR IGNORE INTO report_recipients (report_config_id, email) VALUES (?, ?)',
        config.id,
        requireEmail(email, 'Recipient email'),
      );
      return findReportConfig(project.id);
    },

    removeReportRecipient(projectId: string, email: string): ReportConfig {
      const project = findProject(projectId);
      const config = findReportConfig(project.id);
      run('DELETE FROM report_recipients WHERE report_config_id = ? AND email = ?', config.id, email.toLowerCase());
      return findReportConfig(project.id);
    },

    getAgencyTeam(): TeamMemberWithAssignments[] {
      const members = all('SELECT * FROM team_members ORDER BY name').map(toTeamMember);
      const assignments = all<{ member_id: string; project_id: string }>('SELECT member_id, project_id FROM project_members');
      const projects = all('SELECT * FROM projects').map(toProject);

      return members.map((member) => {
        const projectIds = assignments.filter((row) => row.member_id === member.id).map((row) => row.project_id);
        return {
          ...member,
          assignmentCount: projectIds.length,
          projects: projects
            .filter((project) => projectIds.includes(project.id))
            .map((project) => ({ id: project.id, name: project.name, clientName: project.clientName })),
        };
      });
    },

    getTeamMember(memberId: string): TeamMemberDetail {
      const row = get('SELECT * FROM team_members WHERE id = ?', memberId);
      if (!row) throw notFound(`Team member ${memberId} was not found`);
      const member = toTeamMember(row);
      const projects = all(
        'SELECT p.* FROM projects p JOIN project_members pm ON pm.project_id = p.id WHERE pm.member_id = ? ORDER BY p.name',
        memberId,
      ).map(toProject);

      return {
        ...member,
        assignmentCount: projects.length,
        openTaskCount: count("SELECT COUNT(*) AS c FROM tasks WHERE assignee = ? AND column_name != 'Done'", member.name),
        projects: projects.map((project) => ({ id: project.id, name: project.name, clientName: project.clientName })),
      };
    },

    getProjectTeam(projectId: string): ProjectTeamPayload {
      const project = findProject(projectId);
      const assigned = projectMembers(project.id);
      const assignedIds = new Set(assigned.map((member) => member.id));
      const agency = all('SELECT * FROM team_members ORDER BY name').map(toTeamMember);
      return {
        assigned,
        available: agency.filter((member) => !assignedIds.has(member.id)),
        counts: { onProject: assigned.length, available: agency.length - assigned.length, agencyTotal: agency.length },
      };
    },

    /**
     * Unassigning a member who still owns open tasks throws a 409 carrying the conflict body,
     * matching the HTTP API so the confirmation flow is identical either way.
     */
    toggleTeamMemberAssignment(projectId: string, memberId: string, force = false): ToggleAssignmentResult {
      const project = findProject(projectId);
      const memberRow = get('SELECT * FROM team_members WHERE id = ?', memberId);
      if (!memberRow) throw notFound(`Team member ${memberId} was not found`);
      const memberName = String(memberRow.name);

      const isAssigned = Boolean(
        get('SELECT 1 AS ok FROM project_members WHERE project_id = ? AND member_id = ?', project.id, memberId),
      );

      if (!isAssigned) {
        run('INSERT OR IGNORE INTO project_members (project_id, member_id) VALUES (?, ?)', project.id, memberId);
        return { assigned: true, memberId };
      }

      const openTasks = all(
        "SELECT * FROM tasks WHERE project_id = ? AND assignee = ? AND column_name != 'Done' ORDER BY due_date",
        project.id,
        memberName,
      ).map(toTask);

      if (openTasks.length > 0 && !force) {
        throw new ApiConflict({
          requiresConfirmation: true,
          memberId,
          memberName,
          taskCount: openTasks.length,
          sampleTasks: openTasks.slice(0, 4).map((task) => ({ id: task.id, title: task.title, dueDate: task.dueDate })),
        });
      }

      run('DELETE FROM project_members WHERE project_id = ? AND member_id = ?', project.id, memberId);
      return { assigned: false, memberId, releasedTaskCount: openTasks.length };
    },

    getAgencySettings: loadSettings,

    updateAgencySettings(input: { agencyName?: string; logoPlaceholder?: string }): AgencySettings {
      const settings = loadSettings();
      return persistSettings({
        ...settings,
        agencyName:
          input.agencyName === undefined ? settings.agencyName : requireString(input.agencyName, 'Agency name', 120),
        logoPlaceholder:
          input.logoPlaceholder === undefined
            ? settings.logoPlaceholder
            : requireString(input.logoPlaceholder, 'Logo initials', 4),
      });
    },

    toggleNotification(key: keyof AgencySettings['notifications'], enabled: boolean): AgencySettings {
      const settings = loadSettings();
      if (!(key in settings.notifications)) throw badRequest(`Unknown notification "${key}"`);
      return persistSettings({ ...settings, notifications: { ...settings.notifications, [key]: enabled } });
    },

    toggleIntegration(integrationId: string, connected: boolean): AgencySettings {
      const settings = loadSettings();
      const target = settings.integrations.find((integration) => integration.id === integrationId);
      if (!target) throw notFound(`Unknown integration "${integrationId}"`);
      return persistSettings({
        ...settings,
        integrations: settings.integrations.map((integration) =>
          integration.id === target.id ? { ...integration, connected } : integration,
        ),
      });
    },

    getInbox(): InboxPayload {
      const items = buildInbox();
      return {
        items,
        unreadCount: items.length,
        pendingApprovals: items.filter((item) => item.kind === 'approval').length,
        tasksInReview: items.filter((item) => item.kind === 'task').length,
      };
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;

/** Six-week clicks/conversions shape used by the campaign detail mini chart. */
function weeklyCampaignPerformance(campaign: Campaign) {
  return [0.12, 0.14, 0.16, 0.18, 0.19, 0.21].map((weight, index) => ({
    label: `W${index + 1}`,
    clicks: Math.round(campaign.clicks * weight),
    conversions: Math.round(campaign.conversions * weight),
  }));
}
