// Kirora in the shop: one client for the app's life, set up the way a real app would. Signs the
// customer in, feeds pushes into the inbox and opens push links in the app.
import { Kirora, type KiroraOptions, type NotificationData, type PushPermission, type PushStatus } from '@kirora/react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL, CLIENT_KEY, PUSH_APP_ID, fetchUserToken } from './config';
import { useNav } from './navigation';
import { type InboxItem, useShop } from './store';

interface KiroraShop {
  client: Kirora;
  /** What the SDK reported, newest last: for the developer tools. */
  log: string[];
  addLog(line: string): void;
  clearLog(): void;
  pushStatus: PushStatus | null;
  refreshPushStatus(): Promise<PushStatus>;
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** The OS prompt, then the customer's consent to marketing push when granted. */
  enableNotifications(): Promise<PushPermission>;
  setNotifications(on: boolean): Promise<void>;
  setAnalytics(on: boolean): void;
  /** Developer tools: replaces the client with one set up with `extra` on top. */
  restart(extra?: Partial<KiroraOptions>): Kirora;
}

const KiroraContext = createContext<KiroraShop | null>(null);

export function toInboxItem(data: NotificationData, read: boolean): InboxItem {
  return {
    // trackingUrl names the device and delivery, so each send is its own entry. Test sends carry
    // none; they fall back to their content.
    key: data.trackingUrl || `${data.title}|${data.body}|${data.actionUrl || data.link}`,
    title: data.title || 'Kirora Shop',
    body: data.body || '',
    link: data.actionUrl || data.link || undefined,
    at: new Date().toISOString(),
    read
  };
}

export function KiroraProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useShop();
  const nav = useNav();
  const [log, setLog] = useState<string[]>([]);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);

  // The SDK's callbacks outlive renders, so they read the latest values through refs.
  const latest = useRef({ state, nav });
  latest.current = { state, nav };

  const addLog = useCallback((line: string) => {
    console.log(`[e2e] ${line}`);
    setLog((prev) => [...prev.slice(-199), line]);
  }, []);

  const options = useCallback(
    (extra: Partial<KiroraOptions> = {}): KiroraOptions => ({
      clientKey: CLIENT_KEY,
      apiUrl: API_URL,
      logLevel: 'debug',
      trackAppLifecycle: true,
      push: {
        pushAppId: PUSH_APP_ID,
        defaultChannelId: 'shop_updates',
        defaultChannelName: 'Orders and offers',
        accentColor: '#1F4BD8',
        onForegroundNotification: (data) => {
          addLog(`foreground: ${JSON.stringify(data)}`);
          dispatch({ type: 'notification', item: toInboxItem(data, false) });
          return true; // show it as a banner too
        }
      },
      fetchUserToken: async () => {
        const email = latest.current.state.customer?.email;
        addLog(`fetchUserToken for ${email ?? 'nobody'}`);
        return email ? fetchUserToken(email) : null;
      },
      onAuthenticationFailed: (reason) => addLog(`authFailed: ${reason}`),
      // Customers' email addresses never leave the device in event properties.
      beforeSend: (event) => {
        if (event.name === 'E2E Dropped') return null;
        // Copy and delete: `{ email, ...rest }` would turn a `__proto__` key into a prototype.
        const properties = { ...event.properties };
        delete properties.email;
        return { ...event, properties };
      },
      handleDeepLink: (url) => {
        const opened = latest.current.nav.openLink(url);
        addLog(`deepLink: ${url} opened=${opened}`);
        return opened;
      },
      ...extra
    }),
    [addLog, dispatch]
  );

  const [client, setClient] = useState(() => new Kirora(options()));

  useEffect(() => {
    const subs = [
      client.onNotificationReceived((data) => {
        addLog(`received: ${JSON.stringify(data)}`);
        dispatch({ type: 'notification', item: toInboxItem(data, false) });
      }),
      client.onNotificationClicked((data) => {
        addLog(`clicked: ${JSON.stringify(data)}`);
        dispatch({ type: 'notification', item: toInboxItem(data, true) });
      })
    ];
    return () => subs.forEach((unsubscribe) => unsubscribe());
  }, [client, addLog, dispatch]);

  // A signed-in customer is identified at every start, as the SDK asks.
  const identified = useRef<Kirora | null>(null);
  useEffect(() => {
    if (!state.loaded || !state.customer || identified.current === client) return;
    identified.current = client;
    client.identify().then(
      () => addLog('identify at start: ok'),
      (e: unknown) => addLog(`identify at start: error ${String(e)}`)
    );
  }, [state.loaded, state.customer, client, addLog]);

  const refreshPushStatus = useCallback(async () => {
    const status = await client.getPushStatus().catch((): PushStatus => 'unsupported');
    setPushStatus(status);
    return status;
  }, [client]);

  const signIn = useCallback(
    async (email: string) => {
      const token = await fetchUserToken(email);
      await client.identify(token);
      identified.current = client;
      const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      dispatch({ type: 'signedIn', customer: { email, name } });
      client.track('Signed In', { method: 'email' });
      void refreshPushStatus();
    },
    [client, dispatch, refreshPushStatus]
  );

  const signOut = useCallback(async () => {
    client.track('Signed Out');
    await client.logout();
    dispatch({ type: 'signedOut' });
    void refreshPushStatus();
  }, [client, dispatch, refreshPushStatus]);

  const enableNotifications = useCallback(async () => {
    const permission = await client.requestPushPermission();
    if (permission === 'granted') {
      await client.setPushEnabled(true);
      // Offline, or setup failed: the OS permission stands, and turning it on again retries.
      if (latest.current.state.customer) {
        await client.setPushConsent(true).catch((e: unknown) => addLog(`setPushConsent: error ${String(e)}`));
      }
    }
    await refreshPushStatus();
    return permission;
  }, [client, refreshPushStatus, addLog]);

  const setNotifications = useCallback(
    async (on: boolean) => {
      if (on) await enableNotifications();
      else {
        await client.setPushEnabled(false);
        await refreshPushStatus();
      }
    },
    [client, enableNotifications, refreshPushStatus]
  );

  const setAnalytics = useCallback(
    (on: boolean) => {
      client.setTrackingConsent(on);
      dispatch({ type: 'analytics', on });
    },
    [client, dispatch]
  );

  const restart = useCallback(
    (extra: Partial<KiroraOptions> = {}) => {
      client.destroy();
      const next = new Kirora(options(extra));
      setClient(next);
      return next;
    },
    [client, options]
  );

  const clearLog = useCallback(() => setLog([]), []);

  const value = useMemo(
    () => ({
      client,
      log,
      addLog,
      clearLog,
      pushStatus,
      refreshPushStatus,
      signIn,
      signOut,
      enableNotifications,
      setNotifications,
      setAnalytics,
      restart
    }),
    [client, log, addLog, clearLog, pushStatus, refreshPushStatus, signIn, signOut, enableNotifications, setNotifications, setAnalytics, restart]
  );
  return <KiroraContext.Provider value={value}>{children}</KiroraContext.Provider>;
}

export function useKirora(): KiroraShop {
  const k = useContext(KiroraContext);
  if (!k) throw new Error('useKirora outside KiroraProvider');
  return k;
}
