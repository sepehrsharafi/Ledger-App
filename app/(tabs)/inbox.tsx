import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { NotificationRow } from '@/components/ui/notification-row';
import { Screen } from '@/components/ui/screen';
import { StatStrip } from '@/components/ui/stat-strip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { colors, spacing } from '@/constants/theme';
import { useInbox } from '@/hooks/use-inbox';
import { useRefresh } from '@/hooks/use-refresh';
import { projectRoute } from '@/lib/routes';

/** Derived inbox: pending approvals plus tasks sitting in Review, deep-linked per item. */
export default function InboxScreen() {
  const { data, isPending, isError, error, refetch } = useInbox();
  const { refreshing, onRefresh } = useRefresh(refetch);

  return (
    <View style={styles.root}>
      <AppHeader
        title="Inbox"
        subtitle="Approvals waiting on a decision and tasks sitting in review."
        showInboxBadge={false}
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading inbox" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load your inbox" /> : null}

        {data ? (
          <StatStrip
            stats={[
              { label: 'Pending approvals', value: String(data.pendingApprovals) },
              { label: 'Tasks in review', value: String(data.tasksInReview) },
            ]}
          />
        ) : null}

        {data?.items.length === 0 ? (
          <EmptyState title="Nothing needs you right now" message="Approvals and tasks in review will appear here." />
        ) : null}

        <View style={styles.list}>
          {data?.items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onPress={() => router.push(projectRoute(item.projectId, item.kind === 'approval' ? 'approvals' : 'tasks'))}
            />
          ))}
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { gap: spacing.md },
});
