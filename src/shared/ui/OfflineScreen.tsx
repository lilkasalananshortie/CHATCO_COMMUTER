import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ConnectionIssue } from "../../core/api/connection-issue";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { Text } from "./BrandText";
import { Mascot } from "./Mascot";

const CHECKS: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { icon: "wifi-outline", label: "Turn on Wi-Fi or mobile data" },
  { icon: "airplane-outline", label: "Turn off Airplane mode" },
  { icon: "cellular-outline", label: "Move to a spot with better signal" },
];

interface OfflineScreenProps {
  issue: ConnectionIssue;
  message: string;
  retrying: boolean;
  retryFailed: boolean;
  onRetry: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}

export function OfflineScreen({ issue, message, retrying, retryFailed, onRetry, secondaryLabel, onSecondary }: OfflineScreenProps) {
  const { colors } = useCommuterTheme();
  const insets = useSafeAreaInsets();
  const offline = issue === "offline";
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.column}>
        <View style={[styles.badge, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
          <Ionicons name={offline ? "cloud-offline-outline" : "server-outline"} size={16} color={colors.warning} />
          <Text style={[styles.badgeText, { color: colors.textPrimary }]}>{offline ? "No internet connection" : "Server not responding"}</Text>
        </View>
        <Mascot pose="offline" size={176} accessibilityLabel={offline ? "CHATCO mascot holding a phone with no Wi-Fi" : "CHATCO mascot waiting for the server"} />
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>{offline ? "You're offline" : "Can't reach E-CHATCO"}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {offline ? message : "E-CHATCO isn't responding right now. Your internet may be fine, so please try again in a moment."}
        </Text>

        {offline && (
          <View style={[styles.checks, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {CHECKS.map(check => (
              <View key={check.label} style={styles.check}>
                <Ionicons name={check.icon} size={18} color={colors.primaryLight} />
                <Text style={[styles.checkText, { color: colors.textPrimary }]}>{check.label}</Text>
              </View>
            ))}
          </View>
        )}

        {retryFailed && !retrying && (
          <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={[styles.noticeText, { color: colors.textPrimary }]}>
              {offline ? "Still no connection. Check your network, then try again." : "E-CHATCO still isn't responding. Please try again shortly."}
            </Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          disabled={retrying}
          onPress={onRetry}
          style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? colors.primaryHover : colors.primary, opacity: retrying ? 0.75 : 1 }]}
        >
          {retrying ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="refresh" size={18} color="#FFFFFF" />}
          <Text style={styles.primaryText}>{retrying ? "Checking connection…" : "Try again"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={retrying} onPress={onSecondary} hitSlop={6} style={[styles.secondary, { opacity: retrying ? 0.5 : 1 }]}>
          <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>{secondaryLabel}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  column: { width: "100%", maxWidth: 384, alignItems: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 999, marginBottom: 8 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", marginTop: 6 },
  message: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 6 },
  checks: { alignSelf: "stretch", gap: 12, padding: 14, borderWidth: 1, borderRadius: 14, marginTop: 18 },
  check: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkText: { flex: 1, fontSize: 13 },
  notice: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderWidth: 1, borderRadius: 10, marginTop: 12 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  primary: { alignSelf: "stretch", minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, marginTop: 16 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondary: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, marginTop: 4 },
  secondaryText: { fontSize: 14, fontWeight: "500" },
});
