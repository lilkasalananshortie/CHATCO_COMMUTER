import * as ImagePicker from "expo-image-picker";

export type ClaimProofImage = { uri: string; name: string; type: string; size?: number; file?: Blob };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function pickClaimProofImages(existingCount: number): Promise<ClaimProofImage[]> {
  const remaining = Math.max(0, 3 - existingCount);
  if (remaining === 0) throw new Error("You can attach up to 3 proof photos.");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 0.9,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).map((asset, index) => {
    const type = asset.mimeType || "";
    if (!ACCEPTED_IMAGE_TYPES.has(type)) throw new Error("Proof photos must be JPG, PNG or WebP images.");
    const size = asset.fileSize;
    if (size != null && size > MAX_IMAGE_BYTES) throw new Error("Each proof photo must be 5MB or smaller.");
    return { uri: asset.uri, name: asset.fileName || `proof-${Date.now()}-${index + 1}.jpg`, type, size, file: asset.file };
  });
}
