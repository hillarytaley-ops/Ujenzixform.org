import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.ke.ujenzipro.app',
  appName: 'UjenziPro',
  webDir: 'dist',
  server: {
    url: "http://localhost:8080",
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Geolocation: {
      permissions: {
        location: "when-in-use"
      }
    }
  }
};

export default config;