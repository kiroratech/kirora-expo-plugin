import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { test } from 'node:test';
import { AndroidConfig } from 'expo/config-plugins';
import { ANDROID_COLOR_NAME, ANDROID_ICON_NAME } from '../build/types';
import { applyPlugin, FIXTURES, makeProject, runMod, TMP_ROOT } from './helpers';

const ICON_PROPS = { android: { icon: './assets/icon.png', color: '#1F4BD8' } };

function iconPath(android: string): string {
  return path.join(android, `app/src/main/res/drawable-xxxhdpi/${ANDROID_ICON_NAME}.png`);
}

async function manifestMetaData(props: object): Promise<string[]> {
  const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(path.join(FIXTURES, 'android/AndroidManifest.xml'));
  const result = await runMod(applyPlugin(props), 'android', 'manifest', manifest, TMP_ROOT);
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(result.modResults);
  return (app['meta-data'] ?? []).map((m: { $: Record<string, string> }) => m.$['android:name']);
}

test('copies the icon, and deletes it once the option is removed', async () => {
  const { root, android } = makeProject();
  await runMod(applyPlugin(ICON_PROPS), 'android', 'dangerous', undefined, root);
  assert.ok(fs.existsSync(iconPath(android)));
  await runMod(applyPlugin({}), 'android', 'dangerous', undefined, root);
  assert.ok(!fs.existsSync(iconPath(android)));
});

test('a missing icon file stops prebuild', async () => {
  const { root } = makeProject();
  await assert.rejects(
    runMod(applyPlugin({ android: { icon: './assets/missing.png' } }), 'android', 'dangerous', undefined, root),
    /android.icon not found/
  );
});

test('sets the colour resource, and removes it once the option is removed', async () => {
  const set = await runMod(applyPlugin(ICON_PROPS), 'android', 'colors', { resources: {} }, TMP_ROOT);
  assert.deepEqual(AndroidConfig.Colors.getColorsAsObject(set.modResults), { [ANDROID_COLOR_NAME]: '#1F4BD8' });
  const removed = await runMod(applyPlugin({}), 'android', 'colors', set.modResults, TMP_ROOT);
  assert.equal(AndroidConfig.Colors.getColorsAsObject(removed.modResults)?.[ANDROID_COLOR_NAME], undefined);
});

test('points Kirora at the icon and colour in the manifest only when they are set', async () => {
  const withBoth = await manifestMetaData(ICON_PROPS);
  assert.ok(withBoth.includes('io.kirora.default_notification_icon'));
  assert.ok(withBoth.includes('io.kirora.default_notification_color'));
  const without = await manifestMetaData({});
  assert.ok(!without.some((name) => name.startsWith('io.kirora.')));
});
