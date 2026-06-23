import { supabase } from './supabase';
import { uploadPageImage } from './upload';
import type { CapturePageResult, Note } from './types';

/** Creates a fresh open note for the user and returns it. */
export async function createNote(userId: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: userId, status: 'open' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create note: ${error?.message ?? 'unknown'}`);
  }
  return data as Note;
}

/**
 * Uploads a captured page and invokes the capture-page Edge Function, which
 * runs OCR, repairs the page junction (for appends), updates note.content,
 * and sends a push notification. Returns the function's result.
 */
export async function capturePage(args: {
  userId: string;
  noteId: string;
  base64: string;
  isNewNote: boolean;
}): Promise<CapturePageResult> {
  const { userId, noteId, base64, isNewNote } = args;

  const storagePath = await uploadPageImage(userId, noteId, base64);

  const { data, error } = await supabase.functions.invoke<CapturePageResult>(
    'capture-page',
    {
      body: { note_id: noteId, storage_path: storagePath, is_new_note: isNewNote },
    },
  );

  if (error || !data) {
    throw new Error(`OCR processing failed: ${error?.message ?? 'unknown'}`);
  }
  return data;
}
