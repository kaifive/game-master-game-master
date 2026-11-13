/** The longest side a photo keeps, and its JPEG quality (ADR-008, ADR-034). */
export const MAX_SIDE = 1600;
const QUALITY = 0.82;

/**
 * Shrinks a photo on the phone before it's sent: longest side 1600 px, JPEG.
 * Re-encoding also drops location data. A photo the browser can't read is
 * an error the screen shows.
 */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Couldn't encode the photo"));
      },
      "image/jpeg",
      QUALITY,
    );
  });
}
