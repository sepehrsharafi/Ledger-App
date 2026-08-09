import { Router } from 'express';

import { all, get, run } from '../db.js';
import { toCalendarEvent } from '../mappers.js';
import { findProject } from '../repo.js';
import { CHANNELS, EVENT_STATUSES } from '../types.js';
import type { CalendarEvent } from '../types.js';
import { id, notFound, requireDate, requireEnum, requireString, todayIso } from '../util.js';

export const calendarRouter = Router();

function findEvent(eventId: string): CalendarEvent {
  const row = get('SELECT * FROM calendar_events WHERE id = ?', eventId);
  if (!row) throw notFound(`Calendar item ${eventId} was not found`);
  return toCalendarEvent(row);
}

calendarRouter.get('/projects/:projectId/calendar', (req, res) => {
  const project = findProject(req.params.projectId);
  const events = all('SELECT * FROM calendar_events WHERE project_id = ? ORDER BY event_date', project.id).map(
    toCalendarEvent,
  );
  const today = todayIso();
  res.json({
    events,
    overdueIds: events.filter((event) => event.date < today && event.status !== 'Published').map((event) => event.id),
  });
});

calendarRouter.post('/projects/:projectId/calendar', (req, res) => {
  const project = findProject(req.params.projectId);
  const body = req.body ?? {};
  const event: CalendarEvent = {
    id: id('evt'),
    projectId: project.id,
    title: requireString(body.title, 'Title', 160),
    channel: requireEnum(body.channel ?? 'Social', 'Channel', CHANNELS),
    date: requireDate(body.date, 'Date'),
    status: requireEnum(body.status ?? 'Draft', 'Status', EVENT_STATUSES),
    assignee: requireString(body.assignee, 'Assignee', 120),
  };

  run(
    'INSERT INTO calendar_events (id, project_id, title, channel, event_date, status, assignee) VALUES (?, ?, ?, ?, ?, ?, ?)',
    event.id,
    event.projectId,
    event.title,
    event.channel,
    event.date,
    event.status,
    event.assignee,
  );

  res.status(201).json(event);
});

calendarRouter.patch('/calendar-events/:eventId', (req, res) => {
  const event = findEvent(req.params.eventId);
  const body = req.body ?? {};
  const next: CalendarEvent = {
    ...event,
    title: body.title === undefined ? event.title : requireString(body.title, 'Title', 160),
    channel: body.channel === undefined ? event.channel : requireEnum(body.channel, 'Channel', CHANNELS),
    date: body.date === undefined ? event.date : requireDate(body.date, 'Date'),
    status: body.status === undefined ? event.status : requireEnum(body.status, 'Status', EVENT_STATUSES),
    assignee: body.assignee === undefined ? event.assignee : requireString(body.assignee, 'Assignee', 120),
  };

  run(
    'UPDATE calendar_events SET title = ?, channel = ?, event_date = ?, status = ?, assignee = ? WHERE id = ?',
    next.title,
    next.channel,
    next.date,
    next.status,
    next.assignee,
    next.id,
  );

  res.json(next);
});

calendarRouter.delete('/calendar-events/:eventId', (req, res) => {
  const event = findEvent(req.params.eventId);
  run('DELETE FROM calendar_events WHERE id = ?', event.id);
  res.json({ ok: true, id: event.id });
});
