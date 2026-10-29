import React from "react";
import { Pressable, View } from "react-native";
import { FeatureInput, useFeatureStyles } from "../../shared/ui/FeatureControls";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { Text } from "../../shared/ui/BrandText";
import type { RenewalFields } from "./renewal-types";

export const EMPTY_SCHOOL_FIELDS: RenewalFields = { school_name: "", education_level: "HIGH_SCHOOL", grade_level: "7", school_year: "", enrollment_term: "" };
export function SchoolProofFields({ fields, onChange, disabled }: {
  fields: RenewalFields; onChange: (fields: RenewalFields) => void; disabled: boolean;
}) {
  const s = useFeatureStyles();
  const { colors, isLight } = useCommuterTheme();
  const set = (key: keyof RenewalFields, value: string) => onChange({ ...fields, [key]: value });
  const choice = (label: string, selected: boolean, onPress: () => void) => <Pressable key={label} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 38, justifyContent: "center", alignItems: "center", paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? (isLight ? "#EAF3FF" : "rgba(26,95,180,0.2)") : colors.surface, opacity: disabled ? 0.6 : 1 }}><Text style={{ color: selected ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: selected ? "700" : "500" }}>{label}</Text></Pressable>;
  return <>
    <FeatureInput label="School name" value={fields.school_name} maxLength={150} editable={!disabled} onChangeText={(value) => set("school_name", value)} />
    <View style={{ gap: 7 }}><Text style={{ color: colors.textSecondary, fontSize: 13 }}>Education level</Text><View style={[s.row, { gap: 8 }]}>{(["HIGH_SCHOOL", "COLLEGE"] as const).map((level) => choice(level === "HIGH_SCHOOL" ? "High school" : "College", fields.education_level === level, () => set("education_level", level)))}</View></View>
    {fields.education_level === "HIGH_SCHOOL" && <View style={{ gap: 7 }}><Text style={{ color: colors.textSecondary, fontSize: 13 }}>Grade level</Text><View style={[s.row, { gap: 7 }]}>{[7, 8, 9, 10, 11, 12].map((grade) => choice(`Grade ${grade}`, fields.grade_level === String(grade), () => set("grade_level", String(grade))))}</View></View>}
    <FeatureInput label="School year (e.g. 2026-2027)" value={fields.school_year} maxLength={20} editable={!disabled} onChangeText={(value) => set("school_year", value)} />
    {(fields.education_level === "COLLEGE" || Number(fields.grade_level) >= 11) && <FeatureInput label={fields.education_level === "COLLEGE" ? "Enrollment term / semester (required)" : "Enrollment term / semester (optional)"} value={fields.enrollment_term} maxLength={50} editable={!disabled} onChangeText={(value) => set("enrollment_term", value)} />}
  </>;
}
