import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppRegistry } from 'react-native';

import { Colors } from '../constants/theme';
import { requestNotificationPermissions } from '../utils/notifications';

AppRegistry.registerHeadlessTask(
  'BankSmsBackground',
  () => require('../utils/backgroundTask').default,
);

export default function RootLayout() {
  useEffect(() => {
    void requestNotificationPermissions();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="add-subscription"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'New subscription',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="edit-subscription"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Edit subscription',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="support"
          options={{
            headerShown: true,
            title: 'Support',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="passbook-test"
          options={{
            headerShown: true,
            title: 'Passbook debug',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />
      </Stack>
    </>
  );
}
