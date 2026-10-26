import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebIcon } from "../../shared/ui/WebIcon";
import { Text } from "../../shared/ui/BrandText";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";

export function useDashboardDialogStyles() {
  const { colors, isLight } = useCommuterTheme();
  return {
    title: { fontSize: 20, fontWeight: "600" as const, color: colors.textPrimary, lineHeight: 28 },
    body: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
    label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 1, textTransform: "uppercase" as const, color: colors.textMuted },
    timer: { fontSize: 36, fontWeight: "600" as const, color: colors.textPrimary },
    row: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 12 },
    button: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row" as const, gap: 8, alignItems: "center" as const, justifyContent: "center" as const, flexGrow: 1, flexBasis: 120 },
    primary: { backgroundColor: "#1A5FB4", borderColor: "#1A5FB4" },
    secondary: { backgroundColor: isLight ? "#FFFFFF" : "#10273F" },
    danger: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
    onPrimary: { fontSize: 14, fontWeight: "600" as const, color: "#FFFFFF" },
    onSecondary: { fontSize: 14, fontWeight: "600" as const, color: colors.textPrimary },
    red: { color: isLight ? "#DC2626" : "#F07171" },
    blue: { color: colors.primaryLight },
    field: { backgroundColor: isLight ? "#F9FAFB" : "#071A2E", borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12 },
  };
}

/** Mirrors web APP_DIALOG: centered solid panel, bare icons, safe scroll area. */
export function DashboardDialog({ visible, title, onClose, children }: { visible: boolean; title?: string; onClose?: () => void; children: ReactNode }) {
  const { colors, isLight } = useCommuterTheme();
  const styles = useDashboardDialogStyles();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose ?? (() => {})}>
    <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" }}>
      {onClose && <Pressable accessibilityLabel="Dismiss dialog" onPress={onClose} style={{ position: "absolute", inset: 0 }} />}
      <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 448, maxHeight: height - insets.top - insets.bottom - 32, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: isLight ? "#FFFFFF" : "#0B1E33", overflow: "hidden" }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          {title && <Text style={[styles.title, { fontSize: 18, paddingRight: 36 }]}>{title}</Text>}
          {children}
        </ScrollView>
        {onClose && <Pressable accessibilityRole="button" accessibilityLabel={title ? `Close ${title}` : "Close dialog"} onPress={onClose} style={{ position: "absolute", right: 6, top: 6, width: 44, height: 44, justifyContent: "center", alignItems: "center" }}><WebIcon name="x" size={20} color={colors.textMuted} /></Pressable>}
      </View>
    </View>
  </Modal>;
}
