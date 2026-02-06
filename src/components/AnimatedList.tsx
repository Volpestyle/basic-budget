import React, { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import type { FlatListProps, ListRenderItem } from 'react-native';
import { MotiView } from 'moti';
import { staggerOffset } from '../theme/tokens';

interface AnimatedListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  renderItem: ListRenderItem<T>;
  staggerDelay?: number;
}

export function AnimatedList<T>({
  renderItem,
  staggerDelay = staggerOffset,
  ...rest
}: AnimatedListProps<T>) {
  const animatedRenderItem: ListRenderItem<T> = useCallback(
    (info) => {
      return (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'timing',
            duration: 300,
            delay: info.index * staggerDelay,
          }}
        >
          {renderItem(info)}
        </MotiView>
      );
    },
    [renderItem, staggerDelay],
  );

  return (
    <FlatList
      {...rest}
      renderItem={animatedRenderItem}
      style={[styles.list, rest.style]}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
