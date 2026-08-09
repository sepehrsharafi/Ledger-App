import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { SessionChip } from '@/components/session-chip';
import { CreateProjectSheet } from '@/components/sheets/create-project-sheet';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { colors, spacing } from '@/constants/theme';
import { useProjects } from '@/hooks/use-projects';
import { useRefresh } from '@/hooks/use-refresh';
import { formatNumber } from '@/lib/format';
import { projectRoute } from '@/lib/routes';
import { useCan } from '@/state/permissions';
import type { ProjectSummary } from '@/types/models';

export default function ProjectsScreen() {
  const { data, isPending, isError, error, refetch } = useProjects();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const [creating, setCreating] = useState(false);
  const canCreate = useCan('createProjects');

  const openProject = (projectId: string) => router.push(projectRoute(projectId, 'overview'));

  return (
    <View style={styles.root}>
      <AppHeader
        title="Projects"
        subtitle="Every client workspace, organized in one place."
        actionLabel={canCreate ? 'New project' : undefined}
        onAction={canCreate ? () => setCreating(true) : undefined}
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading projects" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load projects" /> : null}

        {data?.length === 0 ? (
          <EmptyState
            title="No projects yet"
            message="Create your first client workspace to start tracking leads, campaigns and approvals."
            actionLabel={canCreate ? 'New project' : undefined}
            onAction={canCreate ? () => setCreating(true) : undefined}
          />
        ) : null}

        {data?.map((project) => (
          <ProjectCard key={project.id} project={project} onPress={() => openProject(project.id)} />
        ))}

        <SessionChip />
      </Screen>

      <CreateProjectSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={(projectId) => {
          setCreating(false);
          openProject(projectId);
        }}
      />
    </View>
  );
}

function ProjectCard({ project, onPress }: { project: ProjectSummary; onPress: () => void }) {
  return (
    <Card onPress={onPress} accentColor={project.brandAccent}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <AppText variant="title" numberOfLines={1}>
            {project.name}
          </AppText>
          <Label numberOfLines={1}>{project.clientName}</Label>
        </View>
        <StatusPill label={project.status} />
      </View>

      <AppText variant="bodyMuted" numberOfLines={2} style={styles.type}>
        {project.type}
      </AppText>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCell}>
          <Label>Leads</Label>
          <AppText variant="metric">{formatNumber(project.leadCount)}</AppText>
        </View>
        <View style={[styles.kpiCell, styles.kpiDivider]}>
          <Label numberOfLines={1}>{project.topKpiLabel}</Label>
          <AppText variant="metric" numberOfLines={1} adjustsFontSizeToFit>
            {project.topKpiValue}
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <Label>
          {project.campaignCount} campaigns · {project.taskCount} tasks · {project.teamCount} people
        </Label>
        <Label color={colors.accent}>Open →</Label>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  cardTitle: { flex: 1, gap: 2 },
  type: { marginTop: spacing.md },
  kpiRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  kpiCell: { flex: 1, padding: spacing.md, gap: 2 },
  kpiDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
