import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKirora } from '../kirora';
import { useNav } from '../navigation';
import { useShop } from '../store';
import { Button, Header, colors, styles as ui } from '../ui';
import { usePlaceOrder } from './CartScreen';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInScreen({ thenCheckout }: { thenCheckout?: boolean }) {
  const { signIn } = useKirora();
  const { state } = useShop();
  const nav = useNav();
  const placeOrder = usePlaceOrder();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(address);
      if (thenCheckout) nav.replace({ name: 'order', id: await placeOrder() });
      else nav.pop();
      // Once, after the first sign-in: also at checkout (over the order) or after browsing as a guest.
      if (!state.primed) nav.push({ name: 'notifications' });
    } catch (e) {
      setError(`We couldn't sign you in. ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="" onBack={nav.pop} />
      <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
        <Text style={ui.h1}>Sign in</Text>
        <Text style={[ui.muted, { marginTop: 6, fontSize: 15 }]}>
          {thenCheckout ? 'Sign in to place your order.' : 'Track your orders and get restock alerts.'}
        </Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          accessibilityLabel="Email"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={thenCheckout ? 'Sign in and place order' : 'Continue'} busy={busy} onPress={() => void submit()} style={{ marginTop: 16 }} />
        <Text style={[ui.muted, { marginTop: 16, fontSize: 13, textAlign: 'center' }]}>Demo shop: no password needed.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Asked once after signing in: notification permission, then marketing consent. */
export function NotificationsPrimer() {
  const insets = useSafeAreaInsets();
  const { dispatch } = useShop();
  const { enableNotifications } = useKirora();
  const nav = useNav();
  const [busy, setBusy] = useState(false);

  const done = () => {
    dispatch({ type: 'primed' });
    nav.pop();
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      await enableNotifications();
    } finally {
      setBusy(false);
      done();
    }
  };

  return (
    <View style={[ui.screen, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }]}>
      <View style={styles.bell}>
        <Ionicons name="notifications" size={44} color={colors.accent} />
      </View>
      <Text style={[ui.h1, { textAlign: 'center', marginTop: 28 }]}>Never miss a restock</Text>
      <Text style={[ui.muted, { textAlign: 'center', marginTop: 8, fontSize: 15 }]}>We only send what's worth your time.</Text>
      <View style={{ gap: 18, marginTop: 36 }}>
        <Benefit icon="cube-outline" title="Order updates" body="Know the moment your coffee ships." />
        <Benefit icon="refresh-circle-outline" title="Back in stock" body="Sold-out favourites, as soon as they return." />
        <Benefit icon="pricetag-outline" title="Members' offers" body="Early access to new roasts." />
      </View>
      <View style={{ flex: 1 }} />
      <Button title="Turn on notifications" busy={busy} onPress={() => void turnOn()} />
      <Button kind="plain" title="Not now" onPress={done} style={{ marginTop: 6 }} />
    </View>
  );
}

function Benefit({ icon, title, body }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <Ionicons name={icon} size={26} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[ui.body, { fontWeight: '600' }]}>{title}</Text>
        <Text style={ui.muted}>{body}</Text>
      </View>
    </View>
  );
}

/** First launch: sign in or look around first. */
export function WelcomeScreen({ onSignIn, onBrowse }: { onSignIn: () => void; onBrowse: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.welcome, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="light" />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 64 }}>☕️</Text>
        <Text style={styles.welcomeTitle}>Kirora Shop</Text>
        <Text style={styles.welcomeBody}>Small-batch coffee and the gear to brew it, roasted to order.</Text>
      </View>
      <Button title="Sign in" onPress={onSignIn} style={{ backgroundColor: '#fff' }} kind="secondary" />
      <Button title="Browse as guest" onPress={onBrowse} kind="plain" color="#fff" style={{ marginTop: 6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 28,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text
  },
  error: { color: colors.danger, marginTop: 10, fontSize: 14 },
  bell: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  welcome: { flex: 1, backgroundColor: colors.accent, paddingHorizontal: 24 },
  welcomeTitle: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: 16 },
  welcomeBody: { color: '#DCE4FB', fontSize: 18, lineHeight: 26, marginTop: 10 }
});
