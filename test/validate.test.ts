import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateProps } from '../build/validate';

test('accepts no options and every valid option', () => {
  assert.deepEqual(validateProps(undefined), {});
  const props = {
    mode: 'production',
    android: { icon: './icon.png', color: '#FF5500' },
    ios: {
      notificationServiceExtension: false,
      deploymentTarget: '16.4',
      apiUrl: 'https://api.example.com',
      appleTeamId: 'TEAM123456',
      localSdkPath: '../kirora-ios'
    }
  };
  assert.deepEqual(validateProps(props), props);
});

const invalid: Array<[string, unknown, RegExp]> = [
  ['a non-object', 'production', /options must be an object/],
  ['a malformed colour', { android: { color: 'red' } }, /android.color must be #RRGGBB/],
  ['an unknown top-level key', { modes: 'production' }, /unknown option options\.modes/],
  ['an unknown nested key', { ios: { nse: false } }, /unknown option ios\.nse/],
  ['a wrong mode', { mode: 'prod' }, /mode must be/],
  ['a string boolean', { ios: { notificationServiceExtension: 'false' } }, /must be true or false/],
  ['a malformed deployment target', { ios: { deploymentTarget: 'iOS 16' } }, /deploymentTarget/],
  ['a non-URL apiUrl', { ios: { apiUrl: 'api.example.com' } }, /apiUrl must be an http\(s\) URL/],
  ['an empty icon path', { android: { icon: '' } }, /android.icon must be a path to a .png file/],
  ['a non-PNG icon', { android: { icon: './icon.jpg' } }, /android.icon must be a path to a .png file/]
];

for (const [name, props, message] of invalid) {
  test(`rejects ${name}`, () => {
    assert.throws(() => validateProps(props), message);
  });
}
