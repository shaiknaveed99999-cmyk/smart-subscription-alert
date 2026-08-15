import type {
  BillingCycle,
  SubscriptionCategory,
} from '../types/subscription';

export type SubscriptionTemplate = {
  name: string;
  cost: string;
  category: SubscriptionCategory;
  cycle: BillingCycle;
};

export const SUBSCRIPTION_TEMPLATES: ReadonlyArray<SubscriptionTemplate> = [
  {
    name: 'Swiggy One',
    cost: '149',
    category: 'other',
    cycle: 'quarterly',
  },
  {
    name: 'Hotstar',
    cost: '899',
    category: 'streaming',
    cycle: 'yearly',
  },
  {
    name: 'Jio',
    cost: '299',
    category: 'telecom',
    cycle: '28_days',
  },
  {
    name: 'Airtel',
    cost: '299',
    category: 'telecom',
    cycle: '28_days',
  },
  {
    name: 'Amazon Prime',
    cost: '1499',
    category: 'streaming',
    cycle: 'yearly',
  },
  {
    name: 'Netflix',
    cost: '649',
    category: 'streaming',
    cycle: 'monthly',
  },
  {
    name: 'Spotify',
    cost: '119',
    category: 'streaming',
    cycle: 'monthly',
  },
  {
    name: 'YouTube Premium',
    cost: '129',
    category: 'streaming',
    cycle: 'monthly',
  },
];
