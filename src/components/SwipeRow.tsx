import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';

interface SwipeAction {
  label: string;
  color: string;
  onPress: () => void;
}

interface SwipeRowProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
}

const THRESHOLD = 80;

export function SwipeRow({ children, leftAction, rightAction }: SwipeRowProps) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const triggered = useSharedValue(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const executeLeft = () => leftAction?.onPress();
  const executeRight = () => rightAction?.onPress();

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      const maxLeft = leftAction ? THRESHOLD * 1.2 : 0;
      const maxRight = rightAction ? -THRESHOLD * 1.2 : 0;
      translateX.value = Math.max(maxRight, Math.min(maxLeft, e.translationX));

      if (Math.abs(translateX.value) > THRESHOLD && !triggered.value) {
        triggered.value = true;
        runOnJS(triggerHaptic)();
      } else if (Math.abs(translateX.value) < THRESHOLD) {
        triggered.value = false;
      }
    })
    .onEnd(() => {
      if (translateX.value > THRESHOLD && leftAction) {
        runOnJS(executeLeft)();
      } else if (translateX.value < -THRESHOLD && rightAction) {
        runOnJS(executeRight)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      triggered.value = false;
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Background actions */}
      <View style={styles.actionsContainer}>
        {leftAction && (
          <Pressable
            style={[styles.action, styles.leftAction, { backgroundColor: leftAction.color }]}
            onPress={leftAction.onPress}
          >
            <Text style={styles.actionLabel}>{leftAction.label}</Text>
          </Pressable>
        )}
        {rightAction && (
          <Pressable
            style={[styles.action, styles.rightAction, { backgroundColor: rightAction.color }]}
            onPress={rightAction.onPress}
          >
            <Text style={styles.actionLabel}>{rightAction.label}</Text>
          </Pressable>
        )}
      </View>

      {/* Swipeable content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, { backgroundColor: theme.colors.bgSurface }, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  action: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: 80,
  },
  leftAction: {
    alignItems: 'flex-start',
  },
  rightAction: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    zIndex: 1,
  },
});
