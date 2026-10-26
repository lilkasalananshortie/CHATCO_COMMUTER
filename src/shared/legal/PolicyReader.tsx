import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { PRIVACY_SECTIONS, REGISTRATION_TERMS, POLICY_EFFECTIVE_DATE } from "../../features/auth/registration-policies";

export function PolicyReader({ policy, onClose }: { policy: "terms" | "privacy" | null; onClose: () => void }) {
  const { colors } = useCommuterTheme();
  if (!policy) return null;
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, borderBottomWidth: 1, borderColor: colors.border, gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: 24, fontWeight: "800" }}>{policy === "terms" ? "Terms of Service" : "Privacy Policy"}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close policy" onPress={onClose} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: colors.primaryLight, fontWeight: "700", fontSize: 16 }}>Close</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text style={{ color: colors.textMuted, marginBottom: 20 }}>Effective {POLICY_EFFECTIVE_DATE}</Text>
        {(policy === "terms" ? REGISTRATION_TERMS : PRIVACY_SECTIONS).map(section => <View key={section.id} style={{ marginBottom: 20 }}>
          <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontWeight: "700", marginBottom: 8, fontSize: 17 }}>{section.title}</Text>
          {section.paragraphs.map(text => <Text key={text} style={{ color: colors.textSecondary, lineHeight: 24, fontSize: 16, marginBottom: 8 }}>{text}</Text>)}
        </View>)}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
