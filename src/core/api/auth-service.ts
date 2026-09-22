import { appStorage } from "../storage/app-storage";
import { COMMUTER_DEVICE_TYPE, getCommuterDeviceId } from "../storage/device-id";
import type { User, CommuterProfile } from "../domain/types";
import { post, request, resetSessionEndedNotified, TOKEN_KEY } from "./api-client";

export interface LoginResult {
  user: User;
  profile?: CommuterProfile;
  token: string;
}

const USER_KEY = "chatco_commuter_user";

export const authService = {
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

    const data = await request<any>("/auth/login", {
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

    if (!role || role !== "COMMUTER") {
      throw new Error("This mobile application is restricted to Commuter accounts.");
    }

    const user: User = {
      id: String(rawUser.id),
      email: rawUser.email ?? "",
      name: rawUser.name ?? rawUser.email ?? "Commuter",
      role: rawUser.role,
    };

    if (token) {
      await appStorage.setItem(TOKEN_KEY, token);
    }
    await appStorage.setItem(USER_KEY, JSON.stringify(user));
    resetSessionEndedNotified();

    return {
      user,
      profile: data?.profile,
      token: token ?? "",
    };
  },

  async register(input: any): Promise<{ message: string }> {
    return post("/auth/register", input);
  },

  async me(): Promise<{ user: User; profile?: CommuterProfile } | null> {
    const token = await appStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const data = await request<any>("/user");
      const rawUser = data?.user ?? data;
      if (!rawUser?.role || rawUser.role !== "COMMUTER") return null;
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

  async logout(): Promise<void> {
    try {
      await post("/auth/logout");
    } finally {
      await appStorage.removeItem(TOKEN_KEY);
      await appStorage.removeItem(USER_KEY);
    }
  },

  async forgotPassword(email: string) {
    return post("/auth/forgot-password", { email });
  },

  async verifyResetCode(email: string, code: string) {
    return post("/auth/verify-reset-code", { email, code });
  },

  async resetPassword(input: {
    email: string;
    code: string;
    password: string;
    passwordConfirmation: string;
  }) {
    return post("/auth/reset-password", {
      email: input.email,
      code: input.code,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    });
  },
};
