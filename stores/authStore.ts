import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  // `true` until the initial getSession() resolves, so the router can show a
  // splash instead of flashing the welcome screen for already-signed-in users.
  initializing: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  /** Wires up Supabase auth and keeps the store in sync. Returns an unsubscribe. */
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initializing: true,

  setSession: (session) => set({ session }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },

  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, initializing: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, initializing: false });
    });

    return () => sub.subscription.unsubscribe();
  },
}));

export const useUserId = (): string | undefined =>
  useAuthStore((s) => s.session?.user.id);
