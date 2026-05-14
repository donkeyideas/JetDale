// ============================================================
// Jetdale — Push Notifications (Mobile)
// Registers for push notifications via expo-notifications,
// saves the token to the profiles table, and provides helpers
// for scheduling local notifications.
// ============================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// ---- Default notification behavior ----
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================
// Register for push notifications
// ============================================================

/**
 * Request notification permissions and return the Expo push token.
 * Returns null if permissions are denied or unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications are not available on web
  if (Platform.OS === 'web') {
    console.log('Push notifications are not supported on web');
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5B1F',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

// ============================================================
// Save push token to user profile
// ============================================================

/**
 * Persist the push token in the profiles table so the backend
 * can send targeted push notifications.
 */
export async function savePushToken(
  userId: string,
  token: string,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      push_token: token,
      push_token_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to save push token:', error.message);
  } else {
    console.log('Push token saved for user', userId);
  }
}

// ============================================================
// Schedule local notifications
// ============================================================

/**
 * Schedule a local notification after a delay (in seconds).
 */
export async function scheduleLocalNotification(opts: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  delaySeconds: number;
}): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      data: opts.data ?? {},
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: opts.delaySeconds,
    },
  });
}

/**
 * Schedule a daily reminder at a specific hour (24h format, local time).
 */
export async function scheduleDailyReminder(opts: {
  title: string;
  body: string;
  hour: number;
  minute?: number;
}): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: opts.hour,
      minute: opts.minute ?? 0,
    },
  });
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel a specific scheduled notification by its identifier.
 */
export async function cancelScheduledNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// ============================================================
// Notification listeners (for use in root layout)
// ============================================================

/**
 * Add a listener for when a notification is received while the app is foregrounded.
 */
export function onNotificationReceived(
  callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when the user taps a notification.
 */
export function onNotificationTapped(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
