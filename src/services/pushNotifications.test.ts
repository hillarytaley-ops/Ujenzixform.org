import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPushSupported,
  requestNotificationPermission,
  showLocalNotification,
  getNotificationPreferences,
  setNotificationPreferences,
  NotificationPreferences
} from './pushNotifications';

describe('pushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('isPushSupported', () => {
    it('returns true when all APIs are available', () => {
      // Our test setup mocks these
      expect(isPushSupported()).toBe(true);
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns permission status', async () => {
      const permission = await requestNotificationPermission();
      expect(permission).toBe('granted');
    });

    it('returns denied when push is not supported', async () => {
      // Temporarily remove Notification
      const originalNotification = window.Notification;
      // @ts-expect-error - intentionally setting to undefined for test
      window.Notification = undefined;
      
      const permission = await requestNotificationPermission();
      expect(permission).toBe('denied');
      
      // Restore
      window.Notification = originalNotification;
    });
  });

  describe('showLocalNotification', () => {
    it('shows notification with correct options', async () => {
      const mockShowNotification = vi.fn();
      
      // Mock service worker registration
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            showNotification: mockShowNotification,
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        configurable: true,
      });

      await showLocalNotification({
        title: 'Test Title',
        body: 'Test body message',
        tag: 'test-tag',
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Test Title',
        expect.objectContaining({
          body: 'Test body message',
          tag: 'test-tag',
        })
      );
    });
  });

  describe('getNotificationPreferences', () => {
    it('returns default preferences when none stored', () => {
      const prefs = getNotificationPreferences();
      
      expect(prefs).toEqual({
        enabled: true,
        scanEvents: true,
        orderUpdates: true,
        systemAlerts: true,
      });
    });

    it('returns stored preferences', () => {
      const storedPrefs: NotificationPreferences = {
        enabled: false,
        scanEvents: false,
        orderUpdates: true,
        systemAlerts: false,
      };
      
      localStorage.setItem('notification_preferences', JSON.stringify(storedPrefs));
      
      // Need to mock getItem to return our value
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(storedPrefs));
      
      const prefs = getNotificationPreferences();
      expect(prefs).toEqual(storedPrefs);
    });
  });

  describe('setNotificationPreferences', () => {
    it('stores preferences in localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      
      setNotificationPreferences({ enabled: false });
      
      expect(setItemSpy).toHaveBeenCalledWith(
        'notification_preferences',
        expect.stringContaining('"enabled":false')
      );
    });

    it('merges with existing preferences', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      
      setNotificationPreferences({ scanEvents: false });
      
      // Should still have other defaults
      expect(setItemSpy).toHaveBeenCalledWith(
        'notification_preferences',
        expect.stringContaining('"orderUpdates":true')
      );
    });
  });
});

