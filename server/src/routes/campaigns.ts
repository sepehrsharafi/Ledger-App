import { Router } from 'express';

import { all, get, run } from '../db.js';
import { toCampaign } from '../mappers.js';
import { findProject } from '../repo.js';
import { CAMPAIGN_STATUSES, CHANNELS } from '../types.js';
import type { Campaign } from '../types.js';
import { id, notFound, optionalString, requireDate, requireEnum, requireString, toNumber } from '../util.js';

export const campaignsRouter = Router();

function findCampaign(campaignId: string): Campaign {
  const row = get('SELECT * FROM campaigns WHERE id = ?', campaignId);
  if (!row) throw notFound(`Campaign ${campaignId} was not found`);
  return toCampaign(row);
}

/** Six-week clicks/conversions shape used by the campaign detail mini chart. */
function weeklyPerformance(campaign: Campaign) {
  const weights = [0.12, 0.14, 0.16, 0.18, 0.19, 0.21];
  return weights.map((weight, index) => ({
    label: `W${index + 1}`,
    clicks: Math.round(campaign.clicks * weight),
    conversions: Math.round(campaign.conversions * weight),
  }));
}

campaignsRouter.get('/projects/:projectId/campaigns', (req, res) => {
  const project = findProject(req.params.projectId);
  const campaigns = all('SELECT * FROM campaigns WHERE project_id = ? ORDER BY spent DESC', project.id).map(toCampaign);
  res.json({
    campaigns,
    totals: {
      count: campaigns.length,
      budget: campaigns.reduce((total, campaign) => total + campaign.budget, 0),
      spent: campaigns.reduce((total, campaign) => total + campaign.spent, 0),
      conversions: campaigns.reduce((total, campaign) => total + campaign.conversions, 0),
      clicks: campaigns.reduce((total, campaign) => total + campaign.clicks, 0),
      impressions: campaigns.reduce((total, campaign) => total + campaign.impressions, 0),
    },
  });
});

campaignsRouter.post('/projects/:projectId/campaigns', (req, res) => {
  const project = findProject(req.params.projectId);
  const body = req.body ?? {};
  const campaign: Campaign = {
    id: id('cmp'),
    projectId: project.id,
    name: requireString(body.name, 'Campaign name', 120),
    channel: requireEnum(body.channel ?? 'Paid', 'Channel', CHANNELS),
    status: requireEnum(body.status ?? 'Scheduled', 'Status', CAMPAIGN_STATUSES),
    startDate: requireDate(body.startDate, 'Start date'),
    endDate: requireDate(body.endDate, 'End date'),
    budget: Math.max(0, toNumber(body.budget)),
    spent: Math.max(0, toNumber(body.spent)),
    impressions: Math.max(0, Math.round(toNumber(body.impressions))),
    clicks: Math.max(0, Math.round(toNumber(body.clicks))),
    conversions: Math.max(0, Math.round(toNumber(body.conversions))),
    owner: requireString(body.owner, 'Owner', 120),
    notes: optionalString(body.notes),
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

  res.status(201).json(campaign);
});

campaignsRouter.get('/campaigns/:campaignId', (req, res) => {
  const campaign = findCampaign(req.params.campaignId);
  res.json({ campaign, weeklyPerformance: weeklyPerformance(campaign) });
});

campaignsRouter.patch('/campaigns/:campaignId', (req, res) => {
  const campaign = findCampaign(req.params.campaignId);
  const body = req.body ?? {};
  const next: Campaign = {
    ...campaign,
    name: body.name === undefined ? campaign.name : requireString(body.name, 'Campaign name', 120),
    channel: body.channel === undefined ? campaign.channel : requireEnum(body.channel, 'Channel', CHANNELS),
    status: body.status === undefined ? campaign.status : requireEnum(body.status, 'Status', CAMPAIGN_STATUSES),
    startDate: body.startDate === undefined ? campaign.startDate : requireDate(body.startDate, 'Start date'),
    endDate: body.endDate === undefined ? campaign.endDate : requireDate(body.endDate, 'End date'),
    budget: body.budget === undefined ? campaign.budget : Math.max(0, toNumber(body.budget)),
    spent: body.spent === undefined ? campaign.spent : Math.max(0, toNumber(body.spent)),
    impressions: body.impressions === undefined ? campaign.impressions : Math.max(0, Math.round(toNumber(body.impressions))),
    clicks: body.clicks === undefined ? campaign.clicks : Math.max(0, Math.round(toNumber(body.clicks))),
    conversions: body.conversions === undefined ? campaign.conversions : Math.max(0, Math.round(toNumber(body.conversions))),
    owner: body.owner === undefined ? campaign.owner : requireString(body.owner, 'Owner', 120),
    notes: body.notes === undefined ? campaign.notes : optionalString(body.notes),
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

  res.json({ campaign: next, weeklyPerformance: weeklyPerformance(next) });
});

campaignsRouter.delete('/campaigns/:campaignId', (req, res) => {
  const campaign = findCampaign(req.params.campaignId);
  run('DELETE FROM campaigns WHERE id = ?', campaign.id);
  res.json({ ok: true, id: campaign.id });
});
