import { Platform } from 'react-native';

/**
 * Where the app sends. Set these in an `.env` file or on EAS (`EXPO_PUBLIC_*` values are built
 * into the app). With none set, it talks to the fake client API in
 * kirora-react-native/e2e-app/e2e/fake-kirora.mjs, which the Android emulator reaches at
 * 10.0.2.2 and the iOS simulator at localhost.
 */
const fakeApi = Platform.OS === 'android' ? 'http://10.0.2.2:4010' : 'http://localhost:4010';

export const API_URL = process.env.EXPO_PUBLIC_KIRORA_API_URL || fakeApi;
export const CLIENT_KEY = process.env.EXPO_PUBLIC_KIRORA_CLIENT_KEY || 'kirora_pk_e2e';

/**
 * Which push app this platform registers with, when the workspace has several. Without one, Kirora
 * picks the platform's oldest ready app.
 */
export const PUSH_APP_ID =
  (Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_KIRORA_PUSH_APP_ID_IOS : process.env.EXPO_PUBLIC_KIRORA_PUSH_APP_ID_ANDROID) ||
  undefined;

/**
 * Your backend's endpoint that signs a user in for Kirora: `POST {"email"}` answers
 * `{"token"}`. A real shop gets this token from its own login. Without it, the app makes up
 * `demo-<email>`, which only the fake API accepts.
 */
const TOKEN_URL = process.env.EXPO_PUBLIC_KIRORA_TOKEN_URL || '';

/** The scheme push links use: `kirorashop://product/p1`, `…/order/<id>`, `…/cart`. */
export const LINK_PREFIX = 'kirorashop://';

/**
 * Quick tests without a token endpoint: one user token signed by hand (createUserToken, at most
 * 24 hours). Every sign-in uses it, whatever email is typed, so sign in with the email it was
 * signed for. Rebuild with a new one once it expires.
 */
const FIXED_TOKEN = process.env.EXPO_PUBLIC_KIRORA_USER_TOKEN || '';

export async function fetchUserToken(email: string): Promise<string> {
  if (FIXED_TOKEN) return FIXED_TOKEN;
  if (!TOKEN_URL) return `demo-${email}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) throw new Error(`token endpoint answered ${res.status}`);
  const { token } = (await res.json()) as { token?: string };
  if (!token) throw new Error('token endpoint answered no token');
  return token;
}

/** User tokens the developer tools sign in with. The fake API accepts any token unless told to refuse it. */
export const TEST_TOKENS = {
  userA: 'e2e-token-user-a',
  userB: 'e2e-token-user-b',
  refused: 'e2e-token-refused'
};
