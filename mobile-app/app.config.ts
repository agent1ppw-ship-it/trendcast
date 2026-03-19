import type { ExpoConfig } from 'expo/config';

const version = '0.1.0';
const iosBuildNumber = process.env.APP_IOS_BUILD_NUMBER || '1';
const androidVersionCode = Number(process.env.APP_ANDROID_VERSION_CODE || '1');
const bundleIdentifier = process.env.APP_IOS_BUNDLE_IDENTIFIER || 'io.trendcast.mobile';
const androidPackage = process.env.APP_ANDROID_PACKAGE || 'io.trendcast.mobile';
const scheme = process.env.APP_SCHEME || 'trendcast';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://trendcast.io';
const easProjectId = process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: 'Trendcast Mobile',
  slug: 'trendcast-mobile',
  version,
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  scheme,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#050b14',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier,
    buildNumber: iosBuildNumber,
    usesAppleSignIn: true,
    icon: './assets/icon.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: androidPackage,
    versionCode: androidVersionCode,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#050b14',
    },
  },
  web: {
    bundler: 'metro',
  },
  extra: {
    apiBaseUrl,
    eas: easProjectId ? { projectId: easProjectId } : undefined,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  plugins: ['expo-asset', 'expo-apple-authentication'],
};

export default config;
