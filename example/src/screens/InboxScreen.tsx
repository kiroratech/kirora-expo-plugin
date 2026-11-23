import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useKirora } from '../kirora';
import { useNav } from '../navigation';
import { type InboxItem, useShop } from '../store';
import { Button, Empty, Header, colors, styles as ui, timeAgo } from '../ui';

/** The Kirora pushes this phone received or opened, newest first. */
export function InboxScreen() {
  const { state, dispatch } = useShop();
  const { pushStatus, enableNotifications } = useKirora();
  const nav = useNav();

  const open = (item: InboxItem) => {
    dispatch({ type: 'read', key: item.key });
    if (item.link) nav.openLink(item.link);
  };

  return (
    <View style={ui.screen}>
      <Header
        title="Notifications"
        right={
          state.inbox.length > 0 ? (
            <Text style={{ color: colors.accent, fontSize: 16 }} onPress={() => dispatch({ type: 'clearInbox' })}>
              Clear
            </Text>
          ) : null
        }
      />
      <FlatList
        contentContainerStyle={ui.content}
        data={state.inbox}
        keyExtractor={(i) => i.key}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Empty
            icon="notifications-outline"
            title="No notifications yet"
            body={
              pushStatus === 'enabled'
                ? "You're all set. Order updates and restock alerts will show up here."
                : 'Turn on notifications to hear about your orders and restocks.'
            }
          >
            {pushStatus !== 'enabled' ? (
              <Button title="Turn on notifications" onPress={() => void enableNotifications()} style={{ alignSelf: 'stretch' }} />
            ) : null}
          </Empty>
        }
        renderItem={({ item }) => (
          <Pressable style={[ui.card, styles.item]} onPress={() => open(item)} accessibilityLabel={item.title}>
            <View style={styles.icon}>
              <Ionicons name="notifications" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[ui.body, { fontWeight: item.read ? '500' : '700', flex: 1 }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[ui.muted, { fontSize: 12 }]}>{timeAgo(item.at)}</Text>
              </View>
              {item.body ? (
                <Text style={[ui.muted, { marginTop: 2 }]} numberOfLines={3}>
                  {item.body}
                </Text>
              ) : null}
            </View>
            {!item.read ? <View style={styles.unread} /> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 8 }
});
