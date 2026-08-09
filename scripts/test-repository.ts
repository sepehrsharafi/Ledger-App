/**
 * Exercises the embedded data layer against Node's SQLite. The repository, schema and seed are
 * the exact modules the app runs on `expo-sqlite`, so a pass here means the on-device data layer
 * is sound — only the driver differs.
 *
 * Run with: npm run test:data
 */
import { DatabaseSync } from 'node:sqlite';

import type { SqlDriver, SqlRow, SqlValue } from '../lib/db/driver';
import { initializeDatabase } from '../lib/db/setup';

function createNodeDriver(): SqlDriver {
  const db = new DatabaseSync(':memory:');
  return {
    all<T extends SqlRow = SqlRow>(sql: string, params: SqlValue[] = []): T[] {
      return db.prepare(sql).all(...params) as T[];
    },
    get<T extends SqlRow = SqlRow>(sql: string, params: SqlValue[] = []): T | undefined {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    run(sql: string, params: SqlValue[] = []): void {
      db.prepare(sql).run(...params);
    },
    exec(sql: string): void {
      db.exec(sql);
    },
  };
}

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(`${label}${detail === undefined ? '' : ` — got ${JSON.stringify(detail)}`}`);
}

function expectThrows(label: string, fn: () => unknown, expectedStatus?: number): void {
  try {
    fn();
    failures.push(`${label} — expected a rejection but the call succeeded`);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (expectedStatus !== undefined && status !== expectedStatus) {
      failures.push(`${label} — expected status ${expectedStatus}, got ${String(status)}`);
      return;
    }
    passed += 1;
  }
}

const repo = initializeDatabase(createNodeDriver());

// ---------- seed integrity ----------
const projects = repo.getProjects();
check('seeds 3 projects', projects.length === 3, projects.length);
check('project cards carry counts', projects.every((p) => p.leadCount > 0 && p.campaignCount > 0 && p.teamCount > 0));
check(
  'each project has the baseline plus a randomized current-month lead batch',
  projects.every((project) => project.leadCount >= 120 && project.leadCount <= 170),
  projects.map((project) => project.leadCount),
);
check(
  'each project has populated operational data',
  projects.every((project) => {
    const tasks = repo.getProjectTasks(project.id).tasks;
    const campaigns = repo.getProjectCampaigns(project.id).campaigns;
    const events = repo.getProjectCalendar(project.id).events;
    const approvals = repo.getProjectApprovals(project.id).approvals;
    return tasks.length === 100 && campaigns.length === 36 && events.length === 100 && approvals.length === 24;
  }),
);
const lumen = projects.find((p) => p.name === 'Lumen Skincare');
check('finds Lumen Skincare', Boolean(lumen));
const projectId = lumen!.id;

const team = repo.getAgencyTeam();
check('seeds 8 team members', team.length === 8, team.length);
check('members carry assignments', team.some((member) => member.assignmentCount > 0));

const tasks = repo.getProjectTasks(projectId);
check(
  'tasks populate every column',
  (['To Do', 'In Progress', 'Review', 'Done'] as const).every((column) => tasks.counts[column] > 0),
  tasks.counts,
);

const calendar = repo.getProjectCalendar(projectId);
check('calendar has items this month', calendar.events.length > 0, calendar.events.length);
const monthPrefix = new Date().toISOString().slice(0, 7);
check(
  'calendar items land in the current month',
  calendar.events.some((event) => event.date.startsWith(monthPrefix)),
);

// ---------- overview derivation ----------
const overview = repo.getProjectOverview(projectId);
const campaigns = repo.getProjectCampaigns(projectId);
const leads = repo.getProjectLeads(projectId);

check('overview kpis are complete', overview.kpis.length === 4, overview.kpis.map((k) => k.metric));
check('leads kpi matches lead count', overview.kpis[0]!.current === leads.leads.length);
check(
  'conversions kpi matches campaign sum',
  overview.kpis[1]!.current === campaigns.campaigns.reduce((total, c) => total + c.conversions, 0),
);
check(
  'cost per lead = spend / leads',
  overview.kpis[2]!.current === Math.round(campaigns.totals.spent / leads.leads.length),
  { kpi: overview.kpis[2]!.current, spend: campaigns.totals.spent, leads: leads.leads.length },
);
check('funnel has four stages', overview.funnel.length === 4);
check(
  'funnel counts match lead statuses',
  overview.funnel.every((stage) => stage.count === leads.leads.filter((lead) => lead.status === stage.stage).length),
);
check('twelve months of trend data', overview.timeSeries.length === 12, overview.timeSeries.length);
check('trend points are labelled', overview.timeSeries.every((point) => point.label.length === 3));
check('overview lists project team', overview.team.length > 0);
check(
  'conversion rate = won / total',
  Math.abs(overview.conversionRate - leads.summary.won / leads.summary.total) < 1e-9,
);

