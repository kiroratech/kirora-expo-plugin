import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ExpoConfig } from 'expo/config';
import withKirora from '../build';
import type { KiroraPluginProps } from '../build/types';

// Fixtures come from Expo's SDK 58 bare template (expo-template-bare-minimum@58.0.35).
export const FIXTURES = path.resolve(__dirname, '../test/fixtures');

export const PROJECT_NAME = 'HelloWorld';

/** One temp folder for the whole run, removed when the run ends. */
export const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'kirora-expo-plugin-'));
process.on('exit', () => fs.rmSync(TMP_ROOT, { recursive: true, force: true }));

// @kirora/react-native as an app installs it: the extension's pod comes from its bundled kirora-ios.
const rnPackage = path.join(TMP_ROOT, 'node_modules', '@kirora', 'react-native');
fs.mkdirSync(rnPackage, { recursive: true });
fs.writeFileSync(path.join(rnPackage, 'package.json'), '{"name":"@kirora/react-native"}');

export function baseConfig(overrides: Partial<ExpoConfig> = {}): ExpoConfig {
  return {
    name: PROJECT_NAME,
    slug: 'hello-world',
    version: '1.0.0',
    ...overrides,
    ios: { bundleIdentifier: 'com.example.app', ...overrides.ios },
    android: { package: 'com.example.app', googleServicesFile: './google-services.json', ...overrides.android }
  };
}

/** Applies the plugin to a fresh config, as every `expo prebuild` does. */
export function applyPlugin(props?: KiroraPluginProps, config: ExpoConfig = baseConfig()): ExpoConfig {
  // A deep copy: the plugin and Expo's helpers edit the config in place.
  return withKirora(JSON.parse(JSON.stringify(config)), props);
}

/** A throwaway project folder holding a copy of the template's native files. */
export function makeProject(): { root: string; ios: string; android: string } {
  const root = fs.mkdtempSync(path.join(TMP_ROOT, 'project-'));
  const ios = path.join(root, 'ios');
  const android = path.join(root, 'android');
  fs.mkdirSync(path.join(ios, `${PROJECT_NAME}.xcodeproj`), { recursive: true });
  fs.copyFileSync(path.join(FIXTURES, 'ios/project.pbxproj'), pbxprojPath(ios));
  fs.mkdirSync(android, { recursive: true });
  fs.mkdirSync(path.join(root, 'assets'));
  // Any PNG will do: the plugin copies it without reading it.
  fs.writeFileSync(path.join(root, 'assets/icon.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
  return { root, ios, android };
}

export function pbxprojPath(ios: string): string {
  return path.join(ios, `${PROJECT_NAME}.xcodeproj/project.pbxproj`);
}

/**
 * Runs one of the config's mods (such as `ios.xcodeproj`) the way Expo's compiler does: with
 * the current file contents as `modResults`.
 */
export async function runMod(
  config: ExpoConfig,
  platform: 'ios' | 'android',
  mod: string,
  modResults: unknown,
  projectRoot: string
): Promise<any> {
  const fn = (config as any).mods?.[platform]?.[mod];
  if (!fn) throw new Error(`no ${platform}.${mod} mod registered`);
  return fn({
    ...config,
    modResults,
    modRequest: {
      projectRoot,
      platformProjectRoot: path.join(projectRoot, platform),
      projectName: PROJECT_NAME,
      platform,
      modName: mod,
      introspect: false
    }
  });
}
