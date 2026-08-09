import { Router } from 'express';

import { get, run } from '../db.js';
import { toTask } from '../mappers.js';
import { findProject, listProjectTasks } from '../repo.js';
import { PRIORITIES, TASK_COLUMNS } from '../types.js';
import type { Task } from '../types.js';
import { id, notFound, optionalString, requireDate, requireEnum, requireString, todayIso } from '../util.js';

export const tasksRouter = Router();

function findTask(taskId: string): Task {
  const row = get('SELECT * FROM tasks WHERE id = ?', taskId);
  if (!row) throw notFound(`Task ${taskId} was not found`);
  return toTask(row);
}

tasksRouter.get('/projects/:projectId/tasks', (req, res) => {
  const project = findProject(req.params.projectId);
  const tasks = listProjectTasks(project.id);
  const today = todayIso();
  res.json({
    tasks,
    counts: Object.fromEntries(TASK_COLUMNS.map((column) => [column, tasks.filter((t) => t.column === column).length])),
    overdueIds: tasks.filter((task) => task.column !== 'Done' && task.dueDate < today).map((task) => task.id),
    assignees: [...new Set(tasks.map((task) => task.assignee))].sort(),
  });
});

tasksRouter.post('/projects/:projectId/tasks', (req, res) => {
  const project = findProject(req.params.projectId);
  const body = req.body ?? {};
  const task: Task = {
    id: id('tsk'),
    projectId: project.id,
    title: requireString(body.title, 'Title', 160),
    description: requireString(body.description, 'Description', 1000),
    column: requireEnum(body.column ?? 'To Do', 'Column', TASK_COLUMNS),
    assignee: requireString(body.assignee, 'Assignee', 120),
    dueDate: requireDate(body.dueDate, 'Due date'),
    priority: requireEnum(body.priority ?? 'Medium', 'Priority', PRIORITIES),
    notes: optionalString(body.notes),
  };

  run(
    `INSERT INTO tasks (id, project_id, title, description, column_name, assignee, due_date, priority, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    task.id,
    task.projectId,
    task.title,
    task.description,
    task.column,
    task.assignee,
    task.dueDate,
    task.priority,
    task.notes,
  );

  res.status(201).json(task);
});

tasksRouter.patch('/tasks/:taskId', (req, res) => {
  const task = findTask(req.params.taskId);
  const body = req.body ?? {};
  const next: Task = {
    ...task,
    title: body.title === undefined ? task.title : requireString(body.title, 'Title', 160),
    description: body.description === undefined ? task.description : requireString(body.description, 'Description', 1000),
    column: body.column === undefined ? task.column : requireEnum(body.column, 'Column', TASK_COLUMNS),
    assignee: body.assignee === undefined ? task.assignee : requireString(body.assignee, 'Assignee', 120),
    dueDate: body.dueDate === undefined ? task.dueDate : requireDate(body.dueDate, 'Due date'),
    priority: body.priority === undefined ? task.priority : requireEnum(body.priority, 'Priority', PRIORITIES),
    notes: body.notes === undefined ? task.notes : optionalString(body.notes),
  };

  run(
    `UPDATE tasks SET title = ?, description = ?, column_name = ?, assignee = ?, due_date = ?, priority = ?, notes = ? WHERE id = ?`,
    next.title,
    next.description,
    next.column,
    next.assignee,
    next.dueDate,
    next.priority,
    next.notes,
    next.id,
  );

  res.json(next);
});

tasksRouter.delete('/tasks/:taskId', (req, res) => {
  const task = findTask(req.params.taskId);
  run('DELETE FROM tasks WHERE id = ?', task.id);
  res.json({ ok: true, id: task.id });
});
