import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useThemeStore, themeColors } from '@/stores/themeStore';

interface SearchHit {
  id: string;
  title: string | null;
  snippet: string;
  updated_at?: string;
  page_count?: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];
  const recentSearches = useThemeStore((s) => s.recentSearches);
  const addSearchQuery = useThemeStore((s) => s.addSearchQuery);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(runSearch, 250);
    return () => debounce.current && clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function runSearch() {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    
    setSearching(true);
    addSearchQuery(trimmed);

    const { data, error } = await supabase.rpc('search_notes', {
      q: trimmed,
    });
    if (error) {
      console.warn('[search] failed:', error.message);
      setResults([]);
    } else {
      setResults((data as SearchHit[]) ?? []);
    }
    setSearching(false);
  }

  const hasResults = results.length > 0;
  const showRecents = query.trim().length < 2;
  const showEmpty = query.trim().length >= 2 && !searching && results.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]} edges={['top']}>
      {/* Header Search Bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <View style={[styles.backArrow, { borderColor: colors.ink }]} />
        </Pressable>
        
        <View style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
          <View style={styles.searchIconWrapper}>
            <View style={[styles.searchIconCircle, { borderColor: colors.ink3 }]} />
            <View style={[styles.searchIconLine, { backgroundColor: colors.ink3 }]} />
          </View>
          <TextInput
            style={[styles.input, { color: colors.ink }]}
            placeholder="Search notes"
            placeholderTextColor={colors.ink3}
            autoFocus
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={runSearch}
          />
        </View>
      </View>

      <View style={styles.content}>
        {/* Recent Searches (Show when input is empty) */}
        {showRecents && recentSearches.length > 0 && (
          <View style={styles.recentsSection}>
            <Text style={[styles.sectionTitle, { color: colors.ink3 }]}>Recent searches</Text>
            <View style={styles.chipsContainer}>
              {recentSearches.map((term, i) => (
                <Pressable
                  key={i}
                  style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  onPress={() => setQuery(term)}
                >
                  <View style={[styles.clockIcon, { borderColor: colors.ink3 }]}>
                    <View style={[styles.clockHour, { backgroundColor: colors.ink3 }]} />
                    <View style={[styles.clockMinute, { backgroundColor: colors.ink3 }]} />
                  </View>
                  <Text style={[styles.chipText, { color: colors.ink }]}>{term}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Search Results List */}
        {!showRecents && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.hitCard, { backgroundColor: colors.surface, borderColor: colors.line, shadowColor: colors.shadow }]}
                onPress={() => router.push(`/note/${item.id}`)}
              >
                <Text style={[styles.hitTitle, { color: colors.ink }]} numberOfLines={1}>
                  {item.title?.trim() || 'Untitled note'}
                </Text>
                <Text style={[styles.hitSnippet, { color: colors.ink2 }]} numberOfLines={2}>
                  {item.snippet}
                </Text>
              </Pressable>
            )}
            ListHeaderComponent={
              hasResults ? (
                <Text style={[styles.resultsLabel, { color: colors.ink3 }]}>
                  Results for “{query.trim()}”
                </Text>
              ) : null
            }
            ListEmptyComponent={
              showEmpty ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyTitle, { color: colors.ink2 }]}>No matches</Text>
                  <Text style={[styles.emptyText, { color: colors.ink3 }]}>Nothing found for "{query}"</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1.5,
    borderRadius: 13,
    paddingHorizontal: 14,
    gap: 9,
  },
  searchIconWrapper: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  searchIconCircle: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  searchIconLine: {
    width: 2,
    height: 5,
    borderRadius: 0.5,
    transform: [{ rotate: '-45deg' }],
    position: 'absolute',
    right: 1,
    bottom: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  content: {
    flex: 1,
  },
  recentsSection: {
    paddingHorizontal: 22,
    paddingTop: 6,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 13,
    marginLeft: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    borderWidth: 1,
  },
  clockIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHour: {
    width: 1.2,
    height: 4,
    borderRadius: 0.6,
    position: 'absolute',
    top: 2,
  },
  clockMinute: {
    width: 4,
    height: 1.2,
    borderRadius: 0.6,
    position: 'absolute',
    right: 2,
    top: 5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: { paddingHorizontal: 18, paddingTop: 6 },
  resultsLabel: { 
    fontSize: 12.5, 
    fontWeight: '700', 
    letterSpacing: 0.5,
    textTransform: 'uppercase', 
    marginBottom: 13,
    marginLeft: 2,
  },
  hitCard: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  hitTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  hitSnippet: { 
    fontSize: 14, 
    lineHeight: 22,
  },
  emptyContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

