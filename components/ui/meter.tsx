import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/constants/theme';

interface MeterProps {
  /** 0–1; values above 1 clamp visually but still tint the bar. */
  progress: number;
  color?: string;
  height?: number;
  track?: string;
}

export function Meter({ progress, color = colors.accent, height = 4, track = colors.surfaceSunken }: MeterProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const over = progress > 1;

  return (
    <View style={[styles.track, { height, backgroundColor: track }]}>
      <View
        style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: over ? colors.danger : color, height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radii.sm, overflow: 'hidden' },
  fill: { borderRadius: radii.sm },
});
