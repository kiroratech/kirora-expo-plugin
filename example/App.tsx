// Kirora Shop: a small coffee shop app that shows @kirora/react-native in a real app, set up only
// through @kirora/expo-plugin. Customers browse, sign in, order and get pushes (order updates,
// restocks) that open the right screen. Account → Developer tools holds the SDK test harness.
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KiroraProvider, useKirora } from './src/kirora';
import { NavProvider, type Route, type Tab, useNav } from './src/navigation';
import { AccountScreen } from './src/screens/AccountScreen';
import { CartScreen } from './src/screens/CartScreen';
import { DevToolsScreen } from './src/screens/DevToolsScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { OrderScreen, OrdersScreen } from './src/screens/OrderScreens';
import { ProductScreen } from './src/screens/ProductScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { NotificationsPrimer, SignInScreen, WelcomeScreen } from './src/screens/SignInScreens';
import { ShopProvider, cartCount, useShop } from './src/store';
import { colors, type IconName } from './src/ui';

export default function App() {
  return (
    <SafeAreaProvider>
      <ShopProvider>
        <NavProvider>
          <KiroraProvider>
            <StatusBar style="dark" />
            <Shell />
          </KiroraProvider>
        </NavProvider>
      </ShopProvider>
    </SafeAreaProvider>
  );
}

const TABS: Array<{ tab: Tab; label: string; icon: IconName; iconOn: IconName }> = [
  { tab: 'shop', label: 'Shop', icon: 'storefront-outline', iconOn: 'storefront' },
  { tab: 'cart', label: 'Cart', icon: 'bag-outline', iconOn: 'bag' },
  { tab: 'inbox', label: 'Inbox', icon: 'notifications-outline', iconOn: 'notifications' },
  { tab: 'account', label: 'Account', icon: 'person-outline', iconOn: 'person' }
];

const TAB_SCREENS: Record<Tab, string> = { shop: 'Shop', cart: 'Cart', inbox: 'Inbox', account: 'Account' };
const ROUTE_SCREENS: Record<Route['name'], string> = {
  product: 'Product',
  order: 'Order',
  orders: 'Orders',
  signIn: 'Sign In',
  notifications: 'Notification Prompt',
  devtools: 'Developer Tools'
};

function Shell() {
  const { state, dispatch } = useShop();
  const { client } = useKirora();
  const nav = useNav();
  const top = nav.stack[nav.stack.length - 1];
  const welcome = !state.welcomed && !state.customer && !top;
  const screenName = welcome ? 'Welcome' : top ? ROUTE_SCREENS[top.name] : TAB_SCREENS[nav.tab];
  // Changes for every screen opened, even two products in a row.
  const screenKey = welcome ? 'welcome' : JSON.stringify(top ?? nav.tab);

  useEffect(() => {
    if (state.loaded) client.trackScreenView(screenName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- screenName follows screenKey
  }, [client, screenKey, state.loaded]);

  if (!state.loaded) {
    return (
      <View style={[styles.fill, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (welcome) {
    return (
      <WelcomeScreen
        onBrowse={() => dispatch({ type: 'welcomed' })}
        onSignIn={() => {
          nav.setTab('account');
          nav.push({ name: 'signIn' });
        }}
      />
    );
  }

  // Full-screen steps hide the tab bar.
  const fullScreen = top && (top.name === 'signIn' || top.name === 'notifications');
  return (
    <View style={styles.fill}>
      <View style={styles.fill}>{top ? <RouteScreen route={top} /> : <TabScreen tab={nav.tab} />}</View>
      {fullScreen ? null : <TabBar />}
    </View>
  );
}

function TabScreen({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'shop':
      return <ShopScreen />;
    case 'cart':
      return <CartScreen />;
    case 'inbox':
      return <InboxScreen />;
    case 'account':
      return <AccountScreen />;
  }
}

function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'product':
      return <ProductScreen key={route.id} id={route.id} />;
    case 'order':
      return <OrderScreen id={route.id} />;
    case 'orders':
      return <OrdersScreen />;
    case 'signIn':
      return <SignInScreen thenCheckout={route.thenCheckout} />;
    case 'notifications':
      return <NotificationsPrimer />;
    case 'devtools':
      return <DevToolsScreen />;
  }
}

function TabBar() {
  const insets = useSafeAreaInsets();
  const { state } = useShop();
  const nav = useNav();
  const badges: Partial<Record<Tab, number>> = {
    cart: cartCount(state.cart),
    inbox: state.inbox.filter((i) => !i.read).length
  };
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(({ tab, label, icon, iconOn }) => {
        const on = nav.tab === tab;
        const badge = badges[tab] ?? 0;
        return (
          <Pressable
            key={tab}
            style={styles.tab}
            onPress={() => nav.setTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${label} tab`}
          >
            <View>
              <Ionicons name={on ? iconOn : icon} size={24} color={on ? colors.accent : colors.muted} />
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, on && { color: colors.accent }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingTop: 8
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' }
});
