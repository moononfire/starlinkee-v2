import { createAdminClient } from "./supabase/admin";

const BUCKET = "logos";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

export async function uploadLogo(
  file: File
): Promise<{ path: string; publicUrl: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only PNG and JPEG images are allowed");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File size must be under 5MB");
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
