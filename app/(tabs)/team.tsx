import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { TeamAssignmentPanel } from '@/components/team/team-assignment-panel';
import { FilterChips } from '@/components/ui/filter-chips';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { colors } from '@/constants/theme';
import { useProjects } from '@/hooks/use-projects';
import { useRefresh } from '@/hooks/use-refresh';

/** Workspace-level team view: pick a project, then manage its assignments. */
export default function TeamScreen() {
  const { data: projects, isPending, isError, error, refetch } = useProjects();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    if (!projectId && projects && projects.length > 0) setProjectId(projects[0]!.id);
  }, [projectId, projects]);

  return (
    <View style={styles.root}>
      <AppHeader title="Team" subtitle="Agency roster and per-project ownership." />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading team" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load the team" /> : null}

        {projects && projects.length === 0 ? (
          <EmptyState title="No projects yet" message="Create a project before assigning team members." />
        ) : null}

        {projects && projects.length > 0 ? (
          <FilterChips
            title="Project"
            value={projectId}
            onChange={setProjectId}
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
          />
        ) : null}

        {projectId ? <TeamAssignmentPanel projectId={projectId} /> : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
