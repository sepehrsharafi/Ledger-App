import { Router } from 'express';

import { all, get, run, transaction } from '../db.js';
import {
  toCampaign,
  toChannelBreakdown,
  toGoal,
  toKpiSnapshot,
  toLeadActivity,
  toTimeSeriesPoint,
  toTimelineAnnotation,
} from '../mappers.js';
import { findProject, listProjectMembers, listProjectTasks, listProjects } from '../repo.js';
import { LEAD_STATUSES, PROJECT_STATUSES } from '../types.js';
import type { ProjectSummary } from '../types.js';
import { id, nowIso, requireEnum, requireHexColor, requireString, todayIso } from '../util.js';

export const projectsRouter = Router();

const DEFAULT_REPORT_SECTIONS = [
  'Executive summary',
  'Channel performance',
  'Lead pipeline',
  'Campaign detail',
  'Content calendar',
  'Next steps',
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function countFor(table: string, projectId: string): number {
  const row = get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table} WHERE project_id = ?`, projectId);
  return Number(row?.count ?? 0);
}

projectsRouter.get('/', (_req, res) => {
  const summaries: ProjectSummary[] = listProjects().map((project) => ({
    ...project,
    leadCount: countFor('leads', project.id),
    campaignCount: countFor('campaigns', project.id),
    taskCount: countFor('tasks', project.id),
    teamCount: Number(
      get<{ count: number }>('SELECT COUNT(*) AS count FROM project_members WHERE project_id = ?', project.id)?.count ?? 0,
    ),
  }));
  res.json(summaries);
});

projectsRouter.post('/', (req, res) => {
  const name = requireString(req.body?.name, 'Project name', 120);
  const clientName = requireString(req.body?.clientName, 'Client name', 120);
  const type = requireString(req.body?.type, 'Type', 160);
  const brandPrimary = requireHexColor(req.body?.brandPrimary, 'Primary colour');
  const brandAccent = requireHexColor(req.body?.brandAccent, 'Accent colour');
  const projectId = id('prj');

  transaction(() => {
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

  res.status(201).json(findProject(projectId));
});

projectsRouter.get('/:projectId', (req, res) => {
  res.json(findProject(req.params.projectId));
});

projectsRouter.patch('/:projectId', (req, res) => {
  const project = findProject(req.params.projectId);
  const body = req.body ?? {};
  const next = {
    name: body.name === undefined ? project.name : requireString(body.name, 'Project name', 120),
    clientName: body.clientName === undefined ? project.clientName : requireString(body.clientName, 'Client name', 120),
    type: body.type === undefined ? project.type : requireString(body.type, 'Type', 160),
    status: body.status === undefined ? project.status : requireEnum(body.status, 'Status', PROJECT_STATUSES),
    brandPrimary:
      body.brandPrimary === undefined ? project.brandPrimary : requireHexColor(body.brandPrimary, 'Primary colour'),
    brandAccent: body.brandAccent === undefined ? project.brandAccent : requireHexColor(body.brandAccent, 'Accent colour'),
  };

  run(
    `UPDATE projects SET name = ?, client_name = ?, type = ?, status = ?, brand_primary = ?, brand_accent = ? WHERE id = ?`,
    next.name,
    next.clientName,
    next.type,
    next.status,
    next.brandPrimary,
    next.brandAccent,
    project.id,
  );

  res.json(findProject(project.id));
});

function monthLabel(isoMonth: string): string {
  const monthIndex = Number(isoMonth.slice(5, 7)) - 1;
  return MONTH_LABELS[monthIndex] ?? isoMonth.slice(5, 7);
}

function reportingPeriod(): { label: string; comparisonLabel: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const fmt = (date: Date) => `${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
  return {
    label: `${start.getDate()} – ${fmt(end)}`,
    comparisonLabel: `compared with ${prevStart.getDate()}–${fmt(prevEnd)}`,
  };
}

/**
 * Overview is fully derived from live rows so any CRUD change is reflected immediately.
 * Only "Return on spend" falls back to the stored snapshot — it needs revenue we do not model.
 */
projectsRouter.get('/:projectId/overview', (req, res) => {
  const project = findProject(req.params.projectId);
  const projectId = project.id;

  const campaigns = all('SELECT * FROM campaigns WHERE project_id = ?', projectId).map(toCampaign);
  const leadStatusRows = all<{ status: string; count: number }>(
    'SELECT status, COUNT(*) AS count FROM leads WHERE project_id = ? GROUP BY status',
    projectId,
  );
  const snapshots = all('SELECT * FROM kpi_snapshots WHERE project_id = ?', projectId).map(toKpiSnapshot);
  const tasks = listProjectTasks(projectId);

  const leadCount = leadStatusRows.reduce((total, row) => total + Number(row.count), 0);
  const statusCount = (status: string) => Number(leadStatusRows.find((row) => row.status === status)?.count ?? 0);
  const spend = campaigns.reduce((total, campaign) => total + campaign.spent, 0);
  const conversions = campaigns.reduce((total, campaign) => total + campaign.conversions, 0);
  const costPerLead = leadCount > 0 ? spend / leadCount : 0;
  const snapshotFor = (metric: string) => snapshots.find((snapshot) => snapshot.metric === metric);

  const kpis = [
    {
      metric: 'Leads',
      format: 'number' as const,
      current: leadCount,
      previous: snapshotFor('Leads')?.previous ?? leadCount,
      sparkline: snapshotFor('Leads')?.sparkline ?? [],
      caption: `${statusCount('New')} new this period`,
    },
    {
      metric: 'Conversions',
      format: 'number' as const,
      current: conversions,
      previous: snapshotFor('Conversions')?.previous ?? conversions,
      sparkline: snapshotFor('Conversions')?.sparkline ?? [],
      caption: `across ${campaigns.length} attributed campaigns`,
    },
    {
      metric: 'Cost per lead',
      format: 'currency' as const,
      current: Math.round(costPerLead),
      previous: snapshotFor('Cost per lead')?.previous ?? Math.round(costPerLead),
      sparkline: snapshotFor('Cost per lead')?.sparkline ?? [],
      caption: `$${Math.round(spend).toLocaleString('en-US')} spend across ${campaigns.length} campaigns`,
      lowerIsBetter: true,
    },
    {
      metric: 'Return on spend',
      format: 'multiple' as const,
      current: snapshotFor('Return on spend')?.current ?? 0,
      previous: snapshotFor('Return on spend')?.previous ?? 0,
      sparkline: snapshotFor('Return on spend')?.sparkline ?? [],
      caption: `$${Math.round(spend).toLocaleString('en-US')} spend to date`,
    },
  ];

  const funnelStages = ['New', 'Contacted', 'Qualified', 'Won'] as const;
  const funnel = funnelStages.map((stage, index) => {
    const count = statusCount(stage);
    const previousCount = index === 0 ? leadCount : statusCount(funnelStages[index - 1]!);
    return {
      stage,
      count,
      shareOfTotal: leadCount > 0 ? count / leadCount : 0,
      shareOfPrevious: previousCount > 0 ? count / previousCount : 0,
    };
  });

  const today = todayIso();
  const currentMonth = today.slice(0, 7);
  const currentMonthLeadCount = Number(
    get<{ count: number }>('SELECT COUNT(*) AS count FROM leads WHERE project_id = ? AND created_at >= ?', projectId, `${currentMonth}-01`)?.count ?? 0,
  );
  const timeSeries = all('SELECT * FROM time_series WHERE project_id = ? ORDER BY month_start', projectId)
    .map(toTimeSeriesPoint)
    .map((point) => (point.month.startsWith(currentMonth) ? { ...point, leads: currentMonthLeadCount } : point))
    .map((point) => ({ ...point, label: monthLabel(point.month) }));

  res.json({
    project,
    reportingPeriod: reportingPeriod(),
    kpis,
    totals: { leadCount, conversions, spend, costPerLead, campaignCount: campaigns.length },
    funnel,
    leadStatusCounts: Object.fromEntries(LEAD_STATUSES.map((status) => [status, statusCount(status)])),
    conversionRate: leadCount > 0 ? statusCount('Won') / leadCount : 0,
    timeSeries,
    channels: all('SELECT * FROM channel_breakdowns WHERE project_id = ? ORDER BY visits DESC', projectId).map(
      toChannelBreakdown,
    ),
    annotations: all('SELECT * FROM timeline_annotations WHERE project_id = ? ORDER BY annotation_date DESC', projectId).map(
      toTimelineAnnotation,
    ),
    topCampaigns: [...campaigns].sort((a, b) => b.spent - a.spent).slice(0, 4),
    upcomingTasks: tasks.filter((task) => task.column !== 'Done').slice(0, 6),
    overdueTaskCount: tasks.filter((task) => task.column !== 'Done' && task.dueDate < today).length,
    recentActivity: all('SELECT * FROM lead_activities WHERE project_id = ? ORDER BY created_at DESC LIMIT 6', projectId).map(
      toLeadActivity,
    ),
    team: listProjectMembers(projectId),
  });
});

/** Read-only, client-safe rollup. */
projectsRouter.get('/:projectId/client-view', (req, res) => {
  const project = findProject(req.params.projectId);
  const campaigns = all('SELECT * FROM campaigns WHERE project_id = ?', project.id).map(toCampaign);
  const timeSeries = all('SELECT * FROM time_series WHERE project_id = ? ORDER BY month_start', project.id)
    .map(toTimeSeriesPoint)
    .map((point) => ({ ...point, label: monthLabel(point.month) }));
  const leadCount = Number(
    get<{ count: number }>('SELECT COUNT(*) AS count FROM leads WHERE project_id = ?', project.id)?.count ?? 0,
  );
  const spend = campaigns.reduce((total, campaign) => total + campaign.spent, 0);
  const snapshot = all('SELECT * FROM kpi_snapshots WHERE project_id = ?', project.id)
    .map(toKpiSnapshot)
    .find((entry) => entry.metric === 'Return on spend');

  res.json({
    project,
    traffic: timeSeries.reduce((total, point) => total + point.traffic, 0),
    conversions: campaigns.reduce((total, campaign) => total + campaign.conversions, 0),
    costPerLead: leadCount > 0 ? spend / leadCount : 0,
    returnOnSpend: snapshot?.current ?? 0,
    timeSeries,
    goals: all('SELECT * FROM goals WHERE project_id = ? ORDER BY label', project.id).map(toGoal),
    generatedAt: nowIso(),
  });
});
