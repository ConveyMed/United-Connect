import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.unitedconnect.app',
  appName: 'United Connect',
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
      backgroundColor: '#01040F',
      launchAutoHide: true,
      androidScaleType: 'CENTER_INSIDE'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