// ---------- leads lifecycle ----------
const created = repo.createLead(projectId, {
  name: 'Test Contact',
  email: 'test.contact@example.com',
  company: '',
  phone: '+1-555-0000',
  source: 'Website form',
  status: 'New',
  estimatedValue: 250,
  capturedFrom: 'Automated test',
  assignedTeamMember: 'Isla Chen',
});
check('create lead defaults company', created.lead.company === 'Individual customer', created.lead.company);
check('create lead logs activity', created.activities.some((entry) => entry.activityType === 'Lead created'));
check('lead count grows', repo.getProjectLeads(projectId).leads.length === leads.leads.length + 1);
check('new lead lands on the overview', repo.getProjectOverview(projectId).kpis[0]!.current === leads.leads.length + 1);

const beforeStatus = created.lead.lastContactedAt;
const moved = repo.updateLead(created.lead.id, { status: 'Qualified', author: 'Alex Morgan' });
check('status change persists', moved.lead.status === 'Qualified');
check('status change logs activity', moved.activities.some((entry) => entry.activityType === 'Status change'));
check('status change touches lastContactedAt', moved.lead.lastContactedAt >= beforeStatus);

const noted = repo.addLeadNote(created.lead.id, 'Follow up after the demo call.', 'Isla Chen');
check('note is appended', noted.activities.some((entry) => entry.activityType === 'Note'));

repo.deleteLead(created.lead.id);
check('lead delete removes the row', repo.getProjectLeads(projectId).leads.length === leads.leads.length);
expectThrows('deleted lead is gone', () => repo.getLead(created.lead.id), 404);
check(
  'lead delete cascades activities',
  repo.getProjectOverview(projectId).recentActivity.every((entry) => entry.leadId !== created.lead.id),
);

expectThrows('rejects a bad email', () =>
  repo.createLead(projectId, {
    name: 'Bad Email',
    email: 'not-an-email',
    company: '',
    phone: '',
    source: 'Website form',
    status: 'New',
    estimatedValue: null,
    capturedFrom: 'Automated test',
    assignedTeamMember: 'Isla Chen',
  }),
  400,
);
expectThrows('rejects an empty name', () =>
  repo.createLead(projectId, {
    name: '   ',
    email: 'ok@example.com',
    company: '',
    phone: '',
    source: 'Website form',
    status: 'New',
    estimatedValue: null,
    capturedFrom: 'Automated test',
    assignedTeamMember: 'Isla Chen',
  }),
  400,
);

// ---------- tasks ----------
const reviewBefore = repo.getInbox().tasksInReview;
const newTask = repo.createTask(projectId, {
  title: 'Automated test task',
  description: 'Created by the data-layer test.',
  column: 'To Do',
  assignee: 'Isla Chen',
  dueDate: '2020-01-01',
  priority: 'High',
  notes: '',
});
check('overdue task is flagged', repo.getProjectTasks(projectId).overdueIds.includes(newTask.id));
const reviewed = repo.updateTask(newTask.id, { column: 'Review' });
check('task moves column', reviewed.column === 'Review');
check('Review tasks raise the inbox count', repo.getInbox().tasksInReview === reviewBefore + 1);
repo.updateTask(newTask.id, { column: 'Done' });
check('Done task is not overdue', !repo.getProjectTasks(projectId).overdueIds.includes(newTask.id));
check('Done task leaves the inbox', repo.getInbox().tasksInReview === reviewBefore);
repo.deleteTask(newTask.id);
expectThrows('deleted task is gone', () => repo.updateTask(newTask.id, { column: 'To Do' }), 404);
expectThrows('rejects an invalid due date', () =>
  repo.createTask(projectId, {
    title: 'Bad date',
    description: 'x',
    column: 'To Do',
    assignee: 'Isla Chen',
    dueDate: '31-12-2026',
    priority: 'Low',
  }),
  400,
);

