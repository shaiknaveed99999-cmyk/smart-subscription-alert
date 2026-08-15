import { addSubscription } from './storage';
import { parseBankSms } from './smsParser';
import { isValidIsoDate } from './validation';

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function toIsoDateParts(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month, day));
  return date.toISOString().slice(0, 10);
}

function todayIsoDate(): string {
  const now = new Date();
  return toIsoDateParts(now.getFullYear(), now.getMonth(), now.getDate());
}

export function toIsoBillingDate(rawDate: string): string {
  if (isValidIsoDate(rawDate)) {
    return rawDate;
  }

  const monthNameMatch = rawDate.match(
    /^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/,
  );

  if (monthNameMatch) {
    const day = Number(monthNameMatch[1]);
    const month = MONTH_INDEX[monthNameMatch[2].toLowerCase()];
    let year = Number(monthNameMatch[3]);

    if (month === undefined) {
      return todayIsoDate();
    }

    if (year < 100) {
      year += 2000;
    }

    return toIsoDateParts(year, month, day);
  }

  const numericMatch = rawDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);

  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]) - 1;
    let year = Number(numericMatch[3]);

    if (year < 100) {
      year += 2000;
    }

    return toIsoDateParts(year, month, day);
  }

  return todayIsoDate();
}

export default async function bankSmsBackgroundTask({
  text,
}: {
  text: string;
}): Promise<void> {
  const parsed = parseBankSms(text);

  if (!parsed?.isAutoPay) {
    return;
  }

  await addSubscription({
    name: parsed.merchant,
    amount: parsed.amount,
    category: 'other',
    nextBillingDate: toIsoBillingDate(parsed.date),
  });
}
