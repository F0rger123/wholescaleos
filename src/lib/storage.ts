import { supabase, isSupabaseConfigured } from './supabase';

export type StorageBucket = 'avatars' | 'team-logos' | 'chat-attachments';

export interface UploadResult {
  url: string | null;
  error: Error | null;
}

/**
 * Upload a file to a Supabase bucket
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File,
  _onProgress?: (progress: number) => void
): Promise<UploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { url: null, error: new Error('Supabase is not configured') };
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (err: any) {
    console.error(`Upload to ${bucket} failed:`, err);
    return { url: null, error: err };
  }
}

/**
 * Delete a file from a Supabase bucket
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase is not configured') };
  }

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    console.error(`Delete from ${bucket} failed:`, err);
    return { error: err };
  }
}

/**
 * Generate a unique filename to avoid collisions
 */
export function generateUniqueFileName(fileName: string): string {
  const ext = fileName.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}
