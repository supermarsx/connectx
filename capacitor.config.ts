import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.connectx.app',
  appName: 'ConnectX',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FAF7FB',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FAF7FB',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
