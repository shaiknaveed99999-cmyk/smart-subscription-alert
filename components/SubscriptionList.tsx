import { useCallback, useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  type SectionListRenderItemInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Subscription } from '../types/subscription';
import { Colors, Radius, Spacing } from '../constants/theme';
import {
  groupSubscriptionsByCategory,
  type SubscriptionSection,
} from '../utils/subscriptions';
import { SubscriptionRow } from './SubscriptionRow';

type SubscriptionListProps = {
  subscriptions: Subscription[];
  onDelete: (subscription: Subscription) => void;
  onEdit: (subscription: Subscription) => void;
  onPayNow: (subscription: Subscription) => void;
  onMarkPaid: (subscription: Subscription) => void;
  header: ReactNode;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

function SubscriptionSectionHeader({
  section,
}: {
  section: SubscriptionSection;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );
}

export function SubscriptionList({
  subscriptions,
  onDelete,
  onEdit,
  onPayNow,
  onMarkPaid,
  header,
  loading,
  refreshing,
  onRefresh,
}: SubscriptionListProps) {
  const sections = useMemo(
    () => groupSubscriptionsByCategory(subscriptions),
    [subscriptions],
  );
  const renderSubscription = useCallback(
    ({
      item,
      index,
      section,
    }: SectionListRenderItemInfo<Subscription, SubscriptionSection>) => (
      <SubscriptionRow
        subscription={item}
        isFirst={index === 0}
        isLast={index === section.data.length - 1}
        onDelete={onDelete}
        onEdit={onEdit}
        onPayNow={onPayNow}
        onMarkPaid={onMarkPaid}
      />
    ),
    [onDelete, onEdit, onMarkPaid, onPayNow],
  );

  return (
    <SectionList
      contentContainerStyle={styles.content}
      sections={sections}
      extraData={subscriptions}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          {header}
          <View style={styles.listHeader}>
            <Text style={styles.title}>Active subscriptions</Text>
            <Text style={styles.count}>{subscriptions.length}</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No active subscriptions</Text>
            <Text style={styles.emptyBody}>
              When bills and renewals are added, they will appear here.
            </Text>
          </View>
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.accent}
        />
      }
      renderItem={renderSubscription}
      renderSectionHeader={SubscriptionSectionHeader}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.xxl + 64,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  count: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  loading: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
