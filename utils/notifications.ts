import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SUBSCRIPTION_ALERTS_CHANNEL_ID = 'subscription-alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function configureAndroidNotificationChannel(): Promise<void> {
  const supportsNotificationChannels =
    Platform.OS === 'android' &&
    (Device.platformApiLevel === null || Device.platformApiLevel >= 26);

  if (!supportsNotificationChannels) {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    SUBSCRIPTION_ALERTS_CHANNEL_ID,
    {
      name: 'Subscription alerts',
      description: 'Reminders for upcoming subscription and bill due dates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1F6B4A',
      sound: 'default',
    },
  );
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notification permissions require a physical device.');
    return false;
  }

  try {
    // Android 13 does not show the permission prompt until a channel exists.
    await configureAndroidNotificationChannel();

    const currentPermissions = await Notifications.getPermissionsAsync();

    if (currentPermissions.status === 'granted') {
      return true;
    }

    const requestedPermissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    if (requestedPermissions.status !== 'granted') {
      console.log('Notification permission was not granted.');
      return false;
    }

    return true;
  } catch (error: unknown) {
    console.log('Failed to request notification permissions.', error);
    return false;
  }
}

export function getSubscriptionAlertIdentifier(
  subscriptionId: string,
): string {
  return `subscription-alert-${subscriptionId}`;
}

export async function scheduleSubscriptionAlert(
  name: string,
  dueDate: string,
  cost: string | number,
  subscriptionId?: string,
  isFreeTrial = false,
): Promise<string | null> {
  await configureAndroidNotificationChannel();
  const notificationId = subscriptionId
    ? getSubscriptionAlertIdentifier(subscriptionId)
    : undefined;

  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  const parsedDueDate = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(parsedDueDate.getTime())) {
    console.log('Cannot schedule an alert for an invalid due date.');
    return null;
  }

  const daysBeforeDue = isFreeTrial ? 2 : 1;
  const alertDate = new Date(parsedDueDate);
  alertDate.setDate(alertDate.getDate() - daysBeforeDue);
  alertDate.setHours(10, 0, 0, 0);

  if (alertDate.getTime() <= Date.now()) {
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.status !== 'granted') {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    identifier: notificationId,
    content: {
      title: isFreeTrial
        ? 'Cancel Before Charge 🔔'
        : 'Bill Due Tomorrow! 🔔',
      body: isFreeTrial
        ? `Your ${name} free trial for ₹${cost} charges in 2 days.`
        : `Your ${name} subscription for ₹${cost} is due tomorrow.`,
      data: subscriptionId ? { subscriptionId, isFreeTrial } : undefined,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alertDate,
      channelId:
        Platform.OS === 'android'
          ? SUBSCRIPTION_ALERTS_CHANNEL_ID
          : undefined,
    },
  });
}
