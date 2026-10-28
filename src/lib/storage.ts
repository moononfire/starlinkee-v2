import { createAdminClient } from "./supabase/admin";

const BUCKET = "logos";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

function matchesSignature(head: Uint8Array, type: string): boolean {
  const signature = type === "image/png" ? PNG_SIGNATURE : JPEG_SIGNATURE;
  return signature.every((byte, i) => head[i] === byte);
}

export async function uploadLogo(
  file: File
): Promise<{ path: string; publicUrl: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only PNG and JPEG images are allowed");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File size must be under 5MB");
  }
  // file.type is whatever the client declared: check the real file signature.
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!matchesSignature(head, file.type)) {
    throw new Error("File content does not match a PNG or JPEG image");
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return { path: filename, publicUrl: data.publicUrl };
}

export async function deleteLogo(path: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}
