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

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onGoToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegisterSuccess,
  onGoToLogin,
}) => {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [username, setUsername] = useState("");
  const [appliedType, setAppliedType] = useState<"REGULAR" | "STUDENT" | "SENIOR" | "PWD">("REGULAR");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!firstName.trim() || !surname.trim()) {
      setErrorMessage("Please enter your full legal name.");
      return;
    }
    if (!birthdate.trim()) {
      setErrorMessage("Please enter your birthdate (YYYY-MM-DD).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!contactNumber.trim()) {
      setErrorMessage("Please enter a Philippine mobile number (09XXXXXXXXX).");
      return;
    }
    if (!username.trim()) {
      setErrorMessage("Please enter a unique username.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      // In the backend RegisterRequest, an image file is expected.
      // For mobile direct registration or pending verification:
      const formData = new FormData();
      formData.append("first_name", firstName.trim());
      if (middleName.trim()) formData.append("middle_name", middleName.trim());
      formData.append("surname", surname.trim());
      formData.append("birthdate", birthdate.trim());
      formData.append("gender", gender);
      formData.append("email", email.trim().toLowerCase());
      formData.append("contact_number", contactNumber.trim());
      formData.append("username", username.trim());
      formData.append("applied_type", appliedType);
      formData.append("password", password);
      formData.append("password_confirmation", passwordConfirmation);

      // Create a dummy placeholder image blob for the ID if none picked yet
      const dummyId = {
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        name: "id_document.png",
        type: "image/png",
      } as any;
      formData.append("id_image", dummyId);

      await authService.register(formData);

      Alert.alert(
        "Application Submitted",
        "Your commuter registration has been submitted for admin verification. You will be able to sign in once approved.",
        [{ text: "OK", onPress: onRegisterSuccess }]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please check your details and try again.";
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onGoToLogin}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={commuterColors.navyDeep} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commuter Sign Up</Text>
          <Text style={styles.headerSubtitle}>
            Apply for regular or discounted passenger access
          </Text>
        </View>

        <View style={styles.card}>
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

          {/* Passenger Type Selection */}
          <Text style={styles.label}>Passenger Category</Text>
          <View style={styles.categoryRow}>
            {(["REGULAR", "STUDENT", "SENIOR", "PWD"] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => setAppliedType(cat)}
                style={[
                  styles.categoryPill,
                  appliedType === cat && styles.categoryPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    appliedType === cat && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {appliedType !== "REGULAR" && (
            <Text style={styles.hintText}>
              Note: 20% fare discount applies once verified by CHATCO administration.
            </Text>
          )}

          {/* Full Name Fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Juan"
              placeholderTextColor={commuterColors.textMuted}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Middle Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Santos"
              placeholderTextColor={commuterColors.textMuted}
              value={middleName}
              onChangeText={setMiddleName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Surname *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dela Cruz"
              placeholderTextColor={commuterColors.textMuted}
              value={surname}
              onChangeText={setSurname}
            />
          </View>

          {/* Birthdate & Gender */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Birthdate (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="2000-01-15"
              placeholderTextColor={commuterColors.textMuted}
              value={birthdate}
              onChangeText={setBirthdate}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {(["MALE", "FEMALE", "OTHER"] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={[
                    styles.genderPill,
                    gender === g && styles.genderPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === g && styles.genderTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contact Details */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="juan@example.com"
              placeholderTextColor={commuterColors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number (09XXXXXXXXX) *</Text>
            <TextInput
              style={styles.input}
              placeholder="09171234567"
              placeholderTextColor={commuterColors.textMuted}
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Username & Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="juandelacruz"
              placeholderTextColor={commuterColors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password (8+ chars) *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter strong password"
                placeholderTextColor={commuterColors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={commuterColors.textMuted}
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 4 }}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={commuterColors.textMuted}
              secureTextEntry={!showPassword}
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              autoCapitalize="none"
            />
          </View>

          <CommuterButton
            title={loading ? "Submitting..." : "Submit Registration"}
            onPress={handleRegister}
            loading={loading}
            fullWidth
            style={{ marginTop: 12 }}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered? </Text>
            <Text style={styles.linkText} onPress={onGoToLogin}>
              Sign In
            </Text>
          </View>
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
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: commuterColors.navyDeep,
  },
  headerSubtitle: {
    fontSize: 13,
    color: commuterColors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: commuterColors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: commuterColors.border,
    shadowColor: "#071A2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
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
  },
  categoryRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  categoryPill: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: commuterColors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: commuterColors.surfaceSecondary,
  },
  categoryPillActive: {
    backgroundColor: commuterColors.primary,
    borderColor: commuterColors.primary,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: commuterColors.textSecondary,
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  hintText: {
    fontSize: 11,
    color: commuterColors.textMuted,
    marginBottom: 16,
    fontStyle: "italic",
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: commuterColors.navyDeep,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: commuterColors.border,
    borderRadius: 12,
    backgroundColor: commuterColors.surfaceSecondary,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: commuterColors.textPrimary,
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderPill: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: commuterColors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: commuterColors.surfaceSecondary,
  },
  genderPillActive: {
    backgroundColor: commuterColors.navyDeep,
    borderColor: commuterColors.navyDeep,
  },
  genderText: {
    fontSize: 12,
    fontWeight: "600",
    color: commuterColors.textSecondary,
  },
  genderTextActive: {
    color: "#FFFFFF",
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: commuterColors.border,
    borderRadius: 12,
    backgroundColor: commuterColors.surfaceSecondary,
    paddingHorizontal: 12,
    height: 44,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: commuterColors.textPrimary,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
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
});
