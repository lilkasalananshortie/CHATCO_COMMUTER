import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import type { RenewalDocument } from "./renewal-types";

export async function pickRenewalDocument(): Promise<RenewalDocument | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/jpeg,image/png,image/webp,application/pdf";
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    copyToCacheDirectory: true, multiple: false,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  if (!asset.mimeType) throw new Error("The selected file type could not be identified. Choose a JPG, PNG, WebP or PDF file.");
  return { uri: asset.uri, name: asset.name, type: asset.mimeType, size: asset.size };
}
