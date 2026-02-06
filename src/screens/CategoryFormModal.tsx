import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../theme/ThemeProvider';
import { SegmentedControl } from '../components/SegmentedControl';
import { ActionButton } from '../components/ActionButton';
import { CategoryIcon } from '../components/CategoryIcon';
import type { RootStackParamList } from '../app/AppNavigator';
import type { CategoryKind } from '../types/domain';
import { useAppStore } from '../state/store';

type EditRoute = RouteProp<RootStackParamList, 'EditCategory'>;

const ICON_OPTIONS = [
  { key: 'cart', label: 'Groceries' },
  { key: 'home', label: 'Home' },
  { key: 'car', label: 'Transport' },
  { key: 'food', label: 'Dining' },
  { key: 'coffee', label: 'Coffee' },
  { key: 'movie', label: 'Entertainment' },
  { key: 'gym', label: 'Fitness' },
  { key: 'health', label: 'Health' },
  { key: 'phone', label: 'Phone' },
  { key: 'power', label: 'Utilities' },
  { key: 'shirt', label: 'Shopping' },
  { key: 'card', label: 'Subscriptions' },
  { key: 'dollar', label: 'Bills' },
  { key: 'gift', label: 'Gifts' },
  { key: 'plane', label: 'Travel' },
  { key: 'book', label: 'Education' },
  { key: 'music', label: 'Music' },
  { key: 'game', label: 'Gaming' },
  { key: 'pet', label: 'Pets' },
  { key: 'pig', label: 'Savings' },
];

const DEFAULT_COLOR = '#34D399';

const COLOR_OPTIONS = [
  DEFAULT_COLOR, '#00E5A0', '#2DD4BF', '#38BDF8',
  '#60A5FA', '#818CF8', '#A78BFA', '#C084FC',
  '#F472B6', '#FB923C', '#FBBF24', '#F87171',
  '#A3876A', '#6EE7B7', '#67E8F9', '#FDE68A',
];

const KIND_OPTIONS: { label: string; value: CategoryKind }[] = [
  { label: 'Need', value: 'need' },
  { label: 'Want', value: 'want' },
];

interface CategoryFormModalProps {
  isEdit?: boolean;
}

export function CategoryFormModal({ isEdit = false }: CategoryFormModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<EditRoute>();
  const categoryId = isEdit ? route.params?.categoryId : undefined;

  const categories = useAppStore((state) => state.categories);
  const loadCategories = useAppStore((state) => state.loadCategories);
  const createCategory = useAppStore((state) => state.createCategory);
  const updateCategory = useAppStore((state) => state.updateCategory);

  const existing = isEdit && categoryId ? categories.find((category) => category.id === categoryId) ?? null : null;

  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('need');
  const [selectedIcon, setSelectedIcon] = useState('cart');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      void loadCategories();
    }
  }, [categories.length, loadCategories]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setKind(existing.kind);
      setSelectedIcon(existing.icon);
      setSelectedColor(existing.color);
      return;
    }

    if (!isEdit) {
      setName('');
      setKind('need');
      setSelectedIcon('cart');
      setSelectedColor(DEFAULT_COLOR);
    }
  }, [existing, isEdit]);

  const canSave = name.trim().length > 0;
  const screenTitle = isEdit ? 'Edit Category' : 'New Category';

  const handleSave = useCallback(async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);

    try {
      if (isEdit && categoryId) {
        await updateCategory(categoryId, {
          name: name.trim(),
          kind,
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        await createCategory({
          name: name.trim(),
          kind,
          icon: selectedIcon,
          color: selectedColor,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }, [canSave, categoryId, createCategory, isEdit, kind, name, navigation, selectedColor, selectedIcon, updateCategory]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bgElevated }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.cancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{screenTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 120 }}
          style={styles.previewSection}
        >
          <CategoryIcon icon={selectedIcon} color={selectedColor} size={64} />
          <Text
            style={[
              styles.previewName,
              { color: name ? theme.colors.textPrimary : theme.colors.textMuted },
            ]}
          >
            {name || 'Category Name'}
          </Text>
          <View
            style={[
              styles.previewKindBadge,
              { backgroundColor: kind === 'need' ? theme.colors.infoDim : theme.colors.warningDim },
            ]}
          >
            <Text
              style={[
                styles.previewKindText,
                { color: kind === 'need' ? theme.colors.info : theme.colors.warning },
              ]}
            >
              {kind === 'need' ? 'NEED' : 'WANT'}
            </Text>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 50 }}
        >
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>NAME</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderDefault,
                backgroundColor: theme.colors.bgSurface,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Groceries"
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={theme.colors.accent}
            autoFocus={!isEdit}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 100 }}
        >
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>TYPE</Text>
          <SegmentedControl options={KIND_OPTIONS} selected={kind} onChange={setKind} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 150 }}
        >
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>ICON</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((opt) => {
              const isSelected = selectedIcon === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.iconCell,
                    {
                      backgroundColor: isSelected ? `${selectedColor}20` : theme.colors.bgSurface,
                      borderColor: isSelected ? selectedColor : theme.colors.borderDefault,
                    },
                  ]}
                  onPress={() => {
                    setSelectedIcon(opt.key);
                    Haptics.selectionAsync();
                  }}
                >
                  <CategoryIcon icon={opt.key} color={isSelected ? selectedColor : theme.colors.textMuted} size={32} />
                  <Text
                    style={[
                      styles.iconLabel,
                      { color: isSelected ? selectedColor : theme.colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
        >
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>COLOR</Text>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map((color) => {
              const isSelected = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  style={[
                    styles.colorCell,
                    {
                      backgroundColor: color,
                      borderColor: isSelected ? theme.colors.textPrimary : 'transparent',
                      transform: [{ scale: isSelected ? 1.15 : 1 }],
                    },
                  ]}
                  onPress={() => {
                    setSelectedColor(color);
                    Haptics.selectionAsync();
                  }}
                >
                  {isSelected && (
                    <Text style={styles.colorCheck}>{'\u2713'}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 250 }}
          style={styles.buttonSection}
        >
          <ActionButton
            label={isEdit ? 'Save Changes' : 'Create Category'}
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
          />
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function CreateCategoryModal() {
  return <CategoryFormModal isEdit={false} />;
}

export function EditCategoryModal() {
  return <CategoryFormModal isEdit />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cancel: {
    fontSize: 15,
    minWidth: 50,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    minWidth: 50,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '600',
  },
  previewKindBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  previewKindText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 18,
  },
  textInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCell: {
    width: '31%',
    minWidth: 96,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  iconLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  colorCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonSection: {
    marginTop: 28,
  },
});
