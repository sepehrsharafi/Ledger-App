import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/charts/sparkline';
import { AppText, Label } from '@/components/ui/text';
import { colors, radii, spacing } from '@/constants/theme';
import { formatDelta, formatKpi } from '@/lib/format';
import type { OverviewKpi } from '@/types/models';

interface MetricCardProps {
  kpi: OverviewKpi;
}

export function MetricCard({ kpi }: MetricCardProps) {
  const delta = formatDelta(kpi.current, kpi.previous);
  // For inverted metrics like cost per lead, a decrease is the good outcome.
  const positive = kpi.lowerIsBetter ? delta.direction === 'down' : delta.direction === 'up';
  const deltaColor = delta.direction === 'flat' ? colors.inkMuted : positive ? colors.success : colors.danger;
  const arrow = delta.direction === 'flat' ? '' : delta.direction === 'up' ? '▲' : '▼';

  return (
    <View style={styles.card}>
      <Label>{kpi.metric}</Label>
      <View style={styles.valueRow}>
        <AppText variant="metric">{formatKpi(kpi.current, kpi.format)}</AppText>
        <AppText variant="small" color={deltaColor}>
          {arrow} {delta.label}
        </AppText>
      </View>
      <Sparkline values={kpi.sparkline} height={32} />
      <AppText variant="small" numberOfLines={1}>
        {kpi.caption}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
});
