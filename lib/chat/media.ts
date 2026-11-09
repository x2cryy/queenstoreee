import { createClient } from "../supabase/browser";

export const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMG = 8 * 1024 * 1024;
export const MAX_AUDIO = 10 * 1024 * 1024;
const AUDIO_EXT: Record<string, string> = {
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav",
};
export function normAudio(type: string): string | null {
  const t = type.split(";")[0].toLowerCase();
  const m: Record<string, string> = { "audio/x-m4a": "audio/mp4", "audio/mp3": "audio/mpeg", "audio/x-wav": "audio/wav", "audio/wave": "audio/wav" };
  const n = m[t] ?? t;
  return AUDIO_EXT[n] ? n : null;
}
export const audioExt = (mime: string) => AUDIO_EXT[mime] ?? "webm";

export async function compressImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("compress failed");
  return blob;
}

export async function uploadMedia(folderUid: string, chatId: string, blob: Blob, mime: string, ext: string) {
  const path = `${folderUid}/${chatId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from("chat-media").upload(path, blob, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}

const cache = new Map<string, { url: string; exp: number }>();
export async function signedUrl(path: string): Promise<string> {
  const hit = cache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await createClient().storage.from("chat-media").createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("sign failed");
  cache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
