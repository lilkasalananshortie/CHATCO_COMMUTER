import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, View } from "react-native";
import { studentRenewalService } from "../../core/api/student-renewal-service";
import { FeatureButton, featureStyles as s } from "../../shared/ui/FeatureControls";
import { EMPTY_SCHOOL_FIELDS, SchoolProofFields } from "./SchoolProofFields";
import { pickRenewalDocument } from "./pick-renewal-document";
import { RENEWAL_LABELS, renewalPayload, type RenewalDocument, type RenewalFields, type RenewalState } from "./renewal-types";

const date = (iso: string) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
export function StudentRenewalScreen({ state, loading, loadError, onRefresh, onClose }: {
  state: RenewalState | null; loading: boolean; loadError: string; onRefresh: () => Promise<void>; onClose: () => void;
}) {
  const [fields, setFields] = useState<RenewalFields>(EMPTY_SCHOOL_FIELDS);
  const [document, setDocument] = useState<RenewalDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmRegular, setConfirmRegular] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const application = state?.application;
    if (application) setFields({ school_name: application.school_name, education_level: application.education_level, grade_level: String(application.grade_level ?? 7), school_year: application.school_year, enrollment_term: application.enrollment_term ?? "" });
  }, [state?.application?.id, state?.application?.revision]);
  const choose = async () => {
    if (pending.current) return;
    pending.current = true; setPicking(true); setError("");
    try {
      const file = await pickRenewalDocument();
      if (file && file.size != null && file.size > 5 * 1024 * 1024) throw new Error("Enrollment proof must be 5MB or smaller.");
      if (mounted.current && file) setDocument(file);
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { pending.current = false; if (mounted.current) setPicking(false); }
  };
  const perform = async (regular: boolean) => {
    if (pending.current || loading) return;
    pending.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      if (regular) await studentRenewalService.switchToRegular();
      else await studentRenewalService.submit(renewalPayload(fields, document));
      if (!mounted.current) return;
      setDocument(null); setConfirmRegular(false);
      setSuccess(regular ? "Your commuter category is now Regular." : "Enrollment proof submitted for review. This does not mean it has been approved.");
      await onRefresh();
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const blocked = busy || picking || loading;
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <FeatureButton secondary label="Back to Rewards" disabled={busy || picking} onPress={onClose} />
    <Text style={s.title}>Student Renewal</Text>
    <Text style={s.muted}>Keep your verified student discount up to date. Your original registration ID is not replaced.</Text>
    {loading && <ActivityIndicator color="#62A0EA" />}
    {!!loadError && <View style={s.card}><Text style={s.error}>{loadError}</Text><FeatureButton label="Retry renewal loading" onPress={() => void onRefresh()} disabled={blocked} /></View>}
    {!!error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    {!!success && <Text accessibilityLiveRegion="polite" style={{ color: "#34D399", lineHeight: 22 }}>{success}</Text>}
    {state && <>
      <View style={s.card}>
        <Text style={s.heading}>{RENEWAL_LABELS[state.status] ?? state.status}</Text>
        <Text style={s.text}>Current category: {state.commuter_type}</Text>
        <Text style={s.text}>Student discount: {state.discount_eligible ? "Eligible" : "Not currently eligible"}</Text>
        <Text style={s.muted}>Renewal: {state.renewal_period}</Text>
        <Text style={s.muted}>Opens: {date(state.opens_at)} (PH)</Text>
        <Text style={s.muted}>Deadline: {date(state.deadline)} (PH)</Text>
        {state.discount_expires_at && <Text style={s.muted}>Discount expires: {date(state.discount_expires_at)} (PH)</Text>}
        {state.application?.reason && <Text style={s.text}>Review note: {state.application.reason}</Text>}
        {state.application?.correction_due_at && <Text style={s.text}>Correction deadline: {date(state.application.correction_due_at)} (PH)</Text>}
      </View>
      {state.can_submit ? <View style={s.card}>
        <Text style={s.heading}>{state.status === "NEEDS_CORRECTION" ? "Correct your enrollment proof" : "Submit current enrollment proof"}</Text>
        <SchoolProofFields fields={fields} onChange={setFields} disabled={blocked} />
        <Text style={s.muted}>Upload a clear school ID showing the current school year or enrollment proof. JPG, PNG, WebP or PDF, maximum 5MB.</Text>
        <FeatureButton secondary label={picking ? "Choosing proof…" : document ? `Replace: ${document.name}` : "Choose enrollment proof"} disabled={blocked} onPress={() => void choose()} />
        <FeatureButton label={busy ? "Submitting…" : "Submit for verification"} disabled={blocked || !document} onPress={() => void perform(false)} />
      </View> : <Text style={s.muted}>{state.status === "PENDING" ? "Your submission is awaiting review. You cannot submit another application while it is pending." : "Submission is not currently available for this account or renewal period."}</Text>}
      {state.can_switch_to_regular && <FeatureButton secondary label="No longer a student — switch to Regular" disabled={blocked} onPress={() => setConfirmRegular(true)} />}
      <FeatureButton secondary label="Refresh renewal status" disabled={blocked} onPress={() => void onRefresh()} />
    </>}
    <Modal visible={confirmRegular} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmRegular(false); }}>
      <View style={{ flex: 1, backgroundColor: "#000B", justifyContent: "center", padding: 24 }}><View style={s.card}>
        <Text style={s.heading}>Switch to Regular?</Text><Text style={s.text}>Your student discount will stop and outstanding renewal applications will be cancelled. This does not delete your account or ride history.</Text>
        <FeatureButton label="Confirm switch to Regular" disabled={busy} onPress={() => void perform(true)} />
        <FeatureButton label="Keep student account" secondary disabled={busy} onPress={() => setConfirmRegular(false)} />
      </View></View>
    </Modal>
  </ScrollView>;
}
