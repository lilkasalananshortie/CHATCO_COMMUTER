import React, { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { PolicyReader } from "../../shared/legal/PolicyReader";
import { POLICY_EFFECTIVE_DATE, REGISTRATION_TERMS } from "./registration-policies";
import type { AgreementChoices } from "./registration-agreement";

export function RegistrationConsent({ visible, value, onChange, disabled, error, onBack, onConfirm }: {
  visible: boolean;
  value: AgreementChoices;
  onChange: (value: AgreementChoices) => void;
  disabled: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [policy, setPolicy] = useState<"terms" | "privacy" | null>(null);
  const { colors } = useCommuterTheme();
  const agreed = value.terms && value.privacy && value.confirmation;

  return <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onBack}>
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(2, 8, 23, 0.76)", padding: 18 }}>
        <View style={{ width: "100%", maxWidth: 620, maxHeight: "92%", alignSelf: "center", borderRadius: 20, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <ScrollView contentContainerStyle={{ padding: 22, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: 22, lineHeight: 28, fontWeight: "800" }}>CHATCO Terms and Conditions</Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
              Please review these terms before submitting your commuter registration. They explain your responsibilities and how CHATCO handles registration, rides, payments, rewards, and safety features.
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Effective date: {POLICY_EFFECTIVE_DATE}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
              {(["terms", "privacy"] as const).map((kind) => <TouchableOpacity key={kind} disabled={disabled} onPress={() => setPolicy(kind)} accessibilityRole="button" style={{ paddingVertical: 5 }}>
                <Text style={{ color: colors.primaryLight, textDecorationLine: "underline", fontWeight: "600" }}>
                  {kind === "terms" ? "Read Terms of Service" : "Read Privacy Policy"}
                </Text>
              </TouchableOpacity>)}
            </View>
            <View style={{ gap: 12 }}>
              {REGISTRATION_TERMS.map((section, index) => <View key={section.id} style={{ gap: 5 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: "700", lineHeight: 21 }}>{index + 1}. {section.title}</Text>
                {section.paragraphs.map((paragraph, paragraphIndex) => <Text key={`${section.id}-${paragraphIndex}`} style={{ color: colors.textSecondary, lineHeight: 20 }}>{paragraph}</Text>)}
              </View>)}
            </View>
            <Text style={{ color: colors.textPrimary, fontWeight: "700", marginTop: 4 }}>Confirm your agreements</Text>
            {([
              ["terms", "I have read and agree to CHATCO’s Terms of Service."],
              ["privacy", "I acknowledge CHATCO’s Privacy Policy, which explains how my information is used."],
              ["confirmation", "I confirm that my registration details are accurate and any documents I submit are genuine and belong to me. I understand that my account requires admin approval before I can log in."],
            ] as const).map(([key, label]) => <TouchableOpacity key={key} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: value[key], disabled }} onPress={() => onChange({ ...value, [key]: !value[key] })} style={{ flexDirection: "row", alignItems: "flex-start", gap: 11, paddingVertical: 5 }}>
              <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: value[key] ? colors.primary : colors.border, backgroundColor: value[key] ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                {value[key] && <Text style={{ color: "#FFFFFF", fontSize: 15, lineHeight: 18, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 21 }}>{label}</Text>
            </TouchableOpacity>)}
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
              Selecting “Agree & submit registration” sends your application for admin review. It does not approve your account or sign you in.
            </Text>
            {error && <Text accessibilityRole="alert" style={{ color: colors.danger, lineHeight: 20 }}>{error}</Text>}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
              <TouchableOpacity disabled={disabled} onPress={onBack} style={{ flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: "700", textAlign: "center" }}>Back to registration</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!agreed || disabled} onPress={onConfirm} style={{ flex: 1.25, minHeight: 48, borderRadius: 12, backgroundColor: !agreed || disabled ? colors.border : colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700", textAlign: "center" }}>{disabled ? "Submitting registration…" : "Agree & submit registration"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    <PolicyReader policy={policy} onClose={() => setPolicy(null)} />
  </>;
}
