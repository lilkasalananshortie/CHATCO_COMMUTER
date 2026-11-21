import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../shared/ui/BrandText";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { RENEWAL_COPY, RENEWAL_LABELS, type RenewalState } from "../student-renewal/renewal-types";

const date = (value: string) => new Date(value).toLocaleString("en-PH", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila",
});

export function RewardsRenewalNotice({ renewal, onOpen }: { renewal: RenewalState; onOpen: () => void }) {
  const { isLight, colors } = useCommuterTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const pending = renewal.status === "PENDING";
  const correction = renewal.status === "NEEDS_CORRECTION";
  const status = renewal.status === "NOT_RENEWED" ? "For renewal" : RENEWAL_LABELS[renewal.status];
  const copy = RENEWAL_COPY[renewal.kind ?? "STUDENT"];
  const pwd = renewal.kind === "PWD";
  const title = pending ? `Your ${copy.proofShort} is being reviewed` : correction ? copy.correctionTitle : copy.renewTitle;
  const description = pending
    ? "We’ll notify you when the review is complete. No need to submit again."
    : correction
      ? `Check the reviewer’s note and send ${pwd ? "a corrected PWD ID" : "corrected proof"} before your correction deadline.`
      : `Have ${copy.ready} ready to continue your ${copy.discount}.`;
  const action = renewal.can_submit ? (correction ? copy.correctedAction : copy.renewAction) : "View renewal status";
  const main = isLight ? "#111827" : "#FFFFFF";
  const muted = isLight ? "#6B7280" : "rgba(255,255,255,0.5)";
  const border = isLight ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  return <View style={{ marginBottom: 28, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: isLight ? "rgba(26,95,180,0.3)" : "rgba(98,160,234,0.3)", backgroundColor: isLight ? "#FFFFFF" : "#071A2E", gap: 16 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name={pwd ? "accessibility-outline" : "school-outline"} size={18} color={isLight ? "#1A5FB4" : "#99C1F1"} /><Text style={{ color: isLight ? "#1A5FB4" : "#99C1F1", fontSize: 12, fontWeight: "500" }}>{copy.label}</Text></View>
      <Text style={{ color: isLight ? "#374151" : "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" }}>{status}</Text>
    </View>
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Text style={{ color: main, fontSize: 20, lineHeight: 27, fontWeight: "600", flexShrink: 1 }}>{title}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="What happens next" accessibilityState={{ expanded: helpOpen }} onPress={() => setHelpOpen(value => !value)} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}><Ionicons name="help-circle-outline" size={19} color={muted} /></TouchableOpacity>
      </View>
      {helpOpen && <View style={{ borderLeftWidth: 1, borderLeftColor: isLight ? "#D1D5DB" : "rgba(255,255,255,0.15)", paddingLeft: 16, gap: 10 }}>
        <Text style={{ color: main, fontSize: 14, fontWeight: "600" }}>What happens next</Text>
        <Text style={{ color: muted, fontSize: 12, lineHeight: 19 }}>Your discount: {renewal.discount_eligible ? `You can still use it until ${date(renewal.discount_expires_at ?? renewal.deadline)} (Philippine time), unless your renewal is approved and extends it.` : "Regular fares apply until your renewal is approved."}</Text>
        <Text style={{ color: muted, fontSize: 12, lineHeight: 19 }}>If you miss the deadline: Without {pwd ? "your renewed PWD ID" : "proof"} submitted before {date(renewal.deadline)} (Philippine time), your commuter type automatically changes to Regular. Your account stays active, and you can still submit {pwd ? "it" : "proof"} afterward. Regular fares apply until it is approved.</Text>
        <Text style={{ color: muted, fontSize: 12, lineHeight: 19 }}>If you submit on time: You keep the {pwd ? "PWD" : "Student"} type while your {copy.proofShort} is reviewed. Once your current discount expires, Regular fares apply until approval.{correction ? " Send any corrections before the correction deadline shown below." : ""}</Text>
      </View>}
      <Text style={{ color: isLight ? "#4B5563" : "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 23 }}>{description}</Text>
    </View>
    <View style={{ paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: border, gap: 16 }}>
      <View style={{ gap: 4 }}><Text style={{ color: muted, fontSize: 12 }}>Renewal period</Text><Text style={{ color: main, fontSize: 14, fontWeight: "500" }}>{renewal.renewal_period}</Text><Text style={{ color: muted, fontSize: 12 }}>Philippine time</Text></View>
      <View style={{ gap: 5 }}><Text style={{ color: muted, fontSize: 12 }}>{copy.discountLabel}</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name={renewal.discount_eligible ? "checkmark-circle-outline" : "time-outline"} size={16} color={muted} /><Text style={{ color: main, fontSize: 14, fontWeight: "500" }}>{renewal.discount_eligible ? "Available" : "Unavailable"}</Text></View></View>
      {correction && renewal.application?.correction_due_at && <View style={{ gap: 4 }}><Text style={{ color: muted, fontSize: 12 }}>Correction deadline</Text><Text style={{ color: main, fontSize: 14, fontWeight: "500" }}>{date(renewal.application.correction_due_at)} (Philippine time)</Text></View>}
    </View>
    <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={{ minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>{action}</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
    </TouchableOpacity>
  </View>;
}
