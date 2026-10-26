import { Alert, Linking } from "react-native";

export const LEGAL_LINKS = {
  terms: "https://chatco.online/terms-of-service",
  privacy: "https://chatco.online/privacy-policy",
  support: "mailto:eric.chatco@gmail.com?subject=ChatCo%20commuter%20support",
} as const;

export async function openLegalLink(kind: keyof typeof LEGAL_LINKS): Promise<void> {
  try { await Linking.openURL(LEGAL_LINKS[kind]); }
  catch {
    Alert.alert("Unable to open link", kind === "support"
      ? "Email eric.chatco@gmail.com from your email app. Never send passwords or verification codes."
      : `Open ${LEGAL_LINKS[kind]} in your browser when you have a connection.`);
  }
}
