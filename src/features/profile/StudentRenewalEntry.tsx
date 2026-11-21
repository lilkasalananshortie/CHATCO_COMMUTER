import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../shared/ui/BrandText";
import { RENEWAL_COPY, type RenewalState } from "../student-renewal/renewal-types";

const date = (value: string, withTime = false) => new Date(value).toLocaleString("en-PH", {
  month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
});

export function StudentRenewalEntry({ state, discountPercentage, isLight, onOpen }: {
  state: RenewalState | null; discountPercentage: number; isLight: boolean; onOpen: () => void;
}) {
  if (!state?.notice_active || state.commuter_type !== (state.kind ?? "STUDENT")) return null;
  const copy = RENEWAL_COPY[state.kind ?? "STUDENT"];
  const pwd = state.kind === "PWD";
  const label = copy.label.replace(/^Student/, "student");
  const { status, can_submit: canSubmit, application } = state;
  const discount = `${discountPercentage}% ${copy.discount}`;
  const content = status === "PENDING"
    ? { text: `Your ${label} is being reviewed. We’ll notify you when it’s done, so there’s no need to submit again.`, link: "View renewal status" }
    : status === "NEEDS_CORRECTION"
      ? { text: `An admin asked for a correction to your ${label}. Send ${pwd ? "a corrected PWD ID" : "corrected proof"}${application?.correction_due_at ? ` by ${date(application.correction_due_at, true)}` : ""} to continue the review.`, link: copy.correctedAction }
      : status === "REJECTED"
        ? { text: `Your ${label} was not approved.`, link: canSubmit ? "Submit again" : "View renewal status" }
        : !canSubmit
          ? { lead: `${copy.label} is coming up.`, text: `It opens on ${date(state.opens_at)}. Have ${copy.ready} ready to keep your ${discount}.`, link: "View renewal status" }
          : { lead: `${copy.label} is due.`, text: `Upload ${copy.ready} ${pwd ? `by ${date(new Date(Date.parse(state.deadline) - 1).toISOString())}` : `before ${date(state.deadline)}`} to keep your ${discount}.`, link: copy.renewAction };
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
