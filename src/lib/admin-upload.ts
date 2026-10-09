import { requireClient } from "./supabase";

/** Upload an image to the public "media" bucket and return its public URL. */
export async function uploadImage(file: File, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image must be under 8 MB.");
  const db = requireClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return db.storage.from("media").getPublicUrl(path).data.publicUrl;
}
