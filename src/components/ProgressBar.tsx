import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import type { MoneyCents } from '../types/domain';
import { useTheme } from '../theme/ThemeProvider';

interface ProgressBarProps {
  spent: MoneyCents;
  budget: MoneyCents;
  height?: number;
  color?: string;
  showOverspend?: boolean;
}

export function ProgressBar({
  spent,
  budget,
  height = 6,
  color,
  showOverspend = true,
}: ProgressBarProps) {
  const theme = useTheme();
  const ratio = budget > 0 ? (spent as number) / (budget as number) : 0;
  const clampedRatio = Math.min(ratio, 1);
  const isOverspent = ratio > 1;

  const fillColor = color ?? (isOverspent ? theme.colors.danger : theme.colors.accent);
  const trackColor = isOverspent ? theme.colors.dangerDim : theme.colors.accentSubtle;

  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clampedRatio, { duration: 600 });
  }, [clampedRatio, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as `${number}%`,
  }));

  const overspendWidth = useSharedValue(0);

  useEffect(() => {
    if (showOverspend && isOverspent) {
      overspendWidth.value = withTiming(Math.min(ratio - 1, 1), { duration: 600 });
    } else {
      overspendWidth.value = 0;
    }
  }, [ratio, isOverspent, showOverspend, overspendWidth]);

  const overspendStyle = useAnimatedStyle(() => ({
    width: `${overspendWidth.value * 100}%` as `${number}%`,
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          fillStyle,
          { backgroundColor: fillColor, borderRadius: height / 2, height },
        ]}
      />
      {showOverspend && isOverspent && (
        <Animated.View
          style={[
            styles.overspend,
            overspendStyle,
            {
              backgroundColor: theme.colors.danger,
              borderRadius: height / 2,
              height,
              opacity: 0.5,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  overspend: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
