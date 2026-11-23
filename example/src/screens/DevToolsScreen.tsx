// The SDK test harness, behind Account → Developer tools: one button per SDK call and a log of
// what came back. Buttons keep their ids (testID and accessibilityLabel) and log
// `[e2e] <name>: ok|error …`, as in kirora-react-native/e2e-app, so the same flows can drive both.
import { Kirora, SDK_VERSION } from '@kirora/react-native';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_URL, TEST_TOKENS } from '../config';
import { useKirora } from '../kirora';
import { useNav } from '../navigation';
import { Header, colors } from '../ui';

export function DevToolsScreen() {
  const { client, restart, log, addLog, clearLog } = useKirora();
  const nav = useNav();

  const run = useCallback(
    (name: string, call: (k: Kirora) => unknown) => async () => {
      try {
        const result = await call(client);
        addLog(`${name}: ok${result === undefined ? '' : ` ${JSON.stringify(result)}`}`);
      } catch (e) {
        addLog(`${name}: error ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
      }
    },
    [client, addLog]
  );

  const start = (label: string, extra = {}) => () => {
    const k = restart(extra);
    addLog(`${label}: ok available=${k.isAvailable}`);
  };

  const actions: Array<[string, () => unknown]> = [
    ['start', start('start')],
    ['startConsent', start('startConsent', { requireTrackingConsent: true })],
    ['identifyA', run('identifyA', (k) => k.identify(TEST_TOKENS.userA))],
    ['identifyB', run('identifyB', (k) => k.identify(TEST_TOKENS.userB))],
    ['identifyFetch', run('identifyFetch', (k) => k.identify())],
    ['identifyRefused', run('identifyRefused', (k) => k.identify(TEST_TOKENS.refused))],
    ['logout', run('logout', (k) => k.logout())],
    ['track', run('track', (k) => k.track('E2E Tapped', { n: 1, ok: true, nested: { list: [1, 'two', null] }, email: 'x@example.com' }))],
    ['trackProto', run('trackProto', (k) => k.track('E2E Proto', JSON.parse('{"__proto__":{"tier":"gold"},"order_id":"ORD-1042"}')))],
    ['trackDropped', run('trackDropped', (k) => k.track('E2E Dropped', { secret: true }))],
    ['trackScreen', run('trackScreen', (k) => k.trackScreenView('E2E Screen'))],
    ['consentOn', run('consentOn', (k) => k.setTrackingConsent(true))],
    ['consentOff', run('consentOff', (k) => k.setTrackingConsent(false))],
    ['pushConsentOn', run('pushConsentOn', (k) => k.setPushConsent(true))],
    ['pushConsentOff', run('pushConsentOff', (k) => k.setPushConsent(false))],
    ['requestPermission', run('requestPermission', (k) => k.requestPushPermission())],
    ['pushStatus', run('pushStatus', (k) => k.getPushStatus())],
    ['pushEnabledOn', run('pushEnabledOn', (k) => k.setPushEnabled(true))],
    ['pushEnabledOff', run('pushEnabledOff', (k) => k.setPushEnabled(false))],
    ['flush', run('flush', (k) => k.flush())],
    ['state', run('state', (k) => k.getState())],
    // A refusal followed at once by a replacement client must still reach native.
    ['replaceAfterRefusal', run('replaceAfterRefusal', (k) => { k.setTrackingConsent(false); start('replaced')(); })],
    ['clearLog', clearLog]
  ];

  return (
    <View style={styles.root}>
      <Header title="Developer tools" onBack={nav.pop} />
      <View style={{ paddingHorizontal: 12, flex: 1 }}>
        <Text testID="available" style={styles.info}>
          SDK {SDK_VERSION} · available: {String(client.isAvailable)} · {API_URL}
        </Text>
        <Text style={styles.note}>Buttons act on the shop's own Kirora client; "start" replaces it.</Text>
        <View style={styles.buttons}>
          {actions.map(([id, action]) => (
            <Pressable key={id} testID={id} accessibilityLabel={id} onPress={() => void action()} style={styles.button}>
              <Text style={styles.buttonText}>{id}</Text>
            </Pressable>
          ))}
        </View>
        <Text testID="lastLine" style={styles.last} numberOfLines={3}>
          {log[log.length - 1] ?? ''}
        </Text>
        <ScrollView style={styles.log} testID="log">
          {log.map((line, i) => (
            <Text key={i} style={styles.line} selectable>
              {line}
            </Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  info: { fontWeight: '600', color: colors.text, fontSize: 12 },
  note: { color: colors.muted, fontSize: 12, marginVertical: 6 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  button: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 },
  buttonText: { color: '#fff', fontSize: 11 },
  last: { marginVertical: 6, fontWeight: '600', color: colors.text },
  log: { flex: 1, borderTopWidth: 1, borderColor: colors.line },
  line: { fontSize: 11, fontFamily: 'monospace', color: '#333' }
});
