import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/theme';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

/** Single-path trend line — no axes, sized to fit inside metric cards. */
export function Sparkline({ values, width = 120, height = 28, color = colors.chartAccent }: SparklineProps) {
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const resolvedWidth = measuredWidth ?? width;

  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const nextWidth = Math.round(nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== measuredWidth) setMeasuredWidth(nextWidth);
  };

  if (values.length < 2) return <View style={{ width: '100%', height }} onLayout={onLayout} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = resolvedWidth / (values.length - 1);

  const path = values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * (height - 2) - 1;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <View style={{ width: '100%', height }} onLayout={onLayout}>
      <Svg width={resolvedWidth} height={height}>
        <Path d={path} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}
