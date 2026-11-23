import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { test } from 'node:test';
import { IOSConfig, type XcodeProject } from 'expo/config-plugins';
import { NSE_TARGET_NAME } from '../build/types';
import { applyPlugin, baseConfig, FIXTURES, makeProject, pbxprojPath, runMod, TMP_ROOT } from './helpers';

const { findNativeTargetByName, getNativeTargets } = IOSConfig.Target;
const { getBuildConfigurationsForListId, unquote } = IOSConfig.XcodeUtils;

function readProject(ios: string): XcodeProject {
  return IOSConfig.XcodeUtils.getPbxproj(path.dirname(ios));
}

/** Applies the plugin to a fresh config and runs its Xcode mod, writing the project back. */
async function prebuildXcode(root: string, ios: string, props = {}, config = baseConfig()): Promise<XcodeProject> {
  const result = await runMod(applyPlugin(props, config), 'ios', 'xcodeproj', readProject(ios), root);
  fs.writeFileSync(pbxprojPath(ios), result.modResults.writeSync());
  return result.modResults;
}

function targetNames(project: XcodeProject): string[] {
  return getNativeTargets(project).map(([, target]) => unquote(target.name));
}

function extensionSettings(project: XcodeProject): Array<Record<string, string>> {
  const [, target] = findNativeTargetByName(project, NSE_TARGET_NAME);
  return getBuildConfigurationsForListId(project, target.buildConfigurationList).map(([, c]) => c.buildSettings);
}

function deploymentTargets(project: XcodeProject): string[] {
  return extensionSettings(project).map((settings) => settings.IPHONEOS_DEPLOYMENT_TARGET);
}

async function podfile(props = {}, config = baseConfig(), contents?: string): Promise<string> {
  const src = contents ?? fs.readFileSync(path.join(FIXTURES, 'ios/Podfile'), 'utf8');
  const result = await runMod(applyPlugin(props, config), 'ios', 'podfile', { contents: src }, TMP_ROOT);
  return result.modResults.contents;
}

test('adds the extension target once, even across repeated prebuilds', async () => {
  const { root, ios } = makeProject();
  await prebuildXcode(root, ios);
  await prebuildXcode(root, ios);
  await prebuildXcode(root, ios);
  assert.deepEqual(targetNames(readProject(ios)).sort(), ['HelloWorld', NSE_TARGET_NAME].sort());
});

test("the deployment target defaults to 15.1, else the app config's, and the option wins", async () => {
  const { root, ios } = makeProject();
  assert.deepEqual(deploymentTargets(await prebuildXcode(root, ios)), ['15.1', '15.1']);
  const config = baseConfig({ ios: { deploymentTarget: '17.0' } });
  assert.deepEqual(deploymentTargets(await prebuildXcode(root, ios, {}, config)), ['17.0', '17.0']);
  const withOption = await prebuildXcode(root, ios, { ios: { deploymentTarget: '18.0' } }, config);
  assert.deepEqual(deploymentTargets(withOption), ['18.0', '18.0']);
});

test('changed options reach an existing extension target', async () => {
  const { root, ios } = makeProject();
  await prebuildXcode(root, ios);
  const project = await prebuildXcode(
    root,
    ios,
    { ios: { appleTeamId: 'TEAM123456' } },
    baseConfig({ ios: { bundleIdentifier: 'com.example.renamed' } })
  );
  for (const settings of extensionSettings(project)) {
    assert.equal(settings.DEVELOPMENT_TEAM, 'TEAM123456');
    assert.equal(settings.PRODUCT_BUNDLE_IDENTIFIER, `"com.example.renamed.${NSE_TARGET_NAME}"`);
  }
});

test("puts the extension's group in the main group only", async () => {
  const { root, ios } = makeProject();
  const project = await prebuildXcode(root, ios);
  const groups = project.hash.project.objects.PBXGroup;
  const parents = Object.keys(groups).filter(
    (k) => typeof groups[k] === 'object' && groups[k].children?.some((c: { comment: string }) => c.comment === NSE_TARGET_NAME)
  );
  assert.deepEqual(parents, [project.getFirstProject().firstProject.mainGroup]);
});

test('stops when the extension is turned off but its target is still there', async () => {
  const { root, ios } = makeProject();
  await prebuildXcode(root, ios);
  await assert.rejects(prebuildXcode(root, ios, { ios: { notificationServiceExtension: false } }), /prebuild --clean/);
});

