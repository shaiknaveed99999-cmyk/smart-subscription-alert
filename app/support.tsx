import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SUPPORT_UPI_ID } from '../constants/support';
import { Colors, Radius, Spacing } from '../constants/theme';
import {
  exportDataAsJson,
  importDataFromJson,
  type ImportMode,
} from '../utils/backup';
import { copyUpiIdToClipboard, openUpiTip } from '../utils/deeplink';

const TIP_OPTIONS = [
  { id: 'coffee', label: 'Buy me a coffee', amount: 49 },
  { id: 'lunch', label: 'Buy me a lunch', amount: 99 },
] as const;

export default function SupportScreen() {
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendTip = async (amount: number, note: string) => {
    setSending(true);
    setSelectedTip(amount);
    setStatusMessage(null);

    const didOpen = await openUpiTip(amount, note);

    setStatusMessage(
      didOpen
        ? `Opening your UPI app for a ₹${amount} tip.`
        : `No UPI app opened. Use ${SUPPORT_UPI_ID} to send ₹${amount}.`,
    );
    setSending(false);
  };

  const sendCustomTip = async () => {
    const amount = Number(customAmount.trim());
    await sendTip(amount, 'Custom tip for Smart Subscription Alert');
  };

  const copyUpiId = async () => {
    await copyUpiIdToClipboard();
    setStatusMessage(`Copied ${SUPPORT_UPI_ID} to the clipboard.`);
  };

  const exportBackup = async () => {
    try {
      const { payload } = await exportDataAsJson();
      setStatusMessage(
        `Exported ${payload.subscriptions.length} subscriptions as JSON.`,
      );
    } catch {
      setStatusMessage('Could not export a backup. Please try again.');
    }
  };

  const restoreBackup = async (mode: ImportMode) => {
    try {
      const result = await importDataFromJson(mode);

      if (result.status === 'canceled') {
        setStatusMessage('Restore canceled.');
        return;
      }

      setStatusMessage(
        mode === 'replace'
          ? `Replaced local data with ${result.subscriptions.length} subscriptions.`
          : `Merged backup. ${result.subscriptions.length} subscriptions are stored.`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not restore the backup.';
      setStatusMessage(message);
    }
  };

  const confirmRestore = () => {
    Alert.alert(
      'Restore from backup?',
      'Replace all local subscriptions, or merge this backup with what is already on the device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          onPress: () => void restoreBackup('merge'),
        },
        {
          text: 'Replace all',
          style: 'destructive',
          onPress: () => void restoreBackup('replace'),
        },
      ],
    );
  };

  const customAmountValue = Number(customAmount.trim());
  const isCustomAmountValid =
    Number.isFinite(customAmountValue) && customAmountValue > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>Privacy first</Text>
          <Text style={styles.title}>Your bills stay on this device</Text>
          <Text style={styles.subtitle}>
            Smart Subscription Alert never sends your subscriptions, payment
            links, or reminders to a server. Everything is stored locally with
            AsyncStorage, and alerts are scheduled on-device.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>No account. No tracking.</Text>
          <Text style={styles.cardBody}>
            There is no cloud sync, no analytics, and no third-party billing
            profile. If you delete the app, the data leaves with it.
          </Text>
        </View>

        <View style={styles.tipSection}>
          <Text style={styles.tipTitle}>Keep it independent</Text>
          <Text style={styles.tipBody}>
            If the app is saving you from surprise renewals, send a one-time
            UPI tip. This opens your UPI app with the amount filled in.
          </Text>

          <View style={styles.tipRow}>
            {TIP_OPTIONS.map((option) => {
              const isSelected = selectedTip === option.amount;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: sending,
                    selected: isSelected,
                  }}
                  disabled={sending}
                  key={option.id}
                  onPress={() =>
                    void sendTip(option.amount, option.label)
                  }
                  style={({ pressed }) => [
                    styles.tipButton,
                    isSelected && styles.tipButtonSelected,
                    pressed && styles.tipButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.tipAmount,
                      isSelected && styles.tipAmountSelected,
                    ]}
                  >
                    ₹{option.amount}
                  </Text>
                  <Text
                    style={[
                      styles.tipLabel,
                      isSelected && styles.tipLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.customField}>
            <Text style={styles.customLabel}>Custom tip</Text>
            <View style={styles.customRow}>
              <View style={styles.customInput}>
                <Text style={styles.currency}>₹</Text>
                <TextInput
                  editable={!sending}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  onChangeText={setCustomAmount}
                  placeholder="199"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.customTextInput}
                  value={customAmount}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: sending || !isCustomAmountValid }}
                disabled={sending || !isCustomAmountValid}
                onPress={() => void sendCustomTip()}
                style={({ pressed }) => [
                  styles.customSendButton,
                  (!isCustomAmountValid || sending) &&
                    styles.customSendButtonDisabled,
                  pressed && isCustomAmountValid && styles.tipButtonPressed,
                ]}
              >
                <Text style={styles.customSendText}>Send tip</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={sending}
            onPress={() => void copyUpiId()}
            style={({ pressed }) => [
              styles.copyButton,
              pressed && styles.tipButtonPressed,
            ]}
          >
            <Text style={styles.copyButtonText}>Copy UPI ID</Text>
            <Text style={styles.copyButtonId}>{SUPPORT_UPI_ID}</Text>
          </Pressable>

          {statusMessage ? (
            <Text accessibilityRole="alert" style={styles.thanks}>
              {statusMessage}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data & Privacy</Text>
          <Text style={styles.cardBody}>
            Export a JSON backup to keep a copy on this device, or restore
            subscriptions from a previous export. Restore asks before it
            overwrites local data.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void exportBackup()}
            style={({ pressed }) => [
              styles.dataButton,
              pressed && styles.tipButtonPressed,
            ]}
          >
            <Text style={styles.dataButtonText}>Export Backup (JSON)</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={confirmRestore}
            style={({ pressed }) => [
              styles.dataButton,
              styles.restoreButton,
              pressed && styles.tipButtonPressed,
            ]}
          >
            <Text style={styles.restoreButtonText}>Restore from Backup</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  hero: {
    gap: Spacing.sm,
  },
  kicker: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  tipSection: {
    gap: Spacing.sm,
  },
  tipTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  tipBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  tipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tipButton: {
    flex: 1,
    minHeight: 96,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  tipButtonSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  tipButtonPressed: {
    opacity: 0.8,
  },
  tipAmount: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  tipAmountSelected: {
    color: Colors.accent,
  },
  tipLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tipLabelSelected: {
    color: Colors.accent,
  },
  customField: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  customLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  customInput: {
    flex: 1,
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
  customTextInput: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: 16,
  },
  customSendButton: {
    minWidth: 108,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
  },
  customSendButtonDisabled: {
    opacity: 0.45,
  },
  customSendText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  copyButton: {
    minHeight: 58,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  copyButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  copyButtonId: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  thanks: {
    marginTop: Spacing.sm,
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  dataButton: {
    minHeight: 48,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  dataButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  restoreButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  restoreButtonText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
