import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { authService } from "../../core/api/auth-service";
import type { User } from "../../core/domain/types";
import { LoginBoardingAnimation } from "./LoginBoardingAnimation";
import { Mascot } from "../../shared/ui/Mascot";
import { MascotMessage } from "../../shared/ui/MascotMessage";
import { getMascotErrorState, shouldIllustrateError } from "../../shared/ui/mascot-error";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
  onGoToRegister: () => void;
  onResetOnboarding?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onGoToRegister,
  onResetOnboarding,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"identifier" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTakingOff, setIsTakingOff] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [illustratedError, setIllustratedError] = useState<ReturnType<typeof getMascotErrorState> | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  const pendingAuthRef = useRef<{ user: User; token: string } | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const canSubmit = !loading && !isTakingOff && identifier.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    if (submitting.current) return;
    if (!identifier.trim()) {
      setErrorMessage("Please enter your phone number or email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setErrorMessage(null);
    setIllustratedError(null);
    submitting.current = true;
    setLoading(true);

    try {
      const response = await authService.login({
        phone_or_email: identifier.trim(),
        password,
      });

      if (!mounted.current) return;
      // Boarding is cosmetic and starts only after server authentication succeeds.
      pendingAuthRef.current = { user: response.user, token: response.token };
      setIsTakingOff(true);
    } catch (err: any) {
      if (!mounted.current) return;
      submitting.current = false;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your credentials and try again.";
      setErrorMessage(msg);
      setIllustratedError(shouldIllustrateError(err) ? getMascotErrorState(err) : null);
      setLoading(false);
    }
  };

  const handleTakeoffComplete = () => {
    if (pendingAuthRef.current) {
      const authenticated = pendingAuthRef.current;
      pendingAuthRef.current = null;
      onLoginSuccess(authenticated.user, authenticated.token);
    }
  };

  if (showRecovery) {
    return <ForgotPasswordScreen onBack={() => setShowRecovery(false)} />;
  }

  if (isTakingOff) return <LoginBoardingAnimation onComplete={handleTakeoffComplete} />;

  return (
    <View style={styles.outerContainer}>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.scrollContentTablet,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formWrapper}>
            <View style={styles.jeepneyHeroContainer}>
              <Mascot pose="phone" size={168} accessibilityLabel="ChatCo mascot welcoming you to sign in" />
            </View>

            {/* Form Content that smoothly slides out as the jeep takes off */}
            <View style={styles.formContentAnim}>
              {/* Top Brand Mark */}
              <View style={styles.brandHeader}>
              <Text style={styles.brandTitle}>CHATCO.</Text>
              <Text style={styles.brandSubtitle}>Commuter Portal</Text>
            </View>

            {/* Section Heading */}
            <View style={styles.headingBlock}>
              <View style={styles.headingCopy}>
              <Text style={styles.headingTitle}>Welcome back</Text>
              <Text style={styles.headingSubtitle}>
                Sign in with your existing commuter account.
              </Text>
              </View>
            </View>

          {/* Error Banner */}
          {illustratedError ? <MascotMessage {...illustratedError} compact /> : errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={commuterColors.danger}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Phone or Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone number or email</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "identifier" && styles.inputWrapperFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                value={identifier}
                editable={!loading}
                onChangeText={(t) => {
                  setIdentifier(t);
                  if (errorMessage) setErrorMessage(null);
                  setIllustratedError(null);
                }}
                onFocus={() => setFocusedField("identifier")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "password" && styles.inputWrapperFocused,
              ]}
            >
              <TextInput
                style={[styles.input, { paddingRight: 40 }]}
                secureTextEntry={!showPassword}
                value={password}
                editable={!loading}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage(null);
                  setIllustratedError(null);
                }}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={commuterColors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowRecovery(true)}
            disabled={loading || isTakingOff}
            style={styles.forgotLink}
            accessibilityRole="button"
          >
            <Text style={styles.registerLink}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={!canSubmit || isTakingOff}
            activeOpacity={0.85}
            style={[
              styles.submitButton,
              (!canSubmit || isTakingOff) && styles.submitButtonDisabled,
              isTakingOff && styles.submitButtonDeparting,
            ]}
          >
            {isTakingOff ? (
              <View style={styles.departingRow}>
                <Ionicons name="checkmark-circle" size={18} color="#34D399" style={{ marginRight: 6 }} />
                <Text style={styles.submitButtonText}>All Aboard!</Text>
              </View>
            ) : loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Register Prompt */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={onGoToRegister} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Create one</Text>
            </TouchableOpacity>
          </View>

            {/* Optional Onboarding Tour Reset */}
            {onResetOnboarding && (
              <TouchableOpacity
                onPress={onResetOnboarding}
                disabled={loading}
                style={styles.tourLink}
                activeOpacity={0.7}
              >
                <Text style={styles.tourLinkText}>App Walkthrough</Text>
              </TouchableOpacity>
            )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  forgotLink: { minHeight: 44, alignSelf: "flex-end", justifyContent: "center", paddingHorizontal: 4 },
  outerContainer: {
    flex: 1,
    backgroundColor: "#050F1A",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    alignItems: "center",
  },
  formWrapper: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  formContentAnim: {
    width: "100%",
  },
  jeepneyHeroContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "visible",
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
  headingBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headingCopy: { flex: 1, minWidth: 0 },
  headingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headingSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#FCA5A5",
    fontWeight: "600",
    lineHeight: 17,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#071A2E",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: "#1A5FB4",
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#FFFFFF",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  submitButton: {
    height: 48,
    backgroundColor: "#1A5FB4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#1A5FB4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonDeparting: {
    backgroundColor: "#0D3868",
    borderColor: "#10B981",
    borderWidth: 1.5,
    opacity: 1,
  },
  departingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  registerPrompt: {
    fontSize: 13,
    color: "#94A3B8",
  },
  registerLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#62A0EA",
  },
  tourLink: {
    alignSelf: "center",
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tourLinkText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "600",
  },
});
