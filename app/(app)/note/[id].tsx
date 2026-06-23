import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfidenceHighlight } from '@/components/ConfidenceHighlight';
import { PageThumbnailStrip } from '@/components/PageThumbnailStrip';
import { supabase } from '@/lib/supabase';
import type { Note, NotePage } from '@/lib/types';
import { useNoteStore } from '@/stores/noteStore';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const markDone = useNoteStore((s) => s.markDone);

  const [note, setNote] = useState<Note | null>(null);
  const [pages, setPages] = useState<NotePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [noteRes, pagesRes] = await Promise.all([
      supabase.from('notes').select('*').eq('id', id).single(),
      supabase
        .from('note_pages')
        .select('*')
        .eq('note_id', id)
        .order('page_number', { ascending: true }),
    ]);
    if (noteRes.data) {
      setNote(noteRes.data as Note);
      setDraft((noteRes.data as Note).content);
    }
    setPages((pagesRes.data as NotePage[]) ?? []);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function saveEdits() {
    if (!id) return;
    const { error } = await supabase
      .from('notes')
      .update({ content: draft, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }
    setNote((n) => (n ? { ...n, content: draft } : n));
    setEditing(false);
  }

  async function seal() {
    if (!id) return;
    try {
      await markDone(id);
      setNote((n) => (n ? { ...n, status: 'complete' } : n));
    } catch (e) {
      Alert.alert('Could not seal note', (e as Error).message);
    }
  }

  if (loading || !note) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const isOpen = note.status === 'open';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {note.title?.trim() || 'Untitled note'}
          </Text>
          <Text style={styles.meta}>
            {note.page_count} {note.page_count === 1 ? 'page' : 'pages'} ·{' '}
            {isOpen ? 'Open' : 'Completed'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <PageThumbnailStrip pages={pages} />

        <View style={styles.divider} />

        {editing ? (
          <TextInput
            style={styles.editor}
            multiline
            value={draft}
            onChangeText={setDraft}
            autoFocus
            textAlignVertical="top"
          />
        ) : (
          <ConfidenceHighlight content={note.content} pages={pages} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isOpen ? (
          <Pressable
            style={[styles.button, styles.secondary]}
            onPress={() => router.push(`/capture/${note.id}`)}
          >
            <Text style={styles.secondaryText}>+ Add Page</Text>
          </Pressable>
        ) : null}

        {editing ? (
          <Pressable style={[styles.button, styles.primary]} onPress={saveEdits}>
            <Text style={styles.primaryText}>Save</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, styles.secondary]}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.secondaryText}>Edit</Text>
          </Pressable>
        )}

        {isOpen && !editing ? (
          <Pressable style={[styles.button, styles.primary]} onPress={seal}>
            <Text style={styles.primaryText}>Done ✓</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  back: { fontSize: 24, color: '#111' },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
  body: { padding: 16, paddingBottom: 40 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee', marginVertical: 16 },
  editor: {
    minHeight: 300,
    fontSize: 16,
    lineHeight: 26,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 10,
    padding: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  button: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primary: { backgroundColor: '#2563eb' },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: '#2563eb' },
  secondaryText: { color: '#2563eb', fontWeight: '600' },
});
