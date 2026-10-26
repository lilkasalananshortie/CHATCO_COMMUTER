import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { discountApplicationService } from "../../core/api/discount-application-service";
import { FeatureButton, useFeatureStyles } from "../../shared/ui/FeatureControls";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { ProfileIcon } from "../profile/ProfileIcon";
import { EMPTY_SCHOOL_FIELDS, SchoolProofFields } from "../student-renewal/SchoolProofFields";
import { pickRenewalDocument } from "../student-renewal/pick-renewal-document";
import type { RenewalDocument, RenewalFields } from "../student-renewal/renewal-types";
import { APPLICATION_LABELS, DISCOUNT_CATEGORIES, applicationPayload, canCancelApplication, type ApplicationState, type DiscountCategory } from "./application-types";

export function DiscountApplicationScreen({ state, loading, loadError, onRefresh, onClose, onOpenRenewal }: {
  state: ApplicationState | null; loading: boolean; loadError: string; onRefresh: () => Promise<void>; onClose: () => void; onOpenRenewal: () => void;
}) {
  const s = useFeatureStyles();
  const { colors, isLight } = useCommuterTheme();
  const [category, setCategory] = useState<DiscountCategory | "">("");
  const [fields, setFields] = useState<RenewalFields>(EMPTY_SCHOOL_FIELDS);
  const [document, setDocument] = useState<RenewalDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ title: string; body: string } | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Use the returned authoritative state immediately, before the follow-up GET completes.
  const [saved, setSaved] = useState<{ base: ApplicationState | null; state: ApplicationState } | null>(null);
  const current = saved?.base === state ? saved.state : state;
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const application = current?.application;
    setDocument(null);
    if (application?.request_type === "APPLICATION" && current?.status === "NEEDS_CORRECTION") {
      setCategory(application.requested_type);
      setFields({ school_name: application.school_name ?? "", education_level: application.education_level ?? "HIGH_SCHOOL", grade_level: String(application.grade_level ?? 7), school_year: application.school_year ?? "", enrollment_term: application.enrollment_term ?? "" });
    } else { setCategory(""); setFields(EMPTY_SCHOOL_FIELDS); }
  }, [current?.application?.id, current?.application?.revision, current?.status]);
  const choose = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const file = await pickRenewalDocument();
      if (file?.size != null && file.size > 5 * 1024 * 1024) throw new Error("Supporting proof must be 5MB or smaller.");
      if (mounted.current && file) setDocument(file);
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Unable to choose a document."); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const perform = async (cancel: boolean) => {
    if (pending.current || loading || !current || loadError) return;
    pending.current = true; setBusy(true); setError(""); setMessage(null);
    try {
      if (cancel && !canCancelApplication(current)) throw new Error("This application can no longer be cancelled. Refresh its status.");
      const result = cancel ? await discountApplicationService.cancel(current.application!.id)
        : await discountApplicationService.submit(applicationPayload(current, category, fields, document));
      if (!mounted.current) return;
      setSaved({ base: state, state: result }); setDocument(null); setConfirmCancel(false);
      setMessage(cancel
        ? { title: "Application cancelled", body: "You can start a new application at any time." }
        : { title: "Application submitted", body: "Your account stays Regular until an admin approves it." });
      await onRefresh();
    } catch (reason) {
      if (!mounted.current) return;
      setError(reason instanceof Error ? reason.message : "Unable to complete this request.");
      // Another device or Admin may have changed the revision or decision. Never retry a write automatically.
      if ([403, 404, 409].includes((reason as { status?: number }).status ?? 0)) await onRefresh();
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const blocked = busy || loading || !!loadError;
  const application = current?.application;
  const correction = current?.status === "NEEDS_CORRECTION";
  const renewal = application?.request_type === "RENEWAL";
  const requiresDocument = current?.document_required !== false;
  const categoryDetails: Record<DiscountCategory, string> = { STUDENT: "Current enrollment proof", PWD: "Valid PWD identification", SENIOR: "Valid senior citizen ID" };
  const statusColor = current?.status === "PENDING" ? (isLight ? "#0369A1" : "#BAE6FD")
    : current?.status === "NEEDS_CORRECTION" ? (isLight ? "#B45309" : "#FDE68A")
      : current?.status === "APPROVED" ? (isLight ? "#047857" : "#A7F3D0")
        : current?.status === "REJECTED" ? (isLight ? "#B91C1C" : "#FECACA") : colors.textSecondary;
  const requestTitle = renewal ? "Student renewal" : correction ? "Update your application"
    : application && current?.status !== "CANCELLED" ? `${DISCOUNT_CATEGORIES[application.requested_type]} application` : "Start an application";
  const formattedDate = application?.submitted_at ? new Date(application.submitted_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }) : "";
  const fieldLabel = { color: colors.textMuted, fontSize: 12 } as const;
  const fieldValue = { color: colors.textPrimary, fontSize: 14, fontWeight: "600" as const, marginTop: 4 };
  const separator = { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle } as const;
  const panel = { backgroundColor: isLight ? colors.surface : "rgba(255,255,255,0.035)", borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 18 } as const;
  return <KeyboardAvoidingView style={[s.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: isLight ? colors.surface : "#071A2E", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to home" disabled={busy} onPress={onClose} style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="arrow-back" size={18} color={isLight ? "#1A5FB4" : "#99C1F1"} /><Text style={{ color: isLight ? "#1A5FB4" : "#99C1F1", fontSize: 14 }}>Home</Text>
      </TouchableOpacity>
      <Text style={[s.title, { fontSize: 23, marginTop: 2 }]}>Discount Application</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 4 }}>Tell us which discount applies to you and send proof for verification.</Text>
    </View>
    <ScrollView contentContainerStyle={[s.content, { padding: 20, paddingBottom: 36, gap: 20 }]} keyboardShouldPersistTaps="handled">
      {loading && <View accessibilityLiveRegion="polite" style={{ minHeight: 180, justifyContent: "center", alignItems: "center", gap: 10 }}><ActivityIndicator color={isLight ? "#1A5FB4" : "#62A0EA"} /><Text style={s.muted}>Loading your application status...</Text></View>}
      {!!loadError && <View accessibilityLiveRegion="polite" style={{ backgroundColor: isLight ? "#FEF2F2" : "rgba(248,113,113,0.1)", borderColor: isLight ? "#FECACA" : "rgba(248,113,113,0.25)", borderWidth: 1, padding: 14, borderRadius: 12, gap: 10 }}><Text style={s.error}>{loadError}</Text><FeatureButton secondary label="Refresh status" disabled={busy} onPress={() => { setSaved(null); void onRefresh(); }} /></View>}
      {!!error && <Text accessibilityLiveRegion="polite" style={[s.error, { padding: 12, borderRadius: 10, backgroundColor: isLight ? "#FEF2F2" : "rgba(248,113,113,0.1)" }]}>{error}</Text>}
      {!!message && <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: isLight ? "#A7F3D0" : "#1F4D3D", backgroundColor: isLight ? "#ECFDF5" : "#0D2A22" }}>
        <ProfileIcon name="check" size={19} color={isLight ? "#059669" : "#34D399"} /><View style={{ flex: 1, gap: 3 }}><Text style={{ color: isLight ? "#065F46" : "#FFFFFF", fontWeight: "700" }}>{message.title}</Text><Text style={{ color: isLight ? "#047857" : "#A7D7C5", lineHeight: 21 }}>{message.body}</Text></View>
      </View>}
      {current && <View style={{ gap: 18 }}>
        <View style={[separator, { paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }]}>
          <View style={{ flex: 1 }}><Text style={fieldLabel}>YOUR REQUEST</Text><Text style={[s.heading, { marginTop: 5 }]}>{requestTitle}</Text></View>
          <View accessibilityLabel={`Status: ${APPLICATION_LABELS[current.status]}`} style={{ flexDirection: "row", gap: 6, alignItems: "center", flexShrink: 0 }}><ProfileIcon name={current.status === "APPROVED" ? "check" : current.status === "NEEDS_CORRECTION" ? "shield-alert" : current.status === "REJECTED" ? "x" : "clock"} size={16} color={statusColor} /><Text style={{ color: statusColor, fontSize: 13, fontWeight: "700" }}>{APPLICATION_LABELS[current.status] ?? current.status}</Text></View>
        </View>
        {application && <View style={[separator, { paddingBottom: 16, gap: 14 }]}>
          <View><Text style={fieldLabel}>Current account</Text><Text style={fieldValue}>{DISCOUNT_CATEGORIES[current.commuter_type as DiscountCategory] ?? "Regular"}</Text></View>
          <View><Text style={fieldLabel}>Submitted</Text><Text style={fieldValue}>{formattedDate}</Text></View>
          {application.requested_type === "STUDENT" && <><View><Text style={fieldLabel}>School</Text><Text style={fieldValue}>{application.school_name ?? "—"}</Text></View><View><Text style={fieldLabel}>Education</Text><Text style={fieldValue}>{application.education_level === "COLLEGE" ? "College" : `Grade ${application.grade_level ?? "—"}`} · {application.school_year ?? "School year not provided"}</Text></View></>}
        </View>}
        {!!application?.reason && <View style={{ borderRadius: 12, borderWidth: 1, borderColor: isLight ? "#FDE68A" : "rgba(253,230,138,0.25)", backgroundColor: isLight ? "#FFFBEB" : "rgba(253,230,138,0.08)", padding: 14, gap: 5 }}><Text style={{ color: isLight ? "#92400E" : "#FDE68A", fontWeight: "700" }}>Note from the reviewer</Text><Text style={s.text}>{application.reason}</Text></View>}
        {correction && <View style={{ gap: 10 }}><Text style={{ color: isLight ? "#92400E" : "#FDE68A", lineHeight: 21 }}>Send your corrected supporting document below whenever you are ready. The discount category cannot be changed for this request; to apply under a different category, cancel this application first.</Text>{canCancelApplication(current) && <FeatureButton secondary label="Cancel application" disabled={blocked} onPress={() => setConfirmCancel(true)} />}</View>}
        {renewal ? <View style={[panel, { gap: 12 }]}><Text style={s.text}>You have an outstanding Student renewal. Complete that request before starting a new discount application.</Text><FeatureButton label="View Student renewal" disabled={busy} onPress={onOpenRenewal} /></View>
          : current.can_submit && !loadError ? <View style={{ gap: 20 }}>
            <View>
              <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 15 }}>{correction ? "Application category" : "Choose your discount category"}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 }}>
                {(Object.keys(DISCOUNT_CATEGORIES) as DiscountCategory[]).map((value) => {
                  const selected = category === value;
                  return <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: blocked || correction }} disabled={blocked || correction} onPress={() => { setCategory(value); setFields(EMPTY_SCHOOL_FIELDS); setDocument(null); setError(""); }} style={{ flex: 1, minWidth: 96, minHeight: 104, justifyContent: "space-between", gap: 10, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: selected ? (isLight ? "#1A5FB4" : "#62A0EA") : colors.border, backgroundColor: selected ? (isLight ? "#EAF3FF" : "rgba(26,95,180,0.2)") : (isLight ? colors.surface : "rgba(255,255,255,0.03)"), opacity: blocked || correction ? 0.7 : 1 }}>
                    <Ionicons name={value === "STUDENT" ? "school-outline" : value === "PWD" ? "accessibility-outline" : "id-card-outline"} size={20} color={selected ? (isLight ? "#1A5FB4" : "#99C1F1") : colors.textMuted} />
                    <View><Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 14 }}>{DISCOUNT_CATEGORIES[value]}</Text><Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 3 }}>{categoryDetails[value]}</Text></View>
                  </TouchableOpacity>;
                })}
              </View>
            </View>
            {!!category && <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18, gap: 14 }}>
              <View><Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700" }}>Supporting document</Text><Text style={[s.muted, { marginTop: 5 }]}>{requiresDocument ? category === "STUDENT" ? "Use a school ID showing the current school year or another document proving current enrollment." : `Upload your ${DISCOUNT_CATEGORIES[category]} ID/card. The name should match your verified commuter account.` : "Document upload is disabled for local workflow testing. No file will be sent or stored."}</Text></View>
              {category === "STUDENT" && <SchoolProofFields fields={fields} onChange={setFields} disabled={blocked} />}
              {requiresDocument && <><Text style={fieldLabel}>{category === "STUDENT" ? "Enrollment proof" : `${DISCOUNT_CATEGORIES[category]} ID/card`} · JPG, PNG, WebP or PDF · max 5 MB</Text><FeatureButton secondary label={document ? `Replace: ${document.name}` : "Choose supporting document"} disabled={blocked} onPress={() => void choose()} /></>}
            </View>}
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: isLight ? "rgba(26,95,180,0.2)" : "rgba(98,160,234,0.2)", backgroundColor: isLight ? "#F0F7FF" : "rgba(98,160,234,0.07)" }}><ProfileIcon name="shield-check" size={19} color={isLight ? "#1A5FB4" : "#99C1F1"} /><Text style={[s.text, { flex: 1, fontSize: 13 }]}>Your fare stays Regular while the team checks your document. Once approved, your new classification is used by the existing fare discount process. Student discounts require annual renewal.</Text></View>
            <FeatureButton label={busy ? "Submitting..." : correction ? "Submit corrected documents" : "Submit application"} disabled={blocked || !category || (requiresDocument && !document)} onPress={() => { setError(""); setConfirmSubmit(true); }} />
          </View>
          : <View style={{ gap: 14, paddingVertical: 8 }}>
            <Text style={s.text}>{current.status === "PENDING" ? "Your supporting document is being verified. Your account stays Regular until approval. We will send the result to Rewards & Updates." : current.status === "APPROVED" ? "Your discount application was approved. Your current commuter classification is shown above." : "New discount applications are available to active Regular commuter accounts."}</Text>
            {current.commuter_type === "STUDENT" && current.discount_expires_at && <View style={{ gap: 8 }}><Text style={s.muted}>Your Student discount expires {new Date(current.discount_expires_at).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" })} Philippine time.</Text><TouchableOpacity accessibilityRole="button" onPress={onOpenRenewal} style={{ minHeight: 40, justifyContent: "center" }}><Text style={{ color: isLight ? "#1A5FB4" : "#99C1F1", textDecorationLine: "underline", fontWeight: "700" }}>View annual renewal</Text></TouchableOpacity></View>}
            {canCancelApplication(current) && <FeatureButton secondary label="Cancel application" disabled={blocked} onPress={() => setConfirmCancel(true)} />}
            <TouchableOpacity accessibilityRole="button" disabled={busy || loading} onPress={() => { setSaved(null); void onRefresh(); }} style={{ minHeight: 42, flexDirection: "row", alignItems: "center", gap: 7 }}><Text style={{ color: isLight ? "#1A5FB4" : "#99C1F1", fontWeight: "700", fontSize: 14 }}>Refresh status</Text><Ionicons name="arrow-forward" size={15} color={isLight ? "#1A5FB4" : "#99C1F1"} /></TouchableOpacity>
          </View>}
      </View>}
      <View style={[panel, { gap: 17 }]}>
        <Text style={{ color: isLight ? "#1A5FB4" : "#99C1F1", fontSize: 12, fontWeight: "800", letterSpacing: 1 }}>WHAT HAPPENS NEXT</Text>
        {[ ["01", "Send your proof", "Choose the category and upload a clear document."], ["02", "Admin verification", "A reviewer checks that the document is valid."], ["03", "Classification update", "If approved, the discount is applied to future eligible fares."] ].map(([number, title, description], index) => {
          const step = current?.status === "APPROVED" ? 3 : current?.status === "PENDING" ? 1 : 0;
          const done = index < step;
          return <View key={number} style={{ flexDirection: "row", gap: 13 }}><View style={{ width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: done ? "#1A5FB4" : colors.border, backgroundColor: done ? "#1A5FB4" : "transparent", justifyContent: "center", alignItems: "center" }}>{done ? <ProfileIcon name="check" size={14} color="#FFFFFF" /> : <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "700" }}>{number}</Text>}</View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700" }}>{title}</Text><Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>{description}</Text></View></View>;
        })}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, gap: 8 }}><Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.7 }}>BEFORE YOU SUBMIT</Text><Text style={s.muted}>• Use a clear, complete photo or PDF.</Text><Text style={s.muted}>• Files must be JPG, PNG, WebP, or PDF and no larger than 5 MB.</Text><Text style={s.muted}>• Only authorized reviewers can access your document.</Text></View>
      </View>
    </ScrollView>
    <Modal visible={confirmSubmit} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmSubmit(false); }}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 24 }}><View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 20 }]}>
        <Text style={s.heading}>{correction ? "Submit corrected documents?" : "Submit discount application?"}</Text>
        <Text style={s.text}>You are applying for the {category ? DISCOUNT_CATEGORIES[category] : "selected"} commuter discount. The details and document will be sent to an admin for verification. Your account remains Regular until approval.</Text>
        {!requiresDocument && <Text style={s.muted}>Local workflow testing only: no document will be sent or stored.</Text>}
        {document && <Text numberOfLines={1} style={s.muted}>Document: {document.name}</Text>}
        <FeatureButton secondary label="Go back" disabled={busy} onPress={() => setConfirmSubmit(false)} />
        <FeatureButton label={busy ? "Submitting..." : "Confirm submission"} disabled={busy} onPress={() => { setConfirmSubmit(false); void perform(false); }} />
      </View></View>
    </Modal>
    <Modal visible={confirmCancel} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmCancel(false); }}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 24 }}><View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 20 }]}>
        <Text style={s.heading}>Cancel this application?</Text>
        <Text style={s.text}>Your {application ? DISCOUNT_CATEGORIES[application.requested_type] : ""} application will be withdrawn and will not be reviewed. Your account stays Regular. You can start a new application, in any category, at any time.</Text>
        {!!error && <Text style={s.error}>{error}</Text>}
        <FeatureButton secondary label="Keep application" disabled={busy} onPress={() => setConfirmCancel(false)} />
        <FeatureButton label={busy ? "Cancelling..." : "Cancel application"} disabled={blocked} onPress={() => void perform(true)} />
      </View></View>
    </Modal>
  </KeyboardAvoidingView>;
}
