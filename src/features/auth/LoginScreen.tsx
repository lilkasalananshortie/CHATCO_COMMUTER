import React, { useState, useRef, useEffect } from "react";
import { Text, TextInput } from "../../shared/ui/BrandText";
import { Animated, Easing, View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, useWindowDimensions, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { authService } from "../../core/api/auth-service";
import type { User } from "../../core/domain/types";
import { Mascot } from "../../shared/ui/Mascot";
import { MascotMessage } from "../../shared/ui/MascotMessage";
import { getMascotErrorState, shouldIllustrateError } from "../../shared/ui/mascot-error";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";
import { useReducedMotion } from "../../shared/useReducedMotion";

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
  onGoToRegister: (animateEntrance: boolean) => void;
  animateEntranceFromRight?: boolean;
  onResetOnboarding?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onGoToRegister,
  animateEntranceFromRight = false,
  onResetOnboarding,
}) => {
  const colors = commuterColors;
  const styles = baseStyles;
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"identifier" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [illustratedError, setIllustratedError] = useState<ReturnType<typeof getMascotErrorState> | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const reducedMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(animateEntranceFromRight ? 0 : 1)).current;

  useEffect(() => {
    if (!animateEntranceFromRight) { entrance.setValue(1); return; }
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [animateEntranceFromRight, entrance]);

  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const canSubmit = !loading && identifier.trim().length > 0 && password.length > 0;

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
      onLoginSuccess(response.user, response.token);
    } catch (err: any) {
      if (!mounted.current) return;
      submitting.current = false;
      const msg =
        err?.response?.data?.errors?.login?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your credentials and try again.";
      setErrorMessage(msg);
      setIllustratedError(shouldIllustrateError(err) ? getMascotErrorState(err) : null);
      setLoading(false);
    }
  };

  if (showRecovery) {
    return <ForgotPasswordScreen onBack={() => setShowRecovery(false)} reducedMotion={reducedMotion} />;
  }

  return (
    <View style={styles.outerContainer}>
      <Animated.View style={[styles.container, {
        opacity: entrance,
        transform: [{ translateX: entrance.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
      }]}>
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
              <Mascot pose="phone" size={168} accessibilityLabel="E-CHATCO mascot welcoming you to sign in" />
            </View>

            {/* Form Content that smoothly slides out as the jeep takes off */}
            <View style={styles.formContentAnim}>
              {/* Top Brand Mark */}
              <View style={styles.brandHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Image source={require("../../../assets/logo-e-chatco.png")} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityLabel="E-CHATCO logo" />
                <Text style={styles.brandTitle}>E-CHATCO.</Text>
              </View>
              <Text style={styles.brandSubtitle}>Commuter Portal</Text>
              {onResetOnboarding && (
                <TouchableOpacity
                  onPress={onResetOnboarding}
                  disabled={loading}
                  style={styles.tourIconButton}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="App Walkthrough"
                  accessibilityHint="Open the app features guide"
                >
                  <Ionicons name="help-circle-outline" size={23} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Section Heading */}
            <View style={styles.headingBlock}>
              <View style={styles.headingCopy}>
                <Text style={styles.headingTitle}>Welcome back</Text>
              </View>
            </View>

          {/* Error Banner */}
          {illustratedError ? <MascotMessage {...illustratedError} compact /> : errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                  color={colors.danger}
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
          <View style={[styles.fieldGroup, styles.passwordFieldGroup]}>
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
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowRecovery(true)}
            disabled={loading}
            style={styles.forgotLink}
            accessibilityRole="button"
          >
            <Text style={styles.registerLink}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Register Prompt */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => onGoToRegister(!reducedMotion)} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Create one</Text>
            </TouchableOpacity>
          </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const baseStyles = StyleSheet.create({
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
    marginBottom: 16,
  },
  tourIconButton: { position: "absolute", right: 0, top: 0, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
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
    marginBottom: 16,
  },
  headingCopy: { flex: 1, minWidth: 0 },
  headingTitle: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
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
    marginBottom: 12,
  },
  passwordFieldGroup: { marginBottom: 0 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
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
    marginTop: 2,
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
    marginTop: 16,
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
});
