import React from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  selected: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const segmentWidth = useSharedValue(0);
  const selectedIndex = options.findIndex((o) => o.value === selected);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(selectedIndex * segmentWidth.value, { damping: 20, stiffness: 200 }) }],
    width: segmentWidth.value,
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    segmentWidth.value = e.nativeEvent.layout.width / options.length;
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.bgSurface, borderColor: theme.colors.borderDefault }]}
      onLayout={handleLayout}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: theme.colors.accent },
          indicatorStyle,
        ]}
      />
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={styles.segment}
          onPress={() => onChange(option.value)}
        >
          <Text
            style={[
              styles.label,
              {
                color:
                  option.value === selected
                    ? theme.colors.bgPrimary
                    : theme.colors.textSecondary,
                fontWeight: option.value === selected ? '600' : '400',
              },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    zIndex: 1,
  },
  label: {
    fontSize: 13,
  },
});
