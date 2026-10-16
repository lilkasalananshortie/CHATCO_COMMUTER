import React from "react";
import { Text, TextInput, TouchableOpacity, View, StyleSheet, type TextInputProps } from "react-native";

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
export function FeatureButton({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={{ backgroundColor: secondary ? "#18334D" : "#1A5FB4", padding: 14, borderRadius: 12, minHeight: 48, justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>{label}</Text>
  </TouchableOpacity>;
}
export function FeatureInput({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 6 }}><Text style={featureStyles.text}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor="#94A3B8" style={{ backgroundColor: "#071A2E", borderColor: "#29445E", borderWidth: 1, borderRadius: 10, color: "white", padding: 12, minHeight: 48 }} />
  </View>;
}
