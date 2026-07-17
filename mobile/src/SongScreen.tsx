import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedRef,
  useFrameCallback,
  scrollTo,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, TAB_H } from './theme';
import { parseLyrics } from './lyrics';
import type { Song } from './data';

/**
 * Prompter pacing, ported from startScroll() (index.html:1074).
 *
 * The web app runs setInterval(30ms) and adds `boost` px per tick, with a sub-pixel
 * accumulator because scrollTop is integer-only. We keep the tuned curve exactly but
 * drop the accumulator: a float shared value has no rounding to work around, and
 * running on the UI thread means it can't stutter when JS is busy.
 */
const boostFor = (spd: number) => (spd > 6 ? spd * 0.1 : spd * 0.08);
const pxPerMs = (spd: number) => boostFor(spd) / 30;

export function SongScreen({ song, onBack }: { song: Song; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [speed, setSpeed] = useState(3); // index.html default
  const [running, setRunning] = useState(false);

  // Screen must not sleep mid-song. The PWA cannot do this at all.
  useKeepAwake();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const maxOffset = useSharedValue(0);
  const rate = useSharedValue(pxPerMs(3));
  const isRunning = useSharedValue(false);

  const setSpeedBoth = (n: number) => {
    const clamped = Math.min(10, Math.max(1, n));
    setSpeed(clamped);
    rate.value = pxPerMs(clamped);
  };

  const toggle = () => {
    const next = !running;
    setRunning(next);
    isRunning.value = next;
  };

  useFrameCallback((frame) => {
    'worklet';
    if (!isRunning.value) return;
    const dt = frame.timeSincePreviousFrame ?? 16;
    offset.value += rate.value * dt;
    if (offset.value >= maxOffset.value) {
      offset.value = maxOffset.value;
      isRunning.value = false; // auto-stop at the bottom, as the web app does
    }
    scrollTo(scrollRef, 0, offset.value, false);
  });

  // Keep our offset in sync when the user drags manually, so resuming doesn't jump.
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (!isRunning.value) offset.value = e.contentOffset.y;
      maxOffset.value = Math.max(0, e.contentSize.height - e.layoutMeasurement.height);
    },
  });

  const lines = parseLyrics(song.lyrics);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist}
        </Text>
        <View style={styles.chordsBar}>
          <Text style={styles.chordsVal}>{song.key || '—'}</Text>
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.body, { paddingBottom: TAB_H + insets.bottom + 80 }]}
      >
        {lines.map((l) => {
          if (l.kind === 'gap') return <View key={l.key} style={styles.gap} />;
          if (l.kind === 'section')
            return (
              <Text key={l.key} style={styles.section}>
                {l.text.replace(/^\[|\]$/g, '')}
              </Text>
            );
          if (l.kind === 'chord')
            return (
              <Text key={l.key} style={styles.chord}>
                {l.text}
              </Text>
            );
          return (
            <Text key={l.key} style={styles.lyric}>
              {l.text}
            </Text>
          );
        })}
      </Animated.ScrollView>

      {/* Context-switching tab bar: in detail it becomes Back / Суфлёр / Скорость */}
      <View style={[styles.tabbar, { paddingBottom: insets.bottom }]}>
        <Pressable style={styles.tab} onPress={onBack}>
          <Text style={styles.tabIcon}>‹</Text>
          <Text style={styles.tabLabel}>Плейлист</Text>
        </Pressable>

        <Pressable style={styles.tab} onPress={toggle}>
          <Text style={[styles.tabIcon, running && { color: C.playing }]}>{running ? '■' : '▶'}</Text>
          <Text style={[styles.tabLabel, running && { color: C.playing }]}>
            {running ? 'Стоп' : 'Суфлёр'}
          </Text>
        </Pressable>

        <View style={styles.tab}>
          <View style={styles.spdRow}>
            <Pressable hitSlop={10} onPress={() => setSpeedBoth(speed - 1)}>
              <Text style={styles.spdBtn}>−</Text>
            </Pressable>
            <Text style={styles.spdVal}>{speed}</Text>
            <Pressable hitSlop={10} onPress={() => setSpeedBoth(speed + 1)}>
              <Text style={styles.spdBtn}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.tabLabel}>Скорость</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.sep,
  },
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  artist: { color: C.text3, fontSize: 14, marginTop: 2 },
  chordsBar: {
    marginTop: 10,
    backgroundColor: C.bg2,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chordsVal: { color: C.chord, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  body: { padding: 20 },
  gap: { height: 10 },
  section: {
    color: C.section,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  chord: {
    color: C.chord,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'monospace',
    lineHeight: 24,
  },
  lyric: { color: C.text, fontSize: 22, lineHeight: 32 },

  tabbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(12,12,12,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.sep,
  },
  tab: { flex: 1, height: TAB_H, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { color: C.text2, fontSize: 18, lineHeight: 20 },
  tabLabel: { color: C.text3, fontSize: 10, marginTop: 2 },
  spdRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  spdBtn: { color: C.accent, fontSize: 20, fontWeight: '600', lineHeight: 22 },
  spdVal: { color: C.text, fontSize: 15, fontWeight: '700', minWidth: 16, textAlign: 'center' },
});
