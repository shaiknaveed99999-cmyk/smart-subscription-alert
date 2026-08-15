import * as Clipboard from 'expo-clipboard';
import { Alert, Linking } from 'react-native';

import {
  SUPPORT_PAYEE_NAME,
  SUPPORT_TIP_NOTE,
  SUPPORT_UPI_ID,
} from '../constants/support';

const KNOWN_PAYMENT_URLS: ReadonlyArray<{
  matches: string[];
  url: string;
}> = [
  {
    matches: ['jio'],
    url: 'https://www.jio.com/selfcare/paybill/',
  },
  {
    matches: ['airtel'],
    url: 'https://www.airtel.in/recharge-online',
  },
  {
    matches: ['amazon pay'],
    url: 'https://www.amazon.in/amazonpay/home',
  },
  {
    matches: ['google pay', 'gpay'],
    url: 'gpay://upi/pay',
  },
  {
    matches: ['phonepe'],
    url: 'phonepe://pay',
  },
  {
    matches: ['simpl'],
    url: 'https://getsimpl.com/',
  },
];

function normalizeCustomPaymentUrl(
  serviceName: string,
  customUrl: string,
): string {
  const trimmedUrl = customUrl.trim();

  if (/^[^\s:@]+@[^\s@]+$/.test(trimmedUrl)) {
    return `upi://pay?pa=${encodeURIComponent(
      trimmedUrl,
    )}&pn=${encodeURIComponent(serviceName)}`;
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

function getPaymentCandidates(
  serviceName: string,
  customUrl?: string,
): string[] {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `pay ${serviceName}`,
  )}`;

  if (customUrl?.trim()) {
    return [
      normalizeCustomPaymentUrl(serviceName, customUrl),
      searchUrl,
    ];
  }

  const normalizedServiceName = serviceName.toLowerCase();
  const knownService = KNOWN_PAYMENT_URLS.find(({ matches }) =>
    matches.some((name) => normalizedServiceName.includes(name)),
  );

  return knownService ? [knownService.url, searchUrl] : [searchUrl];
}

export type UpiPaymentParams = {
  pa: string;
  pn: string;
  am: string | number;
  cu?: string;
  tn?: string;
};

export function generateUpiUrl({
  pa,
  pn,
  am,
  cu = 'INR',
  tn,
}: UpiPaymentParams): string {
  const query = [
    `pa=${encodeURIComponent(pa)}`,
    `pn=${encodeURIComponent(pn)}`,
    `am=${encodeURIComponent(String(am))}`,
    `cu=${encodeURIComponent(cu)}`,
  ];

  if (tn) {
    query.push(`tn=${encodeURIComponent(tn)}`);
  }

  return `upi://pay?${query.join('&')}`;
}

export async function copyUpiIdToClipboard(): Promise<void> {
  await Clipboard.setStringAsync(SUPPORT_UPI_ID);
}

export async function openUpiTip(
  amount: number,
  note: string = SUPPORT_TIP_NOTE,
): Promise<boolean> {
  if (!Number.isFinite(amount) || amount <= 0) {
    Alert.alert('Enter a valid tip', 'Tip amount must be greater than zero.');
    return false;
  }

  const upiUrl = generateUpiUrl({
    pa: SUPPORT_UPI_ID,
    pn: SUPPORT_PAYEE_NAME,
    am: Number.isInteger(amount) ? String(amount) : amount.toFixed(2),
    cu: 'INR',
    tn: note,
  });

  try {
    const canOpen = await Linking.canOpenURL(upiUrl);

    if (canOpen) {
      await Linking.openURL(upiUrl);
      return true;
    }
  } catch (error: unknown) {
    console.warn('Could not open the UPI payment app.', error);
  }

  try {
    await Linking.openURL(upiUrl);
    return true;
  } catch (error: unknown) {
    console.warn('UPI intent fallback also failed.', error);
  }

  try {
    await copyUpiIdToClipboard();
    Alert.alert(
      'No UPI app found',
      `Copied ${SUPPORT_UPI_ID} to your clipboard. Paste it in any UPI app to send ₹${amount}.`,
    );
  } catch (clipboardError: unknown) {
    Alert.alert(
      'No UPI app found',
      `Open any UPI app and pay ${SUPPORT_UPI_ID}.`,
    );
    console.warn('Could not copy the UPI ID.', clipboardError);
  }

  return false;
}

export async function openPaymentApp(
  serviceName: string,
  customUrl?: string,
): Promise<boolean> {
  const candidates = getPaymentCandidates(serviceName, customUrl);

  for (const url of candidates) {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch (error: unknown) {
      console.warn(`Could not open payment link: ${url}`, error);
    }
  }

  console.warn(`No payment link is available for ${serviceName}.`);
  return false;
}
