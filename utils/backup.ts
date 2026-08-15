import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type {
  BillingCycle,
  Subscription,
  SubscriptionCategory,
} from '../types/subscription';
import { scheduleSubscriptionAlert } from './notifications';
import { computeSubscriptionStatus } from './status';
import { loadSubscriptions, saveSubscriptions } from './storage';
import { isValidIsoDate } from './validation';

export const BACKUP_SCHEMA_VERSION = 1;

export type ImportMode = 'replace' | 'merge';

export type BackupPayload = {
  schemaVersion: number;
  exportedAt: string;
  subscriptions: Subscription[];
};

export type ImportResult =
  | { status: 'canceled' }
  | {
      status: 'imported';
      mode: ImportMode;
      subscriptions: Subscription[];
    };

const SUBSCRIPTION_CATEGORIES: ReadonlyArray<SubscriptionCategory> = [
  'telecom',
  'streaming',
  'utility',
  'finance',
  'other',
];

const BILLING_CYCLES: ReadonlyArray<BillingCycle> = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSubscriptionCategory(
  value: unknown,
): value is SubscriptionCategory {
  return (
    typeof value === 'string' &&
    SUBSCRIPTION_CATEGORIES.includes(value as SubscriptionCategory)
  );
}

function isBillingCycle(value: unknown): value is BillingCycle {
  return (
    typeof value === 'string' &&
    BILLING_CYCLES.includes(value as BillingCycle)
  );
}

function normalizeSharedWithCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return 1;
  }

  return value;
}

function parseImportedSubscription(
  value: unknown,
  index: number,
): Subscription {
  if (!isRecord(value)) {
    throw new Error(`Subscription ${index + 1} is not an object.`);
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    throw new Error(`Subscription ${index + 1} is missing a valid id.`);
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    throw new Error(`Subscription ${index + 1} is missing a valid name.`);
  }

  if (typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0) {
    throw new Error(`Subscription ${index + 1} has an invalid amount.`);
  }

  if (
    typeof value.nextBillingDate !== 'string' ||
    !isValidIsoDate(value.nextBillingDate)
  ) {
    throw new Error(`Subscription ${index + 1} has an invalid billing date.`);
  }

  const name = value.name.trim();
  const nextBillingDate = value.nextBillingDate;
  const billingCycle = isBillingCycle(value.billingCycle)
    ? value.billingCycle
    : 'monthly';

  return {
    id: value.id.trim(),
    name,
    amount: value.amount,
    nextBillingDate,
    category: isSubscriptionCategory(value.category)
      ? value.category
      : 'other',
    currency: typeof value.currency === 'string' ? value.currency : 'INR',
    billingCycle,
    status: computeSubscriptionStatus(nextBillingDate),
    iconColor:
      typeof value.iconColor === 'string' ? value.iconColor : '#1F6B4A',
    iconLabel:
      typeof value.iconLabel === 'string'
        ? value.iconLabel
        : name
            .split(/\s+/)
            .map((word) => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
    paymentUrl:
      typeof value.paymentUrl === 'string' && value.paymentUrl.trim()
        ? value.paymentUrl.trim()
        : undefined,
    lastPaidDate:
      typeof value.lastPaidDate === 'string' &&
      isValidIsoDate(value.lastPaidDate)
        ? value.lastPaidDate
        : undefined,
    isFreeTrial: value.isFreeTrial === true,
    sharedWithCount: normalizeSharedWithCount(value.sharedWithCount),
  };
}

export function createBackupPayload(
  subscriptions: Subscription[],
  exportedAt: string = new Date().toISOString(),
): BackupPayload {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    subscriptions,
  };
}

export function parseBackupJson(raw: string): Subscription[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => parseImportedSubscription(item, index));
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.subscriptions)) {
    throw new Error('Backup file must contain a subscriptions array.');
  }

  if (
    parsed.schemaVersion !== undefined &&
    typeof parsed.schemaVersion !== 'number'
  ) {
    throw new Error('Backup schemaVersion is invalid.');
  }

  return parsed.subscriptions.map((item, index) =>
    parseImportedSubscription(item, index),
  );
}

export function mergeSubscriptions(
  existingSubscriptions: Subscription[],
  importedSubscriptions: Subscription[],
): Subscription[] {
  const mergedSubscriptions = new Map(
    existingSubscriptions.map((subscription) => [
      subscription.id,
      subscription,
    ]),
  );

  importedSubscriptions.forEach((subscription) => {
    mergedSubscriptions.set(subscription.id, subscription);
  });

  return Array.from(mergedSubscriptions.values());
}

async function rescheduleImportedAlerts(
  subscriptions: Subscription[],
): Promise<void> {
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await scheduleSubscriptionAlert(
          subscription.name,
          subscription.nextBillingDate,
          subscription.amount,
          subscription.id,
          subscription.isFreeTrial,
        );
      } catch (notificationError: unknown) {
        console.warn(
          `Imported ${subscription.name}, but its alert could not be scheduled.`,
          notificationError,
        );
      }
    }),
  );
}

export async function exportDataAsJson(): Promise<{
  uri: string;
  payload: BackupPayload;
}> {
  const subscriptions = await loadSubscriptions();
  const payload = createBackupPayload(subscriptions);
  const fileName = `smart-subscription-alert-backup-${payload.exportedAt.slice(0, 10)}.json`;
  const file = new File(Paths.cache, fileName);

  if (file.exists) {
    file.delete();
  }

  file.create();
  file.write(JSON.stringify(payload, null, 2));

  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export subscription backup',
      UTI: 'public.json',
    });
  }

  return { uri: file.uri, payload };
}

export async function importDataFromJson(
  mode: ImportMode,
): Promise<ImportResult> {
  const pickerResult = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (pickerResult.canceled || !pickerResult.assets[0]) {
    return { status: 'canceled' };
  }

  const backupFile = new File(pickerResult.assets[0].uri);
  const rawBackup = await backupFile.text();
  const importedSubscriptions = parseBackupJson(rawBackup);
  const existingSubscriptions = await loadSubscriptions();
  let nextSubscriptions: Subscription[];

  switch (mode) {
    case 'replace':
      nextSubscriptions = importedSubscriptions;
      break;
    case 'merge':
      nextSubscriptions = mergeSubscriptions(
        existingSubscriptions,
        importedSubscriptions,
      );
      break;
    default: {
      const exhaustiveMode: never = mode;
      throw new Error(`Unhandled import mode: ${exhaustiveMode}`);
    }
  }

  await saveSubscriptions(nextSubscriptions);
  await rescheduleImportedAlerts(nextSubscriptions);

  return {
    status: 'imported',
    mode,
    subscriptions: nextSubscriptions,
  };
}
