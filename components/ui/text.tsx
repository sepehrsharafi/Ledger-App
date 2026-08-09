import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { typography } from '@/constants/theme';

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
}

/** Every piece of copy in the app renders through this so type styles stay consistent. */
export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[typography[variant], color ? { color } : null, align ? { textAlign: align } : null, style]} />;
}

export function Label({ style, ...rest }: Omit<AppTextProps, 'variant'>) {
  return <AppText variant="label" {...rest} style={style} />;
}

export const textStyles = StyleSheet.create({
  strike: { textDecorationLine: 'line-through' },
});
