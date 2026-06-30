// capture-page — runs OCR on a freshly uploaded page, repairs the junction
// with the previous page (for appends), updates the note, and notifies the
// user when done.
//
// Secrets:
//   GOOGLE_SERVICE_ACCOUNT_JSON  (required) — full service-account key JSON;
//                                 used to mint a Bearer token for Vision.
//   ANTHROPIC_API_KEY            (optional) — AI page-seam repair on appends.
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0';

const JUNCTION_WINDOW = 300;
const VISION_SCOPE = 'https://www.googleapis.com/auth/cloud-vision';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CapturePageBody {
  note_id: string;
  storage_path: string;
  is_new_note: boolean;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
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
    const admin = createClient(supabaseUrl, serviceKey);

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

    // 2. OCR via Google Cloud Vision (service-account Bearer auth).
    const accessToken = await getGoogleAccessToken();
    const { rawText, avgConfidence } = await runVision(accessToken, imageBase64);
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

    // 4. Stitch the new page onto the existing content. The Anthropic key is
    // OPTIONAL: with it we AI-repair the seam; without it we newline-join.
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

function base64url(bytes: Uint8Array): string {
  return encodeBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Mints a short-lived OAuth2 access token for Vision from the service-account
// JSON, via the signed-JWT bearer grant.
async function getGoogleAccessToken(): Promise<string> {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
  const sa = JSON.parse(raw) as ServiceAccount;
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
  );
  const claims = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: VISION_SCOPE,
        aud: tokenUri,
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;

  // Replace escaped newlines with actual newlines if set via CLI.
  const privateKey = sa.private_key.replace(/\\n/g, '\n');

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)),
  );
  const assertion = `${unsigned}.${base64url(sigBytes)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function runVision(
  accessToken: string,
  imageBase64: string,
): Promise<{ rawText: string; avgConfidence: number }> {
  const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Vision API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  const rawText: string = annotation?.text ?? '';

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
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
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
  }).catch(() => {});
}
