import fs from 'fs';
import path from 'path';
import {
  AndroidConfig,
  type ConfigPlugin,
  WarningAggregator,
  withAndroidColors,
  withAndroidManifest,
  withDangerousMod
} from 'expo/config-plugins';
import { ANDROID_COLOR_NAME, ANDROID_ICON_NAME, type KiroraPluginProps } from './types';
import { fail } from './validate';

// The manifest entries the Kirora Android SDK reads for its pushes' appearance (KiroraPushDisplay).
const META_ICON = 'io.kirora.default_notification_icon';
const META_COLOR = 'io.kirora.default_notification_color';

/**
 * Copies the icon to `res/drawable-xxxhdpi`; Android scales it down for other densities.
 * Without an icon, deletes the copy an earlier prebuild made.
 */
const withIconFile: ConfigPlugin<string | undefined> = (config, icon) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/drawable-xxxhdpi');
      const target = path.join(dir, `${ANDROID_ICON_NAME}.png`);
      if (!icon) {
        fs.rmSync(target, { force: true });
        return config;
      }
      const source = path.resolve(config.modRequest.projectRoot, icon);
      if (!fs.existsSync(source)) fail(`android.icon not found: ${source}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(source, target);
      return config;
    }
  ]);

/** Sets the accent colour resource, or removes it when no colour is set. */
const withColorResource: ConfigPlugin<string | undefined> = (config, color) =>
  withAndroidColors(config, (config) => {
    config.modResults = AndroidConfig.Colors.assignColorValue(config.modResults, {
      name: ANDROID_COLOR_NAME,
      value: color
    });
    return config;
  });

/** Points Kirora at the icon and colour that are set, and drops the entries of those that aren't. */
const withManifestEntries: ConfigPlugin<KiroraPluginProps['android']> = (config, android) =>
  withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const entries: Array<[string, string | false]> = [
      [META_ICON, !!android?.icon && `@drawable/${ANDROID_ICON_NAME}`],
      [META_COLOR, !!android?.color && `@color/${ANDROID_COLOR_NAME}`]
    ];
    for (const [name, value] of entries) {
      if (value) AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, name, value, 'resource');
      else AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(app, name);
    }
    return config;
  });

export const withKiroraAndroid: ConfigPlugin<KiroraPluginProps> = (config, props) => {
  // Firebase itself is Expo's job: `android.googleServicesFile` copies the file and applies the
  // Google Services plugin. Kirora's Android push needs it, so say so when it's missing.
  if (!config.android?.googleServicesFile) {
    WarningAggregator.addWarningAndroid(
      '@kirora/expo-plugin',
      'android.googleServicesFile is not set: Kirora push on Android needs Firebase. ' +
        'Add your google-services.json and point android.googleServicesFile at it.'
    );
  }

  // Always applied, so removing an option also removes what an earlier prebuild added.
  config = withIconFile(config, props.android?.icon);
  config = withColorResource(config, props.android?.color);
  return withManifestEntries(config, props.android);
};
