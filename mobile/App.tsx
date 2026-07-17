import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from './src/theme';
import { PLAYLISTS, SONGS, songCount, type Playlist, type Song } from './src/data';
import { SongScreen } from './src/SongScreen';

/**
 * Prototype scope — see MOBILE_APP_PLAN.md.
 * This is Phase 1 spiked thin: seed data in memory, no persistence, no sync, no editing.
 * Navigation is useState rather than expo-router, deliberately — fewer moving parts for a
 * throwaway spike. The real port uses expo-router + SQLite.
 *
 * The point of this build is to answer two questions on a real device:
 *   1. Does the prompter scroll smoothly? (reanimated, UI thread)
 *   2. Do chords-over-lyrics render readably? (the web app never did this at all)
 */

type Nav =
  | { screen: 'playlists' }
  | { screen: 'songs'; playlist: Playlist }
  | { screen: 'song'; song: Song };

export default function App() {
  const [nav, setNav] = useState<Nav>({ screen: 'playlists' });

  const backFromSong = (song: Song) => {
    const pl = PLAYLISTS.find((p) => p.name === song.playlist);
    setNav(pl ? { screen: 'songs', playlist: pl } : { screen: 'playlists' });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {nav.screen === 'playlists' && (
          <Playlists onOpen={(playlist) => setNav({ screen: 'songs', playlist })} />
        )}
        {nav.screen === 'songs' && (
          <Songs
            playlist={nav.playlist}
            onBack={() => setNav({ screen: 'playlists' })}
            onOpen={(song) => setNav({ screen: 'song', song })}
          />
        )}
        {nav.screen === 'song' && (
          <SongScreen song={nav.song} onBack={() => backFromSong(nav.song)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Header({ title, sub }: { title: string; sub?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.ph, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.phTitle}>{title}</Text>
      {sub ? <Text style={styles.phSub}>{sub}</Text> : null}
    </View>
  );
}

function Playlists({ onOpen }: { onOpen: (p: Playlist) => void }) {
  return (
    <View style={styles.root}>
      <Header title="Плейлисты" sub={songCount(SONGS.length)} />
      <FlatList
        data={PLAYLISTS}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          // linked by NAME — the model flaw the real port replaces with an FK
          const n = SONGS.filter((s) => s.playlist === item.name).length;
          return (
            <Pressable style={styles.row} onPress={() => onOpen(item)}>
              <View style={[styles.cover62, { backgroundColor: item.color }]}>
                <Text style={styles.coverEmoji}>{item.emoji}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {songCount(n)} · {item.desc}
                </Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function Songs({
  playlist,
  onBack,
  onOpen,
}: {
  playlist: Playlist;
  onBack: () => void;
  onOpen: (s: Song) => void;
}) {
  const list = SONGS.filter((s) => s.playlist === playlist.name);
  return (
    <View style={styles.root}>
      <Header title={playlist.name} sub={songCount(list.length)} />
      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<Text style={styles.empty}>🎵  Нет песен</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onOpen(item)}>
            <View style={[styles.cover52, { backgroundColor: playlist.color }]}>
              <Text style={styles.coverEmoji}>{item.instr === 'Piano' ? '🎹' : '🎸'}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {item.artist} · {item.key}
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backTxt}>‹ Плейлисты</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  ph: { paddingHorizontal: 16, paddingBottom: 12 },
  phTitle: { color: C.text, fontSize: 30, fontWeight: '800' },
  phSub: { color: C.text3, fontSize: 13, marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  cover62: { width: 62, height: 62, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cover52: { width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 26 },
  rowText: { flex: 1 },
  rowTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  rowSub: { color: C.text3, fontSize: 13, marginTop: 3 },
  chev: { color: C.text3, fontSize: 22 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.sep, marginLeft: 90 },
  empty: { color: C.text3, textAlign: 'center', marginTop: 60, fontSize: 15 },

  backBtn: { padding: 16 },
  backTxt: { color: C.accent, fontSize: 17 },
});
