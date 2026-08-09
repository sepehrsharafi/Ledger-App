import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { colors, spacing } from '@/constants/theme';
import { AppText, Label } from '@/components/ui/text';

export interface Series {
  key: string;
  label: string;
  values: number[];
  color: string;
}

interface MultiLineProps {
  series: Series[];
  labels: string[];
  height?: number;
  /** Rebases every series to 100 at the first point so different units share one scale. */
  indexed?: boolean;
  caption?: string;
}

const CHART_WIDTH = 320;

export function MultiLine({ series, labels, height = 150, indexed = true, caption }: MultiLineProps) {
  const prepared = series.map((entry) => {
    if (!indexed) return entry;
    const base = entry.values[0] ?? 0;
    return {
      ...entry,
      values: base === 0 ? entry.values : entry.values.map((value) => (value / base) * 100),
    };
  });

  const all = prepared.flatMap((entry) => entry.values);
  const min = all.length > 0 ? Math.min(...all) : 0;
  const max = all.length > 0 ? Math.max(...all) : 1;
  const range = max - min || 1;

  const toPath = (values: number[]) => {
    if (values.length < 2) return '';
    const stepX = CHART_WIDTH / (values.length - 1);
    return values
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - min) / range) * (height - 12) - 6;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  };

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        {series.map((entry) => (
          <View key={entry.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: entry.color }]} />
            <Label>{entry.label}</Label>
          </View>
        ))}
      </View>

      <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((fraction) => (
          <Line
            key={fraction}
            x1={0}
            y1={height * fraction}
            x2={CHART_WIDTH}
            y2={height * fraction}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        {prepared.map((entry) => (
          <Path
            key={entry.key}
            d={toPath(entry.values)}
            stroke={entry.color}
            strokeWidth={1.6}
            fill="none"
            strokeLinejoin="round"
          />
        ))}
      </Svg>

      <View style={styles.labels}>
        {labels.map((label, index) => (
          <Label key={`${label}-${index}`} style={styles.label}>
            {label}
          </Label>
        ))}
      </View>

      {caption ? <AppText variant="small">{caption}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 8, height: 8 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { flex: 1, textAlign: 'center', fontSize: 9 },
});
