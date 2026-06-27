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
import { useThemeStore, themeColors } from '@/stores/themeStore';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const markDone = useNoteStore((s) => s.markDone);
  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];

  const [note, setNote] = useState<Note | null>(null);
  const [pages, setPages] = useState<NotePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');

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
      setTitleDraft((noteRes.data as Note).title || '');
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
      .update({ 
        title: titleDraft.trim() || 'Untitled note', 
        content: draft, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);
    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }
    setNote((n) => (n ? { ...n, title: titleDraft.trim() || 'Untitled note', content: draft } : n));
    setEditing(false);
  }

  async function handleDelete() {
    if (!id) return;
    Alert.alert(
      'Delete Note',
      'Are you sure you want to permanently delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('notes').delete().eq('id', id);
            if (error) {
              Alert.alert('Delete failed', error.message);
              return;
            }
            router.replace('/home');
          },
        },
      ],
    );
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
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.paper }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const isOpen = note.status === 'open';
  const pageMeta = `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`;
  const statusColor = isOpen ? colors.accent : colors.ink3;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderColor: colors.line }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <View style={[styles.backArrow, { borderColor: colors.ink }]} />
        </Pressable>
        
        {!editing ? (
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
              {note.title?.trim() || 'Untitled note'}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: colors.ink2 }]}>{pageMeta}</Text>
              <View style={[styles.metaDot, { backgroundColor: colors.ink3 }]} />
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {isOpen ? 'Open' : 'Completed'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.ink }]}>Editing note</Text>
          </View>
        )}

        <Pressable onPress={handleDelete} hitSlop={12} style={styles.deleteButton} aria-label="Delete">
          <View style={styles.trashIconContainer}>
            <View style={[styles.trashLid, { backgroundColor: colors.ink2 }]} />
            <View style={[styles.trashBody, { borderColor: colors.ink2 }]}>
              <View style={[styles.trashLine, { backgroundColor: colors.ink2 }]} />
              <View style={[styles.trashLine, { backgroundColor: colors.ink2 }]} />
            </View>
          </View>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!editing ? (
          <View>
            {/* Horizontal thumbnail strip, with interactive Add Page button if open */}
            <View style={styles.stripWrapper}>
              <PageThumbnailStrip 
                pages={pages} 
                onAddPage={isOpen ? () => router.push(`/capture/${note.id}`) : undefined} 
              />
            </View>

            {/* Note text content card */}
            <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.line, shadowColor: colors.shadow }]}>
              <ConfidenceHighlight content={note.content} pages={pages} />
            </View>
            
            <View style={styles.confidenceInfo}>
              <Text style={[styles.confidenceText, { color: colors.ink3 }]}>
                <Text style={[styles.dashedText, { color: colors.low, borderBottomColor: colors.low }]}>dashed</Text> words are low-confidence — tap Edit to fix
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.editContainer}>
            <Text style={[styles.editLabel, { color: colors.ink2 }]}>Note Title</Text>
            <TextInput
              style={[styles.titleInput, { color: colors.ink, backgroundColor: colors.surface2, borderColor: colors.line }]}
              value={titleDraft}
              onChangeText={setTitleDraft}
              placeholder="Untitled note"
              placeholderTextColor={colors.ink3}
            />
            <Text style={[styles.editLabel, { color: colors.ink2 }]}>Content</Text>
            <TextInput
              style={[styles.editor, { color: colors.ink, backgroundColor: colors.surface2, borderColor: colors.line }]}
              multiline
              value={draft}
              onChangeText={setDraft}
              textAlignVertical="top"
            />
          </View>
        )}
      </ScrollView>

      {/* Footer controls */}
      <View style={[styles.footer, { borderColor: colors.line, backgroundColor: colors.paper }]}>
        {editing ? (
          <>
            <Pressable 
              style={[styles.button, styles.secondary, { borderColor: colors.line, backgroundColor: colors.surface }]} 
              onPress={() => setEditing(false)}
            >
              <Text style={[styles.secondaryText, { color: colors.ink2 }]}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.button, styles.primary, { backgroundColor: colors.accent }]} 
              onPress={saveEdits}
            >
              <Text style={[styles.primaryText, { color: colors.accentInk }]}>Save changes</Text>
            </Pressable>
          </>
        ) : (
          <>
            {isOpen && (
              <Pressable 
                style={[styles.button, styles.secondary, { borderColor: colors.line, backgroundColor: colors.surface }]} 
                onPress={() => router.push(`/capture/${note.id}`)}
              >
                <View style={styles.footerPlusIcon}>
                  <View style={[styles.footerPlusLineH, { backgroundColor: colors.ink }]} />
                  <View style={[styles.footerPlusLineV, { backgroundColor: colors.ink }]} />
                </View>
                <Text style={[styles.secondaryText, { color: colors.ink }]}>Add Page</Text>
              </Pressable>
            )}
            
            <Pressable 
              style={[styles.button, styles.secondary, { borderColor: colors.line, backgroundColor: colors.surface, flex: isOpen ? 0 : 1, paddingHorizontal: 24 }]} 
              onPress={() => setEditing(true)}
            >
              <Text style={[styles.secondaryText, { color: colors.ink }]}>Edit</Text>
            </Pressable>

            {isOpen && (
              <Pressable 
                style={[styles.button, styles.primary, { backgroundColor: colors.accent, flex: 0, paddingHorizontal: 20 }]} 
                onPress={seal}
              >
                <View style={styles.checkIcon}>
                  <View style={[styles.checkPart1, { backgroundColor: colors.accentInk }]} />
                  <View style={[styles.checkPart2, { backgroundColor: colors.accentInk }]} />
                </View>
                <Text style={[styles.primaryText, { color: colors.accentInk }]}>Done</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  deleteButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashLid: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginBottom: 2,
  },
  trashBody: {
    width: 13,
    height: 14,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  trashLine: {
    width: 1.5,
    height: '100%',
    borderRadius: 0.7,
  },
  headerText: { flex: 1, marginLeft: 6 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  meta: { fontSize: 13, fontWeight: '500' },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 9,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  body: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 40 },
  stripWrapper: {
    marginBottom: 20,
  },
  contentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  confidenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingLeft: 2,
  },
  confidenceText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  dashedText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dashed',
  },
  editContainer: {
    gap: 8,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  titleInput: {
    fontSize: 16.5,
    fontWeight: '600',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  editor: {
    minHeight: 340,
    fontSize: 16.5,
    lineHeight: 28,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  button: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  primaryText: {
    fontWeight: '700',
    fontSize: 14.5,
  },
  secondary: {
    flex: 1,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
  },
  secondaryText: {
    fontWeight: '600',
    fontSize: 14.5,
  },
  footerPlusIcon: {
    width: 14,
    height: 14,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPlusLineH: {
    position: 'absolute',
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  footerPlusLineV: {
    position: 'absolute',
    width: 2,
    height: 12,
    borderRadius: 1,
  },
  checkIcon: {
    width: 14,
    height: 14,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkPart1: {
    position: 'absolute',
    width: 2.2,
    height: 6,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
    left: 3,
    bottom: 3,
  },
  checkPart2: {
    position: 'absolute',
    width: 2.2,
    height: 11,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
    right: 3,
    bottom: 4,
  },
});
