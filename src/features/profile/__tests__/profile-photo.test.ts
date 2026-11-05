/// <reference types="jest" />
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { pickProfilePhoto, profilePhotoForm } from "../profile-photo";

jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-image-picker", () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({ File: class { bytes() { return Promise.resolve(new Uint8Array([1, 2, 3])); } } }));
beforeEach(() => {
  jest.resetAllMocks();
  (Platform as { OS: string }).OS = "android";
  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
});

test("denied photo permission gives an actionable error without launching picker", async () => {
  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  await expect(pickProfilePhoto()).rejects.toThrow("Allow photo access");
  expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
});

test("cancelled picker is not a failed upload", async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true });
  expect(await pickProfilePhoto()).toBeNull();
});

test.each(["image/gif", "image/svg+xml", "application/pdf", ""])('rejects unsupported type %s', async type => {
  await expect(profilePhotoForm({ uri: "file:///photo", name: "photo", type })).rejects.toThrow("JPG, PNG or WebP");
});

test("rejects files over 3MB", async () => {
  await expect(profilePhotoForm({ uri: "file:///photo", name: "photo.jpg", type: "image/jpeg", size: 3 * 1024 * 1024 + 1 })).rejects.toThrow("3 MB");
});

test("browser photo uses the actual File rather than a local URI string", async () => {
  (Platform as { OS: string }).OS = "web";
  const file = new File(["image"], "photo.png", { type: "image/png" });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: "blob:photo", mimeType: "image/png", width: 50, height: 50, file }] });
  const photo = await pickProfilePhoto();
  expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  expect((await profilePhotoForm(photo!)).get("photo")).toBe(file);
});

test("native multipart sends file bytes with the original name and MIME type", async () => {
  const Original = globalThis.FormData;
  const append = jest.fn();
  globalThis.FormData = class { append = append; } as unknown as typeof FormData;
  try {
    await profilePhotoForm({ uri: "file:///photo.webp", name: "photo.webp", type: "image/webp" });
    expect(append).toHaveBeenCalledWith("photo", expect.any(Blob), "photo.webp");
    expect(append.mock.calls[0][1]).toMatchObject({ type: "image/webp", size: 3 });
  } finally { globalThis.FormData = Original; }
});

test("oversized dimensions and unidentified format fail before upload", async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: "file:///photo", width: 4097, height: 50, mimeType: "image/jpeg" }] });
  await expect(pickProfilePhoto()).rejects.toThrow("4096");
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: "file:///photo", width: 50, height: 50 }] });
  await expect(pickProfilePhoto()).rejects.toThrow("could not be identified");
});
