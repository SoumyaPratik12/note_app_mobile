# InkSync — Android MVP

Photograph handwritten notes → get digitized, searchable text back → keep
adding pages → read it back. That single loop is the whole MVP.

**Stack:** React Native (Expo + Expo Router) · Supabase (Postgres, Auth,
Storage, Edge Functions) · Google Cloud Vision (OCR) · Claude Haiku 4.5
(page-junction repair) · Expo Push (notifications) · Zustand (state).

---

## Project layout

```
app/                       Expo Router routes
  index.tsx                entry redirect
  _layout.tsx              auth gating + push registration
  (auth)/welcome.tsx       Google + email sign-in
  (auth)/verify-email.tsx  OTP screen
  (app)/home.tsx           note list + open-note banner + capture FAB
  (app)/search.tsx         keyword search
  (app)/note/[id].tsx      view / inline-edit a note
  (app)/capture/new.tsx    camera — new note
  (app)/capture/[id].tsx   camera — continue an open note
components/                NoteCard, OpenNoteBanner, CaptureCamera, etc.
stores/                    Zustand: authStore, noteStore
lib/                       supabase client, upload, capture, notifications, types
supabase/
  migrations/0001_init.sql schema, RLS, search RPC, storage bucket + policies
  functions/capture-page/  OCR + junction-repair + push Edge Function
```

> Note: `components/`, `stores/`, and `lib/` live at the project root rather
> than under `app/` (as in the original spec) because Expo Router treats every
> file under `app/` as a route. Search is implemented as the `search_notes`
> Postgres RPC (called directly from the client over RLS) instead of a separate
> Edge Function — one fewer network hop, same result.

---

## 1. Supabase setup

```bash
# Link to your hosted project and push the schema:
supabase link --project-ref <your-project-ref>
supabase db push                       # applies supabase/migrations/0001_init.sql

# Deploy the Edge Function and set its secrets:
supabase functions deploy capture-page
supabase secrets set \
  GOOGLE_VISION_API_KEY=<key> \
  ANTHROPIC_API_KEY=<key>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into the function
automatically — don't set them by hand.

The migration creates the private `note-images` bucket and per-user storage
policies, so no manual bucket setup is needed.

**Auth providers:** enable Email (with confirmations) and, for the
"Continue with Google" button, configure the Google provider in the Supabase
dashboard plus `expo-auth-session` on the client (stubbed in `welcome.tsx`).

## 2. App setup

```bash
cp .env.example .env        # fill in EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY
npm install
npm run android             # or: npm start, then press 'a'
```

`EXPO_PUBLIC_*` vars are read at build time and embedded in the client. The
anon key is safe to ship — Row Level Security protects the data.

Push notifications require a physical device and an EAS project id
(`Constants.expoConfig.extra.eas.projectId`); they no-op on simulators.

---

## How the core loop works

1. **Capture** (`capture/new` or `capture/[id]`) takes a JPEG, uploads it to
   `note-images/<user>/<note>/<ts>.jpg` (`lib/upload.ts`), then invokes the
   `capture-page` Edge Function (`lib/capture.ts`).
2. **capture-page** downloads the image, runs Google Vision
   `DOCUMENT_TEXT_DETECTION`, post-processes the text, and — for appended pages
   — asks Claude Haiku 4.5 to repair the seam between the previous page's tail
   and the new page's head. It updates `notes.content`, inserts a `note_pages`
   row (with average OCR confidence) and a `page_joins` audit row, then sends an
   Expo push.
3. **Read back** (`note/[id]`) renders the joined text with low-confidence
   spans underlined (`ConfidenceHighlight`), a horizontal page-thumbnail strip,
   inline editing, and a **Done** action that seals the note (`status:
   'complete'`).
4. **Search** (`search`) calls the `search_notes` RPC (full-text + trigram,
   scoped to the caller) and shows highlighted snippets.

Only one note is "open" at a time; the `noteStore` tracks it and the Home
banner offers Continue / Mark Done.

---

## Not in the MVP

Folders, tags, AI summary/chat, web app, export, offline mode — all Phase 2.
The data layer (Postgres + pgvector-ready) is chosen so semantic search and
heavier ML can be added later without migrating off the storage layer.
