import { Router } from 'express';

import { run } from '../db.js';
import { findProject, findReportConfig } from '../repo.js';
import { FREQUENCIES } from '../types.js';
import { nowIso, requireEmail, requireEnum } from '../util.js';

export const reportsRouter = Router();

reportsRouter.get('/projects/:projectId/report', (req, res) => {
  const project = findProject(req.params.projectId);
  res.json(findReportConfig(project.id));
});

reportsRouter.patch('/projects/:projectId/report', (req, res) => {
  const project = findProject(req.params.projectId);
  const config = findReportConfig(project.id);
  const body = req.body ?? {};

  const frequency = body.frequency === undefined ? config.frequency : requireEnum(body.frequency, 'Frequency', FREQUENCIES);
  const internalReviewFirst =
    body.internalReviewFirst === undefined ? config.internalReviewFirst : Boolean(body.internalReviewFirst);
  const includedSections = Array.isArray(body.includedSections)
    ? (body.includedSections as unknown[]).map((section) => String(section)).filter(Boolean)
    : config.includedSections;

  run(
    'UPDATE report_configs SET frequency = ?, internal_review_first = ?, included_sections = ? WHERE id = ?',
    frequency,
    internalReviewFirst ? 1 : 0,
    JSON.stringify(includedSections),
    config.id,
  );

  res.json(findReportConfig(project.id));
});

/** No real delivery integration yet — this records the send so Activity stays truthful. */
reportsRouter.post('/projects/:projectId/report/send', (req, res) => {
  const project = findProject(req.params.projectId);
  const config = findReportConfig(project.id);
  run('UPDATE report_configs SET last_sent_at = ? WHERE id = ?', nowIso(), config.id);
  res.json(findReportConfig(project.id));
});

reportsRouter.post('/projects/:projectId/report/recipients', (req, res) => {
  const project = findProject(req.params.projectId);
  const config = findReportConfig(project.id);
  const email = requireEmail(req.body?.email, 'Recipient email');
  run('INSERT OR IGNORE INTO report_recipients (report_config_id, email) VALUES (?, ?)', config.id, email);
  res.status(201).json(findReportConfig(project.id));
});

reportsRouter.delete('/projects/:projectId/report/recipients/:email', (req, res) => {
  const project = findProject(req.params.projectId);
  const config = findReportConfig(project.id);
  run(
    'DELETE FROM report_recipients WHERE report_config_id = ? AND email = ?',
    config.id,
    decodeURIComponent(req.params.email).toLowerCase(),
  );
  res.json(findReportConfig(project.id));
});
