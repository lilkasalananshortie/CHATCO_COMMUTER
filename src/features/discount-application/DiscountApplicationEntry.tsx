import React from "react";
import { Text } from "../../shared/ui/BrandText";
import { View } from "react-native";
import { FeatureButton, useFeatureStyles } from "../../shared/ui/FeatureControls";
import { APPLICATION_LABELS, type ApplicationState } from "./application-types";

export function DiscountApplicationEntry({ state, loading, error, commuterType, onOpen }: {
  state: ApplicationState | null; loading: boolean; error: string; commuterType: string; onOpen: () => void;
}) {
  const s = useFeatureStyles();
  if ((state?.commuter_type ?? commuterType).toUpperCase() !== "REGULAR") return null;
  const renewal = state?.application?.request_type === "RENEWAL";
  const renewalTitle = state?.application?.requested_type === "PWD" ? "PWD Renewal" : "Student Renewal";
  return <View style={[s.card, { marginBottom: 20 }]}>
    <Text style={s.heading}>{renewal ? renewalTitle.replace("Renewal", "renewal") : "Discount Application"}</Text>
    <Text style={s.text}>{state ? APPLICATION_LABELS[state.status] : loading ? "Checking application status..." : "Check your eligibility and application status."}</Text>
    <Text style={s.muted}>Eligible for Student, PWD, or Senior Citizen fares? Your account remains Regular until Admin approves your supporting document.</Text>
    {!!state?.application?.reason && <Text style={s.text}>Review note: {state.application.reason}</Text>}
    {!!error && <Text style={s.error}>{error}</Text>}
    <FeatureButton secondary label={renewal ? `View ${renewalTitle}` : state?.application && ["PENDING", "NEEDS_CORRECTION"].includes(state.status) ? "View application" : "Apply for a discount"} onPress={onOpen} />
  </View>;
}
