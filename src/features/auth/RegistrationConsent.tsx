import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { PolicyReader } from "../../shared/legal/PolicyReader";
import type { AgreementChoices } from "./registration-agreement";

export function RegistrationConsent({ value, onChange, disabled }: {
  value: AgreementChoices; onChange: (value: AgreementChoices) => void; disabled: boolean;
}) {
  const [policy, setPolicy] = useState<"terms" | "privacy" | null>(null);
  const { colors } = useCommuterTheme();
  return <View style={{ gap: 12, marginVertical: 16 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      {(["terms", "privacy"] as const).map((kind) => <TouchableOpacity key={kind} accessibilityRole="button" disabled={disabled} onPress={() => setPolicy(kind)} style={{ paddingVertical: 10 }}>
        <Text style={{ color: colors.primaryLight, textDecorationLine: "underline" }}>{kind === "terms" ? "Read Terms of Service" : "Read Privacy Policy"}</Text>
      </TouchableOpacity>)}
    </View>
    {([
      ["terms", "I accept the Terms of Service."],
      ["privacy", "I acknowledge the Privacy Policy."],
      ["confirmation", "My details and documents are accurate. I understand my account requires Admin approval before I can sign in."],
    ] as const).map(([key, label]) => <TouchableOpacity key={key} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: value[key], disabled }} onPress={() => onChange({ ...value, [key]: !value[key] })} style={{ flexDirection: "row", gap: 10, paddingVertical: 8 }}>
      <Text style={{ color: colors.primaryLight, fontSize: 20 }} importantForAccessibility="no">{value[key] ? "☑" : "☐"}</Text>
      <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 21 }}>{label}</Text>
    </TouchableOpacity>)}
    <PolicyReader policy={policy} onClose={() => setPolicy(null)} />
  </View>;
}
