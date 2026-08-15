const { withAndroidManifest } = require('@expo/config-plugins');

function withNotificationService(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];

    if (!application.service) {
      application.service = [];
    }

    const alreadyRegistered = application.service.some(
      (service) =>
        service.$?.['android:name'] ===
        'expo.modules.banksms.BankSmsNotificationListener',
    );

    if (!alreadyRegistered) {
      application.service.push({
        $: {
          'android:name':
            'expo.modules.banksms.BankSmsNotificationListener',
          'android:permission':
            'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name':
                    'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    const headlessRegistered = application.service.some(
      (service) =>
        service.$?.['android:name'] ===
        'expo.modules.banksms.BankSmsHeadlessTaskService',
    );

    if (!headlessRegistered) {
      application.service.push({
        $: {
          'android:name':
            'expo.modules.banksms.BankSmsHeadlessTaskService',
          'android:exported': 'false',
        },
      });
    }

    return config;
  });
}

module.exports = withNotificationService;
