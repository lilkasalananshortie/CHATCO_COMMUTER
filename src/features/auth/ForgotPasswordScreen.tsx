import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authService } from "../../core/api/auth-service";
import { commuterColors as colors } from "../../core/theme/colors";
import { Mascot } from "../../shared/ui/Mascot";
import { MascotMessage } from "../../shared/ui/MascotMessage";
import { getMascotErrorState, shouldIllustrateError } from "../../shared/ui/mascot-error";
import { validateRecovery, type RecoveryStep } from "./recovery-validation";

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [illustration, setIllustration] = useState<ReturnType<typeof getMascotErrorState> | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { if (!inFlight.current) onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const submit = async (resend = false) => {
    if (inFlight.current || (resend && resendIn > 0)) return;
    const validation = validateRecovery(resend ? "email" : step, { email, code, password, confirmation });
    if (validation) { setError(validation); setIllustration(null); return; }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setIllustration(null);
    try {
      if (step === "email" || resend) {
        await authService.forgotPassword(email.trim().toLowerCase());
        if (mounted.current) { setCode(""); setResendIn(60); setStep("code"); }
      } else if (step === "code") {
        await authService.verifyResetCode(email.trim().toLowerCase(), code);
        if (mounted.current) setStep("password");
      } else if (step === "password") {
        await authService.resetPassword({ email: email.trim().toLowerCase(), code, password, passwordConfirmation: confirmation });
        if (mounted.current) { setPassword(""); setConfirmation(""); setCode(""); setStep("done"); }
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Please try again.");
        // 404 here can mean an unknown email: keep that actionable account message.
        const state = getMascotErrorState(err);
        setIllustration(shouldIllustrateError(err) && state.title !== "We couldn't find that" ? state : null);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={onBack} disabled={busy} style={styles.back} accessibilityRole="button">
          <Text style={styles.link}>Back to login</Text>
        </TouchableOpacity>
        <View style={styles.card}>
          <Mascot pose={step === "done" ? "thanks" : step === "code" ? "envelope" : "key"} size={120} />
          <Text style={styles.title} accessibilityRole="header">{step === "done" ? "Password updated" : step === "code" ? "Check your email" : step === "password" ? "Choose a new password" : "Forgot your password?"}</Text>
          <Text style={styles.description}>{step === "done" ? "You can now sign in with your new password." : step === "email" ? "We'll send a reset code to your registered email." : step === "code" ? `Enter the 6-digit code sent to ${email.trim()}.` : "Use 8–128 characters, an uppercase letter, a number, and a symbol."}</Text>
          {illustration ? <MascotMessage {...illustration} compact /> : error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {step === "email" && <TextInput accessibilityLabel="Registered email" placeholder="Registered email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={styles.input} />}
          {step === "code" && <TextInput accessibilityLabel="6-digit reset code" placeholder="6-digit code" placeholderTextColor={colors.textMuted} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} editable={!busy} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" style={styles.input} />}
          {step === "password" && <>
            <TextInput accessibilityLabel="New password" placeholder="New password" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} style={styles.input} />
            <TextInput accessibilityLabel="Confirm new password" placeholder="Confirm password" placeholderTextColor={colors.textMuted} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} style={styles.input} />
          </>}
          <TouchableOpacity accessibilityRole="button" disabled={busy} accessibilityState={{ busy, disabled: busy }} onPress={step === "done" ? onBack : () => submit()} style={[styles.button, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{step === "done" ? "Back to login" : step === "email" ? "Send reset code" : step === "code" ? "Verify code" : "Update password"}</Text>}
          </TouchableOpacity>
          {step === "code" && <>
            <TouchableOpacity onPress={() => submit(true)} disabled={busy || resendIn > 0} style={styles.back} accessibilityRole="button">
              <Text style={[styles.link, (busy || resendIn > 0) && styles.disabled]}>{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={() => { setCode(""); setError(null); setIllustration(null); setStep("email"); }} style={styles.back} accessibilityRole="button"><Text style={styles.link}>Use another email</Text></TouchableOpacity>
          </>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center" },
  card: { width: "100%", maxWidth: 420, alignSelf: "center", gap: 16 },
  back: { minHeight: 44, justifyContent: "center", alignSelf: "center", paddingHorizontal: 8 },
  link: { color: colors.primaryLight, fontSize: 14, fontWeight: "600" },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: "800", textAlign: "center" },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center" },
  input: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, color: colors.textPrimary, fontSize: 16 },
  error: { color: "#FCA5A5", fontSize: 13, lineHeight: 19 },
  button: { minHeight: 50, backgroundColor: colors.primary, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
