import type {
  Subscription,
  SubscriptionStatus,
} from '../types/subscription';

function getStartOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysUntilDueDate(
  nextBillingDate: string,
  now: Date = new Date(),
): number {
  const dueDate = new Date(`${nextBillingDate}T00:00:00`);
  const startOfDueDate = getStartOfLocalDay(dueDate);
  const startOfToday = getStartOfLocalDay(now);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (startOfDueDate.getTime() - startOfToday.getTime()) / millisecondsPerDay,
  );
}

export function computeSubscriptionStatus(
  nextBillingDate: string,
  now: Date = new Date(),
): SubscriptionStatus {
  const daysUntilDue = getDaysUntilDueDate(nextBillingDate, now);

  if (daysUntilDue < 0) {
    return 'overdue';
  }

  if (daysUntilDue <= 3) {
    return 'due_soon';
  }

  return 'active';
}

export function withComputedStatus(
  subscription: Subscription,
  now: Date = new Date(),
): Subscription {
  return {
    ...subscription,
    status: computeSubscriptionStatus(subscription.nextBillingDate, now),
  };
}
