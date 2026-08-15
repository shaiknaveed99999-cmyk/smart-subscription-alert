const billingDateFormatter = new Intl.DateTimeFormat('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  locale: string = 'en-IN',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatBillingDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return billingDateFormatter.format(date);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    telecom: 'Telecom',
    streaming: 'Streaming',
    entertainment: 'Entertainment',
    utility: 'Utility',
    utilities: 'Utilities',
    finance: 'Finance',
    other: 'Other',
  };
  return labels[category] ?? category;
}
