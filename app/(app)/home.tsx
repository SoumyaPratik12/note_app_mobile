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
import { useThemeStore, themeColors } from '@/stores/themeStore';

export default function HomeScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const refreshOpenNote = useNoteStore((s) => s.refreshOpenNote);

  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];

  const load = useCallback(async () => {
    setRefreshing(true);
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.appName, { color: colors.ink }]}>InkSync</Text>
        <View style={styles.headerActions}>
          {/* Search Button */}
          <Pressable 
            onPress={() => router.push('/search')} 
            style={[styles.headerButton, { backgroundColor: colors.surface2 }]}
            hitSlop={8}
            aria-label="Search"
          >
            <View style={[styles.searchIconCircle, { borderColor: colors.ink2 }]} />
            <View style={[styles.searchIconLine, { backgroundColor: colors.ink2 }]} />
          </Pressable>
          
          {/* Settings Button */}
          <Pressable 
            onPress={() => router.push('/settings')} 
            style={[styles.headerButton, { backgroundColor: colors.surface2 }]}
            hitSlop={8}
            aria-label="Settings"
          >
            <View style={styles.settingsIconContainer}>
              <View style={[styles.settingsLine, { backgroundColor: colors.ink2 }]}>
                <View style={[styles.settingsDot, { backgroundColor: colors.surface2, borderColor: colors.ink2, left: 4 }]} />
              </View>
              <View style={[styles.settingsLine, { backgroundColor: colors.ink2 }]}>
                <View style={[styles.settingsDot, { backgroundColor: colors.surface2, borderColor: colors.ink2, right: 4 }]} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={load} 
            colors={[colors.accent]} 
            tintColor={colors.accent} 
          />
        }
        ListHeaderComponent={
          <View>
            <OpenNoteBanner />
            <Text style={[styles.sectionTitle, { color: colors.ink3 }]}>Recent notes</Text>
          </View>
        }
        renderItem={({ item }) => <NoteCard note={item} />}
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
                <View style={[styles.emptyDocIcon, { borderColor: colors.ink3 }]}>
                  <View style={[styles.emptyDocLine, { backgroundColor: colors.ink3, width: 14 }]} />
                  <View style={[styles.emptyDocLine, { backgroundColor: colors.ink3, width: 14 }]} />
                  <View style={[styles.emptyDocLine, { backgroundColor: colors.ink3, width: 10 }]} />
                </View>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.ink2 }]}>No notes yet</Text>
              <Text style={[styles.emptyText, { color: colors.ink3 }]}>
                Tap <Text style={{ color: colors.accent, fontWeight: '700' }}>Capture</Text> to photograph your first handwritten page.
              </Text>
            </View>
          ) : null
        }
      />

      <Pressable 
        style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]} 
        onPress={() => router.push('/capture/new')}
      >
        <View style={styles.fabPlus}>
          <View style={[styles.fabPlusLineHorizontal, { backgroundColor: colors.accentInk }]} />
          <View style={[styles.fabPlusLineVertical, { backgroundColor: colors.accentInk }]} />
        </View>
        <Text style={[styles.fabText, { color: colors.accentInk }]}>Capture</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  appName: { 
    fontSize: 23, 
    fontWeight: '700', 
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  searchIconCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2.2,
    position: 'absolute',
    left: 11,
    top: 11,
  },
  searchIconLine: {
    width: 2.2,
    height: 6,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  settingsIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    gap: 5,
  },
  settingsLine: {
    height: 2,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  settingsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    position: 'absolute',
  },
  list: { paddingHorizontal: 18, paddingBottom: 120 },
  sectionTitle: { 
    fontSize: 12.5, 
    fontWeight: '700', 
    letterSpacing: 0.5,
    textTransform: 'uppercase', 
    marginVertical: 12,
    marginLeft: 2,
  },
  emptyContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    paddingVertical: 54,
    paddingHorizontal: 20,
  },
  emptyIconWrapper: {
    width: 78,
    height: 78,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyDocIcon: {
    width: 24,
    height: 30,
    borderWidth: 1.8,
    borderRadius: 4,
    paddingTop: 6,
    alignItems: 'center',
    gap: 4,
  },
  emptyDocLine: {
    height: 1.8,
    borderRadius: 0.9,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 230,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    height: 56,
    paddingLeft: 19,
    paddingRight: 22,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  fabPlus: {
    width: 22,
    height: 22,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlusLineHorizontal: {
    position: 'absolute',
    width: 14,
    height: 2.6,
    borderRadius: 1.3,
  },
  fabPlusLineVertical: {
    position: 'absolute',
    width: 2.6,
    height: 14,
    borderRadius: 1.3,
  },
  fabText: { fontWeight: '700', fontSize: 16 },
});

