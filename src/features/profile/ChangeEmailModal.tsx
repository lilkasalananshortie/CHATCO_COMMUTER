import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput } from "react-native";
import { emailChangeService, type EmailChangeState } from "../../core/api/email-change-service";

export function ChangeEmailModal({ visible, onClose, onChanged }: {
  visible: boolean; onClose: () => void; onChanged: (email: string) => void;
}) {
  const [state, setState] = useState<EmailChangeState | null>(null);
  const [method, setMethod] = useState<"email" | "password">("email");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const lock = useRef(false);
  const generation = useRef(0);
  const receivedAt = useRef(Date.now());
  const alive = useRef(true);
  const apply = (next: EmailChangeState) => { if (alive.current) { receivedAt.current = Date.now(); setElapsed(0); setState(next); } };
  useEffect(() => {
    const current = ++generation.current;
    if (!visible) return;
    alive.current = true;
    setState(null); setError(""); setCode(""); setPassword(""); setEmail(""); setBusy(true);
    void emailChangeService.state().then(value => { if (generation.current === current) apply(value); })
      .catch(reason => { if (generation.current === current) setError(reason.message); })
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
        setError(Object.values(failure.response?.data?.errors ?? {}).flat()[0] ?? failure.message ?? "Please try again.");
        // Refresh durable budgets, cooldowns and expiry after a rejected action.
        try {
          const next = await emailChangeService.state();
          if (current === generation.current && next) apply(next);
        } catch { /* Keep the original action error during connectivity failure. */ }
      }
    } finally { lock.current = false; if (current === generation.current) setBusy(false); }
  };
  const flow = state?.flow;
  const wait = Math.max(0, (flow?.step === "verify" ? state?.new_resend_in_seconds : state?.old_resend_in_seconds) ?? 0) - elapsed;
  const button = (label: string, action: () => Promise<void>, disabled = false) => (
    <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={() => void run(action)}
      style={{ padding: 14, marginTop: 10, borderRadius: 12, backgroundColor: "#1A5FB4", opacity: busy || disabled ? 0.45 : 1 }}>
      <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
  const input = { color: "white", backgroundColor: "#142B40", borderRadius: 10, padding: 14, marginTop: 12 };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", backgroundColor: "#000A", padding: 20 }}>
      <ScrollView style={{ flexGrow: 0, backgroundColor: "#071A2E", borderRadius: 20 }} contentContainerStyle={{ padding: 22 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>Change email</Text>
        <Text style={{ color: "#C7D5E4", marginTop: 8 }}>Verify your identity, then verify your new address.</Text>
        {busy && <ActivityIndicator accessibilityLabel="Processing email change" style={{ margin: 12 }} />}
        {!!error && <Text accessibilityRole="alert" style={{ color: "#FDA4AF", marginTop: 12 }}>{error}</Text>}
        {!state && !busy && button("Retry", async () => apply(await emailChangeService.state()))}
        {state && !flow && <>
          <Text style={{ color: "#C7D5E4", marginTop: 12 }}>{state.attempts_left} requests remaining. Security limits also apply on the server.</Text>
          {button("Start email change", async () => apply(await emailChangeService.start()), !!state.blocked_until && Date.parse(state.blocked_until) > Date.now())}
        </>}
        {flow?.step === "identity" && <>
          <Text style={{ color: "#C7D5E4", marginTop: 12 }}>{flow.current_email}</Text>
          <Pressable disabled={busy} onPress={() => { setMethod(method === "email" ? "password" : "email"); setCode(""); setPassword(""); }}>
            <Text style={{ color: "#99C1F1", marginTop: 12 }}>Use {method === "email" ? "current password" : "email code"} instead</Text>
          </Pressable>
          {method === "email" ? <>
            {button(wait > 0 ? `Resend in ${wait}s` : "Send code to current email", async () => apply(await emailChangeService.sendCode(flow.id, "old")), wait > 0)}
            <TextInput accessibilityLabel="Current email verification code" placeholder="6-digit code" placeholderTextColor="#9BAFC3" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} style={input} />
          </> : <TextInput accessibilityLabel="Current password" placeholder="Current password" placeholderTextColor="#9BAFC3" secureTextEntry value={password} onChangeText={setPassword} style={input} />}
          {button("Verify identity", async () => { apply(await emailChangeService.verify(flow.id, method, method === "email" ? code.trim() : password)); setPassword(""); setCode(""); }, method === "email" ? !/^\d{6}$/.test(code) : !password || (state?.password_retry_after ?? 0) > elapsed)}
        </>}
        {flow?.step === "email" && <>
          <TextInput accessibilityLabel="New email address" autoCapitalize="none" keyboardType="email-address" placeholder="New email" placeholderTextColor="#9BAFC3" value={email} onChangeText={setEmail} style={input} />
          {button("Send verification code", async () => { apply(await emailChangeService.sendCode(flow.id, "new", email.trim())); setCode(""); }, !email.trim())}
        </>}
        {flow?.step === "verify" && <>
          <Text style={{ color: "#C7D5E4", marginTop: 12 }}>Code sent to {flow.new_email}</Text>
          <TextInput accessibilityLabel="New email verification code" placeholder="6-digit code" placeholderTextColor="#9BAFC3" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} style={input} />
          {button("Confirm new email", async () => { const result = await emailChangeService.confirm(flow.id, code.trim()); if (alive.current) { onChanged(result.email); onClose(); } }, !/^\d{6}$/.test(code))}
          {button(wait > 0 ? `Resend in ${wait}s` : "Resend code", async () => apply(await emailChangeService.sendCode(flow.id, "new", flow.new_email ?? undefined)), wait > 0)}
        </>}
        {flow && button("Cancel this request", async () => { await emailChangeService.cancel(flow.id); apply(await emailChangeService.state()); setPassword(""); setCode(""); })}
        <Pressable disabled={busy} onPress={onClose} style={{ padding: 16 }}><Text style={{ color: "white", textAlign: "center" }}>Close</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
