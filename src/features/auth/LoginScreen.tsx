import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { CommuterButton } from "../../shared/ui/CommuterButton";
import { authService } from "../../core/api/auth-service";
import type { User } from "../../core/domain/types";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setErrorMessage("Please enter your phone number or email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await authService.login({
        phone_or_email: identifier.trim(),
        password,
      });

      onLoginSuccess(response.user, response.token);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your credentials and try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="bus" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.appTitle}>CHATCO</Text>
          <Text style={styles.appSubtitle}>Commuter Passenger Portal</Text>
          <View style={styles.taglineBadge}>
            <Text style={styles.taglineText}>Cabugao - San Juan Modern Jeepney</Text>
          </View>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardDescription}>
            Enter your mobile number or email to track jeepneys and manage rides.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={commuterColors.danger}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Identifier Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number or Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={commuterColors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="09171234567 or email@example.com"
                placeholderTextColor={commuterColors.textMuted}
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={commuterColors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={commuterColors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
              />
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={commuterColors.textMuted}
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              />
            </View>
          </View>

          {/* Login Button */}
          <CommuterButton
            title={loading ? "Authenticating..." : "Sign In to Commuter"}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            style={styles.submitBtn}
          />

          {/* Register Prompt */}
          <View style={styles.registerFooter}>
            <Text style={styles.footerText}>New commuter? </Text>
            <Text style={styles.linkText} onPress={onGoToRegister}>
              Create an Account
            </Text>
          </View>

          {/* Quick Walkthrough Replay Link */}
          {onResetOnboarding && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onResetOnboarding}
              style={styles.replayTourBtn}
            >
              <Ionicons
                name="sparkles"
                size={14}
                color={commuterColors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.replayTourText}>Replay App Onboarding</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commuterColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: commuterColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: commuterColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: commuterColors.navyDeep,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: commuterColors.textSecondary,
    fontWeight: "600",
    marginTop: 2,
  },
  taglineBadge: {
    marginTop: 8,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: "600",
    color: commuterColors.textSecondary,
  },
  card: {
    backgroundColor: commuterColors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#071A2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: commuterColors.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: commuterColors.navyDeep,
  },
  cardDescription: {
    fontSize: 13,
    color: commuterColors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: commuterColors.dangerBg,
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: commuterColors.danger,
    fontWeight: "600",
    lineHeight: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: commuterColors.navyDeep,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: commuterColors.border,
    borderRadius: 12,
    backgroundColor: commuterColors.surfaceSecondary,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: commuterColors.textPrimary,
  },
  eyeIcon: {
    padding: 4,
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 16,
  },
  registerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: commuterColors.textSecondary,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: commuterColors.primary,
  },
  replayTourBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(26, 95, 180, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(26, 95, 180, 0.18)",
    alignSelf: "center",
  },
  replayTourText: {
    fontSize: 12,
    fontWeight: "700",
    color: commuterColors.primary,
  },
});