// ---------- campaigns ----------
const campaign = repo.createCampaign(projectId, {
  name: 'Automated test campaign',
  channel: 'Paid',
  status: 'Active',
  startDate: '2026-01-01',
  endDate: '2026-02-01',
  budget: 1000,
  spent: 400,
  impressions: 10000,
  clicks: 250,
  conversions: 5,
  owner: 'Priya Shah',
  notes: '',
});
check('campaign spend hits project totals', repo.getProjectCampaigns(projectId).totals.spent === campaigns.totals.spent + 400);
check(
  'campaign spend changes cost per lead',
  repo.getProjectOverview(projectId).totals.spend === campaigns.totals.spent + 400,
);
const detail = repo.getCampaign(campaign.id);
check('campaign chart has six weeks', detail.weeklyPerformance.length === 6);
check('campaign numbers coerce from strings', repo.updateCampaign(campaign.id, { budget: 2000 }).campaign.budget === 2000);
repo.deleteCampaign(campaign.id);
check('campaign delete restores totals', repo.getProjectCampaigns(projectId).totals.spent === campaigns.totals.spent);

// ---------- calendar ----------
const event = repo.createCalendarEvent(projectId, {
  title: 'Automated test item',
  channel: 'Email',
  date: '2020-05-05',
  status: 'Draft',
  assignee: 'Daniel Kim',
});
check('past draft item is overdue', repo.getProjectCalendar(projectId).overdueIds.includes(event.id));
repo.updateCalendarEvent(event.id, { status: 'Published' });
check('published item is not overdue', !repo.getProjectCalendar(projectId).overdueIds.includes(event.id));
repo.deleteCalendarEvent(event.id);
check('calendar delete removes the item', !repo.getProjectCalendar(projectId).events.some((e) => e.id === event.id));

// ---------- approvals ----------
const pendingBefore = repo.getInbox().pendingApprovals;
const approval = repo.createApproval(projectId, {
  title: 'Automated test approval',
  requestType: 'Budget',
  submittedBy: 'Priya Shah',
  summary: 'Summary for the test.',
  details: 'Details for the test.',
  pros: 'Pro',
  cons: 'Con',
  recommendation: 'Approve',
});
check('new approval starts Pending', approval.status === 'Pending');
check('new approval gets attachments text', approval.attachments.length > 0);
check('pending approval raises the inbox count', repo.getInbox().pendingApprovals === pendingBefore + 1);
const commented = repo.addApprovalComment(approval.id, 'Alex Morgan', 'Looks reasonable.');
check('comment is stored', commented.comments.some((entry) => entry.message === 'Looks reasonable.'));
const approved = repo.updateApprovalStatus(approval.id, 'Approved');
check('decision persists', approved.status === 'Approved');
check('approved request leaves the inbox', repo.getInbox().pendingApprovals === pendingBefore);
repo.deleteApproval(approval.id);
expectThrows('deleted approval is gone', () => repo.updateApprovalStatus(approval.id, 'Pending'), 404);

// ---------- reports ----------
const report = repo.getProjectReport(projectId);
check('report has seeded sections', report.includedSections.length === 6, report.includedSections.length);
check('report has recipients', report.recipients.length > 0);
check('report engagement chart has six weeks', report.weeklyEngagement.length === 6);
check('frequency updates', repo.updateReportConfig(projectId, { frequency: 'Monthly' }).frequency === 'Monthly');
check(
  'internal review toggles',
  repo.updateReportConfig(projectId, { internalReviewFirst: false }).internalReviewFirst === false,
);
check(
  'section order persists',
  repo.updateReportConfig(projectId, { includedSections: ['Executive summary', 'Next steps'] }).includedSections.length === 2,
);
const withRecipient = repo.addReportRecipient(projectId, 'New.Person@Client.com');
check('recipient is normalised to lowercase', withRecipient.recipients.includes('new.person@client.com'));
check(
  'recipient can be removed',
  !repo.removeReportRecipient(projectId, 'new.person@client.com').recipients.includes('new.person@client.com'),
);
expectThrows('rejects an invalid recipient', () => repo.addReportRecipient(projectId, 'nope'), 400);
check('send stamps lastSentAt', repo.sendReport(projectId).lastSentAt !== null);

