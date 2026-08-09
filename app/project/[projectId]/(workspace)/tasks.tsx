import { useMemo, useState, useTransition } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ProjectHeader } from '@/components/project/project-header';
import { TaskSheet } from '@/components/tasks/task-sheet';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterChips } from '@/components/ui/filter-chips';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { TASK_COLUMNS } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useProjectId } from '@/hooks/use-project-context';
import { useRefresh } from '@/hooks/use-refresh';
import { useMoveTask, useProjectTasks } from '@/hooks/use-tasks';
import { isTaskOverdue } from '@/lib/derive';
import { formatDayMonth } from '@/lib/format';
import type { Task, TaskColumn } from '@/types/models';

type ViewMode = 'Table' | 'Pipeline';

/**
 * Column-per-screen board. A segmented column selector beats horizontal drag-and-drop on
 * phones: it keeps one column full-width and readable, and moves stay a single tap.
 */
export default function TasksScreen() {
  const projectId = useProjectId();
  const { data, isPending, isError, error, refetch } = useProjectTasks(projectId);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const moveTask = useMoveTask(projectId);
  const [isViewPending, startViewTransition] = useTransition();

  const [mode, setMode] = useState<ViewMode>('Table');
  const [column, setColumn] = useState<TaskColumn>('To Do');
  const [assignee, setAssignee] = useState<string>('All');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const visible = useMemo(
    () => tasks.filter((task) => task.column === column && (assignee === 'All' || task.assignee === assignee)),
    [tasks, column, assignee],
  );
  const filteredTasks = useMemo(
    () => tasks.filter((task) => assignee === 'All' || task.assignee === assignee),
    [tasks, assignee],
  );
  const grouped = useMemo(
    () =>
      TASK_COLUMNS.reduce(
        (groups, name) => {
          groups[name] = filteredTasks.filter((task) => task.column === name);
          return groups;
        },
        {} as Record<TaskColumn, Task[]>,
      ),
    [filteredTasks],
  );

  const openCreate = () => {
    setEditingTask(null);
    setSheetOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setSheetOpen(true);
  };

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="tasks"
        title="Tasks"
        subtitle="Kanban workflow for project delivery."
        actionLabel="New task"
        onAction={openCreate}
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading board" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load the board" /> : null}

        {data ? (
          <>
            <View style={styles.viewControl}>
              <SegmentedControl
                options={['Table', 'Pipeline'] as const}
                value={mode}
                onChange={(nextMode) => startViewTransition(() => setMode(nextMode))}
              />
            </View>

            <FilterChips
              title="Assignee"
              value={assignee}
              onChange={setAssignee}
              options={[{ value: 'All', label: 'Everyone' }, ...data.assignees.map((name) => ({ value: name, label: name }))]}
            />

            <View style={styles.contentArea}>
              {mode === 'Table' ? (
              <>
                <View style={styles.statusFilter}>
                  <SegmentedControl
                    options={TASK_COLUMNS}
                    value={column}
                    onChange={setColumn}
                    scrollable
                    labels={Object.fromEntries(
                      TASK_COLUMNS.map((name) => [name, `${name} ${data.counts[name] ?? 0}`]),
                    ) as Record<TaskColumn, string>}
                  />
                </View>
                {visible.length === 0 ? (
                  <EmptyState
                    title={`Nothing in ${column}`}
                    message={
                      assignee === 'All'
                        ? 'Move a task into this column or create a new one.'
                        : `${assignee} has no tasks in this column.`
                    }
                    actionLabel="New task"
                    onAction={openCreate}
                  />
                ) : (
                  <View style={styles.list}>
                    {visible.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onPress={() => openEdit(task)}
                        onMove={(next) => moveTask.mutate({ taskId: task.id, column: next })}
                        moving={moveTask.isPending}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                title="No tasks to show"
                message={assignee === 'All' ? 'Create a task to start the project workflow.' : `${assignee} has no tasks.`}
                actionLabel="New task"
                onAction={openCreate}
              />
            ) : (
              <TaskPipelineBoard
                grouped={grouped}
                onPress={openEdit}
                onMove={(task, next) => moveTask.mutate({ taskId: task.id, column: next })}
                moving={moveTask.isPending}
              />
              )}
              <LoadingOverlay visible={isViewPending} />
            </View>
          </>
        ) : null}
      </Screen>

      <TaskSheet projectId={projectId} visible={sheetOpen} task={editingTask} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onMove: (column: TaskColumn) => void;
  moving: boolean;
}

function TaskCard({ task, onPress, onMove, moving }: TaskCardProps) {
  const overdue = isTaskOverdue(task);
  const currentIndex = TASK_COLUMNS.indexOf(task.column);
  const previous = currentIndex > 0 ? TASK_COLUMNS[currentIndex - 1] : undefined;
  const next = currentIndex < TASK_COLUMNS.length - 1 ? TASK_COLUMNS[currentIndex + 1] : undefined;

  return (
    <Card accentColor={overdue ? colors.danger : undefined} onPress={onPress}>
      <View style={styles.cardHeader}>
        <AppText variant="heading" style={styles.cardTitle} numberOfLines={2}>
          {task.title}
        </AppText>
        <StatusPill label={task.priority} />
      </View>

      <AppText variant="bodyMuted" numberOfLines={3} style={styles.cardBody}>
        {task.description}
      </AppText>

      <View style={styles.cardMeta}>
        <View style={styles.assignee}>
          <Avatar name={task.assignee} size="sm" />
          <Label>{task.assignee}</Label>
        </View>
        <Label color={overdue ? colors.danger : colors.inkMuted}>
          {overdue ? `Overdue ${formatDayMonth(task.dueDate)}` : formatDayMonth(task.dueDate)}
        </Label>
      </View>

      <View style={styles.cardActions}>
        {previous ? (
          <Button label={`← ${previous}`} onPress={() => onMove(previous)} variant="secondary" size="sm" disabled={moving} />
        ) : null}
        {next ? (
          <Button label={`${next} →`} onPress={() => onMove(next)} variant="secondary" size="sm" disabled={moving} />
        ) : null}
        <Button label="Edit" onPress={onPress} variant="ghost" size="sm" />
      </View>
    </Card>
  );
}

function TaskPipelineBoard({
  grouped,
  onPress,
  onMove,
  moving,
}: {
  grouped: Record<TaskColumn, Task[]>;
  onPress: (task: Task) => void;
  onMove: (task: Task, next: TaskColumn) => void;
  moving: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipelineBoard}>
      {TASK_COLUMNS.map((name) => (
        <View key={name} style={styles.pipelineColumn}>
          <View style={styles.pipelineHeader}>
            <Label>{name}</Label>
            <AppText variant="heading">{grouped[name].length}</AppText>
          </View>
          <View style={styles.pipelineRule} />
          {grouped[name].length === 0 ? (
            <AppText variant="small" style={styles.pipelineEmpty}>
              Nothing here yet.
            </AppText>
          ) : (
            grouped[name].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => onPress(task)}
                onMove={(next) => onMove(task, next)}
                moving={moving}
              />
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  viewControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contentArea: { position: 'relative', minHeight: 220 },
  statusFilter: { marginBottom: spacing.md },
  list: { gap: spacing.md },
  pipelineBoard: { gap: spacing.md, paddingRight: spacing.lg },
  pipelineColumn: { width: 260, gap: spacing.sm, padding: spacing.sm, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  pipelineHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  pipelineRule: { height: 1, backgroundColor: colors.ink },
  pipelineEmpty: { paddingVertical: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  cardTitle: { flex: 1 },
  cardBody: { marginTop: spacing.sm },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  assignee: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
});
