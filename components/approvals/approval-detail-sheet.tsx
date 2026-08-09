import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TextField } from '@/components/ui/form-field';
import { OptionPicker } from '@/components/ui/option-picker';
import { Section } from '@/components/ui/section';
import { AppText, Label } from '@/components/ui/text';
import { APPROVAL_STATUSES } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useAddApprovalComment, useDeleteApproval, useUpdateApprovalStatus } from '@/hooks/use-approvals';
import { formatFullDate, formatRelative } from '@/lib/format';
import { useSessionUser } from '@/state/auth-store';
import type { Approval, ApprovalStatus } from '@/types/models';

interface ApprovalDetailSheetProps {
  projectId: string;
  approval: Approval | null;
  onClose: () => void;
}

export function ApprovalDetailSheet({ projectId, approval, onClose }: ApprovalDetailSheetProps) {
  const user = useSessionUser();
  const author = user?.name ?? 'Alex Morgan';
  const updateStatus = useUpdateApprovalStatus(projectId);
  const addComment = useAddApprovalComment(projectId, author);
  const deleteApproval = useDeleteApproval(projectId);
  const [comment, setComment] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const onDecision = (status: ApprovalStatus) => {
    if (!approval || approval.status === status) return;
    updateStatus.mutate({ approvalId: approval.id, status });
  };

  const onComment = async () => {
    if (!approval || comment.trim().length === 0) return;
    await addComment.mutateAsync({ approvalId: approval.id, message: comment.trim() });
    setComment('');
  };

  const onDelete = async () => {
    if (!approval) return;
    await deleteApproval.mutateAsync(approval.id);
    setConfirmingDelete(false);
    onClose();
  };

  return (
    <>
      <BottomSheet
        visible={approval !== null}
        onClose={onClose}
        title="Approval request"
        footer={<Button label="Delete request" onPress={() => setConfirmingDelete(true)} variant="secondary" size="sm" />}
      >
        {approval ? (
          <>
            <View style={[styles.thumbnail, { backgroundColor: approval.thumbnailColor }]} />
            <AppText variant="title">{approval.title}</AppText>
            <Label>
              {approval.submittedBy} · {formatFullDate(approval.submittedAt)} · {approval.type}
            </Label>

            <AppText variant="bodyMuted">{approval.details}</AppText>

            <View style={styles.splitRow}>
              <View style={styles.splitCell}>
                <Label>For</Label>
                <View style={styles.rule} />
                <AppText variant="bodyMuted">{approval.pros || '—'}</AppText>
              </View>
              <View style={styles.splitCell}>
                <Label>Against</Label>
                <View style={styles.rule} />
                <AppText variant="bodyMuted">{approval.cons || '—'}</AppText>
              </View>
            </View>

            <Section title="Recommendation">
              <AppText variant="bodyMuted">{approval.recommendation || 'No recommendation recorded.'}</AppText>
            </Section>

            <Section title="Attachments">
              <AppText variant="body" color={colors.accent}>
                {approval.attachments || 'No attachments'}
              </AppText>
            </Section>

            <OptionPicker label="Decision" options={APPROVAL_STATUSES} value={approval.status} onChange={onDecision} />

            <Section title="Comments">
              {approval.comments.length === 0 ? (
                <AppText variant="small">No comments yet.</AppText>
              ) : (
                approval.comments.map((entry) => (
                  <View key={entry.id} style={styles.comment}>
                    <View style={styles.commentHeader}>
                      <AppText variant="body">{entry.author}</AppText>
                      <Label>{formatRelative(entry.createdAt)}</Label>
                    </View>
                    <AppText variant="bodyMuted">{entry.message}</AppText>
                  </View>
                ))
              )}
            </Section>

            <TextField
              label="Add a comment"
              value={comment}
              onChangeText={setComment}
              placeholder="Share the reasoning behind your decision…"
              multiline
            />
            <Button
              label="Post comment"
              onPress={onComment}
              size="sm"
              disabled={comment.trim().length === 0}
              loading={addComment.isPending}
            />
          </>
        ) : null}
      </BottomSheet>

      <ConfirmModal
        visible={confirmingDelete}
        title="Delete this request?"
        message="The request and all its comments will be removed."
        confirmLabel="Delete"
        destructive
        loading={deleteApproval.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  thumbnail: { height: 120, borderRadius: 4 },
  splitRow: { flexDirection: 'row', gap: spacing.lg },
  splitCell: { flex: 1, gap: spacing.xs },
  rule: { height: 1, backgroundColor: colors.ink },
  comment: { gap: 2, paddingBottom: spacing.md },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
