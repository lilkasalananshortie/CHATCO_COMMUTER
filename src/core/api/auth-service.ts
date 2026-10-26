import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { appStorage } from "../storage/app-storage";
import { COMMUTER_DEVICE_TYPE, getCommuterDeviceId } from "../storage/device-id";
import type { User, CommuterProfile } from "../domain/types";
import { API_URL, NetworkError, post, request, resetSessionEndedNotified, TOKEN_KEY } from "./api-client";

export interface LoginResult {
  user: User;
  profile?: CommuterProfile;
  token: string;
}

const USER_KEY = "chatco_commuter_user";

export const authService = {
  async updateStoredEmail(email: string): Promise<void> {
    const user = await authService.getStoredUser();
    if (user) await appStorage.setItem(USER_KEY, JSON.stringify({ ...user, email }));
  },
  async getStoredToken(): Promise<string | null> {
    return appStorage.getItem(TOKEN_KEY);
  },

  async getStoredUser(): Promise<User | null> {
    const raw = await appStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async clearLocalSession(): Promise<void> {
    await appStorage.removeItem(TOKEN_KEY);
    await appStorage.removeItem(USER_KEY);
  },

  async restoreSession(): Promise<LoginResult | null> {
    const token = await appStorage.getItem(TOKEN_KEY);
    const cachedUser = await authService.getStoredUser();
    if (!token) return null;
    try {
      const session = await request<{ user: User }>("/mobile/auth/session");
      if (session.user?.role !== "COMMUTER") {
        await authService.clearLocalSession();
        return null;
      }
      if (session.user.must_change_password) {
        await appStorage.setItem(USER_KEY, JSON.stringify(session.user));
        return { user: session.user, token };
      }
      const data = await request<{ user: User; profile?: CommuterProfile }>("/mobile/user");
      if (!data?.user?.id || data.user.role !== "COMMUTER") {
        await authService.clearLocalSession();
        return null;
      }
      await appStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return { user: data.user, profile: data.profile ? { ...data.profile, id: data.profile.id ?? data.user.id } : undefined, token };
    } catch (error) {
      // Connectivity failure is not token revocation. Never fabricate a profile.
      if (error instanceof NetworkError && cachedUser?.role === "COMMUTER") return { user: cachedUser, token };
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) await authService.clearLocalSession();
      return null;
    }
  },

  async login(
    loginOrPayload: string | { login?: string; phone_or_email?: string; password?: string },
    passwordArg?: string
  ): Promise<LoginResult> {
    const deviceId = await getCommuterDeviceId();
    const login =
      typeof loginOrPayload === "string"
        ? loginOrPayload
        : loginOrPayload.login || loginOrPayload.phone_or_email || "";
    const password =
      typeof loginOrPayload === "string"
        ? passwordArg || ""
        : loginOrPayload.password || passwordArg || "";

    const data = await request<any>("/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify({
        login,
        password,
        device_id: deviceId,
        device_type: COMMUTER_DEVICE_TYPE,
      }),
    });

    const rawUser = data?.user ?? data;
    const token = data?.token ?? (data?.user as any)?.token;
    const role = rawUser?.role;

    if (!role || String(role).toUpperCase().trim() !== "COMMUTER") {
      throw new Error("This mobile application is restricted to Commuter accounts.");
    }

    const user: User = {
      id: String(rawUser.id),
      email: rawUser.email ?? "",
      name: rawUser.name ?? rawUser.email ?? "Commuter",
      role: rawUser.role,
      must_change_password: Boolean(data.must_change_password ?? rawUser.must_change_password),
    };

    if (!token) throw new Error("The server did not return a login token. Please try again.");
    await appStorage.setItem(TOKEN_KEY, token);
    await appStorage.setItem(USER_KEY, JSON.stringify(user));
    resetSessionEndedNotified();

    return {
      user,
      profile: data?.profile,
      token: token ?? "",
    };
  },

  async setNewPassword(password: string, confirmation: string): Promise<void> {
    await post("/mobile/auth/set-new-password", { password, password_confirmation: confirmation });
    await authService.clearLocalSession();
  },

  async register(
    input: FormData | { fileUri: string; parameters: Record<string, string> } | any
  ): Promise<{ message: string }> {
    if (Platform.OS !== "web" && typeof input === "object" && input && "fileUri" in input) {
      const { fileUri, parameters } = input as {
        fileUri: string;
        parameters: Record<string, string>;
      };

      const uploadResponse = await FileSystem.uploadAsync(
        `${API_URL}/api/v1/mobile/auth/register`,
        fileUri,
        {
          fieldName: "id_image",
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          mimeType: fileUri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
          parameters,
          headers: {
            Accept: "application/json",
          },
        }
      );

      let parsed: any = null;
      try {
        parsed = JSON.parse(uploadResponse.body);
      } catch {}

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        let errMsg = parsed?.message || `Registration failed (${uploadResponse.status}).`;
        if (parsed?.errors && typeof parsed.errors === "object") {
          const errList = Object.values(parsed.errors).flat().filter(Boolean);
          if (errList.length > 0) {
            errMsg = `${errMsg}: ${errList.join("; ")}`;
          }
        }
        throw new Error(errMsg);
      }

      return parsed?.data ?? parsed ?? { message: "Registration successful" };
    }

    return post("/mobile/auth/register", input);
  },

  async sendRegistrationCode(email: string, contactNumber?: string): Promise<{ resend_in_seconds?: number }> {
    return post("/mobile/auth/register/send-code", { email, contact_number: contactNumber });
  },

  async verifyRegistrationCode(email: string, code: string): Promise<void> {
    return post("/mobile/auth/register/verify-code", { email, code });
  },

  async me(): Promise<{ user: User; profile?: CommuterProfile } | null> {
    const token = await appStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const data = await request<any>("/mobile/user");
      const rawUser = data?.user ?? data;
      if (!rawUser?.role || String(rawUser.role).toUpperCase().trim() !== "COMMUTER") return null;
      const user: User = {
        id: String(rawUser.id),
        email: rawUser.email ?? "",
        name: rawUser.name ?? rawUser.email ?? "Commuter",
        role: rawUser.role,
      };
      await appStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user, profile: data?.profile };
    } catch {
      return null;
    }
  },

  async logout(): Promise<{ serverRevoked: boolean }> {
    let serverRevoked = false;
    try {
      await post("/mobile/auth/logout");
      serverRevoked = true;
    } catch (error) {
      serverRevoked = (error as { status?: number }).status === 401;
    } finally {
      await authService.clearLocalSession();
    }
    return { serverRevoked };
  },

  async forgotPassword(email: string) {
    return post("/mobile/auth/forgot-password", { email });
  },

  async verifyResetCode(email: string, code: string) {
    return post("/mobile/auth/verify-reset-code", { email, code });
  },

  async resetPassword(input: {
    email: string;
    code: string;
    password: string;
    passwordConfirmation: string;
  }) {
    return post("/mobile/auth/reset-password", {
      email: input.email,
      code: input.code,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    });
  },
};