test("an Android-only config doesn't need ios.bundleIdentifier", () => {
  const config = baseConfig();
  delete config.ios;
  assert.doesNotThrow(() => applyPlugin({}, config));
});

test("writes the Podfile block once, with the extension's platform and the app's linkage", async () => {
  const config = baseConfig({ ios: { deploymentTarget: '17.0' } });
  const twice = await podfile({}, config, await podfile({}, config));
  assert.equal(twice.match(/# @kirora\/expo-plugin begin/g)?.length, 1);
  assert.match(twice, new RegExp(`target '${NSE_TARGET_NAME}' do\\n  platform :ios, '17.0'`));
  assert.match(twice, /use_frameworks! :linkage => podfile_properties\['ios.useFrameworks'\]/);
  assert.match(twice, /use_frameworks! :linkage => ENV\['USE_FRAMEWORKS'\]/);
});

test("takes the extension's pod from the kirora-ios copy @kirora/react-native bundles", async () => {
  assert.match(
    await podfile(),
    /pod 'KiroraNotificationService', :path => '\.\.\/node_modules\/@kirora\/react-native\/ios\/vendor\/kirora-ios'/
  );
  // Outside TMP_ROOT, whose node_modules has the package.
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'kirora-no-sdk-'));
  const src = fs.readFileSync(path.join(FIXTURES, 'ios/Podfile'), 'utf8');
  try {
    await assert.rejects(
      runMod(applyPlugin({}, baseConfig()), 'ios', 'podfile', { contents: src }, elsewhere),
      /needs @kirora\/react-native installed/
    );
  } finally {
    fs.rmSync(elsewhere, { recursive: true, force: true });
  }
});

test('drops the Podfile block when the extension is turned off', async () => {
  const off = await podfile({ ios: { notificationServiceExtension: false } }, baseConfig(), await podfile());
  assert.doesNotMatch(off, /@kirora\/expo-plugin/);
});

test("copies the app's iOS version and build number into the extension", async () => {
  const { root, ios } = makeProject();
  const config = baseConfig({ ios: { version: '2.3.0', buildNumber: '42' } });
  await runMod(applyPlugin({}, config), 'ios', 'dangerous', undefined, root);
  const plist = fs.readFileSync(path.join(ios, NSE_TARGET_NAME, `${NSE_TARGET_NAME}-Info.plist`), 'utf8');
  assert.match(plist, /<key>CFBundleShortVersionString<\/key>\s*<string>2\.3\.0<\/string>/);
  assert.match(plist, /<key>CFBundleVersion<\/key>\s*<string>42<\/string>/);
});

test('sets aps-environment from mode', async () => {
  const result = await runMod(applyPlugin({ mode: 'production' }), 'ios', 'entitlements', {}, TMP_ROOT);
  assert.equal(result.modResults['aps-environment'], 'production');
});

test("lists the app's universal-link hosts for the Kirora iOS SDK, keeping the app's own", async () => {
  const config = baseConfig({
    ios: {
      associatedDomains: ['applinks:shop.example.com', 'webcredentials:example.com', 'applinks:*.example.org?mode=developer'],
      entitlements: { 'com.apple.developer.associated-domains': ['applinks:shop.example.com', 'applinks:other.example.net'] }
    }
  });
  const result = await runMod(applyPlugin({}, config), 'ios', 'infoPlist', { KiroraUniversalLinkHosts: ['mine.example.com'] }, TMP_ROOT);
  assert.deepEqual(result.modResults.KiroraUniversalLinkHosts, [
    'mine.example.com',
    'shop.example.com',
    '*.example.org',
    'other.example.net'
  ]);
});

test('adds no KiroraUniversalLinkHosts to an app without universal links', async () => {
  const result = await runMod(applyPlugin(), 'ios', 'infoPlist', {}, TMP_ROOT);
  assert.equal('KiroraUniversalLinkHosts' in result.modResults, false);
});

test('registers the extension with EAS Build', () => {
  const extensions = (applyPlugin().extra as any).eas.build.experimental.ios.appExtensions;
  assert.deepEqual(extensions, [
    { targetName: NSE_TARGET_NAME, bundleIdentifier: `com.example.app.${NSE_TARGET_NAME}`, entitlements: {} }
  ]);
});
