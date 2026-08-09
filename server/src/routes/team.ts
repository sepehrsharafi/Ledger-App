import { Router } from 'express';

import { all, get, run } from '../db.js';
import { toProject } from '../mappers.js';
import { findProject, listProjectMembers, listTeam, tasksOwnedByMember } from '../repo.js';
import { badRequest, notFound } from '../util.js';

export const teamRouter = Router();

teamRouter.get('/team', (_req, res) => {
  const members = listTeam();
  const assignments = all<{ member_id: string; project_id: string }>(
    'SELECT member_id, project_id FROM project_members',
  );
  const projects = all('SELECT * FROM projects').map(toProject);

  res.json(
    members.map((member) => {
      const projectIds = assignments.filter((row) => row.member_id === member.id).map((row) => row.project_id);
      return {
        ...member,
        assignmentCount: projectIds.length,
        projects: projects
          .filter((project) => projectIds.includes(project.id))
          .map((project) => ({ id: project.id, name: project.name, clientName: project.clientName })),
      };
    }),
  );
});

teamRouter.get('/projects/:projectId/team', (req, res) => {
  const project = findProject(req.params.projectId);
  const assigned = listProjectMembers(project.id);
  const assignedIds = new Set(assigned.map((member) => member.id));
  const agency = listTeam();

  res.json({
    assigned,
    available: agency.filter((member) => !assignedIds.has(member.id)),
    counts: { onProject: assigned.length, available: agency.length - assigned.length, agencyTotal: agency.length },
  });
});

/**
 * Toggles assignment. Unassigning a member who still owns open tasks is refused with
 * `requiresConfirmation` until the caller repeats the request with `force: true`.
 */
teamRouter.post('/projects/:projectId/team/:memberId/toggle', (req, res) => {
  const project = findProject(req.params.projectId);
  const memberRow = get('SELECT * FROM team_members WHERE id = ?', req.params.memberId);
  if (!memberRow) throw notFound(`Team member ${req.params.memberId} was not found`);
  const memberName = String(memberRow.name);

  const isAssigned = Boolean(
    get('SELECT 1 AS ok FROM project_members WHERE project_id = ? AND member_id = ?', project.id, req.params.memberId),
  );

  if (!isAssigned) {
    run('INSERT INTO project_members (project_id, member_id) VALUES (?, ?)', project.id, req.params.memberId);
    return res.json({ assigned: true, memberId: req.params.memberId });
  }

  const openTasks = tasksOwnedByMember(project.id, memberName);
  if (openTasks.length > 0 && req.body?.force !== true) {
    return res.status(409).json({
      requiresConfirmation: true,
      memberId: req.params.memberId,
      memberName,
      taskCount: openTasks.length,
      sampleTasks: openTasks.slice(0, 4).map((task) => ({ id: task.id, title: task.title, dueDate: task.dueDate })),
    });
  }

  run('DELETE FROM project_members WHERE project_id = ? AND member_id = ?', project.id, req.params.memberId);
  return res.json({ assigned: false, memberId: req.params.memberId, releasedTaskCount: openTasks.length });
});

teamRouter.get('/team/:memberId', (req, res) => {
  const row = get('SELECT * FROM team_members WHERE id = ?', req.params.memberId);
  if (!row) throw notFound(`Team member ${req.params.memberId} was not found`);
  const projects = all(
    `SELECT p.* FROM projects p JOIN project_members pm ON pm.project_id = p.id WHERE pm.member_id = ? ORDER BY p.name`,
    req.params.memberId,
  ).map(toProject);
  const openTaskCount = Number(
    get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM tasks WHERE assignee = ? AND column_name != 'Done'",
      String(row.name),
    )?.count ?? 0,
  );

  res.json({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role),
    avatarColor: String(row.avatar_color),
    assignmentCount: projects.length,
    openTaskCount,
    projects: projects.map((project) => ({ id: project.id, name: project.name, clientName: project.clientName })),
  });
});

teamRouter.post('/projects/:projectId/team', (req, res) => {
  const project = findProject(req.params.projectId);
  const memberId = String(req.body?.memberId ?? '');
  if (!memberId) throw badRequest('memberId is required');
  run('INSERT OR IGNORE INTO project_members (project_id, member_id) VALUES (?, ?)', project.id, memberId);
  res.status(201).json({ assigned: true, memberId });
});
