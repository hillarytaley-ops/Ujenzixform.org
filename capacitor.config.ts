import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mradipro.app',
  appName: 'MradiPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // For development, uncomment to use live server
    // url: 'http://localhost:5173',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e40af',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1e40af'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#1e40af'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    App: {
      // Deep linking configuration
      // URL scheme: mradipro://
    },
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Override user agent for API calls
    // overrideUserAgent: 'MradiPro/1.0'
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
    // limitsNavigationsToAppBoundDomains: true
  }
};

export default config;
