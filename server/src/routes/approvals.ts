import { Router } from 'express';

import { run, transaction } from '../db.js';
import { findApproval, findProject, listApprovalComments, listApprovals } from '../repo.js';
import { APPROVAL_STATUSES, REQUEST_TYPES } from '../types.js';
import { id, nowIso, optionalString, requireEnum, requireString } from '../util.js';

export const approvalsRouter = Router();

const THUMBNAIL_COLORS = ['#1F4BC5', '#E4756A', '#2CB1A6', '#7C4DFF', '#F2A33C'];

approvalsRouter.get('/projects/:projectId/approvals', (req, res) => {
  const project = findProject(req.params.projectId);
  const approvals = listApprovals(project.id);
  res.json({
    approvals,
    counts: Object.fromEntries(
      APPROVAL_STATUSES.map((status) => [status, approvals.filter((approval) => approval.status === status).length]),
    ),
  });
});

approvalsRouter.post('/projects/:projectId/approvals', (req, res) => {
  const project = findProject(req.params.projectId);
  const body = req.body ?? {};
  const requestType = requireEnum(body.requestType ?? 'Creative', 'Request type', REQUEST_TYPES);
  const approvalId = id('apv');
  const title = requireString(body.title, 'Title', 160);

  run(
    `INSERT INTO approvals (id, project_id, title, type, request_type, thumbnail_color, status, submitted_by, submitted_at, summary, details, pros, cons, recommendation, attachments)
     VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
    approvalId,
    project.id,
    title,
    `${requestType} request`,
    requestType,
    THUMBNAIL_COLORS[Math.floor(Math.random() * THUMBNAIL_COLORS.length)]!,
    requireString(body.submittedBy, 'Submitted by', 120),
    nowIso(),
    requireString(body.summary, 'Summary', 500),
    requireString(body.details, 'Details', 2000),
    optionalString(body.pros),
    optionalString(body.cons),
    optionalString(body.recommendation),
    `${title} — working file, reference export`,
  );

  res.status(201).json(findApproval(approvalId));
});

approvalsRouter.get('/approvals/:approvalId', (req, res) => {
  res.json(findApproval(req.params.approvalId));
});

approvalsRouter.patch('/approvals/:approvalId', (req, res) => {
  const approval = findApproval(req.params.approvalId);
  const status = requireEnum(req.body?.status, 'Status', APPROVAL_STATUSES);
  run('UPDATE approvals SET status = ? WHERE id = ?', status, approval.id);
  res.json(findApproval(approval.id));
});

approvalsRouter.post('/approvals/:approvalId/comments', (req, res) => {
  const approval = findApproval(req.params.approvalId);
  run(
    'INSERT INTO approval_comments (id, approval_id, author, message, created_at) VALUES (?, ?, ?, ?, ?)',
    id('cmt'),
    approval.id,
    requireString(req.body?.author, 'Author', 120),
    requireString(req.body?.message, 'Comment', 1000),
    nowIso(),
  );
  res.status(201).json({ ...approval, comments: listApprovalComments(approval.id) });
});

approvalsRouter.delete('/approvals/:approvalId', (req, res) => {
  const approval = findApproval(req.params.approvalId);
  transaction(() => {
    run('DELETE FROM approval_comments WHERE approval_id = ?', approval.id);
    run('DELETE FROM approvals WHERE id = ?', approval.id);
  });
  res.json({ ok: true, id: approval.id });
});
