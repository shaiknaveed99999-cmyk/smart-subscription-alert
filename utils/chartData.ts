import type {
  BillingCycle,
  Subscription,
} from '../types/subscription';
import { categoryLabel } from './format';

type ProratedMonthlyCostCalculator = (
  cost: number,
  billingCycle: BillingCycle,
  sharedWithCount?: number,
) => number;

export type CategoryChartDatum = {
  value: number;
  color: string;
  text: string;
  category: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  telecom: '#3B82F6',
  utility: '#F59E0B',
  utilities: '#F59E0B',
  streaming: '#8B5CF6',
  entertainment: '#EC4899',
  finance: '#14B8A6',
  other: '#94A3B8',
};

const FALLBACK_CATEGORY_COLOR = CATEGORY_COLORS.other;

export function generateCategoryChartData(
  subscriptions: Subscription[],
  getProratedMonthlyCost: ProratedMonthlyCostCalculator,
): CategoryChartDatum[] {
  const totalsByCategory = new Map<string, number>();

  subscriptions.forEach((subscription) => {
    const category = subscription.category?.toLowerCase() || 'other';
    const monthlyCost = getProratedMonthlyCost(
      subscription.amount,
      subscription.billingCycle ?? 'monthly',
      subscription.sharedWithCount ?? 1,
    );

    totalsByCategory.set(
      category,
      (totalsByCategory.get(category) ?? 0) + monthlyCost,
    );
  });

  const totalMonthlyCost = Array.from(totalsByCategory.values()).reduce(
    (total, categoryTotal) => total + categoryTotal,
    0,
  );

  if (totalMonthlyCost <= 0) {
    return [];
  }

  return Array.from(totalsByCategory, ([category, value]) => ({
    value,
    color: CATEGORY_COLORS[category] ?? FALLBACK_CATEGORY_COLOR,
    text: `${Math.round((value / totalMonthlyCost) * 100)}%`,
    category: categoryLabel(category),
  })).sort((first, second) => second.value - first.value);
}
