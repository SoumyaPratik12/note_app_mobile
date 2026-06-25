import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoteCard } from '@/components/NoteCard';
import { OpenNoteBanner } from '@/components/OpenNoteBanner';
import { supabase } from '@/lib/supabase';
import type { Note } from '@/lib/types';
import { useNoteStore } from '@/stores/noteStore';

export default function HomeScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const refreshOpenNote = useNoteStore((s) => s.refreshOpenNote);

  const load = useCallback(async () => {
    setRefreshing(true);
    // RLS scopes this to the signed-in user; no user_id filter needed.
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('[home] failed to load notes:', error.message);
    } else {
      setNotes((data as Note[]) ?? []);
    }
    await refreshOpenNote();
    setRefreshing(false);
  }, [refreshOpenNote]);

  // Reload whenever the screen regains focus (e.g. after capture/seal).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.appName}>InkSync</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/search')} hitSlop={12}>
            <Text style={styles.search}>Search 🔍</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListHeaderComponent={
          <View>
            <OpenNoteBanner />
            <Text style={styles.sectionTitle}>Recent notes</Text>
          </View>
        }
        renderItem={({ item }) => <NoteCard note={item} />}
        ListEmptyComponent={
          !refreshing ? (
            <Text style={styles.empty}>
              No notes yet. Tap Capture to digitize your first page.
            </Text>
          ) : null
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push('/capture/new')}>
        <Text style={styles.fabText}>+ Capture</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  appName: { fontSize: 22, fontWeight: '800', color: '#111' },
  search: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsIcon: {
    fontSize: 22,
  },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 10 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, paddingHorizontal: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    backgroundColor: '#2563eb',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
