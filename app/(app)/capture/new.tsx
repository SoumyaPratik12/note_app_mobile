import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Alert } from 'react-native';
import { CaptureCamera } from '@/components/CaptureCamera';
import { capturePage, createNote } from '@/lib/capture';
import { useAuthStore } from '@/stores/authStore';
import { useNoteStore } from '@/stores/noteStore';

export default function CaptureNewScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const setOpenNote = useNoteStore((s) => s.setOpenNote);

  // The note is created lazily on the first successful capture, then reused
  // for any further pages taken in this session.
  const noteIdRef = useRef<string | null>(null);

  async function handleCapture(base64: string) {
    if (!userId) return;
    try {
      const isNewNote = noteIdRef.current === null;
      if (isNewNote) {
        const note = await createNote(userId);
        noteIdRef.current = note.id;
        setOpenNote(note);
      }
      await capturePage({
        userId,
        noteId: noteIdRef.current!,
        base64,
        isNewNote,
      });
    } catch (e) {
      Alert.alert('Capture failed', (e as Error).message);
    }
  }

  function finish() {
    // Leave the note open; the user can continue or seal it from Home.
    if (noteIdRef.current) {
      router.replace(`/note/${noteIdRef.current}`);
    } else {
      router.back();
    }
  }

  return (
    <CaptureCamera
      onCapture={handleCapture}
      onClose={finish}
      secondaryActionLabel="Done"
      onSecondaryAction={finish}
    />
  );
}
