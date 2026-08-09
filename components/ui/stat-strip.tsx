import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { AppText, Label } from '@/components/ui/text';

export interface Stat {
  label: string;
  value: string;
  caption?: string;
}

interface StatStripProps {
  stats: Stat[];
  /** Two per row keeps four stats readable on small screens. */
  columns?: 2 | 3;
}

export function StatStrip({ stats, columns = 2 }: StatStripProps) {
  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.label} style={[styles.cell, { width: `${100 / columns}%` }]}>
          <Label>{stat.label}</Label>
          <AppText variant="metric" numberOfLines={1} adjustsFontSizeToFit>
            {stat.value}
          </AppText>
          {stat.caption ? <AppText variant="small">{stat.caption}</AppText> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  cell: { padding: spacing.lg, gap: 2 },
});
