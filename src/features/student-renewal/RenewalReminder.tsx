import React, { useEffect, useRef, useState } from "react";
import { Text } from "../../shared/ui/BrandText";
import { View } from "react-native";
import { studentRenewalService } from "../../core/api/student-renewal-service";
import { FeatureButton, useFeatureStyles } from "../../shared/ui/FeatureControls";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { DashboardDialog } from "../dashboard/DashboardDialog";
import { renewalReminderKey, renewalReminderPresentation } from "./renewal-reminder-state";
import type { RenewalState } from "./renewal-types";

export function RenewalReminder({ state, enabled, onOpen, onRefresh, viewingRenewal = false, noticeId }: {
  state: RenewalState | null; enabled: boolean; onOpen: () => void; onRefresh: () => Promise<void>; viewingRenewal?: boolean; noticeId?: string | null;
}) {
  const s = useFeatureStyles();
  const { colors } = useCommuterTheme();
  const [viewedKey, setViewedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const mounted = useRef(true);
  const key = renewalReminderKey(state, noticeId);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!state) return; // An outage must not undo a reminder already seen.
    if (!state.reminder_due) setViewedKey(null);
    else if (viewingRenewal && key) setViewedKey(key);
  }, [state?.reminder_due, key, viewingRenewal]);
  const act = async (action: "snooze" | "dismiss") => {
    if (pending.current || !key) return;
    pending.current = true; setBusy(true); setError("");
    try {
      await studentRenewalService.reminder(action);
      if (!mounted.current) return;
      setViewedKey(key);
      await onRefresh();
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const copy = state ? renewalReminderPresentation(state) : null;
  const close = () => { if (!pending.current) setViewedKey(key); };
  return <DashboardDialog visible={enabled && !viewingRenewal && key !== null && viewedKey !== key} title={copy?.title ?? "Student renewal reminder"} onClose={close}>
    {copy && <>
      <Text style={s.text}>{copy.message}</Text>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
        {[{ label: copy.dateLabel, value: copy.dateValue }, { label: copy.countdownLabel, value: copy.countdown }].map((row, index) => <View key={row.label} style={{ paddingVertical: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8, borderTopWidth: index ? 1 : 0, borderColor: colors.border }}>
          <Text style={s.muted}>{row.label}</Text><Text style={[s.text, { fontWeight: "600", textAlign: "right", flexShrink: 1 }]}>{row.value}</Text>
        </View>)}
      </View>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <FeatureButton label={copy.action} disabled={busy} onPress={() => { if (!pending.current) { setViewedKey(key); onOpen(); } }} />
      <FeatureButton label="Remind me tomorrow" secondary disabled={busy} onPress={() => void act("snooze")} />
      <FeatureButton label="Never remind me" secondary disabled={busy} onPress={() => void act("dismiss")} />
    </>}
  </DashboardDialog>;
}
