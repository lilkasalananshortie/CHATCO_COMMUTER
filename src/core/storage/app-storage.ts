import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
const STORAGE_TIMEOUT_MS = 4000;
const SECURE_KEYS = new Set(["chatco_commuter_session"]);

function secureStorageAvailable(key: string) {
  return !isWeb && SECURE_KEYS.has(key);
}

async function withStorageTimeout<T>(operation: Promise<T>, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>(resolve => {
        timeout = setTimeout(() => resolve(fallback), STORAGE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function webStorageAvailable() {
  return isWeb && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    if (webStorageAvailable()) {
      return window.localStorage.getItem(key);
    }
    if (secureStorageAvailable(key)) {
      return withStorageTimeout(SecureStore.getItemAsync(key), null);
    }
    return withStorageTimeout(AsyncStorage.getItem(key), null);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (webStorageAvailable()) {
      window.localStorage.setItem(key, value);
      return;
    }
    if (secureStorageAvailable(key)) {
      const saved = await withStorageTimeout(
        SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }).then(() => true),
        false,
      );
      if (!saved) throw new Error("Secure session storage is unavailable. Please restart the app and try again.");
      return;
    }
    const saved = await withStorageTimeout(
      AsyncStorage.setItem(key, value).then(() => true),
      false,
    );
    if (!saved) throw new Error("Session storage is unavailable. Please restart the app and try again.");
  },

  async removeItem(key: string): Promise<void> {
    if (webStorageAvailable()) {
      window.localStorage.removeItem(key);
      return;
    }
    if (secureStorageAvailable(key)) {
      await withStorageTimeout(SecureStore.deleteItemAsync(key), undefined);
      return;
    }
    await withStorageTimeout(AsyncStorage.removeItem(key), undefined);
  },
};
