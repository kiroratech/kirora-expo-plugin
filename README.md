# Kirora Expo plugin

An [Expo config plugin](https://docs.expo.dev/config-plugins/introduction/) for
[`@kirora/react-native`](https://github.com/kiroratech/kirora-react-native). It applies the
native push setup that Kirora needs every time `npx expo prebuild` generates your `android/`
and `ios/` folders, so you don't have to add it to them by hand.

> **Preview: 0.1.0, not yet verified on a device.** `@kirora/react-native` and Kirora's iOS pods
> are not published yet, so for now the plugin works only against local checkouts (see
> [Example app](#example-app)). Requires a [development build](https://docs.expo.dev/develop/development-builds/introduction/):
> Expo Go can't load Kirora's native code.

## Compatibility

| `@kirora/expo-plugin` | Expo SDK | `@kirora/react-native` | Status |
| --- | --- | --- | --- |
| 0.1.x | 58 | 0.1.x | Prebuild tested with the example app |
| 0.1.x | 53–57 | 0.1.x | Allowed by `peerDependencies`, untested |

## What it does

| Platform | Change |
| --- | --- |
| Android | Adds your monochrome notification icon (`kirora_notification_icon`) and accent colour, and points Kirora's pushes at them (`io.kirora.default_notification_icon`, `io.kirora.default_notification_color`). Warns when `android.googleServicesFile` is missing. |
| iOS | Sets the push entitlement (`aps-environment`). Adds a `KiroraNotificationService` Notification Service Extension target with the `KiroraNotificationService` pod, for delivery reports, images and buttons. Declares the extension to EAS Build so EAS can create its bundle identifier and provisioning profile. |

Firebase is Expo's own job: set `android.googleServicesFile` and Expo copies the file and applies
the Google Services plugin.

## Install

```sh
npx expo install @kirora/react-native @kirora/expo-plugin
```

```json
{
  "expo": {
    "ios": { "bundleIdentifier": "com.example.app" },
    "android": {
      "package": "com.example.app",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "@kirora/expo-plugin",
        {
          "mode": "production",
          "android": { "icon": "./assets/notification-icon.png", "color": "#FF5500" }
        }
      ]
    ]
  }
}
```

Then run `npx expo prebuild` and build with `npx expo run:android`, `npx expo run:ios` or EAS
Build. Any change to the plugin's options needs a new prebuild and a new native build; a JS
reload is not enough.

## Options

All options are optional. Paths are relative to the project root. The plugin checks every
option when the app config loads and stops prebuild with a message naming any wrong one.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `mode` | `"development"` \| `"production"` | `"development"` | iOS `aps-environment`. Use `"production"` for TestFlight and App Store builds. |
| `android.icon` | string (path to a PNG) | none | White-on-transparent PNG, ideally 96×96. Without it, Kirora uses FCM's `default_notification_icon` if you set one, then the launcher icon. |
| `android.color` | string, `#RRGGBB` | none | Accent colour of Kirora pushes. |
| `ios.notificationServiceExtension` | boolean | `true` | `false` leaves out the extension and its pod: no delivery reports, images or buttons, unless you [use your own extension](#an-existing-notification-service-extension). |
| `ios.deploymentTarget` | string, such as `"16.4"` | app config's `ios.deploymentTarget`, else `15.1` | The extension's iOS deployment target. The plugin also makes it the platform of the extension's Podfile target, so the extension and its pods always match. |
| `ios.apiUrl` | string, `http(s)://…` | none | Set it to the same `apiUrl` you pass to Kirora in JS, when you use one: the extension can't read the app's options. |
| `ios.appleTeamId` | string | `ios.appleTeamId` | Apple team that signs the extension. |
| `ios.localSdkPath` | string (path) | none | Development only: a local kirora-ios checkout used for the `Kirora` and `KiroraNotificationService` pods. |

## iOS: signing, EAS Build and credentials

- The extension's bundle identifier is `<ios.bundleIdentifier>.KiroraNotificationService`. Apple
  needs it registered and provisioned on its own.
- **EAS Build:** the plugin declares the extension under
  `extra.eas.build.experimental.ios.appExtensions`, so `eas build` and `eas credentials` create
  its identifier and provisioning profile next to the app's. See
  [Expo's guide to app extensions](https://docs.expo.dev/build-reference/app-extensions/).
- **Local builds:** set `ios.appleTeamId` in the app config (or the plugin's `ios.appleTeamId`)
  so Xcode can sign the extension automatically.
- The extension needs no App Group or other capability: everything it reports comes from the
  push itself. Its entitlements file is empty.
- This plugin doesn't set up push credentials (the APNs key, Firebase's server credentials).
- The extension's version and build number are copied from the app's (`ios.version` or
  `version`, and `ios.buildNumber`), as App Store Connect requires.

## Prebuild and `--clean`

The plugin applies its changes on every prebuild and replaces its own earlier changes, so running
`npx expo prebuild` twice gives the same project. Removing an option also removes what it added
(the icon file, the colour, the manifest entries, the Podfile block).

`npx expo prebuild --clean` deletes `android/` and `ios/` and generates them again, which also
drops any edits you made there by hand. If you turn off `ios.notificationServiceExtension` and
prebuild finds the extension target still in `ios/`, it stops and asks you to run
`npx expo prebuild --clean`.

## Other push libraries

Kirora's Android SDK has its own Firebase messaging service. Another library that registers one,
such as `expo-notifications`, needs Kirora's forwarding integration: see the
`@kirora/react-native` README.

### An existing Notification Service Extension

An iOS app can have only one Notification Service Extension. If you already have one, set
`ios.notificationServiceExtension: false`, add the `KiroraNotificationService` pod to your
extension's Podfile target, and pass pushes to Kirora from your extension:

```swift
import KiroraNotificationService

override func didReceive(_ request: UNNotificationRequest,
                         withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    if KiroraNotificationService.didReceive(request, withContentHandler: contentHandler) { return }
    // Not a Kirora push: your own handling, then contentHandler(…)
}

override func serviceExtensionTimeWillExpire() {
    KiroraNotificationService.serviceExtensionTimeWillExpire()
    // …and your own
}
```

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Cannot find native module` / Kirora is undefined | You're in Expo Go or an old build. Prebuild, then make a new development build. |
| `pod install` can't find `Kirora` or `KiroraNotificationService` | The pods aren't published yet: set `ios.localSdkPath` to a kirora-ios checkout. |
| Signing fails for `KiroraNotificationService` | The extension has no team or profile. Set `ios.appleTeamId`, or let `eas credentials` create its profile. |
| iOS pushes arrive without images, buttons or delivery reports | The extension is missing or not running. Check that `ios.notificationServiceExtension` isn't `false` and that the push has `mutable-content: 1`. |
| The Android notification icon is a white square | Set `android.icon` to a white-on-transparent PNG. |

## Example app

`example/` is set up only through this plugin. It expects `kirora-react-native` and `kirora-ios`
checked out next to this repository (or `KIRORA_IOS_SDK_PATH` pointing at kirora-ios), and the
Kirora Android SDK in Maven Local (`./gradlew publishToMavenLocal` in kirora-android); the
example's `app.config.js` adds `mavenLocal()` to the Android build for that. Build the plugin
first: the example links it with `file:..` and loads its compiled `build/`.

```sh
npm install --legacy-peer-deps        # @kirora/react-native is not on npm yet
npm run build
cd example
npm install --legacy-peer-deps
npx expo prebuild --clean
npx expo run:android                  # or run:ios
```

Add your own `example/google-services.json` for Android push; it is not committed. The example
points the iOS extension at the fake Kirora API on `http://localhost:4010` from
`kirora-react-native/example/e2e`. Start that before sending test pushes, and replace `localhost`
with your machine's address when you run on a physical device.

## Development

```sh
npm install --legacy-peer-deps
npm test                               # builds, then runs the unit tests in test/
./scripts/check-example-prebuild.sh    # prebuilds example/ twice and checks the result
```

The unit tests run the plugin's mods against native files from Expo's SDK 58 template
(`test/fixtures/`). CI (`.github/workflows/ci.yml`) runs both on every push to `main` and every
pull request.
