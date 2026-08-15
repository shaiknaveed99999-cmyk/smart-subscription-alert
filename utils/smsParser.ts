export type ParsedTransaction = {
  amount: number;
  merchant: string;
  isAutoPay: boolean;
  date: string;
};

const AMOUNT_PATTERN = /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i;
const AUTOPAY_PATTERN =
  /\b(mandate|autopay|auto[\s-]?pay|recurring|scheduled)\b/i;
const MERCHANT_PATTERNS = [
  /debited for\s+(.+?)(?=\s+on\b|[.,\n]|$)/i,
  /paid to\s+(.+?)(?=\s+on\b|[.,\n]|$)/i,
  /\bto\s+(.+?)(?=\s+on\b|[.,\n]|$)/i,
];
const DATE_PATTERN =
  /\bon\s+(\d{1,2}[-/](?:[A-Za-z]{3}|\d{1,2})[-/]\d{2,4})/i;

export function parseBankSms(text: string): ParsedTransaction | null {
  const amountMatch = text.match(AMOUNT_PATTERN);

  if (!amountMatch) {
    return null;
  }

  const amount = Number(amountMatch[1].replace(/,/g, ''));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  let merchant: string | undefined;

  for (const pattern of MERCHANT_PATTERNS) {
    const merchantMatch = text.match(pattern);

    if (merchantMatch?.[1]?.trim()) {
      merchant = merchantMatch[1].trim();
      break;
    }
  }

  if (!merchant) {
    return null;
  }

  const dateMatch = text.match(DATE_PATTERN);

  return {
    amount,
    merchant,
    isAutoPay: AUTOPAY_PATTERN.test(text),
    date: dateMatch?.[1] ?? '',
  };
}
