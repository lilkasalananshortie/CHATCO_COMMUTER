import { useRef, useState } from "react";
import { Modal, Pressable, View, Linking, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebIcon } from "../../shared/ui/WebIcon";
import { Text } from "../../shared/ui/BrandText";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { hailHint, type HailHintReason } from "./dashboard-ui";

/** A sibling of the disabled hail button, so help remains independently tappable. */
export function HailRangeHint({ reason, onRetry }: { reason: HailHintReason; onRetry: () => void }) {
  const [open, setOpen] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const trigger = useRef<View>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [anchor, setAnchor] = useState({ x: width - 44, y: height / 2 });
  const [tipHeight, setTipHeight] = useState(180);
  const { colors, isLight } = useCommuterTheme();
  const copy = hailHint(reason);
  const show = () => {
    if (!trigger.current) { setOpen(true); return; }
    trigger.current.measureInWindow((x, y) => { setAnchor({ x, y }); setOpen(true); });
  };
  return <View ref={trigger} collapsable={false} style={{ width: 44, height: 44, zIndex: 60 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Why can't I hail?" accessibilityState={{ expanded: open }}
      hitSlop={10} onPress={show}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceHover, alignItems: "center", justifyContent: "center" }}><WebIcon name="circle-question-mark" size={21} color={colors.textPrimary} /></View>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Dismiss hail information" onPress={() => setOpen(false)} style={{ position: "absolute", inset: 0 }} />
      <View accessibilityViewIsModal accessibilityLiveRegion="polite" onLayout={event => setTipHeight(event.nativeEvent.layout.height)} style={{ position: "absolute", right: Math.max(12, width - anchor.x - 44), top: Math.max(insets.top + 8, anchor.y - tipHeight - 8), width: Math.min(256, width - 32), padding: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHover, borderRadius: 12, elevation: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 24 }}><WebIcon name="map-pin-off" size={16} color={isLight ? "#D97706" : "#FBBF24"} /><Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>{copy.title}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close hail information" hitSlop={10} onPress={() => setOpen(false)} style={{ position: "absolute", top: 12, right: 12 }}><WebIcon name="x" size={18} color={colors.textMuted} /></Pressable>
      <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>{copy.message}</Text>
      {reason !== "out-of-range" && <Pressable accessibilityRole="button" onPress={() => {
        if (reason === "denied") void Linking.openSettings().catch(() => setSettingsError(true));
        else { onRetry(); setOpen(false); }
      }} style={{ paddingVertical: 12 }}><Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: "600" }}>{reason === "denied" ? "Open device settings" : "Retry location"}</Text></Pressable>}
      {settingsError && <Text style={{ color: colors.danger, fontSize: 12 }}>Open your device settings and allow location for CHATCO.</Text>}
      </View>
      </View>
    </Modal>
  </View>;
}
