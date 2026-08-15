import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { Alert, Linking } from 'react-native';

import AddSubscriptionScreen from '../app/add-subscription';
import EditSubscriptionScreen from '../app/edit-subscription';
import HomeScreen from '../app/index';
import SupportScreen from '../app/support';
import {
  SUPPORT_PAYEE_NAME,
  SUPPORT_UPI_ID,
} from '../constants/support';
import { MOCK_SUBSCRIPTIONS } from '../data/mockSubscriptions';
import type {
  BillingCycle,
  Subscription,
} from '../types/subscription';
import * as Storage from '../utils/storage';
import {
  BACKUP_SCHEMA_VERSION,
  createBackupPayload,
  exportDataAsJson,
  importDataFromJson,
  mergeSubscriptions,
  parseBackupJson,
} from '../utils/backup';
import { generateCategoryChartData } from '../utils/chartData';
import { generateUpiUrl } from '../utils/deeplink';
import { formatBillingDate } from '../utils/format';
import { computeSubscriptionStatus } from '../utils/status';
import {
  getMonthlyBurnRate,
  getProratedMonthlyCost,
  markAsPaid,
  rollForwardOverdueSubscriptions,
} from '../utils/subscriptions';

declare global {
  var __TEST_BILLING_DATE__: Date | undefined;
  var __TEST_BACKUP_JSON__: string | undefined;
  var __TEST_WRITTEN_BACKUP__: string | undefined;
}

async function chooseBillingDate(
  getByRole: (
    role: 'button',
    options: { name: string },
  ) => Parameters<typeof fireEvent.press>[0],
  isoDate: string,
) {
  const [year, month, day] = isoDate.split('-').map(Number);
  globalThis.__TEST_BILLING_DATE__ = new Date(year, month - 1, day);

  await fireEvent.press(getByRole('button', { name: 'Billing due date' }));
  await fireEvent.press(
    getByRole('button', { name: 'Confirm selected date' }),
  );
}

