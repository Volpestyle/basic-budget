import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '../theme/ThemeProvider';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AddTransactionModal } from '../screens/AddTransactionModal';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';
import { CreateCategoryModal, EditCategoryModal } from '../screens/CategoryFormModal';
import { BudgetAllocationScreen } from '../screens/BudgetAllocationScreen';
import { OnboardingFlow } from '../screens/onboarding/OnboardingFlow';
import type { OnboardingResult } from '../screens/onboarding/OnboardingFlow';
import { TabBarIcon } from '../components/TabBarIcon';
import { useAppStore, useAppStoreStatus } from '../state/store';

export type RootStackParamList = {
  Main: undefined;
  AddTransaction: undefined;
  CategoryDetail: { categoryId: string };
  CreateCategory: undefined;
  EditCategory: { categoryId: string };
  BudgetAllocation: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Categories: undefined;
  Transactions: undefined;
  Insights: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBg,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 0.5,
          height: 80,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: theme.fontSizes.xs,
          fontWeight: theme.fontWeights.medium,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="grid" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="layers" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="list" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="bar-chart" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const useNavigationTheme = () => {
  const theme = useTheme();
  return {
    dark: theme.isDark,
    colors: {
      primary: theme.colors.accent,
      background: theme.colors.bgPrimary,
      card: theme.colors.bgSurface,
      text: theme.colors.textPrimary,
      border: theme.colors.borderDefault,
      notification: theme.colors.danger,
    },
    fonts: {
      regular: { fontFamily: theme.fonts.system ?? 'System', fontWeight: '400' as const },
      medium: { fontFamily: theme.fonts.system ?? 'System', fontWeight: '500' as const },
      bold: { fontFamily: theme.fonts.system ?? 'System', fontWeight: '700' as const },
      heavy: { fontFamily: theme.fonts.system ?? 'System', fontWeight: '900' as const },
    },
  };
};

export function AppNavigator() {
  const theme = useTheme();
  const navTheme = useNavigationTheme();
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);
  const bootstrapApp = useAppStore((state) => state.bootstrapApp);
  const completeOnboardingData = useAppStore((state) => state.completeOnboardingData);
  const { initialized, initializationError } = useAppStoreStatus();

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  const handleOnboardingComplete = useCallback(
    async (result: OnboardingResult) => {
      await completeOnboardingData(result);
    },
    [completeOnboardingData],
  );

  if (!initialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bgPrimary }]}> 
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Bootstrapping app data...</Text>
        {initializationError ? (
          <View style={styles.errorWrap}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{initializationError}</Text>
            <Pressable
              onPress={() => {
                void bootstrapApp();
              }}
              style={[styles.retryButton, { borderColor: theme.colors.borderDefault }]}
            >
              <Text style={[styles.retryText, { color: theme.colors.textPrimary }]}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  if (!onboardingComplete) {
    return (
      <NavigationContainer theme={navTheme}>
        <OnboardingFlow onComplete={(result) => { void handleOnboardingComplete(result); }} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionModal}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="CategoryDetail"
          component={CategoryDetailScreen}
          options={{
            animation: 'default',
          }}
        />
        <Stack.Screen
          name="CreateCategory"
          component={CreateCategoryModal}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="EditCategory"
          component={EditCategoryModal}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="BudgetAllocation"
          component={BudgetAllocationScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorWrap: {
    marginTop: 16,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
