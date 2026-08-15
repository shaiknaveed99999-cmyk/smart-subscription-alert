import { useCallback } from 'react';
import { PieChart } from 'react-native-gifted-charts';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '../constants/theme';
import type { CategoryChartDatum } from '../utils/chartData';
import { formatCurrency } from '../utils/format';

type CategoryChartProps = {
  data: CategoryChartDatum[];
  isYearly?: boolean;
};

export function CategoryChart({ data, isYearly = false }: CategoryChartProps) {
  const displayMultiplier = isYearly ? 12 : 1;
  const totalMonthlyBurnRate = data.reduce(
    (total, category) => total + category.value,
    0,
  );
  const displayedTotal = totalMonthlyBurnRate * displayMultiplier;
  const renderCenterLabel = useCallback(
    () => (
      <View style={styles.centerLabel}>
        <Text style={styles.centerAmount}>
          {formatCurrency(displayedTotal)}
        </Text>
        <Text style={styles.centerCaption}>
          {isYearly ? 'yearly projection' : 'monthly burn rate'}
        </Text>
      </View>
    ),
    [displayedTotal, isYearly],
  );

  if (data.length === 0 || totalMonthlyBurnRate <= 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Spending by category</Text>
        <Text style={styles.emptyText}>
          Add a subscription to see your chart
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Spending by category</Text>
          <Text style={styles.subtitle}>
            {isYearly ? 'Projected yearly share' : 'Prorated monthly share'}
          </Text>
        </View>
      </View>

      <View style={styles.chart}>
        <PieChart
          data={data}
          donut
          innerCircleColor={Colors.surface}
          innerRadius={58}
          radius={88}
          centerLabelComponent={renderCenterLabel}
          isAnimated
          showText
          strokeColor={Colors.surface}
          strokeWidth={3}
          textColor="#FFFFFF"
          textSize={11}
          fontWeight="700"
        />
      </View>

      <View style={styles.legend}>
        {data.map((category) => (
          <View key={category.category} style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: category.color },
              ]}
            />
            <Text style={styles.legendLabel}>{category.category}</Text>
            <Text style={styles.legendPercentage}>{category.text}</Text>
            <Text style={styles.legendValue}>
              {formatCurrency(category.value * displayMultiplier)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  chart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 108,
  },
  centerAmount: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  centerCaption: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  legend: {
    gap: 10,
    marginTop: Spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  legendLabel: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  legendPercentage: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginRight: Spacing.md,
  },
  legendValue: {
    minWidth: 68,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
});
