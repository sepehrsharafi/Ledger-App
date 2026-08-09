import { all, get } from './db.js';
import { toApproval, toApprovalComment, toProject, toReportConfig, toTask, toTeamMember } from './mappers.js';
import type { Approval, Project, ReportConfig, Task, TeamMember } from './types.js';
import { notFound } from './util.js';

export function findProject(projectId: string): Project {
  const row = get('SELECT * FROM projects WHERE id = ?', projectId);
  if (!row) throw notFound(`Project ${projectId} was not found`);
  return toProject(row);
}

export function listProjects(): Project[] {
  return all('SELECT * FROM projects ORDER BY created_at DESC').map(toProject);
}

export function listTeam(): TeamMember[] {
  return all('SELECT * FROM team_members ORDER BY name').map(toTeamMember);
}

export function listProjectMembers(projectId: string): TeamMember[] {
  return all(
    `SELECT t.* FROM team_members t
     JOIN project_members pm ON pm.member_id = t.id
     WHERE pm.project_id = ? ORDER BY t.name`,
    projectId,
  ).map(toTeamMember);
}

export function listProjectTasks(projectId: string): Task[] {
  return all('SELECT * FROM tasks WHERE project_id = ? ORDER BY due_date', projectId).map(toTask);
}

/** Tasks still owned by a member on a project — drives the unassign confirmation. */
export function tasksOwnedByMember(projectId: string, memberName: string): Task[] {
  return all(
    "SELECT * FROM tasks WHERE project_id = ? AND assignee = ? AND column_name != 'Done' ORDER BY due_date",
    projectId,
    memberName,
  ).map(toTask);
}

export function listApprovals(projectId: string): Approval[] {
  return all('SELECT * FROM approvals WHERE project_id = ? ORDER BY submitted_at DESC', projectId).map((row) =>
    toApproval(row, listApprovalComments(String(row.id))),
  );
}

export function findApproval(approvalId: string): Approval {
  const row = get('SELECT * FROM approvals WHERE id = ?', approvalId);
  if (!row) throw notFound(`Approval ${approvalId} was not found`);
  return toApproval(row, listApprovalComments(approvalId));
}

export function listApprovalComments(approvalId: string) {
  return all('SELECT * FROM approval_comments WHERE approval_id = ? ORDER BY created_at', approvalId).map(
    toApprovalComment,
  );
}

/** Six trailing weeks of report engagement, derived from the stored totals. */
function weeklyEngagement(opens: number, downloads: number): ReportConfig['weeklyEngagement'] {
  const weights = [0.11, 0.13, 0.16, 0.18, 0.2, 0.22];
  return weights.map((weight, index) => ({
    label: `W${index + 1}`,
    opens: Math.round(opens * weight),
    downloads: Math.round(downloads * weight),
  }));
}

export function findReportConfig(projectId: string): ReportConfig {
  const row = get('SELECT * FROM report_configs WHERE project_id = ?', projectId);
  if (!row) throw notFound(`Report config for ${projectId} was not found`);
  const recipients = all('SELECT email FROM report_recipients WHERE report_config_id = ? ORDER BY email', String(row.id)).map(
    (recipient) => String(recipient.email),
  );
  const stats = JSON.parse(String(row.engagement_stats)) as ReportConfig['engagementStats'];
  return toReportConfig(row, recipients, weeklyEngagement(stats.opens, stats.downloads));
}
