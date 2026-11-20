// The Expo example app: @kirora/react-native set up only through @kirora/expo-plugin, so
// `npx expo prebuild --clean` must produce a working app with no native edits.
const fs = require('fs');
const path = require('path');
const { withProjectBuildGradle } = require('expo/config-plugins');

// Not committed: each developer and CI supplies their own Firebase project's file.
const googleServices = './google-services.json';
const hasGoogleServices = fs.existsSync(path.join(__dirname, googleServices));

// Until Kirora's iOS pods are published, build against a local kirora-ios checkout.
const localIosSdk = process.env.KIRORA_IOS_SDK_PATH ?? '../../kirora-ios';

// Until the Kirora Android SDK is published, it comes from `./gradlew publishToMavenLocal` in a
// kirora-android checkout. @kirora/react-native looks in mavenLocal() only for its own module, so
// the app needs it too. Example-only: not something @kirora/expo-plugin should do for real apps.
const MAVEN_LOCAL = '    mavenLocal() // Kirora example: local SDK builds';
const withMavenLocal = (config) =>
  withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MAVEN_LOCAL)) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (match) => `${match}\n${MAVEN_LOCAL}`
      );
    }
    return config;
  });

module.exports = {
  expo: {
    name: 'Kirora Expo Example',
    slug: 'kirora-expo-example',
    version: '1.0.0',
    scheme: 'kiroraexpoexample',
    ios: {
      bundleIdentifier: 'io.kirora.expoexample'
    },
    android: {
      package: 'io.kirora.expoexample',
      ...(hasGoogleServices ? { googleServicesFile: googleServices } : {})
    },
    plugins: [
      [
        '@kirora/expo-plugin',
        {
          mode: 'development',
          android: { icon: './assets/notification-icon.png', color: '#1F4BD8' },
          ios: {
            // The fake Kirora API in kirora-react-native/example/e2e (src/config.ts).
            apiUrl: 'http://localhost:4010',
            localSdkPath: fs.existsSync(path.resolve(__dirname, localIosSdk)) ? localIosSdk : undefined
          }
        }
      ],
      withMavenLocal
    ]
  }
};
