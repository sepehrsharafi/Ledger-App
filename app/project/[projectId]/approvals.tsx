import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApprovalDetailSheet } from '@/components/approvals/approval-detail-sheet';
import { CreateApprovalSheet } from '@/components/approvals/create-approval-sheet';
import { ProjectHeader } from '@/components/project/project-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterChips } from '@/components/ui/filter-chips';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { APPROVAL_STATUSES } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useProjectApprovals, useUpdateApprovalStatus } from '@/hooks/use-approvals';
import { useProjectId } from '@/hooks/use-project-context';
import { useRefresh } from '@/hooks/use-refresh';
import { formatFullDate } from '@/lib/format';
import type { Approval, ApprovalStatus } from '@/types/models';

export default function ApprovalsScreen() {
  const projectId = useProjectId();
  const { data, isPending, isError, error, refetch } = useProjectApprovals(projectId);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const updateStatus = useUpdateApprovalStatus(projectId);

  const [status, setStatus] = useState<ApprovalStatus | 'All'>('All');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const approvals = useMemo(() => data?.approvals ?? [], [data]);
  const visible = useMemo(
    () => approvals.filter((approval) => status === 'All' || approval.status === status),
    [approvals, status],
  );
  const selected = approvals.find((approval) => approval.id === selectedId) ?? null;

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="approvals"
        title="Approvals"
        subtitle="Creative review with decisions and comments."
        actionLabel="Request"
        onAction={() => setCreating(true)}
        showBack
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading approvals" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load approvals" /> : null}

        {data ? (
          <>
            <FilterChips
              title="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'All' as const, label: 'All', count: approvals.length },
                ...APPROVAL_STATUSES.map((value) => ({ value, label: value, count: data.counts[value] ?? 0 })),
              ]}
            />

            {visible.length === 0 ? (
              <EmptyState
                title={approvals.length === 0 ? 'No approval requests' : 'Nothing with that status'}
                message={
                  approvals.length === 0
                    ? 'Submit a request when creative, copy or budget needs a decision.'
                    : 'Switch the filter to see other requests.'
                }
                actionLabel={approvals.length === 0 ? 'Request approval' : undefined}
                onAction={approvals.length === 0 ? () => setCreating(true) : undefined}
              />
            ) : (
              <View style={styles.list}>
                {visible.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onOpen={() => setSelectedId(approval.id)}
                    onApprove={() => updateStatus.mutate({ approvalId: approval.id, status: 'Approved' })}
                    approving={updateStatus.isPending}
                  />
                ))}
              </View>
            )}
          </>
        ) : null}
      </Screen>

      <CreateApprovalSheet projectId={projectId} visible={creating} onClose={() => setCreating(false)} />
      <ApprovalDetailSheet projectId={projectId} approval={selected} onClose={() => setSelectedId(null)} />
    </View>
  );
}

interface ApprovalCardProps {
  approval: Approval;
  onOpen: () => void;
  onApprove: () => void;
  approving: boolean;
}

function ApprovalCard({ approval, onOpen, onApprove, approving }: ApprovalCardProps) {
  return (
    <Card>
      <View style={[styles.thumbnail, { backgroundColor: approval.thumbnailColor }]} />

      <View style={styles.cardHeader}>
        <AppText variant="heading" style={styles.cardTitle} numberOfLines={2}>
          {approval.title}
        </AppText>
        <StatusPill label={approval.status} />
      </View>

      <Label>
        {approval.submittedBy} · {formatFullDate(approval.submittedAt)} · {approval.type}
      </Label>

      <AppText variant="bodyMuted" numberOfLines={3} style={styles.summary}>
        {approval.summary}
      </AppText>

      <View style={styles.actions}>
        {approval.status !== 'Approved' ? (
          <Button label="Approve" onPress={onApprove} size="sm" disabled={approving} />
        ) : null}
        <Button label="Review" onPress={onOpen} variant="secondary" size="sm" />
        {approval.comments.length > 0 ? <Label>{approval.comments.length} comment(s)</Label> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { gap: spacing.md },
  thumbnail: { height: 110, borderRadius: 4, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  cardTitle: { flex: 1 },
  summary: { marginTop: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
});
