import type {
  BillingCycle,
  Subscription,
} from '../types/subscription';
import { categoryLabel } from './format';
import { computeSubscriptionStatus } from './status';
import {
  loadSubscriptions,
  saveSubscriptions,
} from './storage';

export type SubscriptionSection = {
  title: string;
  data: Subscription[];
};

export function getProratedMonthlyCost(
  cost: number,
  billingCycle: BillingCycle,
  sharedWithCount = 1,
): number {
  const splitCount =
    Number.isFinite(sharedWithCount) && sharedWithCount > 0
      ? sharedWithCount
      : 1;
  let proratedCost: number;

  switch (billingCycle) {
    case 'weekly':
      proratedCost = (cost * 52) / 12;
      break;
    case 'monthly':
      proratedCost = cost;
      break;
    case 'quarterly':
      proratedCost = cost / 3;
      break;
    case 'yearly':
      proratedCost = cost / 12;
      break;
    default: {
      const exhaustiveCycle: never = billingCycle;
      throw new Error(`Unhandled billing cycle: ${exhaustiveCycle}`);
    }
  }

  return proratedCost / splitCount;
}

export function getMonthlyBurnRate(
  subscriptions: Subscription[],
): number {
  return subscriptions.reduce(
    (total, subscription) =>
      total +
      getProratedMonthlyCost(
        subscription.amount,
        subscription.billingCycle ?? 'monthly',
        subscription.sharedWithCount ?? 1,
      ),
    0,
  );
}

function addMonthsToIsoDate(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));

  date.setUTCMonth(date.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDayOfTargetMonth));

  return date.toISOString().slice(0, 10);
}

function getNextDueDate(
  currentDueDate: string,
  billingCycle: BillingCycle,
): string {
  switch (billingCycle) {
    case 'weekly': {
      const date = new Date(`${currentDueDate}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + 7);
      return date.toISOString().slice(0, 10);
    }
    case 'monthly':
      return addMonthsToIsoDate(currentDueDate, 1);
    case 'quarterly':
      return addMonthsToIsoDate(currentDueDate, 3);
    case 'yearly':
      return addMonthsToIsoDate(currentDueDate, 12);
    default: {
      const exhaustiveCycle: never = billingCycle;
      throw new Error(`Unhandled billing cycle: ${exhaustiveCycle}`);
    }
  }
}

function getTodayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const MAX_CYCLE_ROLLOVERS = 240;

export function rollForwardDueDate(
  currentDueDate: string,
  billingCycle: BillingCycle,
  now: Date = new Date(),
): string {
  const todayIsoDate = getTodayIsoDate(now);
  let nextBillingDate = currentDueDate;
  let rollovers = 0;

  while (nextBillingDate < todayIsoDate && rollovers < MAX_CYCLE_ROLLOVERS) {
    nextBillingDate = getNextDueDate(nextBillingDate, billingCycle);
    rollovers += 1;
  }

  return nextBillingDate;
}

export async function rollForwardOverdueSubscriptions(
  now: Date = new Date(),
): Promise<Subscription[]> {
  const subscriptions = await loadSubscriptions();
  let didChange = false;
  const updatedSubscriptions = subscriptions.map((subscription) => {
    const billingCycle = subscription.billingCycle ?? 'monthly';
    const nextBillingDate = rollForwardDueDate(
      subscription.nextBillingDate,
      billingCycle,
      now,
    );

    if (nextBillingDate === subscription.nextBillingDate) {
      return subscription;
    }

    didChange = true;
    return {
      ...subscription,
      billingCycle,
      nextBillingDate,
      status: computeSubscriptionStatus(nextBillingDate, now),
    };
  });

  if (didChange) {
    await saveSubscriptions(updatedSubscriptions);
  }

  return updatedSubscriptions;
}

export async function markAsPaid(
  subscriptionId: string,
): Promise<Subscription[]> {
  const subscriptions = await loadSubscriptions();
  let subscriptionFound = false;
  const updatedSubscriptions = subscriptions.map((subscription) => {
    if (subscription.id !== subscriptionId) {
      return subscription;
    }

    subscriptionFound = true;
    const billingCycle = subscription.billingCycle ?? 'monthly';

    const nextBillingDate = getNextDueDate(
      subscription.nextBillingDate,
      billingCycle,
    );

    return {
      ...subscription,
      billingCycle,
      lastPaidDate: getTodayIsoDate(),
      nextBillingDate,
      status: computeSubscriptionStatus(nextBillingDate),
    };
  });

  if (!subscriptionFound) {
    throw new Error('Subscription not found.');
  }

  await saveSubscriptions(updatedSubscriptions);
  return updatedSubscriptions;
}

export function groupSubscriptionsByCategory(
  subscriptions: Subscription[],
): SubscriptionSection[] {
  const groupedSubscriptions = new Map<string, Subscription[]>();

  subscriptions.forEach((subscription) => {
    const category = subscription.category || 'other';
    const categorySubscriptions = groupedSubscriptions.get(category) ?? [];

    categorySubscriptions.push(subscription);
    groupedSubscriptions.set(category, categorySubscriptions);
  });

  return Array.from(groupedSubscriptions, ([category, data]) => ({
    title: categoryLabel(category),
    data,
  }));
}
