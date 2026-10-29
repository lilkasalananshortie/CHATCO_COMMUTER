import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../shared/ui/BrandText";
import { studentRenewalService } from "../../core/api/student-renewal-service";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { FeatureButton, useFeatureStyles } from "../../shared/ui/FeatureControls";
import { EMPTY_SCHOOL_FIELDS, SchoolProofFields } from "./SchoolProofFields";
import { SupportingDocumentField } from "./SupportingDocumentField";
import { pickRenewalDocument } from "./pick-renewal-document";
import { RENEWAL_LABELS, renewalPayload, schoolProofFieldsError, type RenewalDocument, type RenewalFields, type RenewalState } from "./renewal-types";

const date = (iso: string) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
const renewalStatusColor = (status: string, isLight: boolean) => status === "APPROVED" ? (isLight ? "#047857" : "#34D399")
  : status === "NEEDS_CORRECTION" ? (isLight ? "#92400E" : "#FDE68A")
    : status === "PENDING" ? (isLight ? "#1A5FB4" : "#BAE6FD")
      : status === "REJECTED" || status === "EXPIRED" ? (isLight ? "#B91C1C" : "#FCA5A5") : (isLight ? "#4B5563" : "#CBD5E1");
export function StudentRenewalScreen({ state, loading, loadError, onRefresh, onClose }: {
  state: RenewalState | null; loading: boolean; loadError: string; onRefresh: () => Promise<void>; onClose: () => void;
}) {
  const s = useFeatureStyles();
  const { colors, isLight } = useCommuterTheme();
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
  const fieldsError = schoolProofFieldsError(fields);
  return <View style={[s.screen, { flex: 1 }]}>
    <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 5 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to Rewards & Updates" disabled={busy || picking} onPress={onClose} style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="arrow-back" size={16} color="#99C1F1" /><Text style={{ color: "#99C1F1", fontSize: 14 }}>Rewards &amp; Updates</Text></TouchableOpacity>
      <Text style={[s.title, { fontSize: 23 }]}>Student Renewal</Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { gap: 18 }]} keyboardShouldPersistTaps="handled">
    <Text style={[s.muted, { marginBottom: 5 }]}>Keep your verified student discount up to date. Your original registration ID is not replaced.</Text>
    {loading && <ActivityIndicator color="#62A0EA" />}
    {!!loadError && <View style={s.card}><Text style={s.error}>{loadError}</Text><FeatureButton label="Retry renewal loading" onPress={() => void onRefresh()} disabled={blocked} /></View>}
    {!!error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    {!!success && <Text accessibilityLiveRegion="polite" style={{ color: "#34D399", lineHeight: 22 }}>{success}</Text>}
    {state && <>
      <View style={[s.card, { gap: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}><Text style={s.heading}>Renewal status</Text><Text style={{ color: renewalStatusColor(state.status, isLight), fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surfaceHover }}>{RENEWAL_LABELS[state.status] ?? state.status}</Text></View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}><View style={{ flex: 1, minWidth: 130, gap: 3 }}><Text style={s.muted}>Current category</Text><Text style={s.text}>{state.commuter_type}</Text></View><View style={{ flex: 1, minWidth: 130, gap: 3 }}><Text style={s.muted}>Student discount</Text><Text style={s.text}>{state.discount_eligible ? "Eligible" : "Not currently eligible"}</Text></View></View>
        <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, gap: 6 }}><Text style={s.muted}>Renewal period: {state.renewal_period}</Text><Text style={s.muted}>Opens: {date(state.opens_at)} (PH)</Text><Text style={s.muted}>Deadline: {date(state.deadline)} (PH)</Text>{state.discount_expires_at && <Text style={s.muted}>Discount expires: {date(state.discount_expires_at)} (PH)</Text>}</View>
        {state.application && <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, gap: 6 }}><Text style={s.heading}>Submitted school details</Text><Text style={s.text}>{state.application.school_name}</Text><Text style={s.muted}>{state.application.education_level === "COLLEGE" ? "College" : `Grade ${state.application.grade_level ?? "—"}`} · {state.application.school_year}{state.application.enrollment_term ? ` · ${state.application.enrollment_term}` : ""}</Text><Text style={s.muted}>Last submitted: {date(state.application.submitted_at)}</Text></View>}
        {state.application?.reason && <View style={{ borderRadius: 10, borderWidth: 1, borderColor: isLight ? "#FDE68A" : "rgba(245,158,11,0.25)", backgroundColor: isLight ? "#FFFBEB" : "rgba(245,158,11,0.08)", padding: 12, gap: 5 }}><Text style={{ color: isLight ? "#92400E" : "#FDE68A", fontWeight: "700" }}>Review note</Text><Text style={s.text}>{state.application.reason}</Text>{state.application.correction_due_at && <Text style={{ color: isLight ? "#92400E" : "#FDE68A" }}>Correction deadline: {date(state.application.correction_due_at)} (PH)</Text>}</View>}
      </View>
      {state.can_submit ? <View style={s.card}>
        <Text style={s.heading}>{state.status === "NEEDS_CORRECTION" ? "Correct your enrollment proof" : "Submit current enrollment proof"}</Text>
        <SchoolProofFields fields={fields} onChange={setFields} disabled={blocked} />
        <Text style={s.muted}>Upload a clear school ID showing the current school year or enrollment proof. JPG, PNG, WebP or PDF, maximum 5MB.</Text>
        <SupportingDocumentField document={document} label={picking ? "Choosing proof…" : "Choose enrollment proof"} disabled={blocked} onChoose={() => void choose()} onRemove={() => setDocument(null)} />
        {!!fieldsError && <Text style={s.error}>{fieldsError}</Text>}
        <FeatureButton label={busy ? "Submitting…" : "Submit for verification"} disabled={blocked || !document || !!fieldsError} onPress={() => void perform(false)} />
      </View> : <Text style={s.muted}>{state.status === "PENDING" ? "Your submission is awaiting review. You cannot submit another application while it is pending." : "Submission is not currently available for this account or renewal period."}</Text>}
      {state.can_switch_to_regular && <FeatureButton secondary label="No longer a student — switch to Regular" disabled={blocked} onPress={() => setConfirmRegular(true)} />}
      <FeatureButton secondary label="Refresh renewal status" disabled={blocked} onPress={() => void onRefresh()} />
    </>}
    <Modal visible={confirmRegular} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmRegular(false); }}>
      <View style={{ flex: 1, backgroundColor: "#000B", justifyContent: "center", alignItems: "center", padding: 16 }}><ScrollView style={{ width: "100%", maxWidth: 448, maxHeight: "90%", flexGrow: 0, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }} contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={s.heading}>Switch to Regular?</Text><Text style={s.text}>Your student discount will stop and outstanding renewal applications will be cancelled. This does not delete your account or ride history.</Text>
        <FeatureButton label="Confirm switch to Regular" disabled={busy} onPress={() => void perform(true)} />
        <FeatureButton label="Keep student account" secondary disabled={busy} onPress={() => setConfirmRegular(false)} />
      </ScrollView></View>
    </Modal>
    </ScrollView>
  </View>;
}
