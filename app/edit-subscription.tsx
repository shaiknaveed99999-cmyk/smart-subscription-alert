import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubscriptionForm } from '../components/SubscriptionForm';
import { Colors, Spacing } from '../constants/theme';
import type { Subscription } from '../types/subscription';
import { scheduleSubscriptionAlert } from '../utils/notifications';
import { loadSubscriptions, updateSubscription } from '../utils/storage';

function getSubscriptionId(id: string | string[] | undefined): string | null {
  if (typeof id === 'string' && id.length > 0) {
    return id;
  }

  if (Array.isArray(id) && id[0]) {
    return id[0];
  }

  return null;
}

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = getSubscriptionId(id);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubscription = async () => {
      if (!subscriptionId) {
        setLoadError('This subscription could not be found.');
        setLoading(false);
        return;
      }

      try {
        const subscriptions = await loadSubscriptions();
        const matchedSubscription = subscriptions.find(
          ({ id: storedId }) => storedId === subscriptionId,
        );

        if (!matchedSubscription) {
          setLoadError('This subscription could not be found.');
          return;
        }

        setSubscription(matchedSubscription);
      } catch {
        setLoadError('Could not load the subscription. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadSubscription();
  }, [subscriptionId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!subscription || loadError) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.error}>
            {loadError ?? 'This subscription could not be found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SubscriptionForm
      title="Edit subscription"
      subtitle="Update this recurring service and keep your dashboard in sync."
      submitLabel="Save changes"
      initialValues={{
        name: subscription.name,
        amount: String(subscription.amount),
        nextBillingDate: subscription.nextBillingDate,
        billingCycle: subscription.billingCycle,
        category: subscription.category,
        paymentUrl: subscription.paymentUrl ?? '',
        isFreeTrial: subscription.isFreeTrial,
        sharedWithCount: String(subscription.sharedWithCount ?? 1),
      }}
      onSubmit={async (values) => {
        const updatedSubscription = await updateSubscription(
          subscription.id,
          values,
        );

        try {
          await scheduleSubscriptionAlert(
            updatedSubscription.name,
            updatedSubscription.nextBillingDate,
            updatedSubscription.amount,
            updatedSubscription.id,
            updatedSubscription.isFreeTrial,
          );
        } catch (notificationError: unknown) {
          console.warn(
            'Subscription updated, but its alert could not be scheduled.',
            notificationError,
          );
        }

        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  error: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
