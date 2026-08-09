import { Router } from 'express';

import { get, run } from '../db.js';
import { toAgencySettings } from '../mappers.js';
import type { AgencySettings } from '../types.js';
import { notFound, nowIso, requireString } from '../util.js';

export const settingsRouter = Router();

const SETTINGS_ID = 'agency_ledger';

function loadSettings(): AgencySettings {
  const row = get('SELECT * FROM agency_settings LIMIT 1');
  if (!row) throw notFound('Agency settings have not been initialised');
  return toAgencySettings(row);
}

function persist(settings: AgencySettings): AgencySettings {
  run(
    'UPDATE agency_settings SET agency_name = ?, logo_placeholder = ?, notifications = ?, integrations = ?, updated_at = ? WHERE id = ?',
    settings.agencyName,
    settings.logoPlaceholder,
    JSON.stringify(settings.notifications),
    JSON.stringify(settings.integrations),
    nowIso(),
    settings.id || SETTINGS_ID,
  );
  return loadSettings();
}

settingsRouter.get('/settings', (_req, res) => {
  res.json(loadSettings());
});

settingsRouter.patch('/settings', (req, res) => {
  const settings = loadSettings();
  const agencyName =
    req.body?.agencyName === undefined ? settings.agencyName : requireString(req.body.agencyName, 'Agency name', 120);
  const logoPlaceholder =
    req.body?.logoPlaceholder === undefined
      ? settings.logoPlaceholder
      : requireString(req.body.logoPlaceholder, 'Logo initials', 4);
  res.json(persist({ ...settings, agencyName, logoPlaceholder }));
});

settingsRouter.post('/settings/notifications/:key', (req, res) => {
  const settings = loadSettings();
  const key = req.params.key as keyof AgencySettings['notifications'];
  if (!(key in settings.notifications)) throw notFound(`Unknown notification "${req.params.key}"`);
  const enabled = typeof req.body?.enabled === 'boolean' ? req.body.enabled : !settings.notifications[key];
  res.json(persist({ ...settings, notifications: { ...settings.notifications, [key]: enabled } }));
});

settingsRouter.post('/settings/integrations/:id', (req, res) => {
  const settings = loadSettings();
  const target = settings.integrations.find((integration) => integration.id === req.params.id);
  if (!target) throw notFound(`Unknown integration "${req.params.id}"`);
  const connected = typeof req.body?.connected === 'boolean' ? req.body.connected : !target.connected;
  res.json(
    persist({
      ...settings,
      integrations: settings.integrations.map((integration) =>
        integration.id === target.id ? { ...integration, connected } : integration,
      ),
    }),
  );
});
