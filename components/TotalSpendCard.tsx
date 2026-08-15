import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';
import { formatCurrency } from '../utils/format';

type TotalSpendCardProps = {
  total: number;
  currency?: string;
  activeCount: number;
};

export function TotalSpendCard({
  total,
  currency = 'INR',
  activeCount,
}: TotalSpendCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.glow} />
      <Text style={styles.label}>Monthly Burn Rate</Text>
      <Text style={styles.amount}>{formatCurrency(total, currency)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {activeCount} active {activeCount === 1 ? 'item' : 'items'}
        </Text>
        <Text style={styles.period}>Prorated monthly</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.spendCardStart,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.spendCardEnd,
    opacity: 0.55,
  },
  label: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  period: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '500',
  },
});
