import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Note } from '@/lib/types';

interface NoteState {
  // The single currently-open note, if any. MVP allows only one open note at
  // a time; the Home banner and "continue capturing" flow read from here.
  openNote: Note | null;
  loadingOpenNote: boolean;
  /** Fetches the user's open note (status = 'open'), if one exists. */
  refreshOpenNote: () => Promise<void>;
  setOpenNote: (note: Note | null) => void;
  /** Seals a note: status -> 'complete'. Clears it as the open note. */
  markDone: (noteId: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  openNote: null,
  loadingOpenNote: false,

  refreshOpenNote: async () => {
    set({ loadingOpenNote: true });
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[noteStore] refreshOpenNote failed:', error.message);
      set({ loadingOpenNote: false });
      return;
    }
    set({ openNote: (data as Note) ?? null, loadingOpenNote: false });
  },

  setOpenNote: (note) => set({ openNote: note }),

  markDone: async (noteId) => {
    const { error } = await supabase
      .from('notes')
      .update({ status: 'complete', updated_at: new Date().toISOString() })
      .eq('id', noteId);

    if (error) {
      throw new Error(`Failed to mark note done: ${error.message}`);
    }
    if (get().openNote?.id === noteId) {
      set({ openNote: null });
    }
  },
}));
