import { decode } from 'base64-arraybuffer';
import { NOTE_IMAGES_BUCKET, supabase } from './supabase';

/**
 * Uploads a captured page image (a local file URI from expo-camera) to
 * Supabase Storage and returns the storage path. Images are namespaced by
 * user so the storage RLS policy can scope access per user.
 *
 * @param userId   The authenticated user's id (auth.uid()).
 * @param noteId   The note this page belongs to.
 * @param base64   The JPEG image encoded as base64 (CameraView returns this
 *                 when `base64: true` is passed to takePictureAsync).
 */
export async function uploadPageImage(
  userId: string,
  noteId: string,
  base64: string,
): Promise<string> {
  const path = `${userId}/${noteId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(NOTE_IMAGES_BUCKET)
    .upload(path, decode(base64), {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload page image: ${error.message}`);
  }

  return path;
}

/**
 * Returns a short-lived signed URL for displaying a stored page image.
 * The bucket is private, so direct public URLs are not available.
 */
export async function getSignedImageUrl(
  storagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(NOTE_IMAGES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to sign image URL: ${error?.message ?? 'unknown'}`);
  }

  return data.signedUrl;
}
