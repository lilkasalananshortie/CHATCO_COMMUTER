import React from "react";
import { View } from "react-native";
import { FeatureButton, FeatureInput, featureStyles as s } from "../../shared/ui/FeatureControls";
import type { RenewalFields } from "./renewal-types";

export const EMPTY_SCHOOL_FIELDS: RenewalFields = { school_name: "", education_level: "HIGH_SCHOOL", grade_level: "7", school_year: "", enrollment_term: "" };
export function SchoolProofFields({ fields, onChange, disabled }: {
  fields: RenewalFields; onChange: (fields: RenewalFields) => void; disabled: boolean;
}) {
  const set = (key: keyof RenewalFields, value: string) => onChange({ ...fields, [key]: value });
  return <>
    <FeatureInput label="School name" value={fields.school_name} maxLength={150} editable={!disabled} onChangeText={(value) => set("school_name", value)} />
    <View style={s.row}>{(["HIGH_SCHOOL", "COLLEGE"] as const).map((level) => <FeatureButton key={level} label={level === "HIGH_SCHOOL" ? "High school" : "College"} secondary={fields.education_level !== level} disabled={disabled} onPress={() => set("education_level", level)} />)}</View>
    {fields.education_level === "HIGH_SCHOOL" && <View style={s.row}>{[7, 8, 9, 10, 11, 12].map((grade) => <FeatureButton key={grade} label={`Grade ${grade}`} secondary={fields.grade_level !== String(grade)} disabled={disabled} onPress={() => set("grade_level", String(grade))} />)}</View>}
    <FeatureInput label="School year (e.g. 2026-2027)" value={fields.school_year} maxLength={20} editable={!disabled} onChangeText={(value) => set("school_year", value)} />
    {(fields.education_level === "COLLEGE" || Number(fields.grade_level) >= 11) && <FeatureInput label={fields.education_level === "COLLEGE" ? "Enrollment term / semester (required)" : "Enrollment term / semester (optional)"} value={fields.enrollment_term} maxLength={50} editable={!disabled} onChangeText={(value) => set("enrollment_term", value)} />}
  </>;
}
