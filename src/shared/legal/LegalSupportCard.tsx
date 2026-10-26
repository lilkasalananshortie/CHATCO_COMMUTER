import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { PolicyReader } from "./PolicyReader";
import { openLegalLink } from "./legal-links";

export function LegalSupportCard() {
  const { colors } = useCommuterTheme();
  const [policy, setPolicy] = useState<"terms" | "privacy" | null>(null);
  return <View style={{ padding: 20, marginVertical: 16, gap: 8, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18 }}>
    <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 18 }}>Legal & Support</Text>
    {([["terms", "Terms of Service"], ["privacy", "Privacy Policy & Data Rights"]] as const).map(([kind, label]) =>
      <TouchableOpacity key={kind} accessibilityRole="button" onPress={() => setPolicy(kind)} style={{ minHeight: 48, justifyContent: "center" }}>
        <Text style={{ color: colors.primaryLight, fontSize: 16 }}>{label}</Text>
      </TouchableOpacity>)}
    <TouchableOpacity accessibilityRole="link" accessibilityLabel="Read the current privacy policy online" onPress={() => void openLegalLink("privacy")} style={{ minHeight: 48, justifyContent: "center" }}>
      <Text style={{ color: colors.primaryLight, fontSize: 16 }}>Read current policy online</Text>
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="link" accessibilityLabel="Contact support, opens email" onPress={() => void openLegalLink("support")} style={{ minHeight: 48, justifyContent: "center" }}>
      <Text style={{ color: colors.primaryLight, fontSize: 16 }}>Contact support</Text>
    </TouchableOpacity>
    <Text style={{ color: colors.textMuted, lineHeight: 21 }}>For account corrections or a deletion request, contact support. Your identity must be checked before action is taken. Never send your password, verification codes, or ID documents in an ordinary support message.</Text>
    <PolicyReader policy={policy} onClose={() => setPolicy(null)} />
  </View>;
}
