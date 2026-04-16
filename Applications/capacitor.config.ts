import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studyflow.app',
  appName: 'StudyFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SocialLogin: {
      google: {
        webClientId: '912149378367-bcfpe80oogfmpbb16skohkv0f2be2rpk.apps.googleusercontent.com',
        iosClientId: '912149378367-2tjp261l82vh5etjisk6vasrljreavbf.apps.googleusercontent.com',
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
