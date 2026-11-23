# Kirora Shop

A small coffee shop app set up only through [`@kirora/expo-plugin`](../README.md). It has no
backend: products, cart, orders and inbox live in the app.

| Kirora feature | Where |
| --- | --- |
| `identify`, `logout`, `fetchUserToken` | Sign in (email only), Account → Sign out |
| `track`, `trackScreenView`, `beforeSend` | Shop events and every screen; removes `email` from properties |
| `requestPushPermission`, `setPushConsent` | The prompt after first sign-in; "Notify me" on sold-out products |
| `getPushStatus`, `setPushEnabled`, `setTrackingConsent` | Account |
| `onNotificationReceived`, `onForegroundNotification`, `onNotificationClicked` | Inbox. iOS has no received event: a push reaches the inbox while the app is open or when tapped, not in the background. |
| `handleDeepLink` | `kirorashop://product/<id>`, `…/order/<id>`, `…/cart`, `…/inbox` |

Account → Developer tools calls each SDK method and logs results.

## Where it sends

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

## Running it locally

You need Node `^22.13.0 || ^24.3.0 || >= 26.0.0`; Xcode and CocoaPods for iOS; JDK 17 and the
Android SDK for Android. Clone `kirora-react-native` next to this repository.
The Android SDK comes from Maven Central. `@kirora/react-native` comes from
`example/vendor/`; `npm run vendor-sdk` in `example/` refreshes it.

From the repository root:

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

## Building on EAS

The `preview` profile builds an APK and an ad hoc iOS build. A pre-install hook compiles the
plugin; the native SDKs come with the vendored `@kirora/react-native` (iOS) and from Maven Central
(Android).

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
`--type string --visibility plaintext`. Upload the APNs key EAS creates to your production Kirora
push app; check in Apple's developer portal that it is a Production key.
