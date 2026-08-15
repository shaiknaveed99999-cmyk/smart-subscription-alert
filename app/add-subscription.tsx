import { router } from 'expo-router';

import { SubscriptionForm } from '../components/SubscriptionForm';
import { scheduleSubscriptionAlert } from '../utils/notifications';
import { addSubscription } from '../utils/storage';

export default function AddSubscriptionScreen() {
  return (
    <SubscriptionForm
      title="Add subscription"
      subtitle="Add a recurring service to keep your monthly total up to date."
      submitLabel="Save subscription"
      onSubmit={async (values) => {
        const subscription = await addSubscription(values);

        try {
          await scheduleSubscriptionAlert(
            subscription.name,
            subscription.nextBillingDate,
            subscription.amount,
            subscription.id,
            subscription.isFreeTrial,
          );
        } catch (notificationError: unknown) {
          console.warn(
            'Subscription saved, but its alert could not be scheduled.',
            notificationError,
          );
        }

        router.back();
      }}
    />
  );
}
