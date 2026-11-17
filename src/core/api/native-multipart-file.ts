/** Expo's native fetch serializes byte-backed parts, not React Native URI parts. */
export function appendNativeMultipartFile(
  form: FormData,
  field: string,
  upload: { uri: string; name: string; type: string },
): void {
  const { File } = require("expo-file-system") as typeof import("expo-file-system");
  const file = new File(upload.uri);
  form.append(field, {
    name: upload.name,
    type: upload.type,
    bytes: () => file.bytes(),
  } as any);
}
