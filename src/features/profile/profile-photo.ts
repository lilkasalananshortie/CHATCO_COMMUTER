import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { appendNativeMultipartFile } from "../../core/api/native-multipart-file";

export interface ProfilePhoto {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  size?: number;
  file?: File;
}

function validateProfilePhoto(photo: ProfilePhoto): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
    throw new Error("Choose a JPG, PNG or WebP photo.");
  }
  if (photo.size != null && photo.size > 3 * 1024 * 1024) {
    throw new Error("Your profile photo must be 3 MB or smaller.");
  }
}

export async function profilePhotoForm(photo: ProfilePhoto): Promise<FormData> {
  validateProfilePhoto(photo);
  const form = new FormData();
  if (photo.file) form.append("photo", photo.file);
  else appendNativeMultipartFile(form, "photo", photo);
  return form;
}

export async function pickProfilePhoto(): Promise<ProfilePhoto | null> {
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error("Allow photo access in your device settings to choose a profile picture.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"], allowsEditing: false, quality: 0.85,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  if (!asset.mimeType) throw new Error("The photo format could not be identified. Choose a JPG, PNG or WebP photo.");
  if (!asset.width || !asset.height) throw new Error("The photo dimensions could not be read. Choose another photo.");
  if (asset.width > 4096 || asset.height > 4096) throw new Error("Choose a photo no larger than 4096 × 4096 pixels.");
  const photo = { uri: asset.uri, name: asset.fileName ?? "profile-photo.jpg", type: asset.mimeType, width: asset.width, height: asset.height, size: asset.fileSize, file: asset.file };
  validateProfilePhoto(photo);
  return photo;
}
