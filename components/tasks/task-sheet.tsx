import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DateInput, isValidDate } from '@/components/ui/date-input';
import { TextField } from '@/components/ui/form-field';
import { AssigneePicker, OptionPicker } from '@/components/ui/option-picker';
import { AppText } from '@/components/ui/text';
import { PRIORITIES, TASK_COLUMNS } from '@/constants/enums';
import { colors } from '@/constants/theme';
import { useCreateTask, useDeleteTask, useUpdateTask } from '@/hooks/use-tasks';
import { useProjectTeam } from '@/hooks/use-team';
import { todayKey } from '@/lib/format';
import type { Priority, Task, TaskColumn } from '@/types/models';

interface TaskSheetProps {
  projectId: string;
  visible: boolean;
  /** Null opens the sheet in create mode. */
  task: Task | null;
  onClose: () => void;
}

interface FormState {
  title: string;
  description: string;
  column: TaskColumn;
  assignee: string;
  dueDate: string;
  priority: Priority;
  notes: string;
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  column: 'To Do',
  assignee: '',
  dueDate: todayKey(),
  priority: 'Medium',
  notes: '',
});

/** Create and edit share one form; `task` decides which mutation runs. */
export function TaskSheet({ projectId, visible, task, onClose }: TaskSheetProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const { data: team } = useProjectTeam(projectId);

  useEffect(() => {
    if (!visible) return;
    setTouched(false);
    setForm(
      task
        ? {
            title: task.title,
            description: task.description,
            column: task.column,
            assignee: task.assignee,
            dueDate: task.dueDate,
            priority: task.priority,
            notes: task.notes,
          }
        : emptyForm(),
    );
  }, [task, visible]);

  const errors = {
    title: form.title.trim().length === 0 ? 'Title is required' : undefined,
    description: form.description.trim().length === 0 ? 'Description is required' : undefined,
    assignee: form.assignee.length === 0 ? 'Pick an assignee' : undefined,
    dueDate: isValidDate(form.dueDate) ? undefined : 'Enter a valid date',
  };
  const valid = Object.values(errors).every((error) => error === undefined);
  const pending = createTask.isPending || updateTask.isPending;

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      column: form.column,
      assignee: form.assignee,
      dueDate: form.dueDate,
      priority: form.priority,
      notes: form.notes.trim(),
    };
    if (task) await updateTask.mutateAsync({ taskId: task.id, input: payload });
    else await createTask.mutateAsync(payload);
    onClose();
  };

  const onDelete = async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    setConfirmingDelete(false);
    onClose();
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={task ? 'Edit task' : 'New task'}
        footer={
          <>
            {task ? (
              <Button label="Delete" onPress={() => setConfirmingDelete(true)} variant="secondary" size="sm" />
            ) : null}
            <Button
              label={task ? 'Save task' : 'Create task'}
              onPress={submit}
              size="sm"
              disabled={touched && !valid}
              loading={pending}
            />
          </>
        }
      >
        <AppText variant="title">{task ? task.title : 'New task'}</AppText>

        <TextField
          label="Title"
          value={form.title}
          onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
          placeholder="Triage hydration quiz leads"
          error={touched ? errors.title : undefined}
        />
        <TextField
          label="Description"
          value={form.description}
          onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
          placeholder="What needs to happen and why."
          multiline
          error={touched ? errors.description : undefined}
        />
        <OptionPicker
          label="Column"
          options={TASK_COLUMNS}
          value={form.column}
          onChange={(column) => setForm((prev) => ({ ...prev, column }))}
        />
        <OptionPicker
          label="Priority"
          options={PRIORITIES}
          value={form.priority}
          onChange={(priority) => setForm((prev) => ({ ...prev, priority }))}
        />
        <DateInput
          label="Due date"
          value={form.dueDate}
          onChange={(dueDate) => setForm((prev) => ({ ...prev, dueDate }))}
          error={touched ? errors.dueDate : undefined}
        />
        <AssigneePicker
          label="Assignee"
          members={team?.assigned ?? []}
          value={form.assignee}
          onChange={(assignee) => setForm((prev) => ({ ...prev, assignee }))}
          error={touched ? errors.assignee : undefined}
        />
        <TextField
          label="Notes"
          value={form.notes}
          onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))}
          placeholder="Optional working notes"
          multiline
        />

        {createTask.isError || updateTask.isError ? (
          <AppText variant="small" color={colors.danger}>
            Could not save the task. Check the fields and try again.
          </AppText>
        ) : null}
        <View />
      </BottomSheet>

      <ConfirmModal
        visible={confirmingDelete}
        title="Delete this task?"
        message="The task will be removed from the board for everyone on this project."
        confirmLabel="Delete"
        destructive
        loading={deleteTask.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
