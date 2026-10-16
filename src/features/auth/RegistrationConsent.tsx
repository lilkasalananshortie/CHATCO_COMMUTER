import React, { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { PRIVACY_SECTIONS, REGISTRATION_TERMS, POLICY_EFFECTIVE_DATE } from "./registration-policies";
import type { AgreementChoices } from "./registration-agreement";

export function RegistrationConsent({ value, onChange, disabled }: {
  value: AgreementChoices; onChange: (value: AgreementChoices) => void; disabled: boolean;
}) {
  const [policy, setPolicy] = useState<"terms" | "privacy" | null>(null);
  return <View style={{ gap: 12, marginVertical: 16 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      {(["terms", "privacy"] as const).map((kind) => <TouchableOpacity key={kind} accessibilityRole="button" disabled={disabled} onPress={() => setPolicy(kind)} style={{ paddingVertical: 10 }}>
        <Text style={{ color: "#62A0EA", textDecorationLine: "underline" }}>{kind === "terms" ? "Read Terms of Service" : "Read Privacy Policy"}</Text>
      </TouchableOpacity>)}
    </View>
    {([
      ["terms", "I accept the Terms of Service."],
      ["privacy", "I acknowledge the Privacy Policy."],
      ["confirmation", "My details and documents are accurate. I understand my account requires Admin approval before I can sign in."],
    ] as const).map(([key, label]) => <TouchableOpacity key={key} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: value[key], disabled }} onPress={() => onChange({ ...value, [key]: !value[key] })} style={{ flexDirection: "row", gap: 10, paddingVertical: 8 }}>
      <Text style={{ color: "#62A0EA", fontSize: 20 }}>{value[key] ? "☑" : "☐"}</Text>
      <Text style={{ color: "#CBD5E1", flex: 1, lineHeight: 21 }}>{label}</Text>
    </TouchableOpacity>)}
    <Modal visible={policy !== null} animationType="slide" onRequestClose={() => setPolicy(null)}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 56, paddingBottom: 48, backgroundColor: "#050F1A", flexGrow: 1 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "800" }}>{policy === "terms" ? "Terms of Service" : "Privacy Policy"}</Text>
        <Text style={{ color: "#94A3B8", marginVertical: 12 }}>Effective {POLICY_EFFECTIVE_DATE}</Text>
        {(policy === "terms" ? REGISTRATION_TERMS : PRIVACY_SECTIONS).map((section) => <View key={section.id} style={{ marginBottom: 18 }}>
          <Text style={{ color: "white", fontWeight: "700", marginBottom: 8 }}>{section.title}</Text>
          {section.paragraphs.map((text) => <Text key={text} style={{ color: "#CBD5E1", lineHeight: 22, marginBottom: 8 }}>{text}</Text>)}
        </View>)}
        <TouchableOpacity accessibilityRole="button" onPress={() => setPolicy(null)} style={{ backgroundColor: "#1A5FB4", padding: 16, borderRadius: 12 }}><Text style={{ color: "white", textAlign: "center" }}>Back to registration</Text></TouchableOpacity>
      </ScrollView>
    </Modal>
  </View>;
}
