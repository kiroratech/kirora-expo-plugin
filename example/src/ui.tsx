import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Product } from './catalog';

export const colors = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  text: '#1C1917',
  muted: '#78716C',
  line: '#E7E5E4',
  accent: '#1F4BD8',
  accentSoft: '#E8EDFC',
  danger: '#B42318',
  success: '#027A48'
};

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  busy,
  disabled,
  icon,
  style,
  color,
  testID
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'plain';
  busy?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  /** The label's colour, when the default doesn't suit the background. */
  color?: string;
  testID?: string;
}) {
  const primary = kind === 'primary';
  const fg = color ?? (primary ? '#fff' : colors.accent);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        primary && { backgroundColor: colors.accent },
        kind === 'secondary' && { backgroundColor: colors.accentSoft },
        (disabled || pressed) && { opacity: disabled ? 0.45 : 0.8 },
        style
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function ProductArt({ product, size }: { product: Product; size: number }) {
  return (
    <View style={[styles.art, { backgroundColor: product.tint, height: size, borderRadius: size > 120 ? 20 : 14 }]}>
      <Text style={{ fontSize: size * 0.42 }}>{product.emoji}</Text>
      {!product.inStock ? (
        <View style={styles.soldOut}>
          <Text style={styles.soldOutText}>Sold out</Text>
        </View>
      ) : null}
    </View>
  );
}

export function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function Row({
  icon,
  title,
  detail,
  onPress,
  last
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={title} style={[styles.row, !last && styles.rowLine]}>
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={styles.rowTitle}>{title}</Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

export function SwitchRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
  disabled,
  last
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <Ionicons name={icon} size={20} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.accent, false: colors.line }}
        thumbColor="#fff"
      />
    </View>
  );
}

export function Empty({ icon, title, body, children }: { icon: IconName; title: string; body: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={32} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {children}
    </View>
  );
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.bg
  },
  headerSide: { width: 56 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.text },
  h1: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  price: { fontSize: 15, fontWeight: '600', color: colors.text },
  button: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  art: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  soldOut: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(28,25,23,0.75)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  soldOutText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  rowTitle: { flex: 1, fontSize: 16, color: colors.text },
  rowSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  rowDetail: { fontSize: 15, color: colors.muted },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 72, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center', marginBottom: 10 }
});
