import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { CaptureCamera } from '@/components/CaptureCamera';
import { capturePage } from '@/lib/capture';
import { supabase } from '@/lib/supabase';
import type { Note } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { useNoteStore } from '@/stores/noteStore';

export default function CaptureContinueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const markDone = useNoteStore((s) => s.markDone);

  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setNote((data as Note) ?? null));
  }, [id]);

  async function handleCapture(base64: string) {
    if (!userId || !id) return;
    try {
      // Appending to an existing note is never a "new note".
      const result = await capturePage({ userId, noteId: id, base64, isNewNote: false });
      // Optimistically bump the local page count for the banner.
      setNote((n) => (n ? { ...n, page_count: result.page_number } : n));
    } catch (e) {
      Alert.alert('Capture failed', (e as Error).message);
    }
  }

  async function done() {
    if (id) {
      try {
        await markDone(id);
      } catch (e) {
        Alert.alert('Could not seal note', (e as Error).message);
        return;
      }
    }
    router.replace('/home');
  }

  const nextPage = (note?.page_count ?? 0) + 1;

  return (
    <CaptureCamera
      bannerTitle={note?.title?.trim() || 'Untitled note'}
      bannerSubtitle={`Page ${nextPage}`}
      onCapture={handleCapture}
      onClose={() => router.back()}
      secondaryActionLabel="Done with note"
      onSecondaryAction={done}
    />
  );
}
