import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.unitedconnect.app',
  appName: 'U Connect',
  webDir: 'build',
  ios: {
    contentInset: 'never',
    backgroundColor: '#FFFFFF'
  },
  android: {
    backgroundColor: '#FFFFFF'
  },
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#FFFFFF',
      launchAutoHide: true,
      androidScaleType: 'CENTER_INSIDE'
    }
  }
};

export default config;
