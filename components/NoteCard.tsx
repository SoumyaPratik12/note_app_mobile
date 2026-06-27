import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Note } from '@/lib/types';
import { relativeTime } from '@/lib/time';
import { useThemeStore, themeColors } from '@/stores/themeStore';

export function NoteCard({ note }: { note: Note }) {
  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];
  
  const pageLabel = `${note.page_count} ${note.page_count === 1 ? 'page' : 'pages'}`;
  const isOpen = note.status === 'open';

  return (
    <Link href={`/note/${note.id}`} asChild>
      <Pressable 
        style={[
          styles.card, 
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.line,
            shadowColor: colors.shadow 
          }
        ]}
      >
        {/* Document Thumbnail icon */}
        <View style={[styles.thumbnail, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
          <View style={[styles.thumbnailLine, { backgroundColor: colors.line, marginTop: 10 }]} />
          <View style={[styles.thumbnailLine, { backgroundColor: colors.line }]} />
          <View style={[styles.thumbnailLine, { backgroundColor: colors.line }]} />
          <View style={[styles.thumbnailLine, { backgroundColor: colors.line, width: '50%' }]} />
        </View>

        {/* Content Details */}
        <View style={styles.details}>
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
            {note.title?.trim() || 'Untitled note'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: colors.ink2 }]}>
              {pageLabel} · {relativeTime(note.updated_at)}
            </Text>
            {isOpen && (
              <View style={styles.openBadge}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.openText, { color: colors.accent }]}>Open</Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron arrow */}
        <View style={[styles.chevron, { borderColor: colors.ink3 }]} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbnail: {
    width: 46,
    height: 54,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 7,
    justifyContent: 'flex-start',
    gap: 5,
  },
  thumbnailLine: {
    height: 2,
    borderRadius: 1,
    width: '100%',
  },
  details: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginRight: 4,
  },
});