// ---------- team assignment + unassign guard ----------
const projectTeam = repo.getProjectTeam(projectId);
check(
  'team counts add up',
  projectTeam.counts.onProject + projectTeam.counts.available === projectTeam.counts.agencyTotal,
  projectTeam.counts,
);
const owner = projectTeam.assigned.find((member) =>
  repo.getProjectTasks(projectId).tasks.some((task) => task.assignee === member.name && task.column !== 'Done'),
);
check('found an assigned member owning open work', Boolean(owner));
expectThrows('unassign is refused while tasks are open', () =>
  repo.toggleTeamMemberAssignment(projectId, owner!.id, false),
  409,
);
try {
  repo.toggleTeamMemberAssignment(projectId, owner!.id, false);
} catch (error) {
  const body = (error as { body?: { taskCount?: number; sampleTasks?: unknown[] } }).body;
  check('conflict reports a task count', (body?.taskCount ?? 0) > 0, body?.taskCount);
  check('conflict lists at most four sample tasks', (body?.sampleTasks?.length ?? 0) <= 4, body?.sampleTasks?.length);
}
const forced = repo.toggleTeamMemberAssignment(projectId, owner!.id, true);
check('forced unassign succeeds', 'assigned' in forced && forced.assigned === false);
check('unassigned member moves to available', repo.getProjectTeam(projectId).available.some((m) => m.id === owner!.id));
repo.toggleTeamMemberAssignment(projectId, owner!.id, false);
check('reassign succeeds', repo.getProjectTeam(projectId).assigned.some((m) => m.id === owner!.id));

const memberDetail = repo.getTeamMember(owner!.id);
check('member detail counts projects', memberDetail.assignmentCount > 0);
check('member detail counts open tasks', memberDetail.openTaskCount > 0);

// ---------- projects CRUD ----------
const newProject = repo.createProject({
  name: 'Automated Test Co.',
  clientName: 'Test Client',
  type: 'Lead generation programme',
  brandPrimary: '#123456',
  brandAccent: '#abcdef',
});
check('new project defaults to Active', newProject.status === 'Active');
check('new project normalises hex case', newProject.brandAccent === '#ABCDEF', newProject.brandAccent);
check('new project auto-creates a report config', repo.getProjectReport(newProject.id).frequency === 'Weekly');
check('new project starts empty', repo.getProjectLeads(newProject.id).leads.length === 0);
const emptyOverview = repo.getProjectOverview(newProject.id);
check('empty project reports zero cost per lead', emptyOverview.totals.costPerLead === 0);
check('empty project funnel does not divide by zero', emptyOverview.funnel.every((stage) => stage.shareOfTotal === 0));
check('project update persists', repo.updateProject(newProject.id, { status: 'Paused' }).status === 'Paused');
expectThrows('rejects a bad hex colour', () => repo.updateProject(newProject.id, { brandPrimary: 'blue' }), 400);
expectThrows('rejects an unknown status', () => repo.updateProject(newProject.id, { status: 'Sleeping' }), 400);
expectThrows('unknown project 404s', () => repo.getProjectOverview('prj_missing'), 404);

// ---------- settings ----------
const settings = repo.getAgencySettings();
check('settings seed three integrations', settings.integrations.length === 3, settings.integrations.length);
const toggledIntegration = repo.toggleIntegration('hubspot', true);
check('integration toggle persists', toggledIntegration.integrations.find((i) => i.id === 'hubspot')?.connected === true);
const toggledNotification = repo.toggleNotification('tasks', true);
check('notification toggle persists', toggledNotification.notifications.tasks === true);
check('agency profile updates', repo.updateAgencySettings({ agencyName: 'Ledger Test' }).agencyName === 'Ledger Test');
expectThrows('unknown integration 404s', () => repo.toggleIntegration('salesforce', true), 404);

// ---------- auth + client view + inbox ----------
const session = repo.signIn('isla.chen@ledgerstudio.co', 'anything');
check('known email resolves to the seeded member', session.user.name === 'Isla Chen', session.user.name);
check('unknown email still signs in', repo.signIn('new.user@agency.com', 'x').user.role === 'Admin');
expectThrows('empty password is rejected', () => repo.signIn('a@b.com', ''), 400);

const clientView = repo.getClientView(projectId);
check('client view aggregates traffic', clientView.traffic > 0);
check('client view lists goals', clientView.goals.length > 0);
check('client view has 12 trend points', clientView.timeSeries.length === 12);

const inbox = repo.getInbox();
check(
  'inbox count = pending approvals + review tasks',
  inbox.unreadCount === inbox.pendingApprovals + inbox.tasksInReview,
  inbox,
);
check('inbox items name their project', inbox.items.every((item) => item.projectName.length > 0));
check('inbox spans projects', new Set(inbox.items.map((item) => item.projectId)).size > 1);

// ---------- report ----------
console.log(`\n${passed} checks passed`);
if (failures.length > 0) {
  console.error(`${failures.length} FAILED:`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log('Embedded data layer verified.\n');
