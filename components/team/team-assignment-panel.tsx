import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DataRow } from '@/components/ui/data-row';
import { Section } from '@/components/ui/section';
import { StatStrip } from '@/components/ui/stat-strip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { colors, spacing } from '@/constants/theme';
import { useProjectTeam, useTeamMember, useToggleAssignment } from '@/hooks/use-team';
import { formatDayMonth } from '@/lib/format';
import { useCan } from '@/state/permissions';
import type { TeamMember, UnassignConflict } from '@/types/models';

interface TeamAssignmentPanelProps {
  projectId: string;
  /** Shown above the lists; the workspace tab renders its own project selector instead. */
  showCounts?: boolean;
}

/**
 * Assigned/available lists with the shared unassign guard: removing a member who still owns
 * open tasks on the project asks for confirmation and shows up to four of those tasks.
 */
export function TeamAssignmentPanel({ projectId, showCounts = true }: TeamAssignmentPanelProps) {
  const { data, isPending, isError, error, refetch } = useProjectTeam(projectId);
  const toggle = useToggleAssignment(projectId);
  const canManage = useCan('manageTeamAssignments');
  const [conflict, setConflict] = useState<UnassignConflict | null>(null);
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);

  const onToggle = async (memberId: string) => {
    const result = await toggle.mutateAsync({ memberId });
    if (result.conflict) setConflict(result.conflict);
  };

  const confirmUnassign = async () => {
    if (!conflict) return;
    await toggle.mutateAsync({ memberId: conflict.memberId, force: true });
    setConflict(null);
  };

  if (isPending) return <LoadingState label="Loading team" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} title="Could not load the team" />;
  if (!data) return null;

  return (
    <>
      {showCounts ? (
        <StatStrip
          columns={3}
          stats={[
            { label: 'On project', value: String(data.counts.onProject) },
            { label: 'Available', value: String(data.counts.available) },
            { label: 'Agency total', value: String(data.counts.agencyTotal) },
          ]}
        />
      ) : null}

      <Section title="Assigned">
        {data.assigned.length === 0 ? (
          <EmptyState title="Nobody assigned" message="Assign a team member to give them ownership on this project." />
        ) : (
          data.assigned.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              actionLabel="Unassign"
              actionVariant="secondary"
              disabled={!canManage || toggle.isPending}
              onAction={() => onToggle(member.id)}
              onPress={() => setDetailMemberId(member.id)}
            />
          ))
        )}
      </Section>

      <Section title="Available">
        {data.available.length === 0 ? (
          <EmptyState title="Everyone is on this project" message="All agency members are already assigned here." />
        ) : (
          data.available.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              actionLabel="Assign"
              actionVariant="primary"
              disabled={!canManage || toggle.isPending}
              onAction={() => onToggle(member.id)}
              onPress={() => setDetailMemberId(member.id)}
            />
          ))
        )}
      </Section>

      <ConfirmModal
        visible={conflict !== null}
        title={`${conflict?.memberName ?? 'This member'} still owns work here`}
        message={
          conflict?.taskCount === 1
            ? '1 open task on this project is assigned to them. Unassigning leaves that work without an owner.'
            : `${conflict?.taskCount ?? 0} open tasks on this project are assigned to them. Unassigning leaves that work without an owner.`
        }
        confirmLabel="Unassign anyway"
        destructive
        loading={toggle.isPending}
        onConfirm={confirmUnassign}
        onCancel={() => setConflict(null)}
      >
        <View style={styles.taskList}>
          {conflict?.sampleTasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <AppText variant="small" color={colors.ink} numberOfLines={1} style={styles.taskTitle}>
                {task.title}
              </AppText>
              <Label>{formatDayMonth(task.dueDate)}</Label>
            </View>
          ))}
        </View>
      </ConfirmModal>

      <MemberDetailSheet memberId={detailMemberId} onClose={() => setDetailMemberId(null)} />
    </>
  );
}

interface MemberRowProps {
  member: TeamMember;
  actionLabel: string;
  actionVariant: 'primary' | 'secondary';
  disabled: boolean;
  onAction: () => void;
  onPress: () => void;
}

function MemberRow({ member, actionLabel, actionVariant, disabled, onAction, onPress }: MemberRowProps) {
  return (
    <DataRow
      title={member.name}
      subtitle={member.email}
      leading={<Avatar name={member.name} color={member.avatarColor} />}
      onPress={onPress}
      trailing={
        <View style={styles.rowActions}>
          <StatusPill label={member.role} />
          <Button label={actionLabel} onPress={onAction} variant={actionVariant} size="sm" disabled={disabled} />
        </View>
      }
    />
  );
}

function MemberDetailSheet({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const { data, isPending } = useTeamMember(memberId ?? undefined);

  return (
    <BottomSheet visible={memberId !== null} onClose={onClose} title="Team member">
      {isPending || !data ? (
        <LoadingState label="Loading member" />
      ) : (
        <>
          <View style={styles.detailHeader}>
            <Avatar name={data.name} color={data.avatarColor} size="lg" />
            <View style={styles.detailHeaderText}>
              <AppText variant="title">{data.name}</AppText>
              <AppText variant="small">{data.email}</AppText>
            </View>
          </View>

          <StatStrip
            columns={3}
            stats={[
              { label: 'Role', value: data.role },
              { label: 'Projects', value: String(data.assignmentCount) },
              { label: 'Open tasks', value: String(data.openTaskCount) },
            ]}
          />

          <Section title="Assigned projects">
            {data.projects.length === 0 ? (
              <EmptyState title="No project assignments" message="This member is available for new work." />
            ) : (
              data.projects.map((project) => (
                <DataRow key={project.id} title={project.name} subtitle={project.clientName} />
              ))
            )}
          </Section>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  taskList: { gap: spacing.sm, marginTop: spacing.md },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  taskTitle: { flex: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailHeaderText: { flex: 1, gap: 2 },
});
