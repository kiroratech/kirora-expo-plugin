# Kirora Expo plugin

An [Expo config plugin](https://docs.expo.dev/config-plugins/introduction/) for
[`@kirora/react-native`](https://github.com/kiroratech/kirora-react-native). It adds Kirora's native
push setup each time `npx expo prebuild` generates `android/` and `ios/`.

> **0.1.0.** `@kirora/react-native` is not on npm and Kirora's iOS pods are not on CocoaPods yet.
> The Android SDK is on Maven Central.
> Kirora needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/):
> Expo Go can't load its native code.

## Compatibility

Tested with Expo SDK 58 and `@kirora/react-native` 0.1.x, using the example app on Android and
iPhone devices. `peerDependencies` also allow Expo SDK 53–57, untested.

## What it does

- **Android:** adds your notification icon (`kirora_notification_icon`) and accent colour, and
  points Kirora's pushes at them. Warns when `android.googleServicesFile` is missing; Expo copies
  that file and applies the Google Services plugin.
- **iOS:** sets the push entitlement (`aps-environment`). Adds a `KiroraNotificationService`
  Notification Service Extension and its pod, for delivery reports, images and buttons, and
  declares it to EAS Build. Copies `applinks:` hosts from `ios.associatedDomains` to Info.plist
  `KiroraUniversalLinkHosts`, so pushes' https links to your site open the app. It may miss a
  domain another plugin adds: list that under `ios.infoPlist.KiroraUniversalLinkHosts`.

## Install

Once the packages are published:

```sh
npx expo install @kirora/react-native @kirora/expo-plugin
```

Until then, install `@kirora/react-native` from a packed tarball and set `ios.localSdkPath` to a
kirora-ios checkout. The [example app](#running-it-locally) does both.

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

Run `npx expo prebuild`, then `npx expo run:android`, `npx expo run:ios` or EAS Build. Changing
options needs a new prebuild and build.

The plugin only configures the native projects. In JavaScript, create one Kirora client with a
`push` option, call `identify()`, and request notification permission: see the
[`@kirora/react-native` README](https://github.com/kiroratech/kirora-react-native#readme).

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
| `ios.localSdkPath` | none | A kirora-ios checkout for the Kirora pods, until they are published. |

### Sandbox or production

An APNs token works only in its build's environment. Register it with the matching Kirora push app
(`push.pushAppId` picks it when the workspace has both):

- Xcode or `npx expo run:ios`: sandbox.
- Any EAS build, TestFlight or App Store: production.

New APNs keys (.p8) work in Sandbox or Production, not both. Upload a Production key to the
production push app, and a Sandbox key to the sandbox one only if you build with Xcode or
`npx expo run:ios`.

## iOS: signing, EAS Build and credentials

- The extension's bundle identifier is `<ios.bundleIdentifier>.KiroraNotificationService`. The
  plugin declares it under `extra.eas.build.experimental.ios.appExtensions`, so EAS creates its
  identifier and profile ([Expo's guide](https://docs.expo.dev/build-reference/app-extensions/)).
- For local builds, set `ios.appleTeamId` so Xcode can sign it.
- It needs no App Group and copies the app's version and build number.
- The plugin doesn't set up push credentials.

## Prebuild and `--clean`

Each prebuild replaces the plugin's earlier changes, and removing an option removes what it added.
`npx expo prebuild --clean` regenerates `android/` and `ios/`, dropping hand edits. If you set
`ios.notificationServiceExtension: false` while the extension target is still in `ios/`, prebuild
stops and asks for `--clean`.

## Other push libraries

Another library with its own Firebase messaging service, such as `expo-notifications`, needs
Kirora's forwarding integration
([`@kirora/react-native` README](https://github.com/kiroratech/kirora-react-native#readme)).

### An existing Notification Service Extension

An iOS app can have only one. If you already have one:

1. Set `ios.notificationServiceExtension: false`.
2. Add `KiroraNotificationService` to your extension's Podfile target. While it is unpublished, use
   `pod 'KiroraNotificationService', :path => '/path/to/kirora-ios'`.
3. With a custom `apiUrl`, set `KiroraApiUrl` in your extension's Info.plist. The plugin's
   `ios.apiUrl` only configures the extension it generates.
4. Pass pushes to Kirora:

```swift
import KiroraNotificationService

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

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot find native module` | Prebuild and make a new development build. |
| iOS pushes lack images, buttons or delivery reports | Keep the extension on, and send pushes with `mutable-content: 1`. |
| The Android icon is a white square | Set `android.icon` to a white-on-transparent PNG. |

## Example app: Kirora Shop

`example/` is a small coffee shop app set up only through this plugin. It has no backend: products,
cart, orders and inbox live in the app.

| Kirora feature | Where |
| --- | --- |
| `identify`, `logout`, `fetchUserToken` | Sign in (email only), Account → Sign out |
| `track`, `trackScreenView`, `beforeSend` | Shop events and every screen; removes `email` from properties |
| `requestPushPermission`, `setPushConsent` | The prompt after first sign-in; "Notify me" on sold-out products |
| `getPushStatus`, `setPushEnabled`, `setTrackingConsent` | Account |
| `onNotificationReceived`, `onForegroundNotification`, `onNotificationClicked` | Inbox. iOS has no received event: a push reaches the inbox while the app is open or when tapped, not in the background. |
| `handleDeepLink` | `kirorashop://product/<id>`, `…/order/<id>`, `…/cart`, `…/inbox` |

Account → Developer tools calls each SDK method and logs results.

### Where it sends

Set these in `example/.env` or on EAS; they are compiled into the app:

| Variable | Default |
| --- | --- |
| `EXPO_PUBLIC_KIRORA_API_URL` | The fake Kirora API on port 4010 |
| `EXPO_PUBLIC_KIRORA_CLIENT_KEY` | `kirora_pk_e2e` |
| `EXPO_PUBLIC_KIRORA_TOKEN_URL` | None: sign-in uses `demo-<email>`, which only the fake API accepts |
| `EXPO_PUBLIC_KIRORA_USER_TOKEN` | None. A hand-signed user token (24 hours at most) for every sign-in |
| `EXPO_PUBLIC_KIRORA_PUSH_APP_ID_IOS` | None: Kirora picks the platform's oldest ready push app |
| `EXPO_PUBLIC_KIRORA_PUSH_APP_ID_ANDROID` | The same, for Android |

The shop posts `{"email"}` to the token URL for a `{"token"}` signed with `createUserToken` from
`@kirora/node`. That is demo behaviour: a production endpoint must
authenticate the caller and take the user id from that session.

A token compiled into an app is readable from its binary, whatever its EAS visibility: use
`EXPO_PUBLIC_KIRORA_USER_TOKEN` only for private test builds.

Set the push app ids when a platform has more than one: an ad hoc or store iOS build gets a
production APNs token, which a sandbox push app can't deliver to. An http API or token URL allows
cleartext traffic in the Android build.

### Running it locally

You need Node `^22.13.0 || ^24.3.0 || >= 26.0.0`; Xcode and CocoaPods for iOS; JDK 17 and the
Android SDK for Android. Clone `kirora-react-native` and `kirora-ios` next to this repository.
The Android SDK comes from Maven Central. `@kirora/react-native` comes from
`example/vendor/`; `npm run vendor-sdk` in `example/` refreshes it.

```sh
npm install --legacy-peer-deps
npm run build                  # the example uses build/
cd example
npm install --legacy-peer-deps
npx expo prebuild --clean
npx expo run:android           # or run:ios
```

Start the fake API from `kirora-react-native/e2e-app` with `node e2e/fake-kirora.mjs`. The
defaults (`10.0.2.2`, `localhost`) reach only an emulator or simulator. On a device, set a
reachable `EXPO_PUBLIC_KIRORA_API_URL`, or on Android run `adb reverse tcp:4010 tcp:4010`.

For Android push, add your own `example/google-services.json`.

### Building on EAS

The `preview` profile builds an APK and an ad hoc iOS build. A pre-install hook fetches the iOS SDK
at the `KIRORA_IOS_REF` commit in `eas.json`, the one the vendored `@kirora/react-native` was
tested against; move it with the tarball. Android uses the published SDK.

`app.config.js` sets `owner: 'kirora'` and an EAS `projectId`. Replace or remove both, then:

```sh
cd example
npx eas-cli login
npx eas-cli init
npx eas-cli env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment preview
npx eas-cli device:create      # register the test iPhones
npx eas-cli build --profile preview --platform all
```

Set the `EXPO_PUBLIC_KIRORA_*` variables for `preview` the same way, with
`--type string --visibility plaintext`. Upload the APNs key EAS creates to your production Kirora push app; check in Apple's developer
portal that it is a Production key.

## Development

```sh
npm install --legacy-peer-deps
npm test                               # build and unit tests
./scripts/check-example-prebuild.sh    # prebuilds example/ twice and checks it
```

CI runs both on every push to `main` and every pull request.
