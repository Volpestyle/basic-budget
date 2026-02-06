import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: number;
}

const iconMap: Record<string, string> = {
  cart: '\u{1F6D2}',
  home: '\u{1F3E0}',
  car: '\u{1F697}',
  food: '\u{1F37D}',
  coffee: '\u{2615}',
  movie: '\u{1F3AC}',
  music: '\u{1F3B5}',
  gym: '\u{1F4AA}',
  health: '\u{2764}',
  gift: '\u{1F381}',
  plane: '\u{2708}',
  book: '\u{1F4DA}',
  phone: '\u{1F4F1}',
  power: '\u{26A1}',
  dollar: '\u{1F4B5}',
  card: '\u{1F4B3}',
  pig: '\u{1F437}',
  shirt: '\u{1F455}',
  game: '\u{1F3AE}',
  pet: '\u{1F43E}',
};

export function CategoryIcon({ icon, color, size = 32 }: CategoryIconProps) {
  const emoji = iconMap[icon] ?? icon;
  const bgOpacity = 0.15;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: `${color}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`,
        },
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size * 0.5 }]}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
});
