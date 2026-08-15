import { Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  BillingCycle,
  Subscription,
} from '../types/subscription';
import { Colors, Radius, Spacing } from '../constants/theme';
import { formatBillingDate, formatCurrency } from '../utils/format';
import { getProratedMonthlyCost } from '../utils/subscriptions';

type SubscriptionRowProps = {
  subscription: Subscription;
  isFirst?: boolean;
  isLast?: boolean;
  onDelete: (subscription: Subscription) => void;
  onEdit: (subscription: Subscription) => void;
  onPayNow: (subscription: Subscription) => void;
  onMarkPaid: (subscription: Subscription) => void;
};

function statusStyles(status: Subscription['status']) {
  switch (status) {
    case 'due_soon':
      return {
        backgroundColor: Colors.warningSoft,
        color: Colors.warning,
        label: 'Due soon',
      };
    case 'overdue':
      return {
        backgroundColor: Colors.dangerSoft,
        color: Colors.danger,
        label: 'Overdue',
      };
    case 'active':
      return {
        backgroundColor: Colors.accentSoft,
        color: Colors.accent,
        label: 'Active',
      };
    default: {
      const exhaustiveStatus: never = status;
      throw new Error(`Unhandled subscription status: ${exhaustiveStatus}`);
    }
  }
}

function billingCycleSuffix(billingCycle: BillingCycle): string {
  switch (billingCycle) {
    case 'weekly':
      return 'wk';
    case 'monthly':
      return 'mo';
    case 'quarterly':
      return 'qtr';
    case 'yearly':
      return 'yr';
    default: {
      const exhaustiveCycle: never = billingCycle;
      throw new Error(`Unhandled billing cycle: ${exhaustiveCycle}`);
    }
  }
}

export function SubscriptionRow({
  subscription,
  isFirst,
  isLast,
  onDelete,
  onEdit,
  onPayNow,
  onMarkPaid,
}: SubscriptionRowProps) {
  const status = statusStyles(subscription.status);
  const billingCycle = subscription.billingCycle ?? 'monthly';
  const monthlyEquivalent = getProratedMonthlyCost(
    subscription.amount,
    billingCycle,
    subscription.sharedWithCount ?? 1,
  );

  return (
    <View
      style={[
        styles.row,
        isFirst && styles.firstRow,
        !isLast && styles.rowBorder,
        isLast && styles.lastRow,
      ]}
    >
      <View style={styles.mainRow}>
        <View
          style={[styles.icon, { backgroundColor: subscription.iconColor }]}
        >
          <Text style={styles.iconText}>{subscription.iconLabel}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {subscription.name}
          </Text>
          <Text style={styles.meta}>
            Due {formatBillingDate(subscription.nextBillingDate)}
          </Text>
          {subscription.lastPaidDate ? (
            <Text style={styles.lastPaid}>
              Last paid {formatBillingDate(subscription.lastPaidDate)}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <Text style={styles.amount}>
            {formatCurrency(subscription.amount, subscription.currency)} /{' '}
            {billingCycleSuffix(billingCycle)}
          </Text>
          {billingCycle !== 'monthly' ? (
            <Text style={styles.monthlyEquivalent}>
              {formatCurrency(monthlyEquivalent, subscription.currency)}/mo
            </Text>
          ) : null}
          <View style={[styles.badge, { backgroundColor: status.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={`Delete ${subscription.name}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onDelete(subscription)}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
        >
          <Text style={styles.deleteIcon}>×</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel={`Edit ${subscription.name}`}
          accessibilityRole="button"
          onPress={() => onEdit(subscription)}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Pay ${subscription.name} now`}
          accessibilityRole="button"
          onPress={() => onPayNow(subscription)}
          style={({ pressed }) => [
            styles.payButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.payButtonText}>Pay Now</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Mark ${subscription.name} as paid`}
          accessibilityRole="button"
          onPress={() => onMarkPaid(subscription)}
          style={({ pressed }) => [
            styles.markPaidButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  firstRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  lastRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  lastPaid: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  monthlyEquivalent: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerSoft,
  },
  deleteButtonPressed: {
    opacity: 0.65,
  },
  deleteIcon: {
    color: Colors.danger,
    fontSize: 20,
    lineHeight: 21,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 14,
    marginLeft: 58,
  },
  payButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.accent,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  editButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  editButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  markPaidButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentSoft,
  },
  markPaidButtonText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
});
