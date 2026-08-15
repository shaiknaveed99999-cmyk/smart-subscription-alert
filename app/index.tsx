import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteSubscription,
  loadSubscriptions,
} from '../utils/storage';
import { generateCategoryChartData } from '../utils/chartData';
import {
  getMonthlyBurnRate,
  getProratedMonthlyCost,
  markAsPaid,
  rollForwardOverdueSubscriptions,
} from '../utils/subscriptions';
import { openPaymentApp } from '../utils/deeplink';
import { scheduleSubscriptionAlert } from '../utils/notifications';
import { CategoryChart } from '../components/CategoryChart';
import { SubscriptionList } from '../components/SubscriptionList';
import { TotalSpendCard } from '../components/TotalSpendCard';
import { Colors, Spacing } from '../constants/theme';
import type { Subscription } from '../types/subscription';

export default function HomeScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscriptions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      await rollForwardOverdueSubscriptions();
      const data = await loadSubscriptions();
      setSubscriptions(data);
    } catch {
      setError('Could not load subscriptions. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSubscriptions();
    }, [refreshSubscriptions]),
  );

  const confirmDelete = useCallback((subscription: Subscription) => {
    const removeSubscription = async () => {
      try {
        setError(null);
        const updatedSubscriptions = await deleteSubscription(subscription.id);
        setSubscriptions(updatedSubscriptions);
      } catch {
        setError('Could not delete the subscription. Please try again.');
      }
    };

    Alert.alert(
      'Delete subscription?',
      `${subscription.name} will be removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void removeSubscription(),
        },
      ],
    );
  }, []);

  const openEditor = useCallback((subscription: Subscription) => {
    router.push({
      pathname: '/edit-subscription',
      params: { id: subscription.id },
    } as Href);
  }, []);

  const payNow = useCallback((subscription: Subscription) => {
    const openPaymentLink = async () => {
      setError(null);
      const didOpen = await openPaymentApp(
        subscription.name,
        subscription.paymentUrl,
      );

      if (!didOpen) {
        setError(
          `No payment app or website could be opened for ${subscription.name}.`,
        );
      }
    };

    void openPaymentLink();
  }, []);

  const recordPayment = useCallback((subscription: Subscription) => {
    const updateSubscription = async () => {
      try {
        setError(null);
        const updatedSubscriptions = await markAsPaid(subscription.id);
        const updatedSubscription = updatedSubscriptions.find(
          ({ id }) => id === subscription.id,
        );

        setSubscriptions(updatedSubscriptions);

        if (updatedSubscription) {
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
              'Payment recorded, but the next alert could not be scheduled.',
              notificationError,
            );
          }
        }
      } catch {
        setError('Could not mark the subscription as paid. Please try again.');
      }
    };

    void updateSubscription();
  }, []);

  const totalSpend = getMonthlyBurnRate(subscriptions);
  const categoryChartData = useMemo(
    () =>
      generateCategoryChartData(
        subscriptions,
        getProratedMonthlyCost,
      ),
    [subscriptions],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <SubscriptionList
        subscriptions={subscriptions}
        onDelete={confirmDelete}
        onEdit={openEditor}
        onPayNow={payNow}
        onMarkPaid={recordPayment}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void refreshSubscriptions(true)}
        header={
          <View style={styles.dashboardHeader}>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <Text style={styles.brand}>Smart Subscription Alert</Text>
                <Pressable
                  accessibilityLabel="Settings"
                  accessibilityRole="button"
                  onPress={() => router.push('/support' as Href)}
                  style={({ pressed }) => [
                    styles.settingsButton,
                    pressed && styles.settingsButtonPressed,
                  ]}
                >
                  <Text style={styles.settingsIcon}>⚙</Text>
                </Pressable>
              </View>
              <Text style={styles.subheading}>
                Track renewals and monthly spend across telecom, utilities, and
                payments.
              </Text>
            </View>

            {!loading ? (
              <>
                <TotalSpendCard
                  total={totalSpend}
                  activeCount={subscriptions.length}
                />
                <CategoryChart data={categoryChartData} />
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
      />

      <Pressable
        accessibilityLabel="Add subscription"
        accessibilityRole="button"
        onPress={() => router.push('/add-subscription')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dashboardHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  brand: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1.1,
    lineHeight: 38,
    marginBottom: Spacing.sm,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsButtonPressed: {
    opacity: 0.75,
  },
  settingsIcon: {
    color: Colors.textPrimary,
    fontSize: 20,
    lineHeight: 22,
  },
  subheading: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: 320,
  },
  error: {
    marginTop: Spacing.md,
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.accentDeep,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '400',
  },
});
