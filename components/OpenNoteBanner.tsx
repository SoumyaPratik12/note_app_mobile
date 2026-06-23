import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNoteStore } from '@/stores/noteStore';
import { relativeTime } from '@/lib/time';

/**
 * Sits at the top of Home and only renders when a note is open. "Continue"
 * jumps straight to the camera for that note; "Mark Done" seals it without
 * opening the camera.
 */
export function OpenNoteBanner() {
  const router = useRouter();
  const openNote = useNoteStore((s) => s.openNote);
  const markDone = useNoteStore((s) => s.markDone);

  if (!openNote) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.title} numberOfLines={1}>
        📝 {openNote.title?.trim() || 'Untitled note'}
      </Text>
      <Text style={styles.meta}>
        {openNote.page_count} {openNote.page_count === 1 ? 'page' : 'pages'} ·{' '}
        {relativeTime(openNote.updated_at)}
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.primary]}
          onPress={() => router.push(`/capture/${openNote.id}`)}
        >
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => markDone(openNote.id)}
        >
          <Text style={styles.secondaryText}>Mark Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#eef4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c9dcff',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111' },
  meta: { marginTop: 2, fontSize: 13, color: '#5a6b87' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  primary: { backgroundColor: '#2563eb' },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#c9dcff' },
  secondaryText: { color: '#2563eb', fontWeight: '600' },
});
