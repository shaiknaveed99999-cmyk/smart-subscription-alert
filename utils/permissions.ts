import { Alert, Linking, Platform } from 'react-native';

export async function requestNotificationListenerPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    Alert.alert(
      'Android only',
      'Notification listener access is granted in Android system settings.',
    );
    return false;
  }

  try {
    await Linking.sendIntent(
      'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS',
    );
    return true;
  } catch (error: unknown) {
    console.warn('Could not open notification listener settings.', error);
    Alert.alert(
      'Could not open settings',
      'Open Settings → Apps → Special app access → Notification access, then enable Smart Subscription Alert.',
    );
    return false;
  }
}
