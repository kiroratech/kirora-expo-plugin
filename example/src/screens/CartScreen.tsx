import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { findProduct, money } from '../catalog';
import { useKirora } from '../kirora';
import { useNav } from '../navigation';
import { cartLines, newOrderId, total, useShop } from '../store';
import { Button, Empty, Header, ProductArt, colors, styles as ui } from '../ui';

const FREE_SHIPPING_FROM = 50;
const SHIPPING = 4.95;

export function shippingFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING;
}

/** Places the cart as an order (no payment: it's a demo) and returns its id. */
export function usePlaceOrder() {
  const { state, dispatch } = useShop();
  const { client } = useKirora();
  return useCallback(async (): Promise<string> => {
    const lines = cartLines(state.cart);
    const subtotal = total(lines);
    const order = {
      id: newOrderId(),
      lines: lines.map(({ productId, quantity, price }) => ({ productId, quantity, price })),
      total: Math.round((subtotal + shippingFor(subtotal)) * 100) / 100,
      placedAt: new Date().toISOString()
    };
    client.track('Checkout Started', { value: subtotal, item_count: lines.length, currency: 'USD' });
    await new Promise((r) => setTimeout(r, 900)); // "paying"
    client.track('Order Placed', {
      order_id: order.id,
      total: order.total,
      currency: 'USD',
      products: lines.map((l) => ({ product_id: l.productId, name: l.name, quantity: l.quantity, price: l.price }))
    });
    dispatch({ type: 'orderPlaced', order });
    return order.id;
  }, [client, dispatch, state.cart]);
}

export function CartScreen() {
  const { state, dispatch } = useShop();
  const { client } = useKirora();
  const nav = useNav();
  const placeOrder = usePlaceOrder();
  const [busy, setBusy] = useState(false);

  const lines = cartLines(state.cart);
  const subtotal = total(lines);
  const shipping = shippingFor(subtotal);

  const setQuantity = (productId: string, quantity: number) => {
    const before = state.cart[productId] ?? 0;
    dispatch({ type: 'setQuantity', productId, quantity });
    if (quantity < before) client.track('Product Removed', { product_id: productId, quantity: before - quantity });
  };

  const checkout = async () => {
    if (!state.customer) {
      nav.push({ name: 'signIn', thenCheckout: true });
      return;
    }
    setBusy(true);
    try {
      nav.push({ name: 'order', id: await placeOrder() });
    } finally {
      setBusy(false);
    }
  };

  if (lines.length === 0) {
    return (
      <View style={ui.screen}>
        <Header title="Cart" />
        <Empty icon="bag-outline" title="Your cart is empty" body="Fresh beans and good gear are a tap away.">
          <Button title="Start shopping" onPress={() => nav.setTab('shop')} style={{ alignSelf: 'stretch' }} />
        </Empty>
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <Header title="Cart" />
      <ScrollView contentContainerStyle={ui.content}>
        <View style={ui.card}>
          {lines.map((line, i) => {
            const product = findProduct(line.productId)!;
            return (
              <View key={line.productId} style={[styles.line, i < lines.length - 1 && ui.rowLine]}>
                <Pressable onPress={() => nav.openLink(`kirorashop://product/${line.productId}`)} style={{ width: 64 }}>
                  <ProductArt product={product} size={64} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{line.name}</Text>
                  <Text style={ui.muted}>{money(line.price)}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable accessibilityLabel={`Fewer ${line.name}`} hitSlop={8} onPress={() => setQuantity(line.productId, line.quantity - 1)}>
                    <Ionicons name={line.quantity === 1 ? 'trash-outline' : 'remove'} size={18} color={colors.text} />
                  </Pressable>
                  <Text style={styles.quantity}>{line.quantity}</Text>
                  <Pressable accessibilityLabel={`More ${line.name}`} hitSlop={8} onPress={() => setQuantity(line.productId, line.quantity + 1)}>
                    <Ionicons name="add" size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[ui.card, { padding: 16, marginTop: 16, gap: 10 }]}>
          <Sum label="Subtotal" value={money(subtotal)} />
          <Sum label="Shipping" value={shipping === 0 ? 'Free' : money(shipping)} />
          {shipping > 0 ? (
            <Text style={[ui.muted, { fontSize: 13 }]}>Add {money(FREE_SHIPPING_FROM - subtotal)} more for free shipping.</Text>
          ) : null}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }} />
          <Sum label="Total" value={money(subtotal + shipping)} strong />
        </View>

        <Button
          title={state.customer ? 'Place order' : 'Sign in to check out'}
          icon="lock-closed-outline"
          busy={busy}
          onPress={() => void checkout()}
          style={{ marginTop: 20 }}
        />
        <Text style={[ui.muted, { textAlign: 'center', marginTop: 10, fontSize: 13 }]}>Demo shop: nothing is charged.</Text>
      </ScrollView>
    </View>
  );
}

function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const style = strong ? { fontSize: 17, fontWeight: '700' as const, color: colors.text } : ui.body;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={style}>{label}</Text>
      <Text style={style}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  lineName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 10,
    height: 36
  },
  quantity: { fontSize: 15, fontWeight: '600', minWidth: 16, textAlign: 'center', color: colors.text }
});
