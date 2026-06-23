// capture-page — runs OCR on a freshly uploaded page, repairs the junction
// with the previous page (for appends), updates the note, and notifies the
// user when done.
//
// Deploy:   supabase functions deploy capture-page
// Secrets:  supabase secrets set GOOGLE_VISION_API_KEY=... ANTHROPIC_API_KEY=...
//           (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the runtime)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0';

const JUNCTION_WINDOW = 300; // chars of overlap we ask Claude to stitch

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CapturePageBody {
  note_id: string;
  storage_path: string;
  is_new_note: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { note_id, storage_path, is_new_note } =
      (await req.json()) as CapturePageBody;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Service-role client for DB/storage work inside the function.
    const admin = createClient(supabaseUrl, serviceKey);

    // Identify the caller from their JWT (forwarded by supabase.functions.invoke).
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
    } = await admin.auth.getUser(jwt);
    if (!user) {
      return json({ error: 'unauthorized' }, 401);
    }

    // 1. Download the uploaded image.
    const { data: blob, error: dlError } = await admin.storage
      .from('note-images')
      .download(storage_path);
    if (dlError || !blob) {
      return json({ error: `download failed: ${dlError?.message}` }, 400);
    }
    const imageBase64 = encodeBase64(await blob.arrayBuffer());

    // 2. OCR via Google Cloud Vision.
    const { rawText, avgConfidence } = await runVision(imageBase64);
    const cleanText = postProcessOCR(rawText);

    // 3. Current note state.
    const { data: note, error: noteError } = await admin
      .from('notes')
      .select('content, page_count, title')
      .eq('id', note_id)
      .single();
    if (noteError || !note) {
      return json({ error: `note not found: ${noteError?.message}` }, 404);
    }

    const newPageNumber = (note.page_count ?? 0) + 1;

    // 4. Stitch the new page onto the existing content.
    // The Anthropic key is OPTIONAL: when present we AI-repair the seam between
    // pages; when absent we fall back to a plain newline join. OCR (Google
    // Vision) is unaffected either way.
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    let finalText = cleanText;
    let repairedJunction: string | null = null;
    let originalTail: string | null = null;
    let originalHead: string | null = null;

    if (!is_new_note && note.content) {
      if (anthropicKey) {
        originalTail = note.content.slice(-JUNCTION_WINDOW);
        originalHead = cleanText.slice(0, JUNCTION_WINDOW);
        repairedJunction = await repairJunction(anthropicKey, originalTail, originalHead);
        finalText =
          note.content.slice(0, -JUNCTION_WINDOW) +
          repairedJunction +
          cleanText.slice(JUNCTION_WINDOW);
      } else {
        // No AI key — append the page on a new line, no seam repair.
        finalText = `${note.content}\n${cleanText}`;
      }
    } else if (note.content) {
      finalText = `${note.content}\n\n${cleanText}`;
    }

    // 5. Auto-title from the first line of the first page.
    const title = is_new_note
      ? cleanText.split('\n')[0]?.slice(0, 60) ?? 'Untitled note'
      : note.title;

    // 6. Persist note + page + (optional) junction record.
    await admin
      .from('notes')
      .update({
        content: finalText,
        title,
        page_count: newPageNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', note_id);

    await admin.from('note_pages').insert({
      note_id,
      page_number: newPageNumber,
      storage_path,
      raw_ocr_text: rawText,
      ocr_confidence: avgConfidence,
      ocr_status: 'done',
    });

    if (repairedJunction !== null) {
      await admin.from('page_joins').insert({
        note_id,
        from_page: newPageNumber - 1,
        to_page: newPageNumber,
        original_tail: originalTail,
        original_head: originalHead,
        repaired_text: repairedJunction,
      });
    }

    // 7. Notify the user (best-effort).
    await sendPush(admin, user.id, `Page ${newPageNumber} added to "${title}"`);

    return json({ page_number: newPageNumber, ocr_confidence: avgConfidence }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

// --- helpers --------------------------------------------------------------

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function runVision(
  imageBase64: string,
): Promise<{ rawText: string; avgConfidence: number }> {
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY')!;
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Vision API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  const rawText: string = annotation?.text ?? '';

  // Average word-level confidence across the page.
  const confidences: number[] = [];
  for (const page of annotation?.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const word of para.words ?? []) {
          if (typeof word.confidence === 'number') confidences.push(word.confidence);
        }
      }
    }
  }
  const avgConfidence = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 1;

  return { rawText, avgConfidence };
}

function postProcessOCR(text: string): string {
  return text
    .replace(/[ \t]+\n/g, '\n') // trim trailing whitespace per line
    .replace(/\n{3,}/g, '\n\n') // collapse excessive blank lines
    .trim();
}

async function repairJunction(
  apiKey: string,
  tail: string,
  head: string,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system:
      'You repair the seam between two OCR-scanned handwritten note pages. ' +
      'You are given the TAIL of page N and the HEAD of page N+1, which may ' +
      'overlap, split a word, or split a sentence. Return ONLY the corrected ' +
      'stitched text that should replace TAIL+HEAD — no commentary, no quotes. ' +
      'Preserve the original wording; only fix the join (de-duplicate overlap, ' +
      'rejoin split words, restore sentence flow).',
    messages: [
      {
        role: 'user',
        content: `TAIL:\n${tail}\n\nHEAD:\n${head}`,
      },
    ],
  });

  const block = message.content.find((b) => b.type === 'text');
  // Fall back to a plain concatenation if the model returns nothing usable.
  return block && block.type === 'text' ? block.text : `${tail}${head}`;
}

async function sendPush(
  admin: ReturnType<typeof createClient>,
  userId: string,
  body: string,
): Promise<void> {
  const { data: profile } = await admin
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();

  const token = profile?.expo_push_token;
  if (!token) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: token,
      title: 'InkSync',
      body,
      sound: 'default',
    }),
  }).catch(() => {
    // Push is best-effort; never fail the request on a notification error.
  });
}
