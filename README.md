# Kirora Expo plugin

[![CI](https://github.com/kiroratech/kirora-expo-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/kiroratech/kirora-expo-plugin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An [Expo config plugin](https://docs.expo.dev/config-plugins/introduction/) that adds Kirora's native
push setup for [`@kirora/react-native`](https://github.com/kiroratech/kirora-react-native) each time
`npx expo prebuild` generates `android/` and `ios/`.

> **0.1.0**, the first release. `@kirora/react-native` bundles Kirora's iOS SDK, so nothing comes
> from CocoaPods trunk; the Android SDK is on Maven Central. Kirora needs a
> [development build](https://docs.expo.dev/develop/development-builds/introduction/): Expo Go
> can't load its native code.

## Requirements

| | Declared (`peerDependencies`) | Tested |
| --- | --- | --- |
| Expo SDK | 53 and later | 58 |
| `@kirora/react-native` | 0.1.0 and later | 0.1.x |

## Quick start

1. **Install:**

   ```sh
   npx expo install @kirora/react-native @kirora/expo-plugin
   ```

2. **Add the plugin** to your app config:

   ```json
   {
     "expo": {
       "ios": { "bundleIdentifier": "com.example.app" },
       "android": { "package": "com.example.app", "googleServicesFile": "./google-services.json" },
       "plugins": [
         ["@kirora/expo-plugin", { "android": { "icon": "./assets/notification-icon.png", "color": "#FF5500" } }]
       ]
     }
   }
   ```

3. **Build.** Run `npx expo prebuild`, then `npx expo run:android`, `npx expo run:ios` or EAS
   Build. Changing options needs a new prebuild and build.

4. **Set up Kirora in JavaScript.** The plugin only configures the native projects. Create one
   Kirora client with a `push` option, call `identify()`, and request notification permission:
   see the [`@kirora/react-native` README](https://github.com/kiroratech/kirora-react-native#readme).

5. **Check push.** On a device, sign in and allow notifications, then send a test push from
   Kirora to that user. Use the push app that matches the build's APNs environment
   ([below](#sandbox-or-production)).

### What it changes

- **Android:** adds your notification icon (`kirora_notification_icon`) and accent colour, and
  points Kirora's pushes at them. Warns when `android.googleServicesFile` is missing; Expo copies
  that file and applies the Google Services plugin.
- **iOS:**
  - Sets the push entitlement (`aps-environment`).
  - Adds a `KiroraNotificationService` Notification Service Extension, for delivery reports,
    images and buttons, with its pod from the copy `@kirora/react-native` bundles, and declares it
    to EAS Build.
  - Copies `applinks:` hosts from `ios.associatedDomains` to Info.plist
    `KiroraUniversalLinkHosts`, so pushes' https links to your site open the app. It may miss a
    domain another plugin adds: list that under `ios.infoPlist.KiroraUniversalLinkHosts`.

## Options

All optional. Paths are relative to the project root. Prebuild stops on an invalid option.

| Option | Default | Meaning |
| --- | --- | --- |
| `mode` | `"development"` | iOS `aps-environment`, `"development"` or `"production"`. Distribution exports always use `production`, so it only affects Xcode and `npx expo run:ios` builds. |
| `android.icon` | none | White-on-transparent PNG, ideally 96×96. Falls back to FCM's `default_notification_icon`, then the launcher icon. |
| `android.color` | none | `#RRGGBB` accent colour of Kirora pushes. |
| `ios.notificationServiceExtension` | `true` | `false` leaves out the extension and its pod ([existing extension](#an-existing-notification-service-extension)). |
| `ios.deploymentTarget` | app's `ios.deploymentTarget`, else `15.1` | The extension's deployment target and Podfile platform. It doesn't set the app's minimum. |
| `ios.apiUrl` | none | The `apiUrl` you pass in JS, if any: the extension can't read it. |
| `ios.appleTeamId` | app's `ios.appleTeamId` | Apple team that signs the extension. |

## Platform notes

### Sandbox or production

An APNs token works only in its build's environment. Register it with the matching Kirora push app
(`push.pushAppId` picks it when the workspace has both):

- Xcode or `npx expo run:ios`: sandbox.
- Any EAS build, TestFlight or App Store: production.

New APNs keys (.p8) work in Sandbox or Production, not both. Upload a Production key to the
production push app, and a Sandbox key to the sandbox one only if you build with Xcode or
`npx expo run:ios`. The plugin doesn't set up push credentials.

### Signing and EAS Build

- The extension's bundle identifier is `<ios.bundleIdentifier>.KiroraNotificationService`. The
  plugin declares it under `extra.eas.build.experimental.ios.appExtensions`, so EAS creates its
  identifier and profile ([Expo's guide](https://docs.expo.dev/build-reference/app-extensions/)).
- For local builds, set `ios.appleTeamId` so Xcode can sign it.
- It needs no App Group and copies the app's version and build number.

### Prebuild and `--clean`

Each prebuild replaces the plugin's earlier changes, and removing an option removes what it added.
`npx expo prebuild --clean` regenerates `android/` and `ios/`, dropping hand edits. If you set
`ios.notificationServiceExtension: false` while the extension target is still in `ios/`, prebuild
stops and asks for `--clean`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot find native module` | Prebuild and make a new development build. |
| iOS pushes lack images, buttons or delivery reports | Keep the extension on, and send pushes with `mutable-content: 1`. |
| The Android icon is a white square | Set `android.icon` to a white-on-transparent PNG. |

### Other push libraries

Another library with its own Firebase messaging service, such as `expo-notifications`, needs
Kirora's forwarding integration
([`@kirora/react-native` README](https://github.com/kiroratech/kirora-react-native#readme)).

### An existing Notification Service Extension

An iOS app can have only one. If you already have one:

1. Set `ios.notificationServiceExtension: false`.
2. Add `KiroraNotificationService` to your extension's Podfile target, from the copy
   `@kirora/react-native` bundles:

   ```ruby
   pod 'KiroraNotificationService', :path => File.join(File.dirname(`node --print "require.resolve('@kirora/react-native/package.json')"`), 'ios', 'vendor', 'kirora-ios')
   ```

3. With a custom `apiUrl`, set `KiroraApiUrl` in your extension's Info.plist. The plugin's
   `ios.apiUrl` only configures the extension it generates.
4. Pass pushes to Kirora:

```swift
import KiroraNotificationService
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    private var request: UNNotificationRequest?

    override func didReceive(_ request: UNNotificationRequest,
                             withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.request = request
        if KiroraNotificationService.didReceive(request, withContentHandler: contentHandler) { return }
        // Not Kirora's: handle it, then call contentHandler
    }

    override func serviceExtensionTimeWillExpire() {
        if let request { KiroraNotificationService.serviceExtensionTimeWillExpire(for: request) }
        // …and your own
    }
}
```

## More

- [Example app: Kirora Shop](example/README.md), a coffee shop app set up only through this plugin.
- [Contributing](CONTRIBUTING.md): tests and the example prebuild check.
- License: [MIT](LICENSE).
