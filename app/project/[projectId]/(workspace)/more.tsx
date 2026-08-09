import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProjectHeader } from '@/components/project/project-header';
import { DataRow } from '@/components/ui/data-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Label } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useProjectId } from '@/hooks/use-project-context';
import { projectRoute, type ProjectSegment } from '@/lib/routes';
import { useCan } from '@/state/permissions';

interface Destination {
  segment: ProjectSegment;
  title: string;
  description: string;
  capabilityGated?: boolean;
}

const DESTINATIONS: Destination[] = [
  { segment: 'campaigns', title: 'Campaigns', description: 'Channel performance, pacing and drill-down stats.' },
  { segment: 'approvals', title: 'Approvals', description: 'Creative review with decisions and comments.' },
  { segment: 'reports', title: 'Reports', description: 'Sections, schedule and report engagement.' },
  { segment: 'team', title: 'Project team', description: 'Project-specific ownership and capacity.' },
  { segment: 'settings', title: 'Project settings', description: 'Name, client, status and brand colours.', capabilityGated: true },
  { segment: 'client-view', title: 'Client view', description: 'Read-only summary that is safe to share.' },
];

export default function MoreScreen() {
  const projectId = useProjectId();
  const canEditSettings = useCan('editProjectSettings');

  return (
    <View style={styles.root}>
      <ProjectHeader projectId={projectId} segment="more" title="More" subtitle="Everything else in this workspace." />

      <Screen>
        <Section title="Modules">
          {DESTINATIONS.filter((destination) => !destination.capabilityGated || canEditSettings).map((destination) => (
            <DataRow
              key={destination.segment}
              title={destination.title}
              subtitle={destination.description}
              trailing={<Label color={colors.accent}>Open</Label>}
              onPress={() => router.push(projectRoute(projectId, destination.segment))}
            />
          ))}
        </Section>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
