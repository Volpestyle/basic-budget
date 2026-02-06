import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TabBarIconProps {
  name: string;
  color: string;
  size: number;
}

/**
 * Minimal geometric tab bar icons.
 * Using simple shapes instead of an icon library for zero dep overhead.
 * Will be replaced with proper SF Symbols / custom icons when branding is finalized.
 */
export function TabBarIcon({ name, color, size }: TabBarIconProps) {
  const s = size * 0.85;

  switch (name) {
    case 'grid':
      return (
        <View style={[styles.iconContainer, { width: s, height: s }]}>
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.gridCell,
                  {
                    backgroundColor: color,
                    width: s * 0.4,
                    height: s * 0.4,
                    borderRadius: s * 0.08,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      );
    case 'layers':
      return (
        <View style={[styles.iconContainer, { width: s, height: s }]}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.layerBar,
                {
                  backgroundColor: color,
                  width: s * (1 - i * 0.2),
                  height: s * 0.18,
                  borderRadius: s * 0.06,
                  opacity: 1 - i * 0.25,
                },
              ]}
            />
          ))}
        </View>
      );
    case 'list':
      return (
        <View style={[styles.iconContainer, { width: s, height: s }]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.listRow}>
              <View
                style={[
                  styles.listDot,
                  { backgroundColor: color, width: s * 0.15, height: s * 0.15, borderRadius: s },
                ]}
              />
              <View
                style={[
                  styles.listLine,
                  {
                    backgroundColor: color,
                    width: s * 0.6,
                    height: s * 0.12,
                    borderRadius: s * 0.04,
                    opacity: 0.7,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      );
    case 'bar-chart':
      return (
        <View style={[styles.iconContainer, { width: s, height: s }]}>
          <View style={styles.barChart}>
            {[0.4, 0.7, 1.0, 0.55].map((h, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: color,
                  width: s * 0.16,
                  height: s * h * 0.8,
                  borderRadius: s * 0.04,
                  opacity: i === 2 ? 1 : 0.65,
                }}
              />
            ))}
          </View>
        </View>
      );
    case 'settings':
      return (
        <View style={[styles.iconContainer, { width: s, height: s }]}>
          <View
            style={[
              styles.gear,
              {
                width: s * 0.55,
                height: s * 0.55,
                borderRadius: s * 0.5,
                borderWidth: s * 0.1,
                borderColor: color,
              },
            ]}
          >
            <View
              style={{
                width: s * 0.18,
                height: s * 0.18,
                borderRadius: s,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    default:
      return (
        <View
          style={{
            width: s * 0.5,
            height: s * 0.5,
            borderRadius: s,
            backgroundColor: color,
          }}
        />
      );
  }
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCell: {},
  layerBar: {
    marginVertical: 1.5,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 1.5,
  },
  listDot: {},
  listLine: {},
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: '80%',
  },
  gear: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
