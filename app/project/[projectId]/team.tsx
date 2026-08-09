import { StyleSheet, View } from 'react-native';

import { ProjectHeader } from '@/components/project/project-header';
import { TeamAssignmentPanel } from '@/components/team/team-assignment-panel';
import { Screen } from '@/components/ui/screen';
import { colors } from '@/constants/theme';
import { useProjectId } from '@/hooks/use-project-context';

export default function ProjectTeamScreen() {
  const projectId = useProjectId();

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="team"
        title="Team"
        subtitle="Project-specific ownership and capacity."
        showBack
      />

      <Screen>
        <TeamAssignmentPanel projectId={projectId} />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
