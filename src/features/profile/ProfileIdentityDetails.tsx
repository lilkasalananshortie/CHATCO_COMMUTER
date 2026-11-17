import { useRef, useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../shared/ui/BrandText";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { ProfileIcon } from "./ProfileIcon";

export function ProfileIdentityDetails({ name, username, verified, statusLabel, roleLabel, discountPercentage, student, expiresAt }: {
  name: string; username: string; verified: boolean; statusLabel: string; roleLabel: string;
  discountPercentage: number; student: boolean; expiresAt?: string | null;
}) {
  const { colors, isLight } = useCommuterTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const statusRef = useRef<View>(null);
  const roleRef = useRef<View>(null);
  const [open, setOpen] = useState<"status" | "role">("status");
  const [anchor, setAnchor] = useState({ x: 16, y: 0 });
  const [tipHeight, setTipHeight] = useState(120);
  const [visible, setVisible] = useState(false);
  const show = (kind: "status" | "role") => {
    (kind === "status" ? statusRef : roleRef).current?.measureInWindow((x, y, _w, h) => setAnchor({ x, y: y + h }));
    setOpen(kind);
    setVisible(true);
  };
  const expiry = expiresAt ? new Date(expiresAt) : null;
  const hasExpiry = expiry && Number.isFinite(expiry.getTime());
  const expiryCopy = hasExpiry
    ? `${expiry.getTime() < Date.now() ? "Expired on" : "Expires on"} ${expiry.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" })}.`
    : "Expiry date unavailable.";
  const roleCopy = discountPercentage > 0 ? `${roleLabel} fare discount: ${discountPercentage}%.` : `${roleLabel} account. Standard fare applies.`;
  const message = open === "status" ? verified ? "Your account is verified." : `Account status: ${statusLabel}.`
    : student ? `${roleCopy} ${expiryCopy}` : roleCopy;
  const tipWidth = Math.min(288, width - 32);
  const verificationTip = open === "status" && verified;
  const tipTitleColor = colors.textPrimary;
  const tipBodyColor = colors.textSecondary;
  // Preserve the selected content while the native modal fades out.
  const close = () => setVisible(false);

  return <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0 }}>
    <Text numberOfLines={name.length > 28 ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontWeight: "700" }}>{name}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>@{username}</Text>
    {!verified && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{statusLabel}</Text>}
    <View testID="profile-identity-pills" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8 }}>
      {verified && <View ref={statusRef} collapsable={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Account verification details" accessibilityState={{ expanded: visible && open === "status" }} hitSlop={4} onPress={() => show("status")} style={{ minHeight: 28, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }}>
          <ProfileIcon name="shield-check" size={12} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 14, fontWeight: "600" }}>Verified</Text>
        </Pressable>
      </View>}
      <View ref={roleRef} collapsable={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Commuter role details" accessibilityState={{ expanded: visible && open === "role" }} onPress={() => show("role")} hitSlop={4} style={{ minHeight: 28, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: isLight ? "#8CB9F0" : "#337DD2", backgroundColor: isLight ? "#1A5FB4" : "#174C8A" }}>
          <Text style={{ color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "600" }}>{roleLabel}</Text>
          {discountPercentage > 0 && <Text style={{ color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "600", borderLeftWidth: 1, borderLeftColor: "#99C1F1", paddingLeft: 6 }}>{discountPercentage}% off</Text>}
        </Pressable>
      </View>
    </View>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Dismiss profile details" onPress={close} style={{ position: "absolute", inset: 0 }} />
        <View accessibilityViewIsModal accessibilityLiveRegion="polite" onLayout={event => setTipHeight(event.nativeEvent.layout.height)} style={{ position: "absolute", width: tipWidth, left: Math.max(16, Math.min(anchor.x, width - tipWidth - 16)), top: Math.max(insets.top + 12, Math.min(anchor.y + 8, height - insets.bottom - tipHeight - 12)), padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, elevation: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {verificationTip && <ProfileIcon name="shield-check" size={20} color={tipTitleColor} />}
            <Text style={{ flex: 1, color: tipTitleColor, fontSize: 14, fontWeight: "600" }}>{open === "status" ? "Account verified" : roleLabel}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close profile details" hitSlop={8} onPress={close}><ProfileIcon name="x" size={18} color={verificationTip ? tipBodyColor : colors.textMuted} /></Pressable>
          </View>
          <Text style={{ color: tipBodyColor, fontSize: 13, lineHeight: 20, marginTop: 8 }}>{message}</Text>
        </View>
      </View>
    </Modal>
  </View>;
}
