import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNoteStore } from '@/stores/noteStore';
import { useThemeStore, themeColors } from '@/stores/themeStore';
import { relativeTime } from '@/lib/time';

export function OpenNoteBanner() {
  const router = useRouter();
  const openNote = useNoteStore((s) => s.openNote);
  const markDone = useNoteStore((s) => s.markDone);
  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];

  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (openNote) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [openNote, pulseAnim]);

  if (!openNote) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.accentSoft }]}>
      {/* Pulse Status */}
      <View style={styles.statusRow}>
        <Animated.View style={[styles.dot, { backgroundColor: colors.accent, opacity: pulseAnim }]} />
        <Text style={[styles.statusText, { color: colors.accent }]}>In progress</Text>
      </View>

      <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
        {openNote.title?.trim() || 'Untitled note'}
      </Text>
      <Text style={[styles.meta, { color: colors.ink2 }]}>
        {openNote.page_count} {openNote.page_count === 1 ? 'page' : 'pages'} ·{' '}
        {relativeTime(openNote.updated_at)}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={() => router.push(`/capture/${openNote.id}`)}
        >
          <Text style={[styles.primaryText, { color: colors.accentInk }]}>Continue</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary, { borderColor: colors.accent }]}
          onPress={() => markDone(openNote.id)}
        >
          <Text style={[styles.secondaryText, { color: colors.accent }]}>Mark Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 20,
    padding: 17,
    marginBottom: 22,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 9,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18.5,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.4,
  },
  meta: {
    fontSize: 13.5,
    marginBottom: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontWeight: '700',
    fontSize: 14.5,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    flex: 0,
    paddingHorizontal: 18,
  },
  secondaryText: {
    fontWeight: '600',
    fontSize: 14.5,
  },
});

