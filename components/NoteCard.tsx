import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { Note } from '@/lib/types';
import { relativeTime } from '@/lib/time';

export function NoteCard({ note }: { note: Note }) {
  const pageLabel = `${note.page_count} ${note.page_count === 1 ? 'page' : 'pages'}`;
  return (
    <Link href={`/note/${note.id}`} asChild>
      <Pressable style={styles.card}>
        <Text style={styles.title} numberOfLines={1}>
          {note.title?.trim() || 'Untitled note'}
        </Text>
        <Text style={styles.meta}>
          {pageLabel} · {relativeTime(note.updated_at)}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e2e2',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#111' },
  meta: { marginTop: 4, fontSize: 13, color: '#777' },
});
