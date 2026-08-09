import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { AppText, Label } from '@/components/ui/text';

export interface PairedBarGroup {
  label: string;
  primary: number;
  secondary: number;
}

interface PairedBarsProps {
  groups: PairedBarGroup[];
  primaryLabel: string;
  secondaryLabel: string;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

/** Two-series bar chart built from views — cheaper than SVG for a handful of bars. */
export function PairedBars({
  groups,
  primaryLabel,
  secondaryLabel,
  height = 140,
  primaryColor = colors.chartInk,
  secondaryColor = colors.chartSoft,
}: PairedBarsProps) {
  const max = Math.max(1, ...groups.flatMap((group) => [group.primary, group.secondary]));

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <LegendSwatch color={primaryColor} label={primaryLabel} />
        <LegendSwatch color={secondaryColor} label={secondaryLabel} />
      </View>

      <View style={[styles.plot, { height }]}>
        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <View style={styles.bars}>
              <View
                style={[styles.bar, { height: Math.max(2, (group.primary / max) * (height - 20)), backgroundColor: primaryColor }]}
              />
              <View
                style={[
                  styles.bar,
                  { height: Math.max(2, (group.secondary / max) * (height - 20)), backgroundColor: secondaryColor },
                ]}
              />
            </View>
            <Label>{group.label}</Label>
          </View>
        ))}
      </View>
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <AppText variant="small">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  legend: { flexDirection: 'row', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 8, height: 8 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  group: { flex: 1, alignItems: 'center', gap: spacing.xs },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, flex: 1 },
  bar: { width: 12 },
});
