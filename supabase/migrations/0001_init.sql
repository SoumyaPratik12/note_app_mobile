-- InkSync MVP schema
-- Notes, pages, AI page-junction repairs, full-text search, RLS, and the
-- private storage bucket for page images.

-- Extensions ---------------------------------------------------------------
create extension if not exists pg_trgm;

-- Profiles -----------------------------------------------------------------
-- Extends auth.users. Holds the Expo push token so Edge Functions can notify
-- the user when OCR completes.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  expo_push_token text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Notes --------------------------------------------------------------------
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text,                                  -- auto-set from first line of page 1
  content text not null default '',            -- full joined text, grows per page
  status text not null default 'open'          -- 'open' | 'complete'
    check (status in ('open', 'complete')),
  page_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Individual captured pages ------------------------------------------------
create table if not exists note_pages (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes (id) on delete cascade,
  page_number int not null,
  storage_path text not null,                  -- Supabase Storage path
  raw_ocr_text text,                           -- original Vision API output
  ocr_confidence double precision,             -- average confidence (0..1)
  ocr_status text not null default 'pending'   -- 'pending'|'processing'|'done'|'failed'
    check (ocr_status in ('pending', 'processing', 'done', 'failed')),
  created_at timestamptz not null default now(),
  unique (note_id, page_number)
);

-- AI junction repairs (audit + trust) --------------------------------------
create table if not exists page_joins (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes (id) on delete cascade,
  from_page int not null,
  to_page int not null,
  original_tail text,
  original_head text,
  repaired_text text,
  created_at timestamptz not null default now()
);

-- Indexes ------------------------------------------------------------------
create index if not exists notes_user_updated_idx
  on notes (user_id, updated_at desc);

-- Full-text search over content.
create index if not exists notes_content_fts_idx
  on notes using gin (to_tsvector('english', coalesce(content, '')));

-- Trigram index for fuzzy / partial matches and title search.
create index if not exists notes_content_trgm_idx
  on notes using gin (content gin_trgm_ops);

create index if not exists note_pages_note_idx
  on note_pages (note_id, page_number);

-- Row Level Security -------------------------------------------------------
alter table profiles enable row level security;
alter table notes enable row level security;
alter table note_pages enable row level security;
alter table page_joins enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own pages" on note_pages
  for all using (
    note_id in (select id from notes where user_id = auth.uid())
  ) with check (
    note_id in (select id from notes where user_id = auth.uid())
  );

create policy "own joins" on page_joins
  for all using (
    note_id in (select id from notes where user_id = auth.uid())
  ) with check (
    note_id in (select id from notes where user_id = auth.uid())
  );

-- Search RPC ---------------------------------------------------------------
-- Keyword search scoped to the caller. Returns the note id, title, and a
-- highlighted snippet around the first match. SECURITY DEFINER so it can run
-- the ts/trgm query efficiently, but it filters on auth.uid() so callers only
-- ever see their own notes.
create or replace function search_notes(q text)
returns table (id uuid, title text, snippet text)
language sql
stable
security definer set search_path = public
as $$
  select
    n.id,
    n.title,
    ts_headline(
      'english',
      coalesce(n.content, ''),
      plainto_tsquery('english', q),
      'StartSel=, StopSel=, MaxFragments=1, MaxWords=24, MinWords=8'
    ) as snippet
  from notes n
  where n.user_id = auth.uid()
    and (
      to_tsvector('english', coalesce(n.content, '')) @@ plainto_tsquery('english', q)
      or n.content ilike '%' || q || '%'
      or n.title ilike '%' || q || '%'
    )
  order by n.updated_at desc
  limit 50;
$$;

-- Storage bucket -----------------------------------------------------------
-- Private bucket for page images. Path convention: <user_id>/<note_id>/<ts>.jpg
insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', false)
on conflict (id) do nothing;

-- Users may only read/write objects under their own user-id prefix.
create policy "own note images read" on storage.objects
  for select using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own note images write" on storage.objects
  for insert with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own note images delete" on storage.objects
  for delete using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
