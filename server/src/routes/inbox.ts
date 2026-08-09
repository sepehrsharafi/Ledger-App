import { Router } from 'express';

import { all } from '../db.js';
import { toApproval, toTask } from '../mappers.js';
import { formatDayMonth } from '../util.js';

export const inboxRouter = Router();

export interface InboxItem {
  id: string;
  kind: 'approval' | 'task';
  title: string;
  subtitle: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  /** Route the client should open when the item is tapped. */
  destination: string;
  entityId: string;
}

/** The global unread count is pending approvals plus tasks sitting in Review. */
export function buildInbox(): InboxItem[] {
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
      subtitle: `In review · ${task.assignee} · due ${formatDayMonth(task.dueDate)}`,
      projectId: task.projectId,
      projectName: String(row.project_name),
      timestamp: task.dueDate,
      destination: `/project/${task.projectId}/tasks`,
      entityId: task.id,
    };
  });

  return [...approvalItems, ...taskItems];
}

inboxRouter.get('/inbox', (_req, res) => {
  const items = buildInbox();
  res.json({
    items,
    unreadCount: items.length,
    pendingApprovals: items.filter((item) => item.kind === 'approval').length,
    tasksInReview: items.filter((item) => item.kind === 'task').length,
  });
});
