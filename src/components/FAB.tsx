import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const theme = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <MotiView
      from={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 120, delay: 300 }}
      style={styles.wrapper}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.colors.accent,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
      >
        <Text style={[styles.icon, { color: theme.colors.bgPrimary }]}>+</Text>
      </Pressable>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});
