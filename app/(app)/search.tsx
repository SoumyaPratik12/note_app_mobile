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

interface SearchHit {
  id: string;
  title: string | null;
  snippet: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

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
    setSearching(true);
    // search_notes is a SECURITY DEFINER RPC defined in the schema migration;
    // it runs a pg_trgm / full-text query scoped to auth.uid() and returns a
    // highlighted snippet around the match.
    const { data, error } = await supabase.rpc('search_notes', {
      q: query.trim(),
    });
    if (error) {
      console.warn('[search] failed:', error.message);
      setResults([]);
    } else {
      setResults((data as SearchHit[]) ?? []);
    }
    setSearching(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Search your notes…"
          autoFocus
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            style={styles.hit}
            onPress={() => router.push(`/note/${item.id}`)}
          >
            <Text style={styles.hitTitle} numberOfLines={1}>
              {item.title?.trim() || 'Untitled note'}
            </Text>
            <Text style={styles.hitSnippet} numberOfLines={2}>
              {item.snippet}
            </Text>
          </Pressable>
        )}
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={styles.resultsLabel}>
              Results for “{query.trim()}”
            </Text>
          ) : null
        }
        ListEmptyComponent={
          query.trim().length >= 2 && !searching ? (
            <Text style={styles.empty}>No matches.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  back: { fontSize: 24, color: '#111' },
  input: {
    flex: 1,
    backgroundColor: '#f1f1f3',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  list: { padding: 16 },
  resultsLabel: { color: '#999', fontSize: 13, marginBottom: 12, fontWeight: '600' },
  hit: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e2e2',
  },
  hitTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  hitSnippet: { marginTop: 4, fontSize: 14, color: '#666' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
