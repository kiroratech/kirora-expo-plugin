import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findProduct, money, productProperties } from '../catalog';
import { useKirora } from '../kirora';
import { useNav } from '../navigation';
import { cartCount, useShop } from '../store';
import { Button, Empty, Header, ProductArt, colors, styles as ui } from '../ui';

export function ProductScreen({ id }: { id: string }) {
  const product = findProduct(id);
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useShop();
  const { client, pushStatus, enableNotifications } = useKirora();
  const nav = useNav();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (product) {
      client.track('Product Viewed', productProperties(product));
    }
  }, [client, product]);

  if (!product) {
    return (
      <View style={ui.screen}>
        <Header title="" onBack={nav.pop} />
        <Empty icon="search" title="We couldn't find that" body="This product isn't in the shop any more." />
      </View>
    );
  }

  const inCart = state.cart[product.id] ?? 0;
  const requested = state.restockRequests.includes(product.id);

  const add = () => {
    dispatch({ type: 'setQuantity', productId: product.id, quantity: inCart + 1 });
    client.track('Product Added', {
      ...productProperties(product),
      quantity: 1,
      cart_size: cartCount(state.cart) + 1
    });
  };

  const notifyMe = async () => {
    if (!state.customer) {
      nav.push({ name: 'signIn' });
      return;
    }
    setBusy(true);
    try {
      // Recorded only once a push can reach this phone; otherwise the button stays, to try again.
      if (pushStatus !== 'enabled' && (await enableNotifications()) !== 'granted') return;
      // The event a "back in stock" campaign in Kirora is triggered by.
      client.track('Back In Stock Requested', { product_id: product.id, name: product.name });
      dispatch({ type: 'restockRequested', productId: product.id });
    } catch {
      // Not turned on: as above.
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={ui.screen}>
      <Header title="" onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <ProductArt product={product} size={300} />
        <Text style={[ui.muted, { marginTop: 20 }]}>{product.category}</Text>
        <Text style={[ui.h1, { marginTop: 4 }]}>{product.name}</Text>
        <Text style={[ui.muted, { marginTop: 4 }]}>{product.blurb}</Text>
        <Text style={[ui.h2, { marginTop: 14 }]}>{money(product.price)}</Text>
        <Text style={[ui.body, { marginTop: 14 }]}>{product.description}</Text>
        <View style={styles.perks}>
          <Perk icon="cube-outline" text="Ships in 1–2 days" />
          <Perk icon="refresh-outline" text="30-day returns" />
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {product.inStock ? (
          inCart > 0 ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button kind="secondary" title={`Add another (${inCart})`} onPress={add} style={{ flex: 1 }} />
              <Button title="View cart" icon="bag-outline" onPress={() => nav.openLink('kirorashop://cart')} style={{ flex: 1 }} />
            </View>
          ) : (
            <Button title="Add to cart" icon="bag-add-outline" onPress={add} />
          )
        ) : requested ? (
          <View style={styles.requested}>
            <Ionicons name="notifications" size={18} color={colors.success} />
            <Text style={{ color: colors.success, fontWeight: '600' }}>We'll let you know when it's back</Text>
          </View>
        ) : (
          <Button title="Notify me when it's back" icon="notifications-outline" busy={busy} onPress={() => void notifyMe()} />
        )}
      </View>
    </View>
  );
}

function Perk({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.perk}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={ui.muted}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  perks: { flexDirection: 'row', gap: 18, marginTop: 18 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.bg
  },
  requested: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }
});
