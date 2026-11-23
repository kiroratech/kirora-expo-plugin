// Kirora Shop, the Expo example app: @kirora/react-native set up only through @kirora/expo-plugin, so
// `npx expo prebuild --clean` must produce a working app with no native edits.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest } = require('expo/config-plugins');

// Not committed: each developer and CI supplies their own Firebase project's file. On EAS, upload
// it as a file environment variable named GOOGLE_SERVICES_JSON.
const googleServices = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const hasGoogleServices = fs.existsSync(path.resolve(__dirname, googleServices));

// The fake API is plain http, which Android refuses outside debug builds. Allowed only while the
// app talks to an http address (the API or the token endpoint); an all-https build keeps Android's
// default.
const apiUrl = process.env.EXPO_PUBLIC_KIRORA_API_URL || 'http://localhost:4010';
const tokenUrl = process.env.EXPO_PUBLIC_KIRORA_TOKEN_URL || '';
const withHttpApi = (config) =>
  withAndroidManifest(config, (config) => {
    if (apiUrl.startsWith('http:') || tokenUrl.startsWith('http:')) {
      config.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });

module.exports = {
  expo: {
    name: 'Kirora Shop',
    owner: 'kirora',
    slug: 'kirora-shop',
    version: '1.0.0',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    // expo.dev project: @kirora/kirora-shop
    extra: { eas: { projectId: '618e84bb-80bc-4148-abba-017940ae715a' } },
    scheme: 'kirorashop',
    ios: {
      bundleIdentifier: 'io.kirora.demo.shop',
      // Only standard HTTPS: skips Apple's export-compliance question on every build.
      infoPlist: { ITSAppUsesNonExemptEncryption: false }
    },
    android: {
      package: 'io.kirora.demo.shop',
      ...(hasGoogleServices ? { googleServicesFile: googleServices } : {})
    },
    plugins: [
      [
        '@kirora/expo-plugin',
        {
          android: { icon: './assets/notification-icon.png', color: '#1F4BD8' },
          ios: {
            // The same address as the app (src/config.ts): staging when set, else the fake API.
            apiUrl
          }
        }
      ],
      withHttpApi
    ]
  }
};
