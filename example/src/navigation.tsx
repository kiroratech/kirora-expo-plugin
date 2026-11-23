// A small tab-and-stack navigator, enough for the shop without a navigation library. It also
// opens the links Kirora pushes carry (kirorashop://product/p1, …/order/<id>, …/cart).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking } from 'react-native';
import { LINK_PREFIX } from './config';

export type Tab = 'shop' | 'cart' | 'inbox' | 'account';

export type Route =
  | { name: 'product'; id: string }
  | { name: 'order'; id: string }
  | { name: 'orders' }
  | { name: 'signIn'; thenCheckout?: boolean }
  | { name: 'notifications' }
  | { name: 'devtools' };

interface Nav {
  tab: Tab;
  /** The screens open on top of the current tab, last on top. */
  stack: Route[];
  setTab(tab: Tab): void;
  push(route: Route): void;
  pop(): void;
  /** Replaces the top screen. */
  replace(route: Route): void;
  /** Opens a push or deep link; false when it isn't one of the shop's. */
  openLink(url: string): boolean;
}

const NavContext = createContext<Nav | null>(null);

/** kirorashop://product/p1 → the tab and screens it opens. */
export function routeForLink(url: string): { tab: Tab; stack: Route[] } | null {
  if (!url.startsWith(LINK_PREFIX)) return null;
  const [kind, id] = url.slice(LINK_PREFIX.length).split(/[?#]/)[0].split('/').filter(Boolean);
  switch (kind) {
    case undefined:
    case 'shop':
      return { tab: 'shop', stack: [] };
    case 'product':
      return id ? { tab: 'shop', stack: [{ name: 'product', id }] } : null;
    case 'order':
      return id ? { tab: 'account', stack: [{ name: 'orders' }, { name: 'order', id }] } : null;
    case 'orders':
      return { tab: 'account', stack: [{ name: 'orders' }] };
    case 'cart':
      return { tab: 'cart', stack: [] };
    case 'inbox':
      return { tab: 'inbox', stack: [] };
    default:
      return null;
  }
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTabState] = useState<Tab>('shop');
  const [stacks, setStacks] = useState<Record<Tab, Route[]>>({ shop: [], cart: [], inbox: [], account: [] });
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const setTab = useCallback((next: Tab) => {
    // Tapping the open tab goes back to its first screen, as in most apps.
    if (next === tabRef.current) setStacks((s) => ({ ...s, [next]: [] }));
    tabRef.current = next; // so a push right after lands on this tab
    setTabState(next);
  }, []);
  const push = useCallback((route: Route) => {
    setStacks((s) => ({ ...s, [tabRef.current]: [...s[tabRef.current], route] }));
  }, []);
  const pop = useCallback(() => {
    setStacks((s) => ({ ...s, [tabRef.current]: s[tabRef.current].slice(0, -1) }));
  }, []);
  const replace = useCallback((route: Route) => {
    setStacks((s) => ({ ...s, [tabRef.current]: [...s[tabRef.current].slice(0, -1), route] }));
  }, []);
  const openLink = useCallback((url: string) => {
    const target = routeForLink(url);
    if (!target) return false;
    setStacks((s) => ({ ...s, [target.tab]: target.stack }));
    tabRef.current = target.tab;
    setTabState(target.tab);
    return true;
  }, []);

  const stack = stacks[tab];
  const depth = useRef(0);
  depth.current = stack.length;

  // Android's back button closes the top screen, then returns to the shop tab, then leaves.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (depth.current > 0) {
        pop();
        return true;
      }
      if (tabRef.current !== 'shop') {
        setTabState('shop');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pop]);

  // Links opened from outside the app. Push links come through the SDK's handleDeepLink instead.
  useEffect(() => {
    void Linking.getInitialURL().then((url) => url && openLink(url));
    const sub = Linking.addEventListener('url', ({ url }) => openLink(url));
    return () => sub.remove();
  }, [openLink]);

  const value = useMemo(
    () => ({ tab, stack, setTab, push, pop, replace, openLink }),
    [tab, stack, setTab, push, pop, replace, openLink]
  );
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav outside NavProvider');
  return nav;
}
