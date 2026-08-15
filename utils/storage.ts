import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { MOCK_SUBSCRIPTIONS } from '../data/mockSubscriptions';
import type {
  BillingCycle,
  Subscription,
  SubscriptionCategory,
} from '../types/subscription';
import { computeSubscriptionStatus, withComputedStatus } from './status';
import { getSubscriptionAlertIdentifier } from './notifications';
import { isValidIsoDate } from './validation';

const SUBSCRIPTIONS_STORAGE_KEY = '@smart-subscription-alert/subscriptions';

type StoredSubscription = Omit<
  Subscription,
  'billingCycle' | 'isFreeTrial' | 'sharedWithCount'
> & {
  billingCycle?: BillingCycle;
  isFreeTrial?: boolean;
  sharedWithCount?: number;
};

export type NewSubscriptionInput = {
  name: string;
  amount: number;
  nextBillingDate: string;
  category: SubscriptionCategory;
  billingCycle?: BillingCycle;
  paymentUrl?: string;
  isFreeTrial?: boolean;
  sharedWithCount?: number;
};

export async function saveSubscriptions(
  subscriptions: Subscription[],
): Promise<void> {
  await AsyncStorage.setItem(
    SUBSCRIPTIONS_STORAGE_KEY,
    JSON.stringify(subscriptions),
  );
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  const storedSubscriptions = await AsyncStorage.getItem(
    SUBSCRIPTIONS_STORAGE_KEY,
  );

  if (storedSubscriptions === null) {
    const seededSubscriptions = MOCK_SUBSCRIPTIONS.map((subscription) =>
      withComputedStatus(subscription),
    );
    await saveSubscriptions(seededSubscriptions);
    return seededSubscriptions;
  }

  const subscriptions: unknown = JSON.parse(storedSubscriptions);

  if (!Array.isArray(subscriptions)) {
    throw new Error('Stored subscriptions are invalid.');
  }

  const storedSubscriptionsList = subscriptions as StoredSubscription[];
  const requiresMigration = storedSubscriptionsList.some(
    (subscription) =>
      subscription.billingCycle === undefined ||
      subscription.isFreeTrial === undefined ||
      subscription.sharedWithCount === undefined,
  );
  const normalizedSubscriptions: Subscription[] =
    storedSubscriptionsList.map((subscription) =>
      withComputedStatus({
        ...subscription,
        billingCycle: subscription.billingCycle ?? 'monthly',
        isFreeTrial: subscription.isFreeTrial ?? false,
        sharedWithCount: normalizeSharedWithCount(
          subscription.sharedWithCount,
        ),
      }),
    );

  if (requiresMigration) {
    await saveSubscriptions(normalizedSubscriptions);
  }

  return normalizedSubscriptions;
}

function normalizeSharedWithCount(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value < 1) {
    return 1;
  }

  return value;
}

function createIconLabel(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function validateSubscriptionInput(input: NewSubscriptionInput): string {
  const name = input.name.trim();

  if (
    !name ||
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    !isValidIsoDate(input.nextBillingDate)
  ) {
    throw new Error('Subscription details are invalid.');
  }

  return name;
}

export async function addSubscription(
  input: NewSubscriptionInput,
): Promise<Subscription> {
  const subscriptions = await loadSubscriptions();
  const name = validateSubscriptionInput(input);

  const subscription: Subscription = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    amount: input.amount,
    nextBillingDate: input.nextBillingDate,
    category: input.category,
    currency: 'INR',
    billingCycle: input.billingCycle ?? 'monthly',
    paymentUrl: input.paymentUrl?.trim() || undefined,
    isFreeTrial: input.isFreeTrial ?? false,
    sharedWithCount: normalizeSharedWithCount(input.sharedWithCount),
    status: computeSubscriptionStatus(input.nextBillingDate),
    iconColor: '#1F6B4A',
    iconLabel: createIconLabel(name),
  };
  const updatedSubscriptions = [...subscriptions, subscription];

  await saveSubscriptions(updatedSubscriptions);
  return subscription;
}

export async function updateSubscription(
  subscriptionId: string,
  input: NewSubscriptionInput,
): Promise<Subscription> {
  const subscriptions = await loadSubscriptions();
  const name = validateSubscriptionInput(input);
  let updatedSubscription: Subscription | undefined;
  const updatedSubscriptions = subscriptions.map((subscription) => {
    if (subscription.id !== subscriptionId) {
      return subscription;
    }

    updatedSubscription = {
      ...subscription,
      name,
      amount: input.amount,
      nextBillingDate: input.nextBillingDate,
      category: input.category,
      billingCycle: input.billingCycle ?? subscription.billingCycle,
      paymentUrl: input.paymentUrl?.trim() || undefined,
      isFreeTrial: input.isFreeTrial ?? false,
      sharedWithCount: normalizeSharedWithCount(input.sharedWithCount),
      status: computeSubscriptionStatus(input.nextBillingDate),
      iconLabel: createIconLabel(name),
    };

    return updatedSubscription;
  });

  if (!updatedSubscription) {
    throw new Error('Subscription not found.');
  }

  await saveSubscriptions(updatedSubscriptions);
  return updatedSubscription;
}

export async function deleteSubscription(
  subscriptionId: string,
): Promise<Subscription[]> {
  const subscriptions = await loadSubscriptions();
  const updatedSubscriptions = subscriptions.filter(
    (subscription) => subscription.id !== subscriptionId,
  );

  try {
    await Notifications.cancelScheduledNotificationAsync(
      getSubscriptionAlertIdentifier(subscriptionId),
    );
  } catch (notificationError: unknown) {
    console.warn(
      'Subscription deleted, but its alert could not be cancelled.',
      notificationError,
    );
  }

  await saveSubscriptions(updatedSubscriptions);
  return updatedSubscriptions;
}
