import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSignedImageUrl } from '@/lib/upload';
import type { NotePage } from '@/lib/types';

interface Props {
  pages: NotePage[];
  onPressPage?: (page: NotePage) => void;
}

/** Horizontally scrollable strip of page thumbnails. */
export function PageThumbnailStrip({ pages, onPressPage }: Props) {
  if (pages.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {pages.map((page) => (
        <Thumbnail key={page.id} page={page} onPress={onPressPage} />
      ))}
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
    <Pressable style={styles.thumb} onPress={() => onPress?.(page)}>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      <Text style={styles.label}>p{page.page_number}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 10, paddingVertical: 4 },
  thumb: { alignItems: 'center' },
  image: { width: 64, height: 84, borderRadius: 8, backgroundColor: '#eee' },
  placeholder: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  label: { marginTop: 4, fontSize: 12, color: '#777' },
});
