import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSignedImageUrl } from '@/lib/upload';
import type { NotePage } from '@/lib/types';
import { useThemeStore, themeColors } from '@/stores/themeStore';

interface Props {
  pages: NotePage[];
  onPressPage?: (page: NotePage) => void;
  onAddPage?: () => void;
}

/** Horizontally scrollable strip of page thumbnails. */
export function PageThumbnailStrip({ pages, onPressPage, onAddPage }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {pages.map((page) => (
        <Thumbnail key={page.id} page={page} onPress={onPressPage} />
      ))}
      
      {onAddPage && (
        <Pressable 
          style={[styles.addButton, { borderColor: colors.line }]} 
          onPress={onAddPage}
          aria-label="Add page"
        >
          <View style={styles.plusContainer}>
            <View style={[styles.plusLineHorizontal, { backgroundColor: colors.accent }]} />
            <View style={[styles.plusLineVertical, { backgroundColor: colors.accent }]} />
          </View>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Thumbnail({
  page,
  onPress,
}: {
  page: NotePage;
  onPress?: (page: NotePage) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];

  useEffect(() => {
    let active = true;
    getSignedImageUrl(page.storage_path)
      .then((u) => active && setUrl(u))
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [page.storage_path]);

  return (
    <Pressable 
      style={[
        styles.thumb, 
        { 
          backgroundColor: colors.surface, 
          borderColor: colors.line,
          shadowColor: colors.shadow 
        }
      ]} 
      onPress={() => onPress?.(page)}
    >
      {url ? (
        <Image source={{ uri: url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <View style={[styles.line, { backgroundColor: colors.line, marginTop: 12 }]} />
          <View style={[styles.line, { backgroundColor: colors.line }]} />
          <View style={[styles.line, { backgroundColor: colors.line }]} />
          <View style={[styles.line, { backgroundColor: colors.line }]} />
        </View>
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{page.page_number}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { 
    gap: 9, 
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  thumb: { 
    flexDirection: 'column',
    width: 58, 
    height: 74, 
    borderRadius: 10, 
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  image: { 
    width: '100%', 
    height: '100%',
  },
  placeholder: { 
    width: '100%',
    height: '100%',
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
    gap: 8,
  },
  line: {
    height: 2,
    borderRadius: 1,
    width: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    backgroundColor: 'rgba(20, 18, 14, 0.55)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { 
    fontSize: 9, 
    fontWeight: '700', 
    color: '#fff',
  },
  addButton: {
    width: 58,
    height: 74,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusContainer: {
    width: 20,
    height: 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusLineHorizontal: {
    position: 'absolute',
    width: 14,
    height: 2.4,
    borderRadius: 1.2,
  },
  plusLineVertical: {
    position: 'absolute',
    width: 2.4,
    height: 14,
    borderRadius: 1.2,
  },
});

