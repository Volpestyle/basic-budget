import React from 'react';
import { StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../theme/ThemeProvider';

interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
}

export function SkeletonLoader({ width, height, borderRadius = 6 }: SkeletonLoaderProps) {
  const theme = useTheme();

  return (
    <MotiView
      from={{ opacity: 0.3 }}
      animate={{ opacity: 0.7 }}
      transition={{
        type: 'timing',
        duration: 800,
        loop: true,
      }}
      style={[
        styles.skeleton,
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: theme.colors.borderDefault,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {},
});
