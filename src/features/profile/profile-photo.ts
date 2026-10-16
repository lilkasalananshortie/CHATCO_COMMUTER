import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export interface ProfilePhoto {
  uri: string;
  name: string;
  type: string;
  size?: number;
  file?: File;
}

export function profilePhotoForm(photo: ProfilePhoto): FormData {
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
    throw new Error("Choose a JPG, PNG or WebP photo.");
  }
  if (photo.size != null && photo.size > 3 * 1024 * 1024) {
    throw new Error("Your profile photo must be 3 MB or smaller.");
  }
  const form = new FormData();
  form.append("photo", photo.file ?? ({ uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob));
  return form;
}

export async function pickProfilePhoto(): Promise<ProfilePhoto | null> {
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error("Allow photo access in your device settings to choose a profile picture.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  if (!asset.mimeType) throw new Error("The photo format could not be identified. Choose a JPG, PNG or WebP photo.");
  if (asset.width > 4096 || asset.height > 4096) throw new Error("Choose a photo no larger than 4096 × 4096 pixels.");
  const photo = { uri: asset.uri, name: asset.fileName ?? "profile-photo.jpg", type: asset.mimeType, size: asset.fileSize, file: asset.file };
  profilePhotoForm(photo); // Fail before attempting an upload.
  return photo;
}
