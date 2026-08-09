import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DateInput, isValidDate } from '@/components/ui/date-input';
import { TextField } from '@/components/ui/form-field';
import { AssigneePicker, OptionPicker } from '@/components/ui/option-picker';
import { AppText } from '@/components/ui/text';
import { CHANNELS, EVENT_STATUSES } from '@/constants/enums';
import { colors } from '@/constants/theme';
import { useCreateCalendarEvent, useDeleteCalendarEvent, useUpdateCalendarEvent } from '@/hooks/use-calendar';
import { useProjectTeam } from '@/hooks/use-team';
import { todayKey } from '@/lib/format';
import type { CalendarEvent, Channel, EventStatus } from '@/types/models';

interface CalendarEventSheetProps {
  projectId: string;
  visible: boolean;
  event: CalendarEvent | null;
  /** Pre-selected date when creating from a tapped day. */
  defaultDate?: string;
  onClose: () => void;
}

interface FormState {
  title: string;
  channel: Channel;
  status: EventStatus;
  date: string;
  assignee: string;
}

export function CalendarEventSheet({ projectId, visible, event, defaultDate, onClose }: CalendarEventSheetProps) {
  const [form, setForm] = useState<FormState>({
    title: '',
    channel: 'Social',
    status: 'Draft',
    date: defaultDate ?? todayKey(),
    assignee: '',
  });
  const [touched, setTouched] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const createEvent = useCreateCalendarEvent(projectId);
  const updateEvent = useUpdateCalendarEvent(projectId);
  const deleteEvent = useDeleteCalendarEvent(projectId);
  const { data: team } = useProjectTeam(projectId);

  useEffect(() => {
    if (!visible) return;
    setTouched(false);
    setForm(
      event
        ? { title: event.title, channel: event.channel, status: event.status, date: event.date, assignee: event.assignee }
        : { title: '', channel: 'Social', status: 'Draft', date: defaultDate ?? todayKey(), assignee: '' },
    );
  }, [defaultDate, event, visible]);

  const errors = {
    title: form.title.trim().length === 0 ? 'Title is required' : undefined,
    date: isValidDate(form.date) ? undefined : 'Enter a valid date',
    assignee: form.assignee.length === 0 ? 'Pick an owner' : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    const payload = {
      title: form.title.trim(),
      channel: form.channel,
      status: form.status,
      date: form.date,
      assignee: form.assignee,
    };
    if (event) await updateEvent.mutateAsync({ eventId: event.id, input: payload });
    else await createEvent.mutateAsync(payload);
    onClose();
  };

  const onDelete = async () => {
    if (!event) return;
    await deleteEvent.mutateAsync(event.id);
    setConfirmingDelete(false);
    onClose();
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={event ? 'Edit content item' : 'New content item'}
        footer={
          <>
            {event ? (
              <Button label="Delete" onPress={() => setConfirmingDelete(true)} variant="secondary" size="sm" />
            ) : null}
            <Button
              label={event ? 'Save item' : 'Add item'}
              onPress={submit}
              size="sm"
              disabled={touched && !valid}
              loading={createEvent.isPending || updateEvent.isPending}
            />
          </>
        }
      >
        <AppText variant="title">{event ? event.title : 'New content item'}</AppText>

        <TextField
          label="Title"
          value={form.title}
          onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
          placeholder="Hydration Boost reel publish"
          error={touched ? errors.title : undefined}
        />
        <OptionPicker
          label="Channel"
          options={CHANNELS}
          value={form.channel}
          onChange={(channel) => setForm((prev) => ({ ...prev, channel }))}
        />
        <OptionPicker
          label="Status"
          options={EVENT_STATUSES}
          value={form.status}
          onChange={(status) => setForm((prev) => ({ ...prev, status }))}
        />
        <DateInput
          label="Date"
          value={form.date}
          onChange={(date) => setForm((prev) => ({ ...prev, date }))}
          error={touched ? errors.date : undefined}
        />
        <AssigneePicker
          label="Owner"
          members={team?.assigned ?? []}
          value={form.assignee}
          onChange={(assignee) => setForm((prev) => ({ ...prev, assignee }))}
          error={touched ? errors.assignee : undefined}
        />

        {createEvent.isError || updateEvent.isError ? (
          <AppText variant="small" color={colors.danger}>
            Could not save this content item.
          </AppText>
        ) : null}
        <View />
      </BottomSheet>

      <ConfirmModal
        visible={confirmingDelete}
        title="Delete this content item?"
        message="It will be removed from the content calendar for this project."
        confirmLabel="Delete"
        destructive
        loading={deleteEvent.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
