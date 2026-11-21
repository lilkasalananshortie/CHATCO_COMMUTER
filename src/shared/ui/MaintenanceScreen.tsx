import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { Text } from "./BrandText";

interface MaintenanceScreenProps {
  message: string;
  checking: boolean;
  stillActive: boolean;
  onCheck: () => void;
}

export function MaintenanceScreen({ message, checking, stillActive, onCheck }: MaintenanceScreenProps) {
  const { colors } = useCommuterTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.column}>
        <Text style={[styles.brand, { color: colors.textPrimary }]}>E-CHATCO</Text>
        <View style={[styles.icon, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
          <Ionicons name="construct-outline" size={40} color={colors.primaryLight} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          We'll be right <Text style={[styles.title, { color: colors.primaryLight }]}>back</Text>
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

        {stillActive && !checking && (
          <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
            <Ionicons name="time-outline" size={18} color={colors.primaryLight} />
            <Text style={[styles.noticeText, { color: colors.textPrimary }]}>Maintenance is still in progress. The app will reopen when it ends.</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: checking, busy: checking }}
          disabled={checking}
          onPress={onCheck}
          style={({ pressed }) => [styles.button, { backgroundColor: pressed ? colors.primaryHover : colors.primary, opacity: checking ? 0.75 : 1 }]}
        >
          {checking ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="refresh" size={18} color="#FFFFFF" />}
          <Text style={styles.buttonText}>{checking ? "Checking…" : "Check again"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  column: { width: "100%", maxWidth: 384, alignItems: "center" },
  brand: { fontSize: 22, fontWeight: "700", marginBottom: 28 },
  icon: { width: 80, height: 80, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 18, marginBottom: 22 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: "700", textAlign: "center" },
  message: { fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 12 },
  notice: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderWidth: 1, borderRadius: 10, marginTop: 18 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  button: { alignSelf: "stretch", minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, marginTop: 20 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
