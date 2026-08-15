import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '../constants/theme';
import type {
  BillingCycle,
  SubscriptionCategory,
} from '../types/subscription';
import { formatBillingDate, toIsoDate } from '../utils/format';
import { isValidIsoDate } from '../utils/validation';

const BILLING_CYCLE_OPTIONS: ReadonlyArray<{
  label: string;
  value: BillingCycle;
}> = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
];

const CATEGORY_OPTIONS: ReadonlyArray<{
  label: string;
  value: SubscriptionCategory;
}> = [
  { label: 'Telecom', value: 'telecom' },
  { label: 'Streaming', value: 'streaming' },
  { label: 'Utility', value: 'utility' },
  { label: 'Finance', value: 'finance' },
  { label: 'Other', value: 'other' },
];

export type SubscriptionFormSubmitValues = {
  name: string;
  amount: number;
  nextBillingDate: string;
  billingCycle: BillingCycle;
  category: SubscriptionCategory;
  paymentUrl: string;
  isFreeTrial: boolean;
  sharedWithCount: number;
};

export type SubscriptionFormInitialValues = {
  name?: string;
  amount?: string;
  nextBillingDate?: string;
  billingCycle?: BillingCycle;
  category?: SubscriptionCategory;
  paymentUrl?: string;
  isFreeTrial?: boolean;
  sharedWithCount?: string;
};

type SubscriptionFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  initialValues?: SubscriptionFormInitialValues;
  onSubmit: (values: SubscriptionFormSubmitValues) => Promise<void>;
};

