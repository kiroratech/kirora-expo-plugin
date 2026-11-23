import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, PRODUCTS, money, type Product } from '../catalog';
import { useKirora } from '../kirora';
import { useNav } from '../navigation';
import { useShop } from '../store';
import { ProductArt, colors, styles as ui } from '../ui';

type Filter = 'All' | Product['category'];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state } = useShop();
  const { client } = useKirora();
  const nav = useNav();
  const [filter, setFilter] = useState<Filter>('All');

  const products = filter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter);
  const tile = (width - 16 * 2 - 12) / 2;

  const choose = (next: Filter) => {
    setFilter(next);
    client.track('Product List Viewed', { category: next });
  };

  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 24 }}
      data={products}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 18 }}>
          <Text style={ui.muted}>
            {greeting()}
            {state.customer ? `, ${state.customer.name.split(' ')[0]}` : ''}
          </Text>
          <Text style={[ui.h1, { marginTop: 2 }]}>Kirora Shop</Text>
          <View style={styles.banner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Fresh roast Fridays</Text>
              <Text style={styles.bannerBody}>Free shipping on orders over $50.</Text>
            </View>
            <Ionicons name="cafe" size={36} color="#fff" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(['All', ...CATEGORIES] as Filter[]).map((c) => (
              <Pressable
                key={c}
                onPress={() => choose(c)}
                accessibilityRole="button"
                accessibilityLabel={`Category ${c}`}
                style={[styles.chip, filter === c && styles.chipOn]}
              >
                <Text style={[styles.chipText, filter === c && { color: '#fff' }]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={{ width: tile }}
          onPress={() => nav.push({ name: 'product', id: item.id })}
          accessibilityRole="button"
          accessibilityLabel={item.name}
        >
          <ProductArt product={item} size={tile} />
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={ui.muted} numberOfLines={1}>
            {item.blurb}
          </Text>
          <Text style={[ui.price, { marginTop: 4 }]}>{money(item.price)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    padding: 18,
    marginVertical: 18
  },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bannerBody: { color: '#DCE4FB', fontSize: 14, marginTop: 4 },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line
  },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  name: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 10 }
});
