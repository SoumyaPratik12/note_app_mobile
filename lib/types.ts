// Shared domain types, mirroring the Supabase schema in
// supabase/migrations/0001_init.sql.

export type NoteStatus = 'open' | 'complete';

export type OcrStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  status: NoteStatus;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export interface NotePage {
  id: string;
  note_id: string;
  page_number: number;
  storage_path: string;
  raw_ocr_text: string | null;
  ocr_confidence: number | null;
  ocr_status: OcrStatus;
  created_at: string;
}

export interface PageJoin {
  id: string;
  note_id: string;
  from_page: number;
  to_page: number;
  original_tail: string | null;
  original_head: string | null;
  repaired_text: string | null;
  created_at: string;
}

// Response shape returned by the capture-page Edge Function.
export interface CapturePageResult {
  page_number: number;
  ocr_confidence: number;
}
