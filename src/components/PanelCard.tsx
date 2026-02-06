import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../theme/ThemeProvider';

interface PanelCardProps {
  children: React.ReactNode;
  animated?: boolean;
  delay?: number;
  style?: object;
}

export function PanelCard({ children, animated = true, delay = 0, style }: PanelCardProps) {
  const theme = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.bgSurface,
      borderColor: theme.colors.borderDefault,
    },
    style,
  ];

  if (animated) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 350,
          delay,
        }}
        style={cardStyle}
      >
        {children}
      </MotiView>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
