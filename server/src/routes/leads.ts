import { Router } from 'express';

import { all, get, run, transaction } from '../db.js';
import { toLead, toLeadActivity } from '../mappers.js';
import { findProject } from '../repo.js';
import { LEAD_STATUSES } from '../types.js';
import type { Lead } from '../types.js';
import {
  id,
  nowIso,
  notFound,
  optionalString,
  requireEmail,
  requireEnum,
  requireString,
  toNullableNumber,
} from '../util.js';

export const leadsRouter = Router();

function findLead(leadId: string): Lead {
  const row = get('SELECT * FROM leads WHERE id = ?', leadId);
  if (!row) throw notFound(`Lead ${leadId} was not found`);
  return toLead(row);
}

function activitiesFor(leadId: string) {
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

function summarize(leads: Lead[]) {
  const count = (status: string) => leads.filter((lead) => lead.status === status).length;
  const won = count('Won');
  return {
    total: leads.length,
    new: count('New'),
    contacted: count('Contacted'),
    qualified: count('Qualified'),
    won,
    lost: count('Lost'),
    conversionRate: leads.length > 0 ? won / leads.length : 0,
    valueByStatus: Object.fromEntries(
      LEAD_STATUSES.map((status) => [
        status,
        leads.filter((lead) => lead.status === status).reduce((total, lead) => total + (lead.estimatedValue ?? 0), 0),
      ]),
    ),
  };
}

leadsRouter.get('/projects/:projectId/leads', (req, res) => {
  const project = findProject(req.params.projectId);
  const leads = all('SELECT * FROM leads WHERE project_id = ? ORDER BY created_at DESC', project.id).map(toLead);
  res.json({
    leads,
    summary: summarize(leads),
    sources: [...new Set(leads.map((lead) => lead.source))].sort(),
    owners: [...new Set(leads.map((lead) => lead.assignedTeamMember))].sort(),
  });
});

leadsRouter.post('/projects/:projectId/leads', (req, res) => {
  const project = findProject(req.params.projectId);
  const body = req.body ?? {};
  const lead: Lead = {
    id: id('lead'),
    projectId: project.id,
    name: requireString(body.name, 'Name', 120),
    email: requireEmail(body.email, 'Email'),
    company: optionalString(body.company, 'Individual customer'),
    phone: optionalString(body.phone),
    source: requireString(body.source, 'Source', 80),
    status: requireEnum(body.status ?? 'New', 'Status', LEAD_STATUSES),
    estimatedValue: toNullableNumber(body.estimatedValue),
    capturedFrom: requireString(body.capturedFrom, 'Captured from', 160),
    assignedTeamMember: requireString(body.assignedTeamMember, 'Owner', 120),
    createdAt: nowIso(),
    lastContactedAt: nowIso(),
  };

  transaction(() => {
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

  res.status(201).json({ lead, activities: activitiesFor(lead.id) });
});

leadsRouter.get('/leads/:leadId', (req, res) => {
  const lead = findLead(req.params.leadId);
  res.json({ lead, activities: activitiesFor(lead.id) });
});

leadsRouter.patch('/leads/:leadId', (req, res) => {
  const lead = findLead(req.params.leadId);
  const body = req.body ?? {};
  const author = optionalString(body.author, 'Alex Morgan') || 'Alex Morgan';

  const next: Lead = {
    ...lead,
    name: body.name === undefined ? lead.name : requireString(body.name, 'Name', 120),
    email: body.email === undefined ? lead.email : requireEmail(body.email, 'Email'),
    company: body.company === undefined ? lead.company : optionalString(body.company, lead.company),
    phone: body.phone === undefined ? lead.phone : optionalString(body.phone),
    source: body.source === undefined ? lead.source : requireString(body.source, 'Source', 80),
    status: body.status === undefined ? lead.status : requireEnum(body.status, 'Status', LEAD_STATUSES),
    estimatedValue: body.estimatedValue === undefined ? lead.estimatedValue : toNullableNumber(body.estimatedValue),
    capturedFrom: body.capturedFrom === undefined ? lead.capturedFrom : requireString(body.capturedFrom, 'Captured from', 160),
    assignedTeamMember:
      body.assignedTeamMember === undefined ? lead.assignedTeamMember : requireString(body.assignedTeamMember, 'Owner', 120),
  };

  const statusChanged = next.status !== lead.status;
  // A status change counts as contact, so lastContactedAt moves with it.
  next.lastContactedAt = statusChanged ? nowIso() : lead.lastContactedAt;

  transaction(() => {
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

  res.json({ lead: findLead(next.id), activities: activitiesFor(next.id) });
});

leadsRouter.post('/leads/:leadId/notes', (req, res) => {
  const lead = findLead(req.params.leadId);
  const content = requireString(req.body?.content, 'Note', 1000);
  const author = optionalString(req.body?.author, 'Alex Morgan') || 'Alex Morgan';
  logActivity(lead, 'Note', content, author);
  res.status(201).json({ lead, activities: activitiesFor(lead.id) });
});

leadsRouter.delete('/leads/:leadId', (req, res) => {
  const lead = findLead(req.params.leadId);
  transaction(() => {
    run('DELETE FROM lead_activities WHERE lead_id = ?', lead.id);
    run('DELETE FROM leads WHERE id = ?', lead.id);
  });
  res.json({ ok: true, id: lead.id });
});
