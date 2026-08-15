# Google Play Data Safety & Sensitive Permissions Guide

Use these answers in Play Console for Smart Subscription Alert. They match the on-device, no-backend design.

## Data safety

**Does your app collect or share any of the required user data types?**  
**NO.**

**Is this data collected or shared?**  
**Neither. It is processed locally.**

Do not declare financial info, SMS, or notification contents as collected or shared. Subscription names, amounts, and due dates stay in AsyncStorage on the device. JSON backups are created only when the user exports a file. Smart Passbook parses notification text on-device and never sends it off the phone.

Suggested follow-ups if Console asks for more detail:

- Data encrypted in transit: Not applicable (no network transmission of user data).
- Users can request deletion: Yes — uninstalling the app removes local storage.
- Data used for ads / fraud / personalization: No.

## Sensitive permissions declaration

Paste this into the `BIND_NOTIFICATION_LISTENER_SERVICE` / Notification Listener justification box:

Smart Subscription Alert uses BIND_NOTIFICATION_LISTENER_SERVICE as the core of its optional Smart Passbook feature. The listener exists only to recognize on-device bank and subscription transaction alerts (for example AutoPay / UPI mandate notifications) so the app can suggest or record a local subscription without asking the user to type every bill by hand. All matching happens on the device. No notification payload, SMS body, or financial detail is transmitted to a server, stored in the cloud, or shared with third parties. This approach is deliberately narrower than READ_SMS: the app never requests SMS inbox permission and never reads the telephony SMS store. Users must grant Notification access themselves in Android settings, and they can revoke it at any time without losing the rest of the app.
