import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { findProduct, money } from '../catalog';
import { useKirora } from '../kirora';
import { useNav } from '../navigation';
import { useShop } from '../store';
import { Button, Empty, Header, ProductArt, colors, styles as ui, timeAgo } from '../ui';

const STEPS = ['Order placed', 'Shipped', 'Delivered'];

export function OrderScreen({ id }: { id: string }) {
  const { state } = useShop();
  const { pushStatus, enableNotifications } = useKirora();
  const nav = useNav();
  const order = state.orders.find((o) => o.id === id);

  if (!order) {
    return (
      <View style={ui.screen}>
        <Header title="Order" onBack={nav.pop} />
        <Empty icon="receipt-outline" title={`Order ${id}`} body="This order isn't on this phone. Orders live on the device that placed them." />
      </View>
    );
  }

  const justPlaced = Date.now() - new Date(order.placedAt).getTime() < 2 * 60_000;

  return (
    <View style={ui.screen}>
      <Header title={`Order ${order.id}`} onBack={nav.pop} />
      <ScrollView contentContainerStyle={ui.content}>
        {justPlaced ? (
          <View style={styles.thanks}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={[ui.h2, { marginTop: 8 }]}>Thanks for your order!</Text>
            <Text style={[ui.muted, { textAlign: 'center', marginTop: 4 }]}>We're roasting and packing it now.</Text>
          </View>
        ) : null}

        <View style={[ui.card, { padding: 16 }]}>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.step}>
              <View style={[styles.dot, i === 0 && { backgroundColor: colors.success, borderColor: colors.success }]}>
                {i === 0 ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
              </View>
              <Text style={[ui.body, i > 0 && { color: colors.muted }]}>{step}</Text>
              {i === 0 ? <Text style={[ui.muted, { marginLeft: 'auto' }]}>{timeAgo(order.placedAt)}</Text> : null}
            </View>
          ))}
        </View>

        {pushStatus !== 'enabled' ? (
          <View style={styles.nudge}>
            <Ionicons name="notifications-outline" size={22} color={colors.accent} />
            <Text style={[ui.body, { flex: 1 }]}>Get a notification when your order ships.</Text>
            <Button kind="secondary" title="Turn on" onPress={() => void enableNotifications()} style={{ height: 38 }} />
          </View>
        ) : null}

        <Text style={[ui.sectionTitle, { marginTop: 24 }]}>Items</Text>
        <View style={ui.card}>
          {order.lines.map((line, i) => {
            const product = findProduct(line.productId);
            return (
              <View key={line.productId} style={[styles.line, i < order.lines.length - 1 && ui.rowLine]}>
                {product ? <View style={{ width: 48 }}><ProductArt product={product} size={48} /></View> : null}
                <Text style={[ui.body, { flex: 1 }]}>
                  {product?.name ?? line.productId} × {line.quantity}
                </Text>
                <Text style={ui.body}>{money(line.price * line.quantity)}</Text>
              </View>
            );
          })}
          <View style={[styles.line, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line }]}>
            <Text style={[ui.body, { flex: 1, fontWeight: '700' }]}>Total paid</Text>
            <Text style={[ui.body, { fontWeight: '700' }]}>{money(order.total)}</Text>
          </View>
        </View>

        <Button kind="plain" title="Keep shopping" onPress={() => nav.setTab('shop')} style={{ marginTop: 16 }} />
      </ScrollView>
    </View>
  );
}

export function OrdersScreen() {
  const { state } = useShop();
  const nav = useNav();
  return (
    <View style={ui.screen}>
      <Header title="Orders" onBack={nav.pop} />
      <FlatList
        contentContainerStyle={ui.content}
        data={state.orders}
        keyExtractor={(o) => o.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Empty icon="receipt-outline" title="No orders yet" body="Orders you place show up here." />}
        renderItem={({ item }) => (
          <Pressable style={[ui.card, styles.orderRow]} onPress={() => nav.push({ name: 'order', id: item.id })} accessibilityLabel={`Order ${item.id}`}>
            <View style={{ flex: 1 }}>
              <Text style={[ui.body, { fontWeight: '600' }]}>{item.id}</Text>
              <Text style={ui.muted}>
                {item.lines.reduce((n, l) => n + l.quantity, 0)} items · {timeAgo(item.placedAt)}
              </Text>
            </View>
            <Text style={ui.price}>{money(item.total)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  thanks: { alignItems: 'center', paddingVertical: 20 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 16
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }
});
