import type { KiroraPluginProps } from './types';

/** Throws the plugin's error, prefixed with its name. */
export function fail(message: string): never {
  throw new Error(`@kirora/expo-plugin: ${message}`);
}

// Records keyed by KiroraPluginProps, so the compiler fails when an option is missing here.
type AllKeys<T> = Record<keyof NonNullable<T>, true>;
const KEYS = Object.keys({ mode: true, android: true, ios: true } satisfies AllKeys<KiroraPluginProps>);
const ANDROID_KEYS = Object.keys({ icon: true, color: true } satisfies AllKeys<KiroraPluginProps['android']>);
const IOS_KEYS = Object.keys({
  notificationServiceExtension: true,
  deploymentTarget: true,
  apiUrl: true,
  appleTeamId: true
} satisfies AllKeys<KiroraPluginProps['ios']>);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Checks that `value` is an object with only the `allowed` keys. */
function checkObject(name: string, value: unknown, allowed: string[]): Record<string, unknown> {
  if (!isObject(value)) fail(`${name} must be an object`);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`unknown option ${name}.${key}; expected one of ${allowed.join(', ')}`);
  }
  return value;
}

/** Checks an optional string option, and its format when `pattern` is given. */
function optionalString(name: string, value: unknown, pattern = /\S/, expected = 'a non-empty string'): void {
  if (value !== undefined && (typeof value !== 'string' || !pattern.test(value))) {
    fail(`${name} must be ${expected}, got ${JSON.stringify(value)}`);
  }
}

/**
 * Checks the options at runtime: app configs are JSON or plain JavaScript, so the TypeScript
 * types don't protect them. Throws on the first problem, naming the option.
 */
export function validateProps(props: unknown): KiroraPluginProps {
  if (props === undefined || props === null) return {};
  const options = checkObject('options', props, KEYS);
  optionalString('mode', options.mode, /^(development|production)$/, '"development" or "production"');

  if (options.android !== undefined) {
    const android = checkObject('android', options.android, ANDROID_KEYS);
    optionalString('android.icon', android.icon, /\.png$/i, 'a path to a .png file');
    optionalString('android.color', android.color, /^#[0-9a-fA-F]{6}$/, '#RRGGBB');
  }

  if (options.ios !== undefined) {
    const ios = checkObject('ios', options.ios, IOS_KEYS);
    if (ios.notificationServiceExtension !== undefined && typeof ios.notificationServiceExtension !== 'boolean') {
      fail(`ios.notificationServiceExtension must be true or false, got ${JSON.stringify(ios.notificationServiceExtension)}`);
    }
    optionalString('ios.deploymentTarget', ios.deploymentTarget, /^\d+(\.\d+){0,2}$/, 'a version such as "15.1"');
    optionalString('ios.apiUrl', ios.apiUrl, /^https?:\/\/\S+$/, 'an http(s) URL');
    optionalString('ios.appleTeamId', ios.appleTeamId);
  }

  return props as KiroraPluginProps;
}
