import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studyflow.app',
  appName: 'StudyFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SocialLogin: {
      google: {
        webClientId: '912149378367-bcfpe80oogfmpbb16skohkv0f2be2rpk.apps.googleusercontent.com',
      },
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f0f23',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#1a1a2e',
      style: 'LIGHT',
    },
  },
};

export default config;
