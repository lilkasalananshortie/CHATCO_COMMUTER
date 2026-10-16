import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from "react-native";
import { discountApplicationService } from "../../core/api/discount-application-service";
import { FeatureButton, featureStyles as s } from "../../shared/ui/FeatureControls";
import { EMPTY_SCHOOL_FIELDS, SchoolProofFields } from "../student-renewal/SchoolProofFields";
import { pickRenewalDocument } from "../student-renewal/pick-renewal-document";
import type { RenewalDocument, RenewalFields } from "../student-renewal/renewal-types";
import { APPLICATION_LABELS, DISCOUNT_CATEGORIES, applicationPayload, canCancelApplication, type ApplicationState, type DiscountCategory } from "./application-types";

export function DiscountApplicationScreen({ state, loading, loadError, onRefresh, onClose, onOpenRenewal }: {
  state: ApplicationState | null; loading: boolean; loadError: string; onRefresh: () => Promise<void>; onClose: () => void; onOpenRenewal: () => void;
}) {
  const [category, setCategory] = useState<DiscountCategory | "">("");
  const [fields, setFields] = useState<RenewalFields>(EMPTY_SCHOOL_FIELDS);
  const [document, setDocument] = useState<RenewalDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      if (cancel && !canCancelApplication(current)) throw new Error("This application can no longer be cancelled. Refresh its status.");
      const result = cancel ? await discountApplicationService.cancel(current.application!.id)
        : await discountApplicationService.submit(applicationPayload(current, category, fields, document));
      if (!mounted.current) return;
      setSaved({ base: state, state: result }); setDocument(null); setConfirmCancel(false);
      setMessage(cancel ? "Application cancelled. Your account and ride history are unchanged." : "Application submitted for review. Your account remains Regular until Admin approves it.");
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
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <FeatureButton secondary label="Back to Profile" disabled={busy} onPress={onClose} />
      <Text style={s.title}>Discount Application</Text>
      <Text style={s.muted}>Apply for a verified discount. Submitting documents does not approve your account or change existing ride fares.</Text>
      {loading && <ActivityIndicator color="#62A0EA" />}
      {!!loadError && <Text accessibilityLiveRegion="polite" style={s.error}>{loadError}</Text>}
      {!!error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={{ color: "#34D399", lineHeight: 22 }}>{message}</Text>}
      {current && <View style={s.card}>
        <Text style={s.heading}>{APPLICATION_LABELS[current.status] ?? current.status}</Text>
        <Text style={s.text}>Current category: {current.commuter_type}</Text>
        <Text style={s.text}>Current fare category: {current.effective_fare_type}</Text>
        {application && <Text style={s.text}>Request: {DISCOUNT_CATEGORIES[application.requested_type]} {renewal ? "renewal" : "application"}</Text>}
        {!!application?.reason && <Text style={s.text}>Review note: {application.reason}</Text>}
        {renewal && <FeatureButton label="Open Student Renewal" disabled={busy} onPress={onOpenRenewal} />}
        {!current.can_submit && !renewal && <Text style={s.muted}>{current.status === "PENDING" ? "Your application is awaiting review." : "New applications are available only to eligible Regular accounts."}</Text>}
      </View>}
      {current?.can_submit && !renewal && !loadError && <View style={s.card}>
        <Text style={s.heading}>{correction ? "Correct your application" : "Choose your discount"}</Text>
        {correction && <Text style={s.muted}>Corrections have no deadline. To change category, cancel this application and start a new one.</Text>}
        <View style={s.row}>{(Object.keys(DISCOUNT_CATEGORIES) as DiscountCategory[]).map((value) => <FeatureButton key={value} label={DISCOUNT_CATEGORIES[value]} secondary={category !== value} disabled={blocked || correction} onPress={() => { setCategory(value); setFields(EMPTY_SCHOOL_FIELDS); setDocument(null); setError(""); }} />)}</View>
        {category === "STUDENT" && <SchoolProofFields fields={fields} onChange={setFields} disabled={blocked} />}
        {!!category && <>
          <Text style={s.muted}>{requiresDocument ? category === "STUDENT" ? "Upload current enrollment proof or a school ID showing the school year. JPG, PNG, WebP or PDF, maximum 5MB." : `Upload your ${DISCOUNT_CATEGORIES[category]} ID/card matching your verified account. JPG, PNG, WebP or PDF, maximum 5MB.` : "Local workflow testing: no document will be uploaded or stored."}</Text>
          {requiresDocument && <FeatureButton secondary label={document ? `Replace: ${document.name}` : "Choose supporting document"} disabled={blocked} onPress={() => void choose()} />}
          <FeatureButton label={busy ? "Submitting..." : correction ? "Submit corrected application" : "Submit for verification"} disabled={blocked || (requiresDocument && !document)} onPress={() => void perform(false)} />
        </>}
      </View>}
      {current && canCancelApplication(current) && <FeatureButton secondary label="Cancel application" disabled={blocked} onPress={() => setConfirmCancel(true)} />}
      <FeatureButton secondary label="Refresh application status" disabled={busy || loading} onPress={() => { setSaved(null); void onRefresh(); }} />
    </ScrollView>
    <Modal visible={confirmCancel} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmCancel(false); }}>
      <View style={{ flex: 1, backgroundColor: "#000B", justifyContent: "center", padding: 24 }}><View style={s.card}>
        <Text style={s.heading}>Cancel this application?</Text>
        <Text style={s.text}>Your open discount request will be withdrawn. Your account stays Regular. You can apply again under another category.</Text>
        {!!error && <Text style={s.error}>{error}</Text>}
        <FeatureButton label="Confirm cancellation" disabled={blocked} onPress={() => void perform(true)} />
        <FeatureButton secondary label="Keep application" disabled={busy} onPress={() => setConfirmCancel(false)} />
      </View></View>
    </Modal>
  </KeyboardAvoidingView>;
}
