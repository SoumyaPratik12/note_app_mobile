-- Security hardening (from Supabase advisor findings after 0001).

-- handle_new_user is a trigger function only; it must never be callable as an
-- RPC. Supabase grants EXECUTE on public functions to anon/authenticated, so
-- revoke from those roles explicitly (PUBLIC too). Trigger firing is
-- unaffected — it runs in the table owner's context.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- search_notes is for signed-in users only (it filters on auth.uid()).
revoke execute on function public.search_notes(text) from public, anon;
grant execute on function public.search_notes(text) to authenticated;

-- Keep pg_trgm out of the public schema. Existing indexes reference the
-- operator class by OID, so they keep working after the move.
alter extension pg_trgm set schema extensions;
