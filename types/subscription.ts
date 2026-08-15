export type SubscriptionCategory = 'telecom' | 'streaming' | 'utility' | 'finance' | 'other';

export type SubscriptionStatus = 'active' | 'due_soon' | 'overdue';

export type BillingCycle =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | '28_days'
  | '56_days'
  | '84_days';

export interface Subscription {
  id: string;
  name: string;
  category: SubscriptionCategory;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  status: SubscriptionStatus;
  iconColor: string;
  iconLabel: string;
  paymentUrl?: string;
  lastPaidDate?: string;
  isFreeTrial: boolean;
  sharedWithCount: number;
}
