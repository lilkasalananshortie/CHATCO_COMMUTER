import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../shared/ui/BrandText";
import { APPLICATION_LABELS, DISCOUNT_CATEGORIES, type ApplicationState } from "../discount-application/application-types";

export function DiscountApplicationEntry({ state, loading, failed, isLight, onOpen, discountRate = 20 }: {
  state: ApplicationState | null; loading: boolean; failed: boolean; isLight: boolean;
  onOpen: () => void; discountRate?: number;
}) {
  if (!state && loading) return <Text accessibilityRole="text" style={{ width: "100%", marginTop: 16, color: isLight ? "#6B7280" : "rgba(255,255,255,0.6)" }}>Loading discount application status...</Text>;

  const application = state?.application;
  const renewal = application?.request_type === "RENEWAL";
  const renewalLabel = application?.requested_type === "PWD" ? "PWD renewal" : "Student renewal";
  const category = application ? DISCOUNT_CATEGORIES[application.requested_type] : "";
  const status = state && application && !["CANCELLED", "EXPIRED"].includes(state.status) ? state.status : "NOT_APPLIED";
  const content = !state
    ? { text: "Unable to load your discount application status.", link: "View application status" }
    : renewal ? { text: `${renewalLabel}: ${APPLICATION_LABELS[status]}`, link: `View ${renewalLabel}` }
    : status === "PENDING" ? { text: "Your discount application is currently under review. Check here for updates on your application status.", link: "View application status" }
    : status === "NEEDS_CORRECTION" ? { text: `An admin asked for a correction to your ${category} discount application. Send corrected documents to continue the review.`, link: "Update your application" }
    : status === "REJECTED" ? { text: `Your ${category} discount application was not approved.`, link: "Apply again" }
    : { lead: "Student, PWD or Senior Citizen?", text: `Verify your ID to pay ${discountRate}% less on every ride.`, link: "Apply for a discount" };
  const primary = !!state && status !== "PENDING";
  const border = isLight ? "rgba(26,95,180,0.15)" : "rgba(255,255,255,0.15)";
  const bodyColor = status === "REJECTED" ? (isLight ? "#B91C1C" : "#FECACA") : (isLight ? "#374151" : "rgba(255,255,255,0.85)");

  return <View style={{ width: "100%", marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: border }}>
    <Text style={{ color: bodyColor, fontSize: 16, lineHeight: 25 }}>
      {"lead" in content && <Text style={{ color: isLight ? "#111827" : "#FFFFFF", fontWeight: "600" }}>{content.lead} </Text>}{content.text}
    </Text>
    {(status === "REJECTED" || status === "NEEDS_CORRECTION") && !!application?.reason && <Text style={{ marginTop: 6, color: isLight ? "#4B5563" : "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 23 }}>Reason: {application.reason}</Text>}
    {failed && <Text style={{ marginTop: 6, color: isLight ? "#4B5563" : "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 23 }}>Open your application to check its latest status.</Text>}
    <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={{ minHeight: 44, marginTop: 12, borderRadius: 12, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: primary ? "#1A5FB4" : isLight ? "#FFFFFF" : "#13283F", borderWidth: primary ? 0 : 1, borderColor: isLight ? "#E5E7EB" : "#2A4A70" }}>
      <Text style={{ color: primary || !isLight ? "#FFFFFF" : "#1F2937", fontSize: 16, fontWeight: "600" }}>{content.link}</Text>
      {primary && <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
    </TouchableOpacity>
  </View>;
}