jest.mock('expo-router', () => {
  const React = require('react');

  return {
    router: {
      back: jest.fn(),
      push: jest.fn(),
    },
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

jest.mock('react-native-gifted-charts', () => ({
  PieChart: () => null,
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    exists = false;

    constructor(...parts: Array<string | { uri?: string }>) {
      const lastPart = parts[parts.length - 1];
      this.uri =
        typeof lastPart === 'string' && lastPart.startsWith('file:')
          ? lastPart
          : `file:///cache/${typeof lastPart === 'string' ? lastPart : 'backup.json'}`;
    }

    create() {
      this.exists = true;
    }

    delete() {
      this.exists = false;
    }

    write(content: string) {
      globalThis.__TEST_WRITTEN_BACKUP__ = content;
    }

    async text() {
      return globalThis.__TEST_BACKUP_JSON__ ?? '';
    }
  }

  return {
    File,
    Paths: { cache: { uri: 'file:///cache' } },
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  platformApiLevel: 34,
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = require('react-native');

  return {
    __esModule: true,
    default: ({
      onChange,
    }: {
      onChange: (event: { type: string }, date?: Date) => void;
    }) => (
      <Pressable
        accessibilityLabel="Confirm selected date"
        accessibilityRole="button"
        onPress={() =>
          onChange(
            { type: 'set' },
            globalThis.__TEST_BILLING_DATE__ ?? new Date(2026, 8, 15),
          )
        }
      >
        <Text>Confirm selected date</Text>
      </Pressable>
    ),
  };
});

jest.mock('expo-notifications', () => ({
  AndroidImportance: {
    HIGH: 4,
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
  getPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
  }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
  }),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(null),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  setNotificationHandler: jest.fn(),
}));

const scheduleNotificationAsyncMock = jest.mocked(
  Notifications.scheduleNotificationAsync,
);
const cancelScheduledNotificationAsyncMock = jest.mocked(
  Notifications.cancelScheduledNotificationAsync,
);

describe('Smart Subscription Alert core logic', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.mocked(useLocalSearchParams).mockReturnValue({});
    delete globalThis.__TEST_BILLING_DATE__;
    delete globalThis.__TEST_BACKUP_JSON__;
    delete globalThis.__TEST_WRITTEN_BACKUP__;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('persists a saved subscription and retrieves it on the next load', async () => {
    const savedSubscription = await Storage.addSubscription({
      name: 'Netflix',
      amount: 649,
      nextBillingDate: '2026-09-15',
      category: 'streaming',
    });

    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      '@smart-subscription-alert/subscriptions',
      expect.stringContaining('"name":"Netflix"'),
    );

    const loadedSubscriptions = await Storage.loadSubscriptions();

    expect(loadedSubscriptions).toContainEqual(savedSubscription);
    expect(savedSubscription.billingCycle).toBe('monthly');
    expect(savedSubscription.category).toBe('streaming');
    expect(savedSubscription.isFreeTrial).toBe(false);
    expect(savedSubscription.sharedWithCount).toBe(1);
  });

  test('persists the category selected on the add-subscription form', async () => {
    const { getByPlaceholderText, getByRole } = await render(
      <AddSubscriptionScreen />,
    );

    await fireEvent.changeText(
      getByPlaceholderText('e.g. Netflix'),
      'Airtel Fiber',
    );
    await fireEvent.changeText(getByPlaceholderText('499'), '999');
    await fireEvent.press(getByRole('button', { name: 'Telecom' }));
    await chooseBillingDate(getByRole, '2026-09-15');
    await fireEvent.press(
      getByRole('button', { name: 'Save subscription' }),
    );

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const loadedSubscriptions = await Storage.loadSubscriptions();
    const savedSubscription = loadedSubscriptions.find(
      ({ name }) => name === 'Airtel Fiber',
    );

    expect(savedSubscription?.category).toBe('telecom');
    expect(savedSubscription?.category).not.toBe('other');
    expect(savedSubscription?.nextBillingDate).toBe('2026-09-15');
  });

  test('shows the selected billing date in en-IN format', async () => {
    const { getByRole, getByText } = await render(<AddSubscriptionScreen />);

    await chooseBillingDate(getByRole, '2026-09-15');

    expect(getByText(formatBillingDate('2026-09-15'))).toBeTruthy();
  });

  test('updates an existing subscription and retrieves the edited values', async () => {
    const originalSubscription = await Storage.addSubscription({
      name: 'Netflix',
      amount: 649,
      nextBillingDate: '2026-09-15',
      category: 'streaming',
    });

    const updatedSubscription = await Storage.updateSubscription(
      originalSubscription.id,
      {
        name: 'Netflix Premium',
        amount: 799,
        nextBillingDate: '2026-10-01',
        category: 'streaming',
        billingCycle: 'yearly',
      },
    );

    expect(updatedSubscription).toEqual(
      expect.objectContaining({
        id: originalSubscription.id,
        name: 'Netflix Premium',
        amount: 799,
        nextBillingDate: '2026-10-01',
        billingCycle: 'yearly',
      }),
    );
    await expect(Storage.loadSubscriptions()).resolves.toContainEqual(
      updatedSubscription,
    );
  });

  test('loads a subscription into the edit form and saves changes', async () => {
    const originalSubscription = await Storage.addSubscription({
      name: 'Netflix',
      amount: 649,
      nextBillingDate: '2026-09-15',
      category: 'streaming',
    });

    jest.mocked(useLocalSearchParams).mockReturnValue({
      id: originalSubscription.id,
    });

    const { findByDisplayValue, getByRole } = await render(
      <EditSubscriptionScreen />,
    );

    await findByDisplayValue('Netflix');
    await fireEvent.changeText(
      await findByDisplayValue('Netflix'),
      'Netflix Family',
    );
    await fireEvent.press(getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(router.back).toHaveBeenCalled();
    });

    const loadedSubscriptions = await Storage.loadSubscriptions();
    const savedSubscription = loadedSubscriptions.find(
      ({ id }) => id === originalSubscription.id,
    );

    expect(savedSubscription?.name).toBe('Netflix Family');
  });

  test('cancels the scheduled alert when a subscription is deleted', async () => {
    const savedSubscription = await Storage.addSubscription({
      name: 'Netflix',
      amount: 649,
      nextBillingDate: '2026-09-15',
      category: 'streaming',
    });

    const remainingSubscriptions = await Storage.deleteSubscription(
      savedSubscription.id,
    );

    expect(cancelScheduledNotificationAsyncMock).toHaveBeenCalledWith(
      `subscription-alert-${savedSubscription.id}`,
    );
    expect(remainingSubscriptions).not.toContainEqual(
      expect.objectContaining({ id: savedSubscription.id }),
    );
  });

  test('prevents an empty add-subscription form from saving', async () => {
    const addSubscriptionSpy = jest.spyOn(Storage, 'addSubscription');

    const { getByRole } = await render(<AddSubscriptionScreen />);

    const submitButton = getByRole('button', {
      name: 'Save subscription',
    });

    expect(submitButton).toBeDisabled();
    await fireEvent.press(submitButton);
    expect(addSubscriptionSpy).not.toHaveBeenCalled();
  });

  test('schedules a saved subscription alert for 10 AM one day before it is due', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 6, 9, 0, 0, 0));

    const { getByPlaceholderText, getByRole } = await render(
      <AddSubscriptionScreen />,
    );

    await fireEvent.changeText(
      getByPlaceholderText('e.g. Netflix'),
      'Netflix',
    );
    await fireEvent.changeText(getByPlaceholderText('499'), '999');
    await chooseBillingDate(getByRole, '2026-08-08');
    await fireEvent.press(
      getByRole('button', { name: 'Save subscription' }),
    );

    await waitFor(() => {
      expect(scheduleNotificationAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(scheduleNotificationAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: expect.stringMatching(/^subscription-alert-/),
        content: expect.objectContaining({
          title: 'Bill Due Tomorrow! 🔔',
          body: 'Your Netflix subscription for ₹999 is due tomorrow.',
        }),
        trigger: expect.objectContaining({
          date: new Date(2026, 7, 7, 10, 0, 0, 0),
        }),
      }),
    );
    expect(cancelScheduledNotificationAsyncMock).toHaveBeenCalledWith(
      expect.stringMatching(/^subscription-alert-/),
    );
  });

  test('schedules a free-trial alert 2 days before the charge', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 6, 9, 0, 0, 0));

    const { getByPlaceholderText, getByRole } = await render(
      <AddSubscriptionScreen />,
    );

    await fireEvent.changeText(
      getByPlaceholderText('e.g. Netflix'),
      'Netflix',
    );
    await fireEvent.changeText(getByPlaceholderText('499'), '999');
    await chooseBillingDate(getByRole, '2026-08-09');
    await fireEvent.press(getByRole('switch'));
    await fireEvent.press(
      getByRole('button', { name: 'Save subscription' }),
    );

    await waitFor(() => {
      expect(scheduleNotificationAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(scheduleNotificationAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Cancel Before Charge 🔔',
          body: 'Your Netflix free trial for ₹999 charges in 2 days.',
        }),
        trigger: expect.objectContaining({
          date: new Date(2026, 7, 7, 10, 0, 0, 0),
        }),
      }),
    );
  });

  test('seeds and returns default subscriptions when storage is empty', async () => {
    const subscriptions = await Storage.loadSubscriptions();

    const seededSubscriptions = MOCK_SUBSCRIPTIONS.map((subscription) => ({
      ...subscription,
      status: computeSubscriptionStatus(subscription.nextBillingDate),
    }));

    expect(subscriptions).toEqual(seededSubscriptions);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@smart-subscription-alert/subscriptions',
      JSON.stringify(seededSubscriptions),
    );
  });

  test.each<{
    billingCycle: BillingCycle;
    cost: number;
    expected: number;
  }>([
    { billingCycle: 'weekly', cost: 120, expected: 520 },
    { billingCycle: 'monthly', cost: 120, expected: 120 },
    { billingCycle: 'quarterly', cost: 120, expected: 40 },
    { billingCycle: 'yearly', cost: 120, expected: 10 },
  ])(
    'prorates a $billingCycle bill to its monthly cost',
    ({ billingCycle, cost, expected }) => {
      expect(getProratedMonthlyCost(cost, billingCycle)).toBeCloseTo(
        expected,
      );
    },
  );

  test('splits a prorated monthly cost across household members', () => {
    expect(getProratedMonthlyCost(120, 'monthly', 2)).toBeCloseTo(60);
    expect(getProratedMonthlyCost(120, 'weekly', 2)).toBeCloseTo(260);
    expect(getProratedMonthlyCost(900, 'quarterly', 3)).toBeCloseTo(100);
  });

  test('reduces the monthly burn rate by shared member counts', () => {
    const sharedSubscriptions: Subscription[] = [
      {
        ...MOCK_SUBSCRIPTIONS[0],
        id: 'solo',
        amount: 300,
        billingCycle: 'monthly',
        sharedWithCount: 1,
      },
      {
        ...MOCK_SUBSCRIPTIONS[1],
        id: 'split',
        amount: 120,
        billingCycle: 'monthly',
        sharedWithCount: 2,
      },
    ];

    expect(getMonthlyBurnRate(sharedSubscriptions)).toBeCloseTo(360);
  });

  test('calculates the monthly burn rate for mixed billing cycles', () => {
    const mixedSubscriptions: Subscription[] = [
      {
        ...MOCK_SUBSCRIPTIONS[0],
        id: 'weekly',
        amount: 120,
        billingCycle: 'weekly',
      },
      {
        ...MOCK_SUBSCRIPTIONS[1],
        id: 'monthly',
        amount: 300,
        billingCycle: 'monthly',
      },
      {
        ...MOCK_SUBSCRIPTIONS[2],
        id: 'quarterly',
        amount: 900,
        billingCycle: 'quarterly',
      },
      {
        ...MOCK_SUBSCRIPTIONS[3],
        id: 'yearly',
        amount: 1200,
        billingCycle: 'yearly',
      },
    ];

    expect(getMonthlyBurnRate(mixedSubscriptions)).toBeCloseTo(1220);
  });

  test.each<{
    billingCycle: BillingCycle;
    dueDate: string;
    expectedDueDate: string;
  }>([
    {
      billingCycle: 'weekly',
      dueDate: '2026-01-29',
      expectedDueDate: '2026-02-05',
    },
    {
      billingCycle: 'monthly',
      dueDate: '2026-01-31',
      expectedDueDate: '2026-02-28',
    },
    {
      billingCycle: 'quarterly',
      dueDate: '2026-11-30',
      expectedDueDate: '2027-02-28',
    },
    {
      billingCycle: 'yearly',
      dueDate: '2028-02-29',
      expectedDueDate: '2029-02-28',
    },
  ])(
    'marks a $billingCycle subscription as paid and advances its due date',
    async ({ billingCycle, dueDate, expectedDueDate }) => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 7, 7, 12, 0, 0, 0));
      const subscription: Subscription = {
        ...MOCK_SUBSCRIPTIONS[0],
        id: `mark-paid-${billingCycle}`,
        billingCycle,
        nextBillingDate: dueDate,
      };

      await Storage.saveSubscriptions([subscription]);
      const updatedSubscriptions = await markAsPaid(subscription.id);

      expect(updatedSubscriptions).toEqual([
        expect.objectContaining({
          id: subscription.id,
          lastPaidDate: '2026-08-07',
          nextBillingDate: expectedDueDate,
          status: computeSubscriptionStatus(expectedDueDate),
        }),
      ]);
      await expect(Storage.loadSubscriptions()).resolves.toEqual(
        updatedSubscriptions,
      );
    },
  );

  test.each<{
    dueDate: string;
    expected: ReturnType<typeof computeSubscriptionStatus>;
  }>([
    { dueDate: '2026-08-06', expected: 'overdue' },
    { dueDate: '2026-08-07', expected: 'due_soon' },
    { dueDate: '2026-08-10', expected: 'due_soon' },
    { dueDate: '2026-08-11', expected: 'active' },
  ])(
    'computes $expected when the bill is due on $dueDate',
    ({ dueDate, expected }) => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 7, 7, 12, 0, 0, 0));

      expect(computeSubscriptionStatus(dueDate)).toBe(expected);
    },
  );

  test('auto-rolls overdue billing dates forward by their cycle', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 7, 12, 0, 0, 0));

    const overdueSubscription: Subscription = {
      ...MOCK_SUBSCRIPTIONS[0],
      id: 'overdue-monthly',
      billingCycle: 'monthly',
      nextBillingDate: '2026-01-31',
    };

    await Storage.saveSubscriptions([overdueSubscription]);
    const updatedSubscriptions = await rollForwardOverdueSubscriptions();

    expect(updatedSubscriptions).toEqual([
      expect.objectContaining({
        id: 'overdue-monthly',
        nextBillingDate: '2026-08-28',
        status: 'active',
      }),
    ]);
    await expect(Storage.loadSubscriptions()).resolves.toEqual(
      updatedSubscriptions,
    );
  });

  test('builds a valid UPI pay URI from the required fields', () => {
    expect(
      generateUpiUrl({
        pa: 'merchant@upi',
        pn: 'Smart Alert',
        am: 49,
        cu: 'INR',
        tn: 'Coffee tip',
      }),
    ).toBe(
      'upi://pay?pa=merchant%40upi&pn=Smart%20Alert&am=49&cu=INR&tn=Coffee%20tip',
    );
  });

  test('shows a privacy-first support screen and opens a UPI tip intent', async () => {
    const canOpenURLSpy = jest
      .spyOn(Linking, 'canOpenURL')
      .mockResolvedValue(true);
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByText, getByRole } = await render(<SupportScreen />);

    expect(
      getByText('Your bills stay on this device'),
    ).toBeTruthy();
    expect(
      getByText(/never sends your subscriptions/i),
    ).toBeTruthy();
    expect(getByRole('button', { name: /Copy UPI ID/i })).toBeTruthy();
    expect(getByText('Data & Privacy')).toBeTruthy();
    expect(getByRole('button', { name: /Export Backup \(JSON\)/i })).toBeTruthy();
    expect(getByRole('button', { name: /Restore from Backup/i })).toBeTruthy();

    await fireEvent.press(
      getByRole('button', { name: /Buy me a coffee/i }),
    );

    await waitFor(() => {
      expect(openURLSpy).toHaveBeenCalledWith(
        generateUpiUrl({
          pa: SUPPORT_UPI_ID,
          pn: SUPPORT_PAYEE_NAME,
          am: 49,
          cu: 'INR',
          tn: 'Buy me a coffee',
        }),
      );
    });
    expect(getByRole('button', { name: /Buy me a lunch/i })).toBeTruthy();
    expect(canOpenURLSpy).toHaveBeenCalled();
  });

  test('copies the support UPI ID to the clipboard', async () => {
    const { getByRole, getByText } = await render(<SupportScreen />);

    await fireEvent.press(getByRole('button', { name: /Copy UPI ID/i }));

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(SUPPORT_UPI_ID);
    });
    expect(getByText(`Copied ${SUPPORT_UPI_ID} to the clipboard.`)).toBeTruthy();
  });

  test('serializes a backup payload with schema version, timestamp, and subscriptions', () => {
    const exportedAt = '2026-08-15T11:30:00.000Z';
    const payload = createBackupPayload(MOCK_SUBSCRIPTIONS, exportedAt);

    expect(payload).toEqual({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt,
      subscriptions: MOCK_SUBSCRIPTIONS,
    });
    expect(JSON.parse(JSON.stringify(payload)).subscriptions).toHaveLength(4);
  });

  test('parses a versioned backup and migrates legacy subscription fields', () => {
    const importedSubscriptions = parseBackupJson(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: '2026-08-15T11:30:00.000Z',
        subscriptions: [
          {
            id: 'legacy-1',
            name: 'Netflix',
            amount: 649,
            nextBillingDate: '2026-09-15',
          },
        ],
      }),
    );

    expect(importedSubscriptions).toEqual([
      expect.objectContaining({
        id: 'legacy-1',
        name: 'Netflix',
        amount: 649,
        nextBillingDate: '2026-09-15',
        category: 'other',
        billingCycle: 'monthly',
        isFreeTrial: false,
        sharedWithCount: 1,
        status: computeSubscriptionStatus('2026-09-15'),
      }),
    ]);
  });

  test('rejects malformed backup files', () => {
    expect(() => parseBackupJson('not-json')).toThrow(
      'Backup file is not valid JSON.',
    );
    expect(() => parseBackupJson(JSON.stringify({ foo: 1 }))).toThrow(
      'Backup file must contain a subscriptions array.',
    );
    expect(() =>
      parseBackupJson(
        JSON.stringify({
          schemaVersion: 1,
          subscriptions: [{ id: '1', name: 'Netflix', amount: -5 }],
        }),
      ),
    ).toThrow('invalid amount');
    expect(() =>
      parseBackupJson(
        JSON.stringify([
          {
            id: '1',
            name: 'Netflix',
            amount: 649,
            nextBillingDate: '15-09-2026',
          },
        ]),
      ),
    ).toThrow('invalid billing date');
  });

  test('exports subscriptions to a shared JSON backup file', async () => {
    await Storage.saveSubscriptions(MOCK_SUBSCRIPTIONS);

    const result = await exportDataAsJson();

    expect(result.payload.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(result.payload.subscriptions).toEqual(
      MOCK_SUBSCRIPTIONS.map((subscription) => ({
        ...subscription,
        status: computeSubscriptionStatus(subscription.nextBillingDate),
      })),
    );
    expect(globalThis.__TEST_WRITTEN_BACKUP__).toEqual(
      JSON.stringify(result.payload, null, 2),
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      result.uri,
      expect.objectContaining({
        mimeType: 'application/json',
      }),
    );
  });

  test('replaces local subscriptions from a valid backup file', async () => {
    await Storage.saveSubscriptions(MOCK_SUBSCRIPTIONS);
    const importedSubscription: Subscription = {
      ...MOCK_SUBSCRIPTIONS[0],
      id: 'imported-1',
      name: 'Hotstar',
      amount: 299,
      nextBillingDate: '2026-10-01',
      category: 'streaming',
    };
    globalThis.__TEST_BACKUP_JSON__ = JSON.stringify(
      createBackupPayload([importedSubscription], '2026-08-15T11:30:00.000Z'),
    );
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///cache/backup.json',
          name: 'backup.json',
          mimeType: 'application/json',
          size: 128,
          lastModified: Date.now(),
        },
      ],
    });

    const result = await importDataFromJson('replace');

    expect(result).toEqual({
      status: 'imported',
      mode: 'replace',
      subscriptions: [
        expect.objectContaining({
          id: 'imported-1',
          name: 'Hotstar',
        }),
      ],
    });
    await expect(Storage.loadSubscriptions()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'imported-1', name: 'Hotstar' }),
      ]),
    );
    expect(scheduleNotificationAsyncMock).toHaveBeenCalled();
  });

  test('merges imported subscriptions with existing local data', () => {
    const existing = MOCK_SUBSCRIPTIONS[0];
    const incoming: Subscription = {
      ...MOCK_SUBSCRIPTIONS[1],
      id: 'incoming-1',
      name: 'Hotstar',
    };

    expect(mergeSubscriptions([existing], [incoming])).toEqual([
      existing,
      incoming,
    ]);
    expect(
      mergeSubscriptions(
        [existing],
        [{ ...existing, name: 'Airtel Fiber' }],
      ),
    ).toEqual([expect.objectContaining({ id: existing.id, name: 'Airtel Fiber' })]);
  });

  test('cancels restore when no backup file is chosen', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: true,
      assets: null,
    });

    await expect(importDataFromJson('replace')).resolves.toEqual({
      status: 'canceled',
    });
  });

  test('rejects a malformed backup file during restore', async () => {
    globalThis.__TEST_BACKUP_JSON__ = '{"foo":1}';
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///cache/backup.json',
          name: 'backup.json',
          mimeType: 'application/json',
          size: 9,
          lastModified: Date.now(),
        },
      ],
    });

    await expect(importDataFromJson('replace')).rejects.toThrow(
      'Backup file must contain a subscriptions array.',
    );
  });

  test('asks for confirmation before restoring a backup', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByRole } = await render(<SupportScreen />);

    await fireEvent.press(getByRole('button', { name: /Restore from Backup/i }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Restore from backup?',
      expect.stringMatching(/Replace all local subscriptions/i),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Merge' }),
        expect.objectContaining({ text: 'Replace all', style: 'destructive' }),
      ]),
    );
  });

  test('opens the support screen from the home settings button', async () => {
    const { findByLabelText } = await render(<HomeScreen />);
    const settingsButton = await findByLabelText('Settings');

    await fireEvent.press(settingsButton);

    expect(router.push).toHaveBeenCalledWith('/support');
  });

  test('generates prorated category totals for the donut chart', () => {
    const subscriptions: Subscription[] = [
      {
        ...MOCK_SUBSCRIPTIONS[0],
        amount: 120,
        billingCycle: 'weekly',
        category: 'telecom',
      },
      {
        ...MOCK_SUBSCRIPTIONS[1],
        amount: 900,
        billingCycle: 'quarterly',
        category: 'utility',
      },
      {
        ...MOCK_SUBSCRIPTIONS[2],
        amount: 1200,
        billingCycle: 'yearly',
        category: 'streaming',
      },
    ];

    const chartData = generateCategoryChartData(
      subscriptions,
      getProratedMonthlyCost,
    );

    expect(chartData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'Telecom',
          value: 520,
          text: '57%',
        }),
        expect.objectContaining({
          category: 'Utility',
          value: 300,
          text: '33%',
        }),
        expect.objectContaining({
          category: 'Streaming',
          value: 100,
          text: '11%',
        }),
      ]),
    );
    expect(new Set(chartData.map((item) => item.color)).size).toBe(3);
  });
});
