import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../shared/ui/BrandText";
import { studentRenewalService } from "../../core/api/student-renewal-service";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { FeatureButton, FeatureInput, useFeatureStyles } from "../../shared/ui/FeatureControls";
import { formatRegistrationBirthdate, pwdValidUntilError } from "../auth/registration-validation";
import { EMPTY_SCHOOL_FIELDS, SchoolProofFields } from "./SchoolProofFields";
import { SupportingDocumentField } from "./SupportingDocumentField";
import { pickRenewalDocument } from "./pick-renewal-document";
import { RENEWAL_COPY, RENEWAL_LABELS, formatCardDate, pwdRenewalPayload, readNativeProof, renewalPayload, schoolProofFieldsError, type RenewalDocument, type RenewalFields, type RenewalState } from "./renewal-types";

const date = (iso: string) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const renewalStatusColor = (status: string, isLight: boolean) => status === "REJECTED" || status === "EXPIRED"
  ? (isLight ? "#B91C1C" : "#F28B82")
  : (isLight ? "#1F4F83" : "#C9D9EC");
export function StudentRenewalScreen({ state, loading, loadError, backLabel, onRefresh, onClose }: {
  state: RenewalState | null; loading: boolean; loadError: string; backLabel: string; onRefresh: () => Promise<void>; onClose: () => void;
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
  const [validUntil, setValidUntil] = useState("");
  const kind = state?.kind ?? "STUDENT";
  const pwd = kind === "PWD";
  const copy = RENEWAL_COPY[kind];
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const application = state?.application;
    if (application && state?.kind === "PWD") setValidUntil(application.status === "NEEDS_CORRECTION" ? application.valid_until?.slice(0, 10) ?? "" : "");
    else if (application) setFields({ school_name: application.school_name ?? "", education_level: application.education_level ?? "", grade_level: application.grade_level == null ? "" : String(application.grade_level), school_year: application.school_year ?? "", enrollment_term: application.enrollment_term ?? "" });
  }, [state?.application?.id, state?.application?.revision]);
  const choose = async () => {
    if (pending.current) return;
    pending.current = true; setPicking(true); setError("");
    try {
      const file = await pickRenewalDocument();
      if (file && file.size != null && file.size > 5 * 1024 * 1024) throw new Error(`${pwd ? "PWD ID" : "Enrollment proof"} must be 5MB or smaller.`);
      if (mounted.current && file) setDocument(file);
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { pending.current = false; if (mounted.current) setPicking(false); }
  };
  const perform = async (regular: boolean) => {
    if (pending.current || loading || (regular && state?.status === "PENDING")) return;
    pending.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      if (regular) await (pwd ? studentRenewalService.switchToRegular("PWD") : studentRenewalService.switchToRegular());
      else if (pwd) await studentRenewalService.submit(pwdRenewalPayload(validUntil, state?.valid_until, document, await readNativeProof(document)), "PWD");
      else await studentRenewalService.submit(renewalPayload(fields, document, true, await readNativeProof(document)));
      if (!mounted.current) return;
      setDocument(null); setConfirmRegular(false);
      setSuccess(regular ? "Your commuter category is now Regular." : pwd ? "Your PWD ID was submitted. An admin will verify it." : "Your proof was submitted. An admin will verify your student status.");
      await onRefresh();
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const blocked = busy || picking || loading;
  const fieldsError = pwd ? pwdValidUntilError(validUntil, state?.valid_until) : schoolProofFieldsError(fields);
  return <View style={[s.screen, { flex: 1 }]}>
    <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 5 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Back to ${backLabel}`} disabled={busy || picking} onPress={onClose} style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="arrow-back" size={16} color="#99C1F1" /><Text style={{ color: "#99C1F1", fontSize: 14 }}>{backLabel}</Text></TouchableOpacity>
      <Text style={[s.title, { fontSize: 23 }]}>{copy.title}</Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { gap: 18 }]} keyboardShouldPersistTaps="handled">
    <Text style={[s.muted, { marginBottom: 5 }]}>Keep your verified {copy.discount} up to date. Your original registration ID is not replaced.</Text>
    {loading && <ActivityIndicator color="#62A0EA" />}
    {!!loadError && <View style={s.card}><Text style={s.error}>{loadError}</Text><FeatureButton label="Retry renewal loading" onPress={() => void onRefresh()} disabled={blocked} /></View>}
    {!!error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    {!!success && <Text accessibilityLiveRegion="polite" style={{ color: colors.textPrimary, lineHeight: 22 }}>{success}</Text>}
    {state && <>
      <View style={[s.card, { gap: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}><Text style={s.heading}>Renewal status</Text><Text style={{ color: renewalStatusColor(state.status, isLight), fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surfaceHover }}>{RENEWAL_LABELS[state.status] ?? state.status}</Text></View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}><View style={{ flex: 1, minWidth: 130, gap: 3 }}><Text style={s.muted}>Current category</Text><Text style={s.text}>{state.commuter_type}</Text></View><View style={{ flex: 1, minWidth: 130, gap: 3 }}><Text style={s.muted}>{copy.discountLabel}</Text><Text style={[s.text, { color: colors.textSecondary }]}>{state.discount_eligible ? "Eligible" : "Not currently eligible"}</Text></View></View>
        <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, gap: 6 }}>{pwd && !!state.valid_until && <Text style={s.muted}>Current card valid until: {state.valid_until.slice(0, 10)}</Text>}<Text style={s.muted}>Renewal period: {state.renewal_period}</Text><Text style={s.muted}>Opens: {date(state.opens_at)} (PH)</Text><Text style={s.muted}>Deadline: {date(state.deadline)} (PH)</Text>{state.discount_expires_at && <Text style={s.muted}>Discount expires: {date(state.discount_expires_at)} (PH)</Text>}</View>
        {state.application && <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, gap: 6 }}>{pwd ? <><Text style={s.heading}>Submitted PWD ID</Text>{!!state.application.valid_until && <Text style={s.text}>Valid until {state.application.valid_until.slice(0, 10)}</Text>}</> : <><Text style={s.heading}>Submitted school details</Text><Text style={s.text}>{state.application.school_name}</Text><Text style={s.muted}>{state.application.education_level === "COLLEGE" ? "College" : `Grade ${state.application.grade_level ?? "—"}`} · {state.application.school_year}{state.application.enrollment_term ? ` · ${state.application.enrollment_term}` : ""}</Text></>}<Text style={s.muted}>Last submitted: {date(state.application.submitted_at)}</Text></View>}
        {state.application?.reason && <View style={{ borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 12, gap: 5 }}><Text style={{ color: colors.textPrimary, fontWeight: "700" }}>Review note</Text><Text style={s.text}>{state.application.reason}</Text>{state.application.correction_due_at && <Text style={{ color: colors.textSecondary }}>Correction deadline: {date(state.application.correction_due_at)} (PH)</Text>}</View>}
      </View>
      {state.can_submit ? <View style={s.card}>
        <Text style={s.heading}>{pwd ? (state.status === "NEEDS_CORRECTION" ? "Correct your PWD ID" : "Submit your renewed PWD ID") : state.status === "NEEDS_CORRECTION" ? "Correct your enrollment proof" : "Submit current enrollment proof"}</Text>
        {pwd && state.status === "NEEDS_CORRECTION" && <Text style={s.muted}>Your previous date is filled in below. Check it, then choose your corrected PWD ID.</Text>}
        {pwd ? <View style={{ gap: 6 }}><FeatureInput label="New valid until date" placeholder="YYYY-MM-DD" value={validUntil} maxLength={10} keyboardType="number-pad" inputMode="numeric" editable={!blocked} onChangeText={(value) => setValidUntil(formatRegistrationBirthdate(value))} /><Text style={validUntil.length === 10 && fieldsError ? s.error : s.muted}>{validUntil.length === 10 && fieldsError ? fieldsError : (state.valid_until ? `Must be later than your current card date (${formatCardDate(state.valid_until)}).` : "Enter the date printed on your renewed PWD ID.")}</Text></View> : <SchoolProofFields fields={fields} onChange={setFields} disabled={blocked} />}
        <Text style={s.muted}>{pwd ? "Upload a clear photo of your renewed PWD ID showing its valid-until date." : "Upload a clear school ID showing the current school year or enrollment proof."} JPG, PNG, WebP or PDF, maximum 5MB.</Text>
        <SupportingDocumentField document={document} label={picking ? "Choosing proof…" : pwd ? "Choose PWD ID" : "Choose enrollment proof"} disabled={blocked} onChoose={() => void choose()} onRemove={() => setDocument(null)} />
        <FeatureButton label={busy ? "Submitting…" : "Submit for verification"} disabled={blocked || !document || !!fieldsError} onPress={() => void perform(false)} />
      </View> : <Text style={s.muted}>{state.status === "PENDING" ? "Your submission is awaiting review. You cannot submit another application while it is pending." : "Submission is not currently available for this account or renewal period."}</Text>}
      {state.can_switch_to_regular && <>
        {state.status === "PENDING" && <Text style={s.muted}>Switching to Regular is unavailable while your {copy.proofShort} is being verified.</Text>}
        <FeatureButton secondary label={pwd ? "Switch to Regular" : "No longer a student — switch to Regular"} disabled={blocked || state.status === "PENDING"} onPress={() => setConfirmRegular(true)} />
      </>}
      <FeatureButton secondary label="Refresh renewal status" disabled={blocked} onPress={() => void onRefresh()} />
    </>}
    <Modal visible={confirmRegular} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmRegular(false); }}>
      <View style={{ flex: 1, backgroundColor: "#000B", justifyContent: "center", alignItems: "center", padding: 16 }}><ScrollView style={{ width: "100%", maxWidth: 448, maxHeight: "90%", flexGrow: 0, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }} contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={s.heading}>Switch to Regular?</Text><Text style={s.text}>Your {copy.discount} ends immediately and any pending renewal is cancelled. Your account, rides, and rewards remain available.</Text>
        <FeatureButton label="Confirm switch to Regular" disabled={busy} onPress={() => void perform(true)} />
        <FeatureButton label={pwd ? "Keep PWD account" : "Keep student account"} secondary disabled={busy} onPress={() => setConfirmRegular(false)} />
      </ScrollView></View>
    </Modal>
    </ScrollView>
  </View>;
}
