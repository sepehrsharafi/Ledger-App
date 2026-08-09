import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { colors, spacing } from '@/constants/theme';
import { AppText, Label } from '@/components/ui/text';

interface AreaTrendProps {
  values: number[];
  labels: string[];
  height?: number;
  color?: string;
  fill?: string;
  /** Rendered above the plot as the series caption. */
  title?: string;
  valueLabel?: string;
  rangeLabel?: string;
  showAxis?: boolean;
}

const CHART_WIDTH = 320;

/**
 * Filled trend line. Uses a fixed viewBox with `preserveAspectRatio="none"` so the SVG
 * stretches to the container width without a layout measurement pass.
 */
export function AreaTrend({
  values,
  labels,
  height = 74,
  color = colors.chartAccent,
  fill = 'rgba(31, 75, 197, 0.10)',
  title,
  valueLabel,
  rangeLabel,
  showAxis = false,
}: AreaTrendProps) {
  if (values.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <AppText variant="small">Not enough data to plot a trend yet.</AppText>
      </View>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = CHART_WIDTH / (values.length - 1);
  const points = values.map((value, index) => ({
    x: index * stepX,
    y: height - ((value - min) / range) * (height - 8) - 4,
  }));

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const area = `${line} L${CHART_WIDTH},${height} L0,${height} Z`;

  return (
    <View style={styles.container}>
      {title || valueLabel ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <Label>{title}</Label> : null}
            {valueLabel ? <AppText variant="metric">{valueLabel}</AppText> : null}
            {rangeLabel ? <AppText variant="small">{rangeLabel}</AppText> : null}
          </View>
        </View>
      ) : null}

      <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`} preserveAspectRatio="none">
        <Path d={area} fill={fill} />
        <Path d={line} stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
        {showAxis ? <Line x1={0} y1={height - 0.5} x2={CHART_WIDTH} y2={height - 0.5} stroke={colors.border} strokeWidth={1} /> : null}
      </Svg>

      {labels.length > 0 ? (
        <View style={styles.labels}>
          {labels.map((label, index) => (
            <Label key={`${label}-${index}`} style={styles.label}>
              {label}
            </Label>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { gap: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { flex: 1, textAlign: 'center' },
  empty: { justifyContent: 'center' },
});
