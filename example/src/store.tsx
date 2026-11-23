// The shop's own state: the signed-in customer, cart, orders and notification inbox, kept on the
// device. No shop backend: the catalogue is in the app and orders are made up locally.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { findProduct } from './catalog';

export interface Customer {
  email: string;
  name: string;
}

export interface OrderLine {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  lines: OrderLine[];
  total: number;
  placedAt: string;
}

export interface InboxItem {
  key: string;
  title: string;
  body: string;
  link?: string;
  at: string;
  read: boolean;
}

export interface ShopState {
  loaded: boolean;
  customer: Customer | null;
  cart: Record<string, number>;
  orders: Order[];
  inbox: InboxItem[];
  /** Set once the welcome screen was dismissed (signed in or browsing as a guest). */
  welcomed: boolean;
  /** Set once the notification screen was shown after a sign-in. */
  primed: boolean;
  /** The customer's analytics choice, mirrored for the switch; the SDK keeps the real one. */
  analytics: boolean;
  restockRequests: string[];
}

const initial: ShopState = {
  loaded: false,
  customer: null,
  cart: {},
  orders: [],
  inbox: [],
  welcomed: false,
  primed: false,
  analytics: true,
  restockRequests: []
};

type Action =
  | { type: 'loaded'; saved: Partial<ShopState> }
  | { type: 'signedIn'; customer: Customer }
  | { type: 'signedOut' }
  | { type: 'welcomed' }
  | { type: 'primed' }
  | { type: 'analytics'; on: boolean }
  | { type: 'setQuantity'; productId: string; quantity: number }
  | { type: 'orderPlaced'; order: Order }
  | { type: 'notification'; item: InboxItem }
  | { type: 'read'; key: string }
  | { type: 'clearInbox' }
  | { type: 'restockRequested'; productId: string };

const INBOX_LIMIT = 50;

/** Adds a push to the inbox, newest first; the same push again (received, then tapped) keeps one entry, read if either was. */
function withNotification(inbox: InboxItem[], item: InboxItem): InboxItem[] {
  return inbox.some((i) => i.key === item.key)
    ? inbox.map((i) => (i.key === item.key ? { ...i, read: i.read || item.read } : i))
    : [item, ...inbox].slice(0, INBOX_LIMIT);
}

/** The cart with `productId` at `quantity`; none left removes it. */
function withQuantity(cart: Record<string, number>, productId: string, quantity: number): Record<string, number> {
  const next = { ...cart };
  if (quantity > 0) next[productId] = quantity;
  else delete next[productId];
  return next;
}

function reducer(state: ShopState, action: Action): ShopState {
  switch (action.type) {
    case 'loaded': {
      // A tap that cold-started the app can arrive before storage loads: added to what was stored,
      // oldest first so the newest stays on top.
      const inbox = [...state.inbox].reverse().reduce(withNotification, action.saved.inbox ?? []);
      return { ...state, ...action.saved, inbox, loaded: true };
    }
    case 'signedIn':
      return { ...state, customer: action.customer, welcomed: true };
    case 'signedOut':
      return { ...state, customer: null, orders: [], inbox: [], restockRequests: [] };
    case 'welcomed':
      return { ...state, welcomed: true };
    case 'primed':
      return { ...state, primed: true };
    case 'analytics':
      return { ...state, analytics: action.on };
    case 'setQuantity':
      return { ...state, cart: withQuantity(state.cart, action.productId, action.quantity) };
    case 'orderPlaced': {
      // Only what was ordered leaves the cart: anything added while paying stays.
      const cart = action.order.lines.reduce(
        (c, line) => withQuantity(c, line.productId, (c[line.productId] ?? 0) - line.quantity),
        state.cart
      );
      return { ...state, cart, orders: [action.order, ...state.orders] };
    }
    case 'notification':
      return { ...state, inbox: withNotification(state.inbox, action.item) };
    case 'read':
      return { ...state, inbox: state.inbox.map((i) => (i.key === action.key ? { ...i, read: true } : i)) };
    case 'clearInbox':
      return { ...state, inbox: [] };
    case 'restockRequested':
      return state.restockRequests.includes(action.productId)
        ? state
        : { ...state, restockRequests: [...state.restockRequests, action.productId] };
  }
}

const STORAGE_KEY = 'kirora-shop/v1';

interface Shop {
  state: ShopState;
  dispatch: React.Dispatch<Action>;
}

const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((text) => dispatch({ type: 'loaded', saved: text ? (JSON.parse(text) as Partial<ShopState>) : {} }))
      .catch(() => dispatch({ type: 'loaded', saved: {} }));
  }, []);

  const saving = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.loaded) return;
    if (saving.current) clearTimeout(saving.current);
    const { loaded: _loaded, ...saved } = state;
    saving.current = setTimeout(() => void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {}), 300);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error('useShop outside ShopProvider');
  return shop;
}

export function cartLines(cart: Record<string, number>): Array<OrderLine & { name: string }> {
  return Object.entries(cart).flatMap(([productId, quantity]) => {
    const p = findProduct(productId);
    return p ? [{ productId, quantity, price: p.price, name: p.name }] : [];
  });
}

export function cartCount(cart: Record<string, number>): number {
  return Object.values(cart).reduce((n, q) => n + q, 0);
}

export function total(lines: OrderLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100;
}

export function newOrderId(): string {
  return `KS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

