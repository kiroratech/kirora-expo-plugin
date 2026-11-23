# Changelog

## 0.1.0

First release: Kirora's native push setup on every `npx expo prebuild`.

- Android: notification icon and accent colour, and a warning when `android.googleServicesFile`
  is missing.
- iOS: the push entitlement (`aps-environment`), a `KiroraNotificationService` Notification
  Service Extension whose pod comes from the kirora-ios copy `@kirora/react-native` bundles, and
  `KiroraUniversalLinkHosts` from `ios.associatedDomains`.
