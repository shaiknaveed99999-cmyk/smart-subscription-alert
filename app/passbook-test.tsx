import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addBankSmsListener } from '@/modules/bank-sms';
import { Colors, Radius, Spacing } from '../constants/theme';
import { requestNotificationListenerPermission } from '../utils/permissions';
import { parseBankSms, type ParsedTransaction } from '../utils/smsParser';

export default function PassbookTestScreen() {
  const [smsText, setSmsText] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdPreview, setCreatedPreview] = useState<string | null>(null);

  const applyParsedText = (text: string) => {
    setCreatedPreview(null);
    setSmsText(text);
    const result = parseBankSms(text);

    if (!result) {
      setParsed(null);
      setError('Could not parse amount and merchant from this SMS.');
      return;
    }

    setError(null);
    setParsed(result);
  };

  useEffect(() => {
    const subscription = addBankSmsListener((event) => {
      applyParsedText(event.text);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const parseSms = () => {
    applyParsedText(smsText);
  };

  const previewAutoCreate = () => {
    if (!parsed) {
      return;
    }

    setCreatedPreview(
      `Would call addSubscription() for ${parsed.merchant} at ₹${parsed.amount}.`,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Smart Passbook debug</Text>
        <Text style={styles.subtitle}>
          Paste an Indian bank SMS to preview offline parsing. Nothing is sent
          off this device.
        </Text>

        <TextInput
          accessibilityLabel="Bank SMS text"
          multiline
          onChangeText={setSmsText}
          placeholder="Rs.649.00 debited from a/c **1234 on 15-Aug-26 to Netflix. Mandate executed."
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          textAlignVertical="top"
          value={smsText}
        />

        <Pressable
          accessibilityRole="button"
          onPress={parseSms}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Parse SMS</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => void requestNotificationListenerPermission()}
          style={({ pressed }) => [
            styles.listenerButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.listenerButtonText}>
            Grant Notification Listener Access
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {parsed ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Extracted JSON</Text>
            <Text accessibilityLabel="Parsed SMS JSON" style={styles.resultJson}>
              {JSON.stringify(parsed, null, 2)}
            </Text>
            {parsed.isAutoPay ? (
              <Pressable
                accessibilityRole="button"
                onPress={previewAutoCreate}
                style={({ pressed }) => [
                  styles.autoCreateButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.autoCreateText}>Auto-Create Subscription</Text>
              </Pressable>
            ) : null}
            {createdPreview ? (
              <Text style={styles.preview}>{createdPreview}</Text>
            ) : null}
          </View>
        ) : null}
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
    gap: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  listenerButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  listenerButtonText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  error: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  resultLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  resultJson: {
    color: Colors.textSecondary,
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 20,
  },
  autoCreateButton: {
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoCreateText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  preview: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
});
