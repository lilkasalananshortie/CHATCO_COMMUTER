import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { authService } from "../../core/api/auth-service";
import { commuterColors as colors } from "../../core/theme/colors";
import { validateNewPassword } from "./recovery-validation";

export function SetNewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const pending = useRef(false);
  const submit = async () => {
    if (pending.current) return;
    const validation = validateNewPassword(password, confirmation);
    if (validation) { setError(validation); return; }
    pending.current = true; setBusy(true); setError("");
    try { await authService.setNewPassword(password, confirmation); setPassword(""); setConfirmation(""); setComplete(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update your password. Please retry."); }
    finally { pending.current = false; setBusy(false); }
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", backgroundColor: colors.background }}><View style={{ padding: 24, gap: 16 }}>
    <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: 26, fontWeight: "800" }}>{complete ? "Account activated" : "Set your new password"}</Text>
    <Text style={{ color: colors.textSecondary }}>{complete ? "Your password was updated. Sign in again to continue." : "Replace the temporary password from your email. Use 8–128 characters, an uppercase letter, a number and a symbol."}</Text>
    {!complete && <>{[["New password", password, setPassword], ["Confirm password", confirmation, setConfirmation]].map(([label, value, update]) => <TextInput key={label as string} accessibilityLabel={label as string} placeholder={label as string} placeholderTextColor={colors.textMuted} value={value as string} onChangeText={update as (value: string) => void} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" style={{ color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14 }} />)}</>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={complete ? onDone : () => void submit()} style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: "center" }}>{busy ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>{complete ? "Sign in again" : "Activate account"}</Text>}</TouchableOpacity>
    {!complete && <TouchableOpacity disabled={busy} onPress={() => { void authService.logout().catch(() => {}).finally(onDone); }}><Text style={{ color: colors.primaryLight, padding: 12 }}>Sign out</Text></TouchableOpacity>}
  </View></ScrollView>;
}
