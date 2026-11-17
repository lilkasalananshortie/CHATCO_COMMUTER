import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../shared/ui/BrandText";
import type { RenewalState } from "../student-renewal/renewal-types";

const date = (value: string, withTime = false) => new Date(value).toLocaleString("en-PH", {
  month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
});

export function StudentRenewalEntry({ state, discountPercentage, isLight, onOpen }: {
  state: RenewalState | null; discountPercentage: number; isLight: boolean; onOpen: () => void;
}) {
  if (!state?.notice_active || state.commuter_type !== "STUDENT") return null;
  const { status, can_submit: canSubmit, application } = state;
  const discount = `${discountPercentage}% student discount`;
  const content = status === "PENDING"
    ? { text: "Your student renewal is being reviewed. We’ll notify you when it’s done, so there’s no need to submit again.", link: "View renewal status" }
    : status === "NEEDS_CORRECTION"
      ? { text: `An admin asked for a correction to your student renewal. Send corrected proof${application?.correction_due_at ? ` by ${date(application.correction_due_at, true)}` : ""} to continue the review.`, link: "Submit corrected proof" }
      : status === "REJECTED"
        ? { text: "Your student renewal was not approved.", link: canSubmit ? "Submit again" : "View renewal status" }
        : !canSubmit
          ? { lead: "Student renewal is coming up.", text: `It opens on ${date(state.opens_at)}. Have your current school ID or enrollment proof ready to keep your ${discount}.`, link: "View renewal status" }
          : { lead: "Student renewal is due.", text: `Upload your current school ID or enrollment proof before ${date(state.deadline)} to keep your ${discount}.`, link: "Renew student status" };
  const primary = canSubmit && status !== "PENDING";
  return <View style={{ width: "100%", marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: isLight ? "rgba(26,95,180,0.15)" : "rgba(255,255,255,0.15)" }}>
    <Text style={{ color: status === "REJECTED" ? (isLight ? "#B91C1C" : "#FECACA") : (isLight ? "#374151" : "rgba(255,255,255,0.85)"), fontSize: 14, lineHeight: 23 }}>
      {"lead" in content && <Text style={{ color: isLight ? "#111827" : "#FFFFFF", fontWeight: "600" }}>{content.lead} </Text>}{content.text}
    </Text>
    {(status === "REJECTED" || status === "NEEDS_CORRECTION") && !!application?.reason && <Text style={{ marginTop: 4, color: isLight ? "#4B5563" : "rgba(255,255,255,0.7)", fontSize: 13 }}>Reason: {application.reason}</Text>}
    <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={{ minHeight: 44, marginTop: 12, borderRadius: 12, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: primary ? "#1A5FB4" : isLight ? "#FFFFFF" : "#13283F", borderWidth: primary ? 0 : 1, borderColor: isLight ? "#E5E7EB" : "#2A4A70" }}>
      <Text style={{ color: primary || !isLight ? "#FFFFFF" : "#1F2937", fontSize: 14, fontWeight: "600" }}>{content.link}</Text>
      {primary && <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
    </TouchableOpacity>
  </View>;
}
