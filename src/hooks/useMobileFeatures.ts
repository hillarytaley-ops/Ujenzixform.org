import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';

export const useMobileFeatures = () => {
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);

  useEffect(() => {
    initializeMobileFeatures();
  }, []);

  const initializeMobileFeatures = async () => {
    try {
      // Check if running in native app
      const appInfo = await App.getInfo();
      setIsNativeApp(appInfo.name !== 'CapacitorWebView');

      // Network monitoring
      const status = await Network.getStatus();
      setNetworkStatus(status);

      Network.addListener('networkStatusChange', status => {
        setNetworkStatus(status);
      });

      // Initialize push notifications
      if (appInfo.name !== 'CapacitorWebView') {
        await initializePushNotifications();
      }

      // Get current location
      await getCurrentLocation();

    } catch (error) {
      console.error('Mobile features initialization failed:', error);
    }
  };

  const initializePushNotifications = async () => {
    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
      }

      await PushNotifications.register();
      setPushEnabled(true);

      // Handle registration success
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
      });

      // Handle registration error
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      // Handle push notification received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });

      // Handle push notification tapped
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      });

    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const permissions = await Geolocation.checkPermissions();
      
      if (permissions.location !== 'granted') {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== 'granted') {
          throw new Error('Location permission not granted');
        }
      }

      const position = await Geolocation.getCurrentPosition();
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

    } catch (error) {
      console.error('Location access failed:', error);
    }
  };

  const sendPushNotification = async (title: string, body: string, data?: any) => {
    if (!pushEnabled) return;

    try {
      // This would typically be sent from your backend
      // For demo purposes, we'll just log
      console.log('Push notification would be sent:', { title, body, data });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  };

  const shareContent = async (text: string, url?: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'UjenziPro',
          text,
          url
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${text} ${url || ''}`);
        console.log('Content copied to clipboard');
      }
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    isNativeApp,
    networkStatus,
    pushEnabled,
    location,
    sendPushNotification,
    shareContent,
    vibrate,
    getCurrentLocation
  };
};