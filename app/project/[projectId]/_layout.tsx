import { Stack, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { ErrorState } from '@/components/ui/states';
import { colors, spacing } from '@/constants/theme';
import { ProjectIdProvider } from '@/hooks/use-project-context';

/**
 * The dynamic segment owns this layout, which is what makes `projectId` resolvable for the
 * nested (workspace) tabs and the pushed screens (campaigns, approvals, reports…). The id is
 * published through context because on native a mounted-but-unfocused tab screen can read empty
 * local route params — screens must never depend on their own params for it.
 */
export default function ProjectLayout() {
  const params = useLocalSearchParams<{ projectId?: string | string[] }>();
  const raw = params.projectId;
  const projectId = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');

  // Fail loudly rather than rendering screens that would quietly fetch nothing.
  if (projectId.length === 0) {
    return (
      <View style={styles.root}>
        <ErrorState
          title="No project selected"
          error={new Error('This screen was opened without a project id. Go back to Projects and pick a project.')}
        />
      </View>
    );
  }

  return (
    <ProjectIdProvider key={projectId} projectId={projectId}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </ProjectIdProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
});
