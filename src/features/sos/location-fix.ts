import * as Location from "expo-location";

export async function getSosLocation(): Promise<{ latitude: number; longitude: number }> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Location permission is required to send your SOS location. Enable it and retry, or use the emergency call buttons below.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Location is unavailable. Retry with GPS enabled, or use the emergency call buttons below.")), 20000); }),
    ]);
    const { latitude, longitude } = fix.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error("A valid GPS location could not be obtained. Retry or use the emergency call buttons below.");
    }
    return { latitude, longitude };
  } finally { if (timer) clearTimeout(timer); }
}
