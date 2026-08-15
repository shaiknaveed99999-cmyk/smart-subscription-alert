# Smart Subscription Alert

A React Native (Expo Router) app for tracking subscriptions and utility bills — total monthly spend at a glance, with a clean list of active renewals.

## Stack

- Expo SDK 57 + Expo Router
- TypeScript
- React Native Safe Area Context
- AsyncStorage for persistent local data
- Expo Notifications for local bill reminders
- Gifted Charts and React Native SVG for spending analytics

## Project structure

```
app/                  # Expo Router screens
  _layout.tsx         # Root layout
  index.tsx           # Home dashboard
  add-subscription.tsx # Add-subscription modal
components/
  TotalSpendCard.tsx  # Monthly spend summary
  SubscriptionList.tsx
  SubscriptionRow.tsx
constants/theme.ts    # Colors, spacing, radius
data/mockSubscriptions.ts
types/subscription.ts
utils/
  format.ts
  notifications.ts     # Permissions, Android channel, and alert scheduling
  storage.ts          # Local CRUD persistence
  validation.ts       # Form validation helpers
```

## Getting started

```bash
npm install
npx expo start
```

## Tests

```bash
npm test
```

The Jest suite covers AsyncStorage persistence and initialization, add-form
validation, and one-day notification scheduling.

## Local data

Subscriptions are stored locally with AsyncStorage. On first launch, the app
seeds storage with Airtel Broadband, Jio, Amazon Pay, and Simpl mock data.
New subscriptions can be added from the dashboard and existing subscriptions
can be deleted after confirmation.

Weekly, monthly, quarterly, and yearly billing cycles are supported. The
dashboard converts each cost to its monthly equivalent and displays the
combined monthly burn rate. A dashboard donut chart groups that prorated spend
by category with percentages and category totals.

New subscriptions schedule a local reminder for 10:00 AM, one day before the
billing due date, when notification permission has been granted.
