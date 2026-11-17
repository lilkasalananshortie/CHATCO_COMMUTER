import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../shared/ui/BrandText";
import { FeatureInput } from "../../shared/ui/FeatureControls";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import type { RenewalFields } from "../student-renewal/renewal-types";

export const EMPTY_APPLICATION_SCHOOL_FIELDS: RenewalFields = { school_name: "", education_level: "", grade_level: "", school_year: "", enrollment_term: "" };
const ENROLLMENT_TERMS = ["1st Semester", "2nd Semester", "3rd Semester"] as const;

export function DiscountSchoolProofFields({ fields, onChange, disabled }: {
  fields: RenewalFields; onChange: (next: RenewalFields) => void; disabled: boolean;
}) {
  const { colors, isLight } = useCommuterTheme();
  const [openSelect, setOpenSelect] = useState<"grade" | "term" | null>(null);
  const year = new Date().getFullYear();
  const set = (patch: Partial<RenewalFields>) => onChange({ ...fields, ...patch });
  const labelStyle = { color: colors.textPrimary, fontSize: 14, fontWeight: "600" as const };
  const choice = (label: string, selected: boolean, onPress: () => void) => <Pressable key={label} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} style={{ flex: 1, minHeight: 44, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: selected ? colors.primary : colors.border, borderRadius: 8, backgroundColor: selected ? (isLight ? "#EAF3FF" : "rgba(98,160,234,0.12)") : colors.surface, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: selected ? colors.primary : colors.textPrimary, fontWeight: selected ? "700" : "500", fontSize: 13 }}>{label}</Text></Pressable>;
  const select = (kind: "grade" | "term", label: string, value: string, placeholder: string, options: readonly string[], onSelect: (value: string) => void) => <View style={{ gap: 8, zIndex: openSelect === kind ? 2 : 0 }}>
    <Text style={labelStyle}>{label}</Text>
    <View style={{ position: "relative" }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: openSelect === kind, disabled }} disabled={disabled} onPress={() => setOpenSelect(openSelect === kind ? null : kind)} style={{ minHeight: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: openSelect === kind ? colors.primary : colors.border, borderRadius: 8, backgroundColor: colors.surface }}><Text style={{ color: value ? colors.textPrimary : colors.textMuted, fontSize: 14 }}>{value || placeholder}</Text><Ionicons name="chevron-down" size={16} color={colors.textSecondary} /></Pressable>
    {openSelect === kind && <View style={{ position: "absolute", left: 0, right: 0, top: 48, zIndex: 3, elevation: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, overflow: "hidden" }}>
      {options.map((option) => <Pressable key={option} accessibilityRole="button" accessibilityLabel={option} onPress={() => { onSelect(option); setOpenSelect(null); }} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderTopWidth: option === options[0] ? 0 : 1, borderTopColor: colors.borderSubtle }}><Text style={{ color: colors.textPrimary, fontSize: 14 }}>{option}</Text></Pressable>)}
    </View>}
    </View>
  </View>;

  return <View style={{ gap: 18, zIndex: openSelect ? 2 : 0 }}>
    <FeatureInput label="School" placeholder="Name of your school or university" value={fields.school_name} maxLength={150} editable={!disabled} onChangeText={(value) => set({ school_name: value })} />
    <View style={{ gap: 8 }}><Text style={labelStyle}>Education level</Text><View style={{ flexDirection: "row", gap: 8 }}>
      {choice("High school", fields.education_level === "HIGH_SCHOOL", () => { set({ education_level: "HIGH_SCHOOL" }); setOpenSelect(null); })}
      {choice("College", fields.education_level === "COLLEGE", () => { set({ education_level: "COLLEGE", grade_level: "" }); setOpenSelect(null); })}
    </View></View>
    {fields.education_level === "HIGH_SCHOOL" && select("grade", "Grade level", fields.grade_level ? `Grade ${fields.grade_level}` : "", "Select grade", [7, 8, 9, 10, 11, 12].map(String).map((grade) => `Grade ${grade}`), (value) => set({ grade_level: value.replace("Grade ", "") }))}
    <FeatureInput label="School year" placeholder={`For example, ${year}–${year + 1}`} value={fields.school_year} maxLength={20} editable={!disabled} onChangeText={(value) => set({ school_year: value })} />
    {select("term", fields.education_level === "HIGH_SCHOOL" ? "Enrollment term (optional)" : "Enrollment term", fields.enrollment_term, fields.education_level === "HIGH_SCHOOL" ? "No term" : "Select term", fields.education_level === "HIGH_SCHOOL" ? ["No term", ...ENROLLMENT_TERMS] : ENROLLMENT_TERMS, (value) => set({ enrollment_term: value === "No term" ? "" : value }))}
  </View>;
}