export function SubscriptionForm({
  title,
  subtitle,
  submitLabel,
  initialValues,
  onSubmit,
}: SubscriptionFormProps) {
  const [serviceName, setServiceName] = useState(initialValues?.name ?? '');
  const [monthlyCost, setMonthlyCost] = useState(initialValues?.amount ?? '');
  const [billingDueDate, setBillingDueDate] = useState(
    initialValues?.nextBillingDate ?? '',
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    initialValues?.billingCycle ?? 'monthly',
  );
  const [category, setCategory] = useState<SubscriptionCategory>(
    initialValues?.category ?? 'streaming',
  );
  const [paymentUrl, setPaymentUrl] = useState(
    initialValues?.paymentUrl ?? '',
  );
  const [isFreeTrial, setIsFreeTrial] = useState(
    initialValues?.isFreeTrial ?? false,
  );
  const [sharedWithCount, setSharedWithCount] = useState(
    initialValues?.sharedWithCount ?? '1',
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isFormComplete =
    serviceName.trim().length > 0 &&
    monthlyCost.trim().length > 0 &&
    billingDueDate.trim().length > 0;

  const handleSubmit = async () => {
    const name = serviceName.trim();
    const amount = Number(monthlyCost.trim());
    const dueDate = billingDueDate.trim();

    const splitCount = Number(sharedWithCount.trim() || '1');

    if (!name || !monthlyCost.trim() || !dueDate) {
      setError('All fields are required.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid monthly cost greater than zero.');
      return;
    }

    if (!Number.isInteger(splitCount) || splitCount < 1) {
      setError('Shared with must be a whole number of at least 1.');
      return;
    }

    if (!isValidIsoDate(dueDate)) {
      setError('Choose a valid billing date.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit({
        name,
        amount,
        nextBillingDate: dueDate,
        billingCycle,
        category,
        paymentUrl,
        isFreeTrial,
        sharedWithCount: splitCount,
      });
    } catch {
      setError('Could not save the subscription. Please try again.');
      setSaving(false);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    switch (event.type) {
      case 'dismissed':
      case 'neutralButtonPressed':
        setShowDatePicker(false);
        return;
      case 'set': {
        if (selectedDate) {
          setBillingDueDate(toIsoDate(selectedDate));
        }
        setShowDatePicker(false);
        return;
      }
      default: {
        const exhaustiveEventType: never = event.type;
        throw new Error(
          `Unhandled date picker event: ${exhaustiveEventType}`,
        );
      }
    }
  };

  const selectedPickerDate = isValidIsoDate(billingDueDate)
    ? new Date(`${billingDueDate}T00:00:00`)
    : new Date();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Service name</Text>
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
                maxLength={60}
                onChangeText={setServiceName}
                placeholder="e.g. Netflix"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                value={serviceName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Cost</Text>
              <View style={styles.costInput}>
                <Text style={styles.currency}>₹</Text>
                <TextInput
                  editable={!saving}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  onChangeText={setMonthlyCost}
                  placeholder="499"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.costTextInput}
                  value={monthlyCost}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryRow}>
                {CATEGORY_OPTIONS.map((option) => {
                  const isSelected = category === option.value;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: saving,
                        selected: isSelected,
                      }}
                      disabled={saving}
                      key={option.value}
                      onPress={() => setCategory(option.value)}
                      style={({ pressed }) => [
                        styles.categoryOption,
                        isSelected && styles.cycleOptionSelected,
                        pressed && styles.cycleOptionPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cycleOptionText,
                          isSelected && styles.cycleOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Billing cycle</Text>
              <View style={styles.cycleRow}>
                {BILLING_CYCLE_OPTIONS.map((option) => {
                  const isSelected = billingCycle === option.value;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: saving,
                        selected: isSelected,
                      }}
                      disabled={saving}
                      key={option.value}
                      onPress={() => setBillingCycle(option.value)}
                      style={({ pressed }) => [
                        styles.cycleOption,
                        isSelected && styles.cycleOptionSelected,
                        pressed && styles.cycleOptionPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cycleOptionText,
                          isSelected && styles.cycleOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Billing due date</Text>
              <Pressable
                accessibilityLabel="Billing due date"
                accessibilityRole="button"
                accessibilityState={{ disabled: saving }}
                accessibilityValue={{
                  text: isValidIsoDate(billingDueDate)
                    ? formatBillingDate(billingDueDate)
                    : 'No date selected',
                }}
                disabled={saving}
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [
                  styles.dateButton,
                  pressed && styles.cycleOptionPressed,
                ]}
              >
                <Text
                  style={
                    isValidIsoDate(billingDueDate)
                      ? styles.dateButtonText
                      : styles.dateButtonPlaceholder
                  }
                >
                  {isValidIsoDate(billingDueDate)
                    ? formatBillingDate(billingDueDate)
                    : 'Select a date'}
                </Text>
              </Pressable>
              <Text style={styles.helper}>
                Tap to choose a date. Stored as YYYY-MM-DD.
              </Text>
              {showDatePicker ? (
                <DateTimePicker
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  mode="date"
                  onChange={handleDateChange}
                  value={selectedPickerDate}
                />
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Shared with</Text>
              <TextInput
                editable={!saving}
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={setSharedWithCount}
                placeholder="1"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                value={sharedWithCount}
              />
              <Text style={styles.helper}>
                Divide this bill across household members. Use 1 if you pay it
                alone.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Payment link / website</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                keyboardType="url"
                onChangeText={setPaymentUrl}
                placeholder="Optional website or UPI handle"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                value={paymentUrl}
              />
              <Text style={styles.helper}>
                Example: https://provider.com/pay or name@upi
              </Text>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{
                disabled: saving,
                checked: isFreeTrial,
              }}
              disabled={saving}
              onPress={() => setIsFreeTrial((current) => !current)}
              style={({ pressed }) => [
                styles.trialToggle,
                isFreeTrial && styles.trialToggleSelected,
                pressed && styles.cycleOptionPressed,
              ]}
            >
              <View style={styles.trialCopy}>
                <Text style={styles.label}>Free trial</Text>
                <Text style={styles.helper}>
                  Remind me 2 days before the charge so I can cancel.
                </Text>
              </View>
              <Text style={styles.trialValue}>
                {isFreeTrial ? 'On' : 'Off'}
              </Text>
            </Pressable>

            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={!isFormComplete || saving}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.submitButton,
                (!isFormComplete || saving) && styles.submitButtonDisabled,
                pressed && isFormComplete && styles.submitButtonPressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>{submitLabel}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  intro: {
    marginBottom: Spacing.xl,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  dateButton: {
    height: 52,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  dateButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  dateButtonPlaceholder: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  costInput: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  currency: {
    color: Colors.textSecondary,
    fontSize: 17,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  costTextInput: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryOption: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  cycleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cycleOption: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xs,
  },
  cycleOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  cycleOptionPressed: {
    opacity: 0.75,
  },
  cycleOptionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  cycleOptionTextSelected: {
    color: Colors.accent,
  },
  helper: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  trialToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
  },
  trialToggleSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  trialCopy: {
    flex: 1,
    gap: 4,
  },
  trialValue: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    marginTop: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
