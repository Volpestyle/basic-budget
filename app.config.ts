import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'basic budget',
  slug: 'basic-budget',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#09090B',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.basicbudget.app',
    infoPlist: {
      NSFaceIDUsageDescription: 'Unlock basic budget with Face ID',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#09090B',
    },
    package: 'com.basicbudget.app',
    edgeToEdgeEnabled: true,
  },
  plugins: [
    'expo-font',
    'expo-secure-store',
    'expo-local-authentication',
    'expo-sqlite',
  ],
  experiments: {
    typedRoutes: false,
  },
});
