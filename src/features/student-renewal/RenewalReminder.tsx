import React, { useRef, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { studentRenewalService } from "../../core/api/student-renewal-service";
import { FeatureButton, useFeatureStyles } from "../../shared/ui/FeatureControls";
import type { RenewalState } from "./renewal-types";

export function RenewalReminder({ state, enabled, onOpen, onRefresh }: {
  state: RenewalState | null; enabled: boolean; onOpen: () => void; onRefresh: () => Promise<void>;
}) {
  const s = useFeatureStyles();
  const [viewed, setViewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const act = async (action: "snooze" | "dismiss") => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await studentRenewalService.reminder(action); setViewed(true); await onRefresh(); }
    catch (e) { setError((e as Error).message); }
    finally { pending.current = false; setBusy(false); }
  };
  return <Modal visible={enabled && !!state?.reminder_due && !viewed} transparent animationType="fade" onRequestClose={() => { if (!pending.current) setViewed(true); }}>
    <View style={{ flex: 1, backgroundColor: "#000B", justifyContent: "center", padding: 24 }}>
      <ScrollView style={{ maxHeight: "85%" }} contentContainerStyle={s.card}>
        <Text style={s.title}>Renew your student discount</Text>
        <Text style={s.text}>{state?.renewal_period}. Submit current enrollment proof to keep your student eligibility.</Text>
        <Text style={s.muted}>Deadline: {state?.deadline ? new Date(state.deadline).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "—"} (Philippine time)</Text>
        {!!error && <Text style={s.error}>{error}</Text>}
        <FeatureButton label="View student renewal" disabled={busy} onPress={() => { setViewed(true); onOpen(); }} />
        <FeatureButton label="Remind me tomorrow" secondary disabled={busy} onPress={() => void act("snooze")} />
        <FeatureButton label="Hide reminders for this cycle" secondary disabled={busy} onPress={() => void act("dismiss")} />
      </ScrollView>
    </View>
  </Modal>;
}
