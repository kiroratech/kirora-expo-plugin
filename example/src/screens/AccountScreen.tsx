import { SDK_VERSION, type PushStatus } from '@kirora/react-native';
import React, { useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useKirora } from '../kirora';
import { useNav } from '../navigation';
import { useShop } from '../store';
import { Button, Header, Row, Section, SwitchRow, colors, styles as ui } from '../ui';

const STATUS_TEXT: Record<PushStatus, string> = {
  enabled: 'On for this phone',
  disabled: 'Off for this phone',
  denied: 'Blocked in system settings',
  unanswered: 'Not set up yet',
  unsupported: 'Not available on this device'
};

export function AccountScreen() {
  const { state } = useShop();
  const { pushStatus, refreshPushStatus, setNotifications, setAnalytics, signOut } = useKirora();
  const nav = useNav();
  const [busy, setBusy] = useState(false);

  // Coming back from the system settings may have changed the permission.
  useEffect(() => {
    void refreshPushStatus();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refreshPushStatus());
    return () => sub.remove();
  }, [refreshPushStatus]);

  const toggleNotifications = async (on: boolean) => {
    if (on && pushStatus === 'denied') {
      await Linking.openSettings();
      return;
    }
    setBusy(true);
    try {
      await setNotifications(on);
    } finally {
      setBusy(false);
    }
  };

  const customer = state.customer;
  return (
    <View style={ui.screen}>
      <Header title="Account" />
      <ScrollView contentContainerStyle={ui.content}>
        {customer ? (
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{customer.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ui.h2}>{customer.name}</Text>
              <Text style={ui.muted}>{customer.email}</Text>
            </View>
          </View>
        ) : (
          <View style={[ui.card, { padding: 18, gap: 12 }]}>
            <Text style={ui.h2}>Welcome</Text>
            <Text style={ui.muted}>Sign in to check out, see your orders and get restock alerts.</Text>
            <Button title="Sign in" onPress={() => nav.push({ name: 'signIn' })} />
          </View>
        )}

        {customer ? (
          <Section>
            <Row icon="receipt-outline" title="Orders" detail={String(state.orders.length)} onPress={() => nav.push({ name: 'orders' })} last />
          </Section>
        ) : null}

        <Section title="Notifications">
          <SwitchRow
            icon="notifications-outline"
            title="Push notifications"
            subtitle={pushStatus ? STATUS_TEXT[pushStatus] : 'Checking…'}
            value={pushStatus === 'enabled'}
            onChange={(on) => void toggleNotifications(on)}
            disabled={busy || pushStatus === 'unsupported' || pushStatus === null}
            last
          />
        </Section>

        <Section title="Privacy">
          <SwitchRow
            icon="analytics-outline"
            title="Share usage analytics"
            subtitle="Helps us improve the shop. Off stops tracking on this phone."
            value={state.analytics}
            onChange={setAnalytics}
            last
          />
        </Section>

        <Section title="About">
          <Row icon="construct-outline" title="Developer tools" onPress={() => nav.push({ name: 'devtools' })} />
          <Row icon="code-slash-outline" title="Kirora SDK" detail={SDK_VERSION} last />
        </Section>

        {customer ? (
          <Button
            kind="plain"
            title="Sign out"
            busy={busy}
            onPress={async () => {
              setBusy(true);
              try {
                await signOut();
              } finally {
                setBusy(false);
              }
            }}
            style={{ marginTop: 20 }}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' }
});
