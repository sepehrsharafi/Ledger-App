import { networkInterfaces } from 'node:os';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { DB_PATH } from './db.js';
import { approvalsRouter } from './routes/approvals.js';
import { authRouter } from './routes/auth.js';
import { calendarRouter } from './routes/calendar.js';
import { campaignsRouter } from './routes/campaigns.js';
import { inboxRouter } from './routes/inbox.js';
import { leadsRouter } from './routes/leads.js';
import { projectsRouter } from './routes/projects.js';
import { reportsRouter } from './routes/reports.js';
import { settingsRouter } from './routes/settings.js';
import { tasksRouter } from './routes/tasks.js';
import { teamRouter } from './routes/team.js';
import { seedIfEmpty } from './seed.js';
import { HttpError } from './util.js';

seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, db: DB_PATH }));

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', leadsRouter);
app.use('/api', tasksRouter);
app.use('/api', campaignsRouter);
app.use('/api', calendarRouter);
app.use('/api', approvalsRouter);
app.use('/api', reportsRouter);
app.use('/api', teamRouter);
app.use('/api', settingsRouter);
app.use('/api', inboxRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  const status = typeof (error as { status?: number }).status === 'number' ? (error as { status: number }).status : 500;
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  if (status >= 500) console.error(error);
  res.status(status).json({ error: message });
});

const PORT = Number(process.env.PORT ?? 4000);

/** Every non-internal IPv4 address, so the console shows the URL a phone should use. */
function lanUrls(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry) && entry!.family === 'IPv4' && !entry!.internal)
    .map((entry) => `http://${entry.address}:${PORT}`);
}

// Bind on 0.0.0.0 explicitly: a device on the same Wi-Fi must be able to reach this.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ledger API listening on http://localhost:${PORT}`);
  for (const url of lanUrls()) console.log(`  reachable on ${url}`);
  console.log(`Database: ${DB_PATH}`);
});
