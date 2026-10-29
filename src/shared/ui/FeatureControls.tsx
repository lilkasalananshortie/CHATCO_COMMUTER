import React from "react";
import { useMemo } from "react";
import { TextInput, TouchableOpacity, View, StyleSheet, type TextInputProps } from "react-native";
import { Text } from "./BrandText";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { themedStyles } from "../../core/theme/themed-styles";

export const featureStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050F1A" },
  content: { padding: 20, paddingBottom: 40, gap: 16, flexGrow: 1 },
  title: { color: "white", fontSize: 24, fontWeight: "800" },
  heading: { color: "white", fontSize: 17, fontWeight: "700" },
  text: { color: "#CBD5E1", lineHeight: 22 },
  muted: { color: "#94A3B8", lineHeight: 21 },
  error: { color: "#FCA5A5", lineHeight: 22 },
  card: { backgroundColor: "#0B2034", padding: 16, borderRadius: 16, gap: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
export function useFeatureStyles() {
  const { colors, isLight } = useCommuterTheme();
  return useMemo(() => themedStyles(featureStyles, colors, isLight), [colors, isLight]);
}
export function FeatureButton({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  const { colors } = useCommuterTheme();
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={{ backgroundColor: secondary ? colors.surfaceHover : colors.primary, borderColor: secondary ? colors.border : "transparent", borderWidth: secondary ? 1 : 0, padding: 14, borderRadius: 12, minHeight: 48, justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: secondary ? colors.textPrimary : "white", fontWeight: "700", textAlign: "center" }}>{label}</Text>
  </TouchableOpacity>;
}
export function FeatureInput({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useCommuterTheme();
  return <View style={{ gap: 6 }}><Text style={{ color: colors.textSecondary }}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.textMuted} style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1, borderRadius: 10, color: colors.textPrimary, padding: 12, minHeight: 48 }} />
  </View>;
}
