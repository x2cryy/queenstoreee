// Browser only. Shrinks a picked image to JPEG so one upload stays under the server-action body limit.
export const MAX_BYTES = 900 * 1024;
const STEPS: Array<[number, number]> = [
  [1600, 0.82],
  [1600, 0.7],
  [1280, 0.7],
  [1024, 0.65],
];

export async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("type");
  const bmp = await createImageBitmap(file);
  try {
    for (const [maxW, q] of STEPS) {
      const s = Math.min(1, maxW / bmp.width);
      const w = Math.max(1, Math.round(bmp.width * s));
      const h = Math.max(1, Math.round(bmp.height * s));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= MAX_BYTES) {
        return new File([blob], "banner.jpg", { type: "image/jpeg" });
      }
    }
  } finally {
    bmp.close();
  }
  throw new Error("size");
}
