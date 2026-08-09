import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TextField } from '@/components/ui/form-field';
import { OptionPicker } from '@/components/ui/option-picker';
import { Section } from '@/components/ui/section';
import { LoadingState } from '@/components/ui/states';
import { AppText, Label } from '@/components/ui/text';
import { LEAD_STATUSES } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useAddLeadNote, useDeleteLead, useLead, useUpdateLeadStatus } from '@/hooks/use-leads';
import { formatCurrency, formatFullDate, formatRelative } from '@/lib/format';
import { useSessionUser } from '@/state/auth-store';
import type { LeadStatus } from '@/types/models';

interface LeadDetailSheetProps {
  projectId: string;
  leadId: string | null;
  onClose: () => void;
}

/** Lead record with status control, activity timeline, note entry and delete. */
export function LeadDetailSheet({ projectId, leadId, onClose }: LeadDetailSheetProps) {
  const user = useSessionUser();
  const author = user?.name ?? 'Alex Morgan';
  const { data, isPending } = useLead(leadId ?? undefined);
  const updateStatus = useUpdateLeadStatus(projectId, author);
  const addNote = useAddLeadNote(projectId, author);
  const deleteLead = useDeleteLead(projectId);
  const [note, setNote] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const onChangeStatus = (status: LeadStatus) => {
    if (!leadId || data?.lead.status === status) return;
    updateStatus.mutate({ leadId, status });
  };

  const onAddNote = async () => {
    if (!leadId || note.trim().length === 0) return;
    await addNote.mutateAsync({ leadId, content: note.trim() });
    setNote('');
  };

  const onDelete = async () => {
    if (!leadId) return;
    await deleteLead.mutateAsync(leadId);
    setConfirmingDelete(false);
    onClose();
  };

  return (
    <>
      <BottomSheet
        visible={leadId !== null}
        onClose={onClose}
        title="Lead"
        footer={
          <Button label="Delete lead" onPress={() => setConfirmingDelete(true)} variant="secondary" size="sm" />
        }
      >
        {isPending || !data ? (
          <LoadingState label="Loading lead" />
        ) : (
          <>
            <AppText variant="title">{data.lead.name}</AppText>

            <View style={styles.fieldList}>
              <Field label="Company" value={data.lead.company} />
              <Field label="Email" value={data.lead.email} />
              <Field label="Phone" value={data.lead.phone.length > 0 ? data.lead.phone : '—'} />
              <Field label="Source" value={data.lead.source} />
              <Field label="Captured from" value={data.lead.capturedFrom} />
              <Field label="Owner" value={data.lead.assignedTeamMember} />
              <Field
                label="Estimated value"
                value={data.lead.estimatedValue === null ? '—' : formatCurrency(data.lead.estimatedValue)}
              />
              <Field label="Last contacted" value={formatFullDate(data.lead.lastContactedAt)} />
            </View>

            <OptionPicker
              label="Status"
              options={LEAD_STATUSES}
              value={data.lead.status}
              onChange={onChangeStatus}
            />

            <Section title="Timeline">
              {data.activities.map((activity) => (
                <View key={activity.id} style={styles.activity}>
                  <View style={styles.activityHeader}>
                    <AppText variant="body">{activity.activityType}</AppText>
                    <Label>{formatRelative(activity.createdAt)}</Label>
                  </View>
                  <AppText variant="bodyMuted">{activity.content}</AppText>
                  <Label>{activity.author}</Label>
                </View>
              ))}
            </Section>

            <TextField
              label="Add timeline entry"
              value={note}
              onChangeText={setNote}
              placeholder="Capture a new timeline update…"
              multiline
            />
            <Button
              label="Add entry"
              onPress={onAddNote}
              size="sm"
              disabled={note.trim().length === 0}
              loading={addNote.isPending}
            />
          </>
        )}
      </BottomSheet>

      <ConfirmModal
        visible={confirmingDelete}
        title="Delete this lead?"
        message="The lead and its full activity timeline will be removed. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteLead.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <AppText variant="body" style={styles.fieldValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldList: { gap: spacing.sm },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  fieldValue: { flex: 1, textAlign: 'right' },
  activity: { gap: 2, paddingBottom: spacing.md },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
