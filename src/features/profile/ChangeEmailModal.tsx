import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "../../shared/ui/BrandText";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { emailChangeService, type EmailChangeState } from "../../core/api/email-change-service";
import { ProfileIcon } from "./ProfileIcon";

type VerifyMethod = "email" | "password";

function maskEmail(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const name = email.slice(0, at);
  return `${name[0]}******${name.length > 1 ? name.slice(-1) : ""}${email.slice(at)}`;
}

export function ChangeEmailModal({ visible, currentEmail, onClose, onChanged }: {
  visible: boolean; currentEmail: string; onClose: () => void; onChanged: (email: string) => void;
}) {
  const { isLight = false } = useCommuterTheme();
  const styles = createStyles(isLight);
  const [state, setState] = useState<EmailChangeState | null>(null);
  const [method, setMethod] = useState<VerifyMethod>("email");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [updatedEmail, setUpdatedEmail] = useState<string | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const receivedAt = useRef(Date.now());
  const alive = useRef(true);

  const apply = (next: EmailChangeState) => {
    if (!alive.current) return;
    receivedAt.current = Date.now();
    setElapsed(0);
    setState(next);
    if (next.flow?.new_email) setEmail(next.flow.new_email);
  };

  useEffect(() => {
    const current = ++generation.current;
    if (!visible) return;
    alive.current = true;
    setState(null); setError(""); setCode(""); setPassword(""); setEmail(""); setUpdatedEmail(null); setBusy(true);
    void emailChangeService.state().then(value => { if (generation.current === current) apply(value); })
      .catch(reason => { if (generation.current === current) setError(reason?.message ?? "Could not load email settings. Please try again."); })
      .finally(() => { if (generation.current === current) setBusy(false); });
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - receivedAt.current) / 1000)), 1000);
    return () => { alive.current = false; generation.current++; clearInterval(timer); };
  }, [visible]);

  const run = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    const current = generation.current;
    try { await operation(); }
    catch (reason) {
      if (current === generation.current) {
        const failure = reason as { message?: string; response?: { data?: { errors?: Record<string, string[]> } } };
        setError(Object.values(failure.response?.data?.errors ?? {}).flat()[0] ?? failure.message ?? "Something went wrong. Please try again.");
        try { const latest = await emailChangeService.state(); if (current === generation.current) apply(latest); } catch { /* Preserve the action error if offline. */ }
      }
    } finally { lock.current = false; if (current === generation.current) setBusy(false); }
  };

  const flow = state?.flow;
  const step = updatedEmail ? "success" : flow?.step ?? "identity";
  const progress = step === "identity" ? 0 : step === "email" ? 1 : step === "verify" ? 2 : 3;
  const oldWait = Math.max(0, (state?.old_resend_in_seconds ?? 0) - elapsed);
  const newWait = Math.max(0, (state?.new_resend_in_seconds ?? 0) - elapsed);
  const passwordWait = Math.max(0, (state?.password_retry_after ?? 0) - elapsed);
  const blocked = !!state?.blocked_until && Date.parse(state.blocked_until) > Date.now();
  const expired = !!flow && Date.parse(flow.expires_at) <= Date.parse(state!.server_now) + elapsed * 1000;
  const title = step === "success" ? "Email updated" : step === "identity" ? "Change email" : step === "email" ? "Enter your new email" : "Verify your new email";
  const remaining = (flow?.step === "verify" ? newWait : oldWait);

  const beginFlow = async () => {
    const next = await emailChangeService.start();
    apply(next);
    return next.flow!.id;
  };
  const submitIdentity = () => void run(async () => {
    const id = flow?.id ?? await beginFlow();
    if (method === "email" && !flow?.old_code_sent) {
      apply(await emailChangeService.sendCode(id, "old"));
      setCode("");
      return;
    }
    const value = method === "email" ? code.trim() : password;
    apply(await emailChangeService.verify(id, method, value));
    setPassword(""); setCode("");
  });
  const submit = () => {
    if (busy || blocked || expired) return;
    if (step === "identity") { submitIdentity(); return; }
    if (step === "email" && flow) void run(async () => { apply(await emailChangeService.sendCode(flow.id, "new", email.trim())); setCode(""); });
    if (step === "verify" && flow) void run(async () => {
      const result = await emailChangeService.confirm(flow.id, code.trim());
      setUpdatedEmail(result.email);
      onChanged(result.email);
    });
  };
  const cancel = () => {
    if (!flow) { onClose(); return; }
    void run(async () => { await emailChangeService.cancel(flow.id); onClose(); });
  };
  const close = () => { if (!busy && !lock.current) onClose(); };
  const buttonLabel = busy ? "Working..." : step === "identity" ? method === "email" && !flow?.old_code_sent ? oldWait ? `Wait ${oldWait}s` : "Send code" : "Continue" : step === "email" ? "Send code" : "Confirm";
  const startAgain = () => void run(async () => { apply(await emailChangeService.start()); setCode(""); setPassword(""); });

  return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
      <Pressable accessibilityLabel="Close change email dialog" style={StyleSheet.absoluteFill} onPress={close} />
      <View style={styles.panel} accessibilityViewIsModal>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <ProfileIcon name={step === "success" ? "check" : "mail"} size={27} color={isLight ? "#1A5FB4" : "#99C1F1"} />
            <View style={styles.headerCopy}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{step === "success" ? "Your new address is verified and saved." : "Keep your account secure at every step."}</Text></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close change email" disabled={busy} onPress={close} style={styles.close}><ProfileIcon name="x" size={20} color={isLight ? "#6B7280" : "rgba(255,255,255,0.55)"} /></Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View accessibilityLabel="Email change progress" style={styles.steps}>
            {["Your identity", "New address", "Verify email"].map((label, index) => <View key={label} style={styles.stepItem}>
              <View style={[styles.stepCircle, progress === index && styles.stepCurrent, progress > index && styles.stepDone]}>{progress > index ? <ProfileIcon name="check" size={13} color={isLight ? "#1A5FB4" : "#99C1F1"} /> : <Text style={[styles.stepNumber, progress === index && styles.stepNumberCurrent]}>{index + 1}</Text>}</View>
              <Text style={[styles.stepLabel, progress >= index && styles.stepLabelActive]}>{label}</Text>
            </View>)}
          </View>
          {busy && !state ? <View style={styles.loading}><ActivityIndicator size="small" color="#62A0EA" /><Text style={styles.loadingText}>Loading email settings...</Text></View> : null}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {blocked && <Text accessibilityRole="alert" style={styles.warning}>You&apos;ve reached the daily limit. Try again after {new Date(state!.blocked_until!).toLocaleString()}.</Text>}
          {expired && <Text accessibilityRole="alert" style={styles.warning}>Your verification session has expired. Start again to continue.</Text>}
          {step === "success" ? <View>
            <Text style={styles.bodyText}>Your registered email is now</Text>
            <Text style={styles.successEmail}>{updatedEmail}</Text>
            <Text style={styles.bodyText}>Use this address for sign-in and account messages. A security notification has been requested for your previous address.</Text>
          </View> : !state ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => apply(await emailChangeService.state()))} style={[styles.primary, busy && styles.disabled]}>{busy && <ActivityIndicator size="small" color="#FFFFFF" />}<Text style={styles.primaryText}>{busy ? "Loading..." : "Try again"}</Text></Pressable> : !flow ? <View>
            <Text style={styles.caption}>Currently registered email</Text><Text style={styles.bodyText}>{maskEmail(currentEmail)}</Text>
            <Text style={styles.bodyTextSpaced}>Confirm it&apos;s you using a code sent to your current email or your current password.</Text>
            <View style={styles.methodRow}>{(["email", "password"] as const).map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: method === option }} disabled={busy} onPress={() => { setMethod(option); setCode(""); setPassword(""); setError(""); }} style={[styles.methodButton, method === option && styles.methodSelected]}><ProfileIcon name={option === "email" ? "mail" : "key"} size={16} color={isLight ? "#1A5FB4" : "#99C1F1"} /><Text style={[styles.methodText, method === option && styles.methodTextSelected]}>{option === "email" ? "Email code" : "Password"}</Text></Pressable>)}</View>
            {method === "email" ? <View style={styles.notice}><Text style={styles.noticeText}>We&apos;ll send a six-digit code to your currently registered email. It expires in 15 minutes.</Text></View> : <View>
              <Text style={styles.label}>Current password</Text>
              <View style={styles.passwordInputWrap}><TextInput accessibilityLabel="Current password" autoComplete="current-password" value={password} onChangeText={value => { setPassword(value); setError(""); }} editable={!busy && passwordWait === 0} secureTextEntry={!showPassword} maxLength={1024} style={styles.input} />
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} onPress={() => setShowPassword(value => !value)} style={styles.eye}><Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text></Pressable></View>
              {passwordWait > 0 && <Text style={styles.warning}>Password verification is temporarily locked. Try again in {Math.ceil(passwordWait / 60)} minutes or use an email code.</Text>}
            </View>}
          </View> : step === "identity" ? <View>
            <Text style={styles.caption}>Currently registered email</Text><Text style={styles.bodyText}>{maskEmail(flow?.current_email ?? currentEmail)}</Text>
            <Text style={styles.bodyTextSpaced}>Confirm it&apos;s you using a code sent to your current email or your current password.</Text>
            <View style={styles.methodRow}>{(["email", "password"] as const).map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: method === option }} disabled={busy} onPress={() => { setMethod(option); setCode(""); setPassword(""); setError(""); }} style={[styles.methodButton, method === option && styles.methodSelected]}><ProfileIcon name={option === "email" ? "mail" : "key"} size={16} color={isLight ? "#1A5FB4" : "#99C1F1"} /><Text style={[styles.methodText, method === option && styles.methodTextSelected]}>{option === "email" ? "Email code" : "Password"}</Text></Pressable>)}</View>
            {method === "password" ? <View>
              <Text style={styles.label}>Current password</Text><View style={styles.passwordInputWrap}><TextInput accessibilityLabel="Current password" autoComplete="current-password" value={password} onChangeText={value => { setPassword(value); setError(""); }} editable={!busy && passwordWait === 0} secureTextEntry={!showPassword} maxLength={1024} style={styles.input} />
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} onPress={() => setShowPassword(value => !value)} style={styles.eye}><Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text></Pressable></View>
              {passwordWait > 0 && <Text style={styles.warning}>Password verification is temporarily locked. Try again in {Math.ceil(passwordWait / 60)} minutes or use an email code.</Text>}
            </View> : flow?.old_code_sent ? <View>
              <Text style={styles.label}>Verification code</Text><TextInput accessibilityLabel="Current email verification code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={value => setCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" placeholderTextColor={isLight ? "#9CA3AF" : "rgba(255,255,255,0.3)"} style={[styles.input, styles.codeInput]} />
              <Text style={styles.help}>{"Enter the six-digit code sent to your current email."}</Text>
              <Pressable disabled={busy || oldWait > 0} onPress={() => { if (flow) void run(async () => apply(await emailChangeService.sendCode(flow.id, "old"))); }} style={styles.textAction}><Text style={styles.textActionLabel}>{oldWait > 0 ? `Resend in ${oldWait}s` : "Resend code"}</Text></Pressable>
            </View> : <View style={styles.notice}><Text style={styles.noticeText}>We&apos;ll send a six-digit code to your currently registered email. It expires in 15 minutes.</Text></View>}
          </View> : step === "email" ? <View>
            <View style={styles.verified}><ProfileIcon name="shield-check" size={16} color="#34D399" /><Text style={styles.verifiedText}>Account ownership verified</Text></View>
            <Text style={styles.label}>New email address</Text><TextInput accessibilityLabel="New email address" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={value => { setEmail(value); setError(""); }} placeholder="yourname@gmail.com" placeholderTextColor={isLight ? "#9CA3AF" : "rgba(255,255,255,0.3)"} style={styles.input} />
            <Text style={styles.help}>We&apos;ll send a verification code to this address. Your registered email stays the same until you confirm the code.</Text>
            {newWait > 0 && <Text style={styles.help}>You can request another code in {newWait}s.</Text>}
          </View> : <View>
            <Text style={styles.bodyText}>Enter the six-digit code sent to</Text><Text style={styles.emailAddress}>{flow?.new_email}</Text>
            <Pressable disabled={busy} onPress={() => { setState(current => current ? { ...current, flow: current.flow ? { ...current.flow, step: "email" } : null } : current); setCode(""); }} style={styles.textAction}><Text style={styles.textActionLabel}>Change address</Text></Pressable>
            <Text style={styles.label}>Verification code</Text><TextInput accessibilityLabel="New email verification code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={value => setCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" placeholderTextColor={isLight ? "#9CA3AF" : "rgba(255,255,255,0.3)"} style={[styles.input, styles.codeInput]} />
            <Text style={styles.help}>Only the most recently sent code can be used.</Text>
            <Pressable disabled={busy || newWait > 0} onPress={() => { if (flow) void run(async () => apply(await emailChangeService.sendCode(flow.id, "new", flow.new_email ?? undefined))); }} style={styles.textAction}><Text style={styles.textActionLabel}>{newWait > 0 ? `Resend in ${newWait}s` : "Resend code"}</Text></Pressable>
          </View>}
          {step !== "success" && flow && <Text style={styles.footnote}>Up to 3 email change requests in 24 hours. Canceled requests count toward this limit. Closing this window keeps your current request available.</Text>}
        </ScrollView>
        <View style={styles.footer}>
          {step === "success" ? <Pressable onPress={close} style={styles.primary}><Text style={styles.primaryText}>Done</Text></Pressable> : expired ? <Pressable accessibilityRole="button" disabled={busy} onPress={startAgain} style={styles.primary}>{busy && <ActivityIndicator size="small" color="#FFFFFF" />}<Text style={styles.primaryText}>Start again</Text></Pressable> : <>
            <Pressable accessibilityRole="button" disabled={busy} onPress={cancel} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={busy || blocked || expired || (step === "identity" ? method === "password" ? !password || passwordWait > 0 : !!flow?.old_code_sent ? code.length !== 6 : oldWait > 0 : step === "email" ? !email.trim() || newWait > 0 : code.length !== 6)} onPress={submit} style={[styles.primary, (busy || blocked || expired) && styles.disabled]}>
              {busy && <ActivityIndicator size="small" color="#FFFFFF" />}<Text style={styles.primaryText}>{buttonLabel}</Text>
            </Pressable>
          </>}
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function createStyles(isLight: boolean) {
  const text = isLight ? "#111827" : "#FFFFFF";
  const muted = isLight ? "#6B7280" : "rgba(255,255,255,0.55)";
  const border = isLight ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
    panel: { width: "100%", maxHeight: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: border, backgroundColor: isLight ? "#FFFFFF" : "#071A2E", overflow: "hidden" },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: border },
    headerMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 12 },
    headerCopy: { flex: 1, minWidth: 0 },
    title: { color: text, fontSize: 20, lineHeight: 26, fontWeight: "700" },
    subtitle: { color: muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
    close: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: isLight ? "#FFFFFF" : "rgba(255,255,255,0.04)" },
    scroll: { flexShrink: 1 }, content: { padding: 20, paddingBottom: 16 },
    steps: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 20 },
    stepItem: { flex: 1, alignItems: "center", gap: 6 },
    stepCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: border },
    stepCurrent: { borderColor: "#62A0EA", backgroundColor: "#1A5FB4" },
    stepDone: { borderColor: "rgba(98,160,234,0.3)", backgroundColor: "rgba(98,160,234,0.1)" },
    stepNumber: { color: muted, fontSize: 12 }, stepNumberCurrent: { color: "#FFFFFF" },
    stepLabel: { color: muted, fontSize: 10, lineHeight: 14, textAlign: "center" }, stepLabelActive: { color: isLight ? "#1A5FB4" : "#99C1F1" },
    loading: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 24 }, loadingText: { color: muted, fontSize: 14 },
    error: { color: isLight ? "#B91C1C" : "#FCA5A5", backgroundColor: isLight ? "#FEF2F2" : "rgba(239,68,68,0.1)", borderColor: isLight ? "#FECACA" : "rgba(239,68,68,0.3)", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 14, lineHeight: 20 },
    warning: { color: isLight ? "#92400E" : "#FCD34D", backgroundColor: isLight ? "#FFFBEB" : "rgba(245,158,11,0.1)", borderRadius: 12, padding: 12, marginVertical: 8, fontSize: 13, lineHeight: 19 },
    caption: { color: muted, fontSize: 12 }, bodyText: { color: isLight ? "#4B5563" : "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 21, marginTop: 4 }, bodyTextSpaced: { color: isLight ? "#4B5563" : "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 21, marginTop: 16 },
    methodRow: { flexDirection: "row", gap: 8, marginVertical: 16 }, methodButton: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: border, paddingHorizontal: 10 }, methodSelected: { borderColor: "rgba(98,160,234,0.4)", backgroundColor: "rgba(98,160,234,0.1)" }, methodText: { color: muted, fontSize: 14, fontWeight: "500" }, methodTextSelected: { color: isLight ? "#1A5FB4" : "#99C1F1" },
    notice: { padding: 16, borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: isLight ? "#F9FAFB" : "#050F1A" }, noticeText: { color: muted, fontSize: 14, lineHeight: 21 },
    label: { color: isLight ? "#374151" : "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 20, fontWeight: "500", marginBottom: 8, marginTop: 8 }, input: { minHeight: 48, borderWidth: 1, borderColor: border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: text, backgroundColor: isLight ? "#FFFFFF" : "#050F1A", fontSize: 16 },
    passwordInputWrap: { position: "relative", justifyContent: "center" }, eye: { position: "absolute", right: 4, height: 44, minWidth: 48, alignItems: "center", justifyContent: "center" }, eyeText: { color: isLight ? "#6B7280" : "rgba(255,255,255,0.55)", fontSize: 12 },
    codeInput: { textAlign: "center", letterSpacing: 5, fontSize: 18 }, help: { color: muted, fontSize: 12, lineHeight: 18, marginTop: 10 }, textAction: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 4 }, textActionLabel: { color: isLight ? "#1A5FB4" : "#99C1F1", fontSize: 14, fontWeight: "500" },
    verified: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }, verifiedText: { color: isLight ? "#047857" : "#6EE7B7", fontSize: 12, fontWeight: "500" }, emailAddress: { color: text, fontSize: 14, fontWeight: "600", marginTop: 4 }, successEmail: { color: isLight ? "#065F46" : "#A7F3D0", backgroundColor: isLight ? "#ECFDF5" : "rgba(16,185,129,0.1)", borderWidth: 1, borderColor: isLight ? "#A7F3D0" : "rgba(16,185,129,0.2)", borderRadius: 12, padding: 16, fontSize: 16, fontWeight: "600", marginTop: 8 }, footnote: { color: isLight ? "#9CA3AF" : "rgba(255,255,255,0.35)", fontSize: 11, lineHeight: 16, marginTop: 16 },
    footer: { flexDirection: "row", gap: 12, padding: 20, paddingBottom: 24, borderTopWidth: 1, borderTopColor: border, backgroundColor: isLight ? "#F9FAFB" : "#0B223A" }, secondary: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: border, paddingHorizontal: 16 }, secondaryText: { color: isLight ? "#374151" : "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600" }, primary: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: "#1A5FB4", paddingHorizontal: 16 }, primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" }, disabled: { opacity: 0.5 },
  });
}
