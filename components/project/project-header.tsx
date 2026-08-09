import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { colors } from '@/constants/theme';
import type { ProjectSegment } from '@/lib/routes';

interface ProjectHeaderProps {
  projectId: string;
  /** Route segment of this screen, e.g. "leads" — also used to stay put when switching projects. */
  segment: ProjectSegment;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  showBack?: boolean;
  showBreadcrumb?: boolean;
}

/** Header used by every project screen: breadcrumb, title, action, and project context. */
export function ProjectHeader({
  projectId,
  segment,
  title,
  subtitle,
  actionLabel,
  onAction,
  showBack = false,
  showBreadcrumb = false,
}: ProjectHeaderProps) {
  const crumbLabel = showBreadcrumb ? segment.replace(/-/g, ' ') : undefined;

  return (
    <View style={styles.container}>
      <AppHeader
        title={title}
        subtitle={subtitle}
        breadcrumb={crumbLabel}
        actionLabel={actionLabel}
        onAction={onAction}
        showBack={showBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
});
