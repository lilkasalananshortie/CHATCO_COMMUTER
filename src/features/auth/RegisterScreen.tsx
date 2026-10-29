import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { authService } from "../../core/api/auth-service";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { AuthBackgroundGraphic } from "./AuthBackgroundGraphic";
import { Mascot } from "../../shared/ui/Mascot";
import { RegistrationConsent } from "./RegistrationConsent";
import { registrationAgreement, type AgreementChoices } from "./registration-agreement";
import { request } from "../../core/api/api-client";
import { registrationBirthdateError, registrationUsernameError, REGISTRATION_USERNAME_MAX_LENGTH } from "./registration-validation";
import { useReducedMotion } from "../../shared/useReducedMotion";

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onGoToLogin: () => void;
}

type AppliedType = "REGULAR" | "STUDENT" | "SENIOR" | "PWD";

const COMMUTER_TYPE_OPTIONS: { label: string; value: AppliedType; description: string }[] = [
  { label: "Regular", value: "REGULAR", description: "Standard fare commuter" },
  { label: "Student", value: "STUDENT", description: "20% student fare discount" },
  { label: "Senior Citizen", value: "SENIOR", description: "20% senior citizen discount" },
  { label: "PWD", value: "PWD", description: "20% person with disability discount" },
];

const SUFFIX_OPTIONS = ["None", "Jr.", "Sr.", "II", "III", "IV"];

const ID_UPLOAD_LABELS: Record<AppliedType, string> = {
  REGULAR: "Upload Valid Government ID *",
  STUDENT: "Upload Student ID / School Certificate *",
  SENIOR: "Upload Senior Citizen ID / OSCA Card *",
  PWD: "Upload PWD ID / Official Card *",
};

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "number", label: "One number", test: (v: string) => /[0-9]/.test(v) },
  { id: "symbol", label: "One symbol (! ? @ # $ %)", test: (v: string) => /[^A-Za-z0-9\s]/.test(v) },
];

const STEP_COPY: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Personal Information", subtitle: "Tell us a bit about yourself" },
  2: { title: "Contact & Verification", subtitle: "We need this for account verification" },
  3: { title: "Confirm Your Email", subtitle: "Enter the 6-digit code we just emailed you" },
  4: { title: "Account Credentials", subtitle: "Secure your account" },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^09\d{9}$/;

// 1x1 clean PNG transparent pixel base64 for sample / fallback testing
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function createSampleIdFile(): Promise<{ uri: string; name: string; type: string } | File> {
  const filename = "valid_government_id_sample.png";
  const mimeType = "image/png";

  if (Platform.OS === "web") {
    try {
      const byteCharacters = atob(SAMPLE_PNG_BASE64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return new File([blob], filename, { type: mimeType });
    } catch {
      return {
        uri: `data:${mimeType};base64,${SAMPLE_PNG_BASE64}`,
        name: filename,
        type: mimeType,
      };
    }
  }

  // Native Android and iOS - write to local cache file so uri is a valid file:// URI (OkHttp supported)
  let baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
  if (baseDir && !baseDir.endsWith("/")) {
    baseDir = `${baseDir}/`;
  }
  let fileUri = `${baseDir}chatco_sample_id.png`;
  if (!fileUri.startsWith("file://") && !fileUri.startsWith("content://")) {
    fileUri = `file://${fileUri}`;
  }

  try {
    await FileSystem.writeAsStringAsync(fileUri, SAMPLE_PNG_BASE64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (err) {
    console.warn("[RegisterScreen] Error writing sample ID file:", err);
  }

  return {
    uri: fileUri,
    name: filename,
    type: mimeType,
  };
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegisterSuccess,
  onGoToLogin,
}) => {
  const colors = commuterColors;
  const styles = baseStyles;
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const [step, setStep] = useState(1);
  const reduceMotion = useReducedMotion();
  const previousStep = useRef(step);
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepTranslateX = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState<AgreementChoices>({ terms: false, privacy: false, confirmation: false });
  const [showRegistrationTerms, setShowRegistrationTerms] = useState(false);
  const [idUploadRequired, setIdUploadRequired] = useState(true);
  const submitting = useRef(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Data
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [suffix, setSuffix] = useState("None");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState<"" | "Male" | "Female" | "Prefer not to say">("");
  const [appliedType, setAppliedType] = useState<AppliedType | "">("");

  // Contact & ID
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [idFileName, setIdFileName] = useState<string | null>(null);
  const [idFileBlob, setIdFileBlob] = useState<any>(null);
  const [showIdChoiceModal, setShowIdChoiceModal] = useState(false);

  // Email OTP Verification
  const [code, setCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Active Focus Field
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fromStep = previousStep.current;
    if (fromStep === step) return;
    previousStep.current = step;

    if (reduceMotion) {
      stepOpacity.setValue(1);
      stepTranslateX.setValue(0);
      return;
    }

    stepOpacity.setValue(0);
    stepTranslateX.setValue(step > fromStep ? 26 : -26);
    const animation = Animated.parallel([
      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(stepTranslateX, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, step, stepOpacity, stepTranslateX]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    let cancelled = false;
    request<{ require_id_upload?: boolean }>("/system-status")
      .then((status) => {
        if (!cancelled && status.require_id_upload === false) setIdUploadRequired(false);
      })
      .catch(() => {
        // Match the web fallback: keep ID upload required if status is unavailable.
      });
    return () => { cancelled = true; };
  }, []);

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Validate per step
  const validateCurrentStep = (stepNum: number): boolean => {
    const errors: Record<string, string> = {};

    if (stepNum === 1) {
      if (!firstName.trim()) errors.firstName = "Enter your first name.";
      if (!surname.trim()) errors.surname = "Enter your surname.";
      if (!birthdate.trim()) {
        errors.birthdate = "Enter your birthdate (YYYY-MM-DD).";
      } else {
        const dateError = registrationBirthdateError(birthdate);
        if (dateError) errors.birthdate = dateError;
      }
      if (!gender) errors.gender = "Select your gender.";
      if (!appliedType) errors.appliedType = "Select the commuter type you're applying for.";
    }

    if (stepNum === 2) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        errors.email = "Enter your email address.";
      } else if (!EMAIL_PATTERN.test(cleanEmail)) {
        errors.email = "Enter a valid email address.";
      }

      const cleanPhone = contactNumber.trim();
      if (!cleanPhone) {
        errors.contactNumber = "Enter your contact number.";
      } else if (!PHONE_PATTERN.test(cleanPhone)) {
        errors.contactNumber = "Must be an 11-digit mobile number starting with 09.";
      }

      const idRequired = appliedType !== "REGULAR" || idUploadRequired;
      if (!idFileBlob && !idFileName && idRequired) {
        errors.id = "Please upload or capture your valid ID document.";
      }
    }

    if (stepNum === 4) {
      const usernameError = registrationUsernameError(username);
      if (usernameError) errors.username = usernameError;
      if (!password) {
        errors.password = "Enter a password.";
      } else {
        const missing = PASSWORD_RULES.filter((r) => !r.test(password));
        if (missing.length > 0) {
          errors.password = "Password does not meet all security requirements.";
        }
      }
      if (!passwordConfirmation) {
        errors.passwordConfirmation = "Confirm your password.";
      } else if (password !== passwordConfirmation) {
        errors.passwordConfirmation = "Passwords do not match.";
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  // Step 2 -> Request Code & Advance to Step 3
  const handleRequestCode = async () => {
    if (!validateCurrentStep(2)) return;

    if (isEmailVerified && verifiedEmail === email.trim().toLowerCase()) {
      setStep(4);
      return;
    }

    setIsSendingCode(true);
    setErrorMessage(null);

    try {
      const result = await authService.sendRegistrationCode(email.trim().toLowerCase(), contactNumber.trim());
      setResendIn(result?.resend_in_seconds || 60);
      setCode("");
      setStep(3);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("429") || msg.includes("already requested")) {
        setResendIn(60);
        setStep(3);
      } else {
        setErrorMessage(err?.message || "Could not send verification code. Please check your email address.");
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  // Step 3 -> Verify Code
  const handleVerifyCode = async () => {
    if (code.trim().length !== 6) {
      setErrorMessage("Enter all 6 digits sent to your email.");
      return;
    }

    setIsVerifyingCode(true);
    setErrorMessage(null);

    try {
      await authService.verifyRegistrationCode(email.trim().toLowerCase(), code.trim());
      setIsEmailVerified(true);
      setVerifiedEmail(email.trim().toLowerCase());
      setStep(4);
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid or expired verification code. Please check your inbox or resend.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Handle Pick / Capture ID
  const handleSelectIdOption = async (option: "CAMERA" | "FILE" | "SAMPLE") => {
    setShowIdChoiceModal(false);
    clearFieldError("id");
    setErrorMessage(null);

    try {
      if (option === "SAMPLE") {
        const sampleFile = await createSampleIdFile();
        setIdFileName("valid_government_id_sample.png");
        setIdFileBlob(sampleFile);
        return;
      }

      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/jpeg,image/png,image/webp";
        if (option === "CAMERA") {
          input.capture = "environment";
        }
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            if (file.size > 5 * 1024 * 1024) {
              setErrorMessage("That image is over 5MB. Please choose an image under 5MB.");
              return;
            }
            setIdFileName(file.name);
            setIdFileBlob(file);
          }
        };
        input.click();
        return;
      }

      // Native Android & iOS
      if (option === "CAMERA") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setErrorMessage("Camera permission is required to take a picture of your ID.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
          const asset = result.assets[0];
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            setErrorMessage("That image is over 5MB. Please choose an image under 5MB.");
            return;
          }
          const filename = asset.fileName || `id_camera_${Date.now()}.jpg`;
          const mime = asset.mimeType || "image/jpeg";
          setIdFileName(filename);
          setIdFileBlob({
            uri: asset.uri,
            name: filename,
            type: mime,
          });
        }
      } else if (option === "FILE") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setErrorMessage("Photo library permission is required to upload your ID document.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
          const asset = result.assets[0];
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            setErrorMessage("That image is over 5MB. Please choose an image under 5MB.");
            return;
          }
          const filename = asset.fileName || `id_upload_${Date.now()}.jpg`;
          const mime = asset.mimeType || "image/jpeg";
          setIdFileName(filename);
          setIdFileBlob({
            uri: asset.uri,
            name: filename,
            type: mime,
          });
        }
      }
    } catch (err: any) {
      console.error("[RegisterScreen] ID selection error:", err);
      setErrorMessage("Could not select image. Please try again or use the Sample ID option.");
    }
  };

  // Final Step 4 -> Submit Registration
  const handleSubmitRegistration = async () => {
    if (submitting.current) return;
    if (!validateCurrentStep(4)) return;
    if (!isEmailVerified || verifiedEmail !== email.trim().toLowerCase()) {
      setErrorMessage("Verify your current email address before submitting.");
      setStep(2);
      return;
    }

    setErrorMessage(null);
    setAgreement({ terms: false, privacy: false, confirmation: false });
    setShowRegistrationTerms(true);
  };

  const confirmRegistration = async () => {
    if (submitting.current) return;
    let accepted: Record<string, string>;
    try { accepted = registrationAgreement(agreement); }
    catch (error) { setErrorMessage((error as Error).message); return; }

    submitting.current = true;
    setLoading(true);
    setErrorMessage(null);

    try {
      if (Platform.OS !== "web") {
        const parameters: Record<string, string> = {
          ...accepted,
          first_name: String(firstName || "").trim(),
          surname: String(surname || "").trim(),
          birthdate: String(birthdate || "").trim(),
          gender: String(gender || ""),
          email: String(email || "").trim().toLowerCase(),
          contact_number: String(contactNumber || "").trim(),
          username: String(username || "").trim(),
          applied_type: String(appliedType),
          password: String(password),
          password_confirmation: String(passwordConfirmation),
        };
        if (middleName && middleName.trim()) parameters.middle_name = String(middleName).trim();
        if (suffix && suffix !== "None") parameters.suffix = String(suffix);
        if (
          idFileBlob &&
          typeof idFileBlob === "object" &&
          "uri" in idFileBlob &&
          typeof idFileBlob.uri === "string" &&
          !idFileBlob.uri.startsWith("data:")
        ) {
          const rawUri = idFileBlob.uri;
          const fileUri =
            rawUri.startsWith("file://") || rawUri.startsWith("content://")
              ? rawUri
              : `file://${rawUri}`;
          await authService.register({ fileUri, parameters });
        } else {
          await authService.register({ parameters });
        }
        setIsSuccess(true);
        return;
      }

      // Web multipart
      const formData = new FormData();
      Object.entries(accepted).forEach(([key, value]) => formData.append(key, value));
      formData.append("first_name", String(firstName || "").trim());
      if (middleName && middleName.trim()) {
        formData.append("middle_name", String(middleName).trim());
      }
      formData.append("surname", String(surname || "").trim());
      if (suffix && suffix !== "None") {
        formData.append("suffix", String(suffix));
      }
      formData.append("birthdate", String(birthdate || "").trim());
      formData.append("gender", String(gender || ""));
      formData.append("email", String(email || "").trim().toLowerCase());
      formData.append("contact_number", String(contactNumber || "").trim());
      formData.append("username", String(username || "").trim());
      formData.append("applied_type", String(appliedType));
      formData.append("password", String(password));
      formData.append("password_confirmation", String(passwordConfirmation));

      if (idFileBlob) formData.append("id_image", idFileBlob as any);

      await authService.register(formData);
      setIsSuccess(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Registration could not be completed. Please review your details.";
      const responseErrors = err?.response?.data?.errors as Record<string, string[] | string> | undefined;
      if (responseErrors && Object.keys(responseErrors).length > 0) {
        const mapped: Record<string, string> = {};
        const stepByField: Record<string, number> = {
          first_name: 1, middle_name: 1, suffix: 1, surname: 1, birthdate: 1, gender: 1, applied_type: 1,
          email: 2, contact_number: 2, id_image: 2,
          username: 4, password: 4, password_confirmation: 4,
        };
        let earliest = 4;
        Object.entries(responseErrors).forEach(([field, messages]) => {
          const key = field === "first_name" ? "firstName"
            : field === "middle_name" ? "middleName"
            : field === "contact_number" ? "contactNumber"
            : field === "id_image" ? "id"
            : field === "applied_type" ? "appliedType"
            : field === "password_confirmation" ? "passwordConfirmation"
            : field;
          mapped[key] = Array.isArray(messages) ? (messages[0] ?? msg) : messages;
          if (stepByField[field]) earliest = Math.min(earliest, stepByField[field]);
        });
        setFieldErrors(mapped);
        if (earliest < 4) {
          setShowRegistrationTerms(false);
          setStep(earliest);
          setErrorMessage(msg);
        } else {
          setErrorMessage(msg);
        }
      } else {
        setErrorMessage(msg);
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  // ── SUCCESS: PENDING ADMIN REVIEW SCREEN ──
  if (isSuccess) {
    return (
      <View style={styles.outerContainer}>
        <AuthBackgroundGraphic />
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successCard}>
            <Mascot pose="envelope" size={120} />

            <Text style={styles.successTitle}>Registration Submitted</Text>

            <Text style={styles.successBody}>
              Your account is{" "}
              <Text style={{ fontWeight: "700", color: "#F59E0B" }}>
                pending admin approval
              </Text>
              . An administrator will review your registration and verify any discount category you selected.
            </Text>

            <Text style={styles.successSubtext}>
              We will email{" "}
              <Text style={{ fontWeight: "600", color: "#62A0EA" }}>
                {email.trim().toLowerCase()}
              </Text>{" "}
              as soon as your account is approved.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onRegisterSuccess}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {/* Background Graphic Layer: Luminous ambient glows & transit grid */}
      <AuthBackgroundGraphic />

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
            {/* Top Navigation Bar */}
            <View style={styles.navBar}>
              <TouchableOpacity
                style={styles.backButton}
                  onPress={onGoToLogin}
                  disabled={loading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Go back to login"
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.brandRow}>
                <Text style={styles.brandTitle}>CHATCO.</Text>
                <View style={styles.brandPill}>
                  <Text style={styles.brandPillText}>COMMUTER SIGN UP</Text>
                </View>
              </View>
            </View>

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Mascot pose={step === 3 ? "envelope" : "greeting"} size={96} />
              <Text style={styles.heroTitle}>Create Account</Text>
              <Text style={styles.heroSubtitle}>
                Register to access digital fares, live tracking, and discount tiers.
              </Text>

              {/* Informational Badges */}
              <View style={styles.infoChipsRow}>
                <View style={styles.infoChip}>
                  <Ionicons name="time-outline" size={13} color="#62A0EA" style={{ marginRight: 5 }} />
                  <Text style={styles.infoChipText}>24-Hour Review</Text>
                </View>
                <View style={styles.infoChip}>
                  <Ionicons name="shield-checkmark-outline" size={13} color="#34D399" style={{ marginRight: 5 }} />
                  <Text style={styles.infoChipText}>Valid ID = 20% Off</Text>
                </View>
              </View>
            </View>

            {/* Stepper Progress Bar (1 to 4) */}
            <View style={styles.stepperContainer}>
              {[1, 2, 3, 4].map((s) => {
                const isCompleted = step > s;
                const isActive = step === s;
                return (
                  <React.Fragment key={s}>
                    <View
                      style={[
                        styles.stepCircle,
                        isCompleted && styles.stepCircleCompleted,
                        isActive && styles.stepCircleActive,
                      ]}
                    >
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.stepNumber,
                            isActive && styles.stepNumberActive,
                          ]}
                        >
                          {s}
                        </Text>
                      )}
                    </View>
                    {s < 4 && (
                      <View
                        style={[
                          styles.stepLine,
                          step > s && styles.stepLineCompleted,
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Main Form Surface Card */}
            <Animated.View style={[styles.card, { opacity: stepOpacity, transform: [{ translateX: stepTranslateX }] }]}>
              {/* Step Header */}
              <View style={styles.stepTitleSection}>
                <Text style={styles.stepTitle}>{STEP_COPY[step]?.title ?? ""}</Text>
                <Text style={styles.stepSubtitle}>{STEP_COPY[step]?.subtitle ?? ""}</Text>
              </View>

              {/* Error Banner */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={colors.danger}
                    style={{ marginRight: 8, marginTop: 1 }}
                  />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* ══════════════ STEP 1: PERSONAL INFORMATION ══════════════ */}
              {step === 1 && (
                <View style={styles.formSection}>
                  {/* First Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>First Name *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "firstName" && styles.inputWrapperFocused,
                        fieldErrors.firstName && styles.inputWrapperError,
                      ]}
                    >
                      <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={(t) => {
                          setFirstName(t);
                          clearFieldError("firstName");
                        }}
                        onFocus={() => setFocusedField("firstName")}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>
                    {fieldErrors.firstName && <Text style={styles.errorText}>{fieldErrors.firstName}</Text>}
                  </View>

                  {/* Middle Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Middle Name (Optional)</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "middleName" && styles.inputWrapperFocused,
                      ]}
                    >
                      <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={middleName}
                        onChangeText={setMiddleName}
                        onFocus={() => setFocusedField("middleName")}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  {/* Surname & Suffix Row */}
                  <View style={styles.nameRow}>
                    <View style={[styles.fieldGroup, { flex: 2, marginRight: 8 }]}>
                      <Text style={styles.label}>Surname *</Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          focusedField === "surname" && styles.inputWrapperFocused,
                          fieldErrors.surname && styles.inputWrapperError,
                        ]}
                      >
                        <TextInput
                          style={styles.input}
                          value={surname}
                          onChangeText={(t) => {
                            setSurname(t);
                            clearFieldError("surname");
                          }}
                          onFocus={() => setFocusedField("surname")}
                          onBlur={() => setFocusedField(null)}
                          autoCapitalize="words"
                          returnKeyType="next"
                        />
                      </View>
                      {fieldErrors.surname && <Text style={styles.errorText}>{fieldErrors.surname}</Text>}
                    </View>

                    <View style={[styles.fieldGroup, { flex: 1.2 }]}>
                      <Text style={styles.label}>Suffix</Text>
                      <View style={styles.suffixSelector}>
                        {SUFFIX_OPTIONS.map((sfx) => (
                          <TouchableOpacity
                            key={sfx}
                            onPress={() => setSuffix(sfx)}
                            style={[
                              styles.suffixChip,
                              suffix === sfx && styles.suffixChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.suffixChipText,
                                suffix === sfx && styles.suffixChipTextActive,
                              ]}
                            >
                              {sfx}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Birthdate */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Birthdate * (YYYY-MM-DD)</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "birthdate" && styles.inputWrapperFocused,
                        fieldErrors.birthdate && styles.inputWrapperError,
                      ]}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={birthdate}
                        onChangeText={(t) => {
                          setBirthdate(t);
                          clearFieldError("birthdate");
                        }}
                        onFocus={() => setFocusedField("birthdate")}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="numbers-and-punctuation"
                        maxLength={10}
                        returnKeyType="next"
                      />
                    </View>
                    {fieldErrors.birthdate && <Text style={styles.errorText}>{fieldErrors.birthdate}</Text>}
                  </View>

                  {/* Gender */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Gender *</Text>
                    <View style={styles.optionsRow}>
                      {(["Male", "Female", "Prefer not to say"] as const).map((g) => (
                        <TouchableOpacity
                          key={g}
                          activeOpacity={0.8}
                          onPress={() => { setGender(g); clearFieldError("gender"); }}
                          style={[
                            styles.optionPill,
                            gender === g && styles.optionPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionPillText,
                              gender === g && styles.optionPillTextActive,
                            ]}
                          >
                            {g}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {fieldErrors.gender && <Text style={styles.errorText}>{fieldErrors.gender}</Text>}
                  </View>

                  {/* Commuter Category */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Commuter Category *</Text>
                    <View style={styles.categoryGrid}>
                      {COMMUTER_TYPE_OPTIONS.map((cat) => {
                        const isSelected = appliedType === cat.value;
                        return (
                          <TouchableOpacity
                            key={cat.value}
                            activeOpacity={0.8}
                            onPress={() => { setAppliedType(cat.value); clearFieldError("appliedType"); clearFieldError("id"); }}
                            style={[
                              styles.categoryCard,
                              isSelected && styles.categoryCardActive,
                            ]}
                          >
                            <View style={styles.categoryCardHeader}>
                              <Text
                                style={[
                                  styles.categoryCardTitle,
                                  isSelected && styles.categoryCardTitleActive,
                                ]}
                              >
                                {cat.label}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={18} color="#62A0EA" />
                              )}
                            </View>
                            <Text style={styles.categoryCardDesc}>{cat.description}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {fieldErrors.appliedType && <Text style={styles.errorText}>{fieldErrors.appliedType}</Text>}
                  </View>
                </View>
              )}

              {/* ══════════════ STEP 2: CONTACT & VERIFICATION ══════════════ */}
              {step === 2 && (
                <View style={styles.formSection}>
                  {/* Email */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Email Address *</Text>
                      {isEmailVerified && (
                        <View style={styles.verifiedTag}>
                          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                          <Text style={styles.verifiedTagText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "email" && styles.inputWrapperFocused,
                        fieldErrors.email && styles.inputWrapperError,
                      ]}
                    >
                      <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          clearFieldError("email");
                          if (isEmailVerified) setIsEmailVerified(false);
                        }}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        returnKeyType="next"
                      />
                    </View>
                    {fieldErrors.email ? (
                      <Text style={styles.errorText}>{fieldErrors.email}</Text>
                    ) : (
                      <Text style={styles.helperText}>
                        We will email a 6-digit code to verify this address.
                      </Text>
                    )}
                  </View>

                  {/* Contact Number */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mobile Contact Number *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "contactNumber" && styles.inputWrapperFocused,
                        fieldErrors.contactNumber && styles.inputWrapperError,
                      ]}
                    >
                      <Ionicons name="call-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={contactNumber}
                        onChangeText={(t) => {
                          setContactNumber(t);
                          clearFieldError("contactNumber");
                        }}
                        onFocus={() => setFocusedField("contactNumber")}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="phone-pad"
                        maxLength={11}
                        returnKeyType="done"
                      />
                    </View>
                    {fieldErrors.contactNumber && (
                      <Text style={styles.errorText}>{fieldErrors.contactNumber}</Text>
                    )}
                  </View>

                  {/* ID Upload Box */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      {appliedType === "REGULAR" && !idUploadRequired
                        ? "Upload Valid Government ID (Optional)"
                        : appliedType ? ID_UPLOAD_LABELS[appliedType] : "Upload Valid ID (choose a commuter category first)"}
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShowIdChoiceModal(true)}
                      style={[
                        styles.idUploadBox,
                        Boolean(idFileName) && styles.idUploadBoxSuccess,
                        Boolean(fieldErrors.id) && styles.idUploadBoxError,
                      ]}
                    >
                      {idFileName ? (
                        <View style={styles.idUploadSuccessState}>
                          <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                          <Text style={styles.idFileNameText} numberOfLines={1}>
                            {idFileName}
                          </Text>
                          <Text style={styles.idTapChangeText}>Tap to replace ID</Text>
                        </View>
                      ) : (
                        <View style={styles.idUploadEmptyState}>
                          <Ionicons name="cloud-upload-outline" size={36} color="#38BDF8" />
                          <Text style={styles.idUploadPrompt}>
                            Tap to attach your valid ID
                          </Text>
                          <Text style={styles.idUploadSub}>
                            Take photo or upload image (JPG, PNG, WebP • max 5MB)
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {fieldErrors.id ? (
                      <Text style={styles.errorText}>{fieldErrors.id}</Text>
                    ) : (
                      <Text style={styles.helperText}>
                        {appliedType === "REGULAR" && !idUploadRequired
                          ? "Optional for regular commuters. Required for Student, Senior Citizen, and PWD applications."
                          : "Required for identity verification and discount approval."}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* ══════════════ STEP 3: CONFIRM YOUR EMAIL ══════════════ */}
              {step === 3 && (
                <View style={styles.formSection}>
                  {/* Email Sent Notice Banner */}
                  <View style={styles.otpNoticeBanner}>
                    <Ionicons name="mail" size={20} color="#38BDF8" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.otpNoticeText}>
                        Code sent to <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>{email}</Text>
                      </Text>
                      <TouchableOpacity onPress={() => setStep(2)}>
                        <Text style={styles.otpWrongEmailLink}>
                          Wrong address? Go back and change it
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 6-Digit Code Input */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>6-Digit Verification Code *</Text>
                    <View style={styles.codeInputWrapper}>
                      <TextInput
                        style={styles.codeInput}
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                      />
                    </View>
                  </View>

                  {/* Resend Ticker */}
                  <View style={styles.resendRow}>
                    <Text style={styles.resendPrompt}>Did not receive the email? </Text>
                    {resendIn > 0 ? (
                      <Text style={styles.resendCooldown}>Resend in {resendIn}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleRequestCode} disabled={isSendingCode}>
                        <Text style={styles.resendAction}>
                          {isSendingCode ? "Sending..." : "Send new code"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.helperText}>
                    Check your spam folder if it has not arrived. Code expires in 15 minutes.
                  </Text>
                </View>
              )}

              {/* ══════════════ STEP 4: ACCOUNT CREDENTIALS ══════════════ */}
              {step === 4 && (
                <View style={styles.formSection}>
                  {/* Username */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Username *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "username" && styles.inputWrapperFocused,
                        fieldErrors.username && styles.inputWrapperError,
                      ]}
                    >
                      <Ionicons name="at-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={(t) => {
                          setUsername(t);
                          clearFieldError("username");
                        }}
                        onFocus={() => setFocusedField("username")}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="none"
                        maxLength={REGISTRATION_USERNAME_MAX_LENGTH}
                        returnKeyType="next"
                      />
                    </View>
                    {fieldErrors.username && <Text style={styles.errorText}>{fieldErrors.username}</Text>}
                  </View>

                  {/* Password */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Password *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "password" && styles.inputWrapperFocused,
                        fieldErrors.password && styles.inputWrapperError,
                      ]}
                    >
                      <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingRight: 40 }]}
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(t) => {
                          setPassword(t);
                          clearFieldError("password");
                        }}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="none"
                        returnKeyType="next"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    </View>
                    {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}

                    {/* Live Password Rules Checklist */}
                    <View style={styles.passwordRulesList}>
                      {PASSWORD_RULES.map((rule) => {
                        const isMet = rule.test(password);
                        return (
                          <View key={rule.id} style={styles.passwordRuleItem}>
                            <Ionicons
                              name={isMet ? "checkmark-circle" : "ellipse-outline"}
                              size={15}
                              color={isMet ? "#10B981" : "#64748B"}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.passwordRuleText,
                                isMet && styles.passwordRuleTextMet,
                              ]}
                            >
                              {rule.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "passwordConfirmation" && styles.inputWrapperFocused,
                        fieldErrors.passwordConfirmation && styles.inputWrapperError,
                      ]}
                    >
                      <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingRight: 40 }]}
                        secureTextEntry={!showConfirmPassword}
                        value={passwordConfirmation}
                        onChangeText={(t) => {
                          setPasswordConfirmation(t);
                          clearFieldError("passwordConfirmation");
                        }}
                        onFocus={() => setFocusedField("passwordConfirmation")}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={handleSubmitRegistration}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeBtn}
                        accessibilityRole="button"
                        accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    </View>
                    {fieldErrors.passwordConfirmation && (
                      <Text style={styles.errorText}>{fieldErrors.passwordConfirmation}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* ══════════════ ACTION CONTROLS ══════════════ */}
              <View style={styles.actionsContainer}>
                {step === 1 && (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      if (validateCurrentStep(1)) {
                        setErrorMessage(null);
                        setStep(2);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryButtonText}>Next Step</Text>
                  </TouchableOpacity>
                )}

                {step === 2 && (
                  <TouchableOpacity
                    style={[styles.primaryButton, isSendingCode && styles.primaryButtonDisabled]}
                    onPress={handleRequestCode}
                    disabled={isSendingCode}
                    activeOpacity={0.85}
                  >
                    {isSendingCode ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {isEmailVerified ? "Next Step" : "Send Verification Code"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {step === 3 && (
                  <TouchableOpacity
                    style={[styles.primaryButton, isVerifyingCode && styles.primaryButtonDisabled]}
                    onPress={handleVerifyCode}
                    disabled={isVerifyingCode}
                    activeOpacity={0.85}
                  >
                    {isVerifyingCode ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                    )}
                  </TouchableOpacity>
                )}

                {step === 4 && (
                  <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                    onPress={handleSubmitRegistration}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* Back to previous step link */}
                {step > 1 && (
                  <TouchableOpacity
                    onPress={() => {
                      setErrorMessage(null);
                      setStep(step === 4 ? 2 : step - 1);
                    }}
                    style={styles.prevStepBtn}
                    disabled={loading || isSendingCode || isVerifyingCode}
                  >
                    <Ionicons name="arrow-back" size={15} color="#94A3B8" style={{ marginRight: 4 }} />
                    <Text style={styles.prevStepText}>Previous Step</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Already have an account row */}
              <View style={styles.loginPromptRow}>
                <Text style={styles.loginPromptText}>Already have an account? </Text>
                <TouchableOpacity onPress={onGoToLogin} disabled={loading}>
                  <Text style={styles.loginPromptLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>

        {/* Registration terms and consent modal */}
        <RegistrationConsent
          visible={showRegistrationTerms}
          value={agreement}
          onChange={setAgreement}
          disabled={loading}
          error={errorMessage}
          onBack={() => { if (!loading) { setShowRegistrationTerms(false); setErrorMessage(null); } }}
          onConfirm={confirmRegistration}
        />

        {/* ID Upload / Capture Choice Modal */}
        <Modal
          visible={showIdChoiceModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowIdChoiceModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.choiceModalCard}>
              <Text style={styles.choiceModalTitle}>Add Valid ID Document</Text>
              <Text style={styles.choiceModalSub}>
                Choose how you want to submit your identification document:
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleSelectIdOption("CAMERA")}
                style={styles.choiceOptionBtn}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.choiceOptionBtnText}>Take a Picture of Your ID</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleSelectIdOption("FILE")}
                style={[styles.choiceOptionBtn, styles.choiceOptionBtnSecondary]}
              >
                <Ionicons name="image-outline" size={20} color="#62A0EA" style={{ marginRight: 10 }} />
                <Text style={[styles.choiceOptionBtnText, { color: "#62A0EA" }]}>
                  Upload / Choose Image File
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleSelectIdOption("SAMPLE")}
                style={[styles.choiceOptionBtn, styles.choiceOptionBtnGhost]}
              >
                <Ionicons name="document-text-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <Text style={styles.choiceOptionGhostText}>Use Demo / Testing ID</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowIdChoiceModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
};

const baseStyles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#050F1A",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  scrollContentTablet: {
    alignItems: "center",
  },
  formWrapper: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.2,
  },
  brandPill: {
    backgroundColor: "rgba(26, 95, 180, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandPillText: {
    color: "#62A0EA",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  // Hero Section
  heroSection: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    lineHeight: 19,
  },
  infoChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  infoChipText: {
    fontSize: 11,
    color: "#E2E8F0",
    fontWeight: "600",
  },

  // Stepper Indicator (1 to 4)
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#1A5FB4",
    borderColor: "#38BDF8",
    borderWidth: 2,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  stepCircleCompleted: {
    backgroundColor: "#1A5FB4",
    borderColor: "#1A5FB4",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  stepNumberActive: {
    color: "#FFFFFF",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginHorizontal: 6,
  },
  stepLineCompleted: {
    backgroundColor: "#1A5FB4",
  },

  // Main Card Surface
  card: {
    backgroundColor: "#071A2E",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  stepTitleSection: {
    marginBottom: 18,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 3,
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#FCA5A5",
    fontWeight: "600",
    lineHeight: 18,
  },

  // Form Fields
  formSection: {
    gap: 14,
  },
  fieldGroup: {
    marginBottom: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#34D399",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    backgroundColor: "#0B1E34",
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: "#1A5FB4",
  },
  inputWrapperError: {
    borderColor: "#EF4444",
  },
  inputIcon: {
    marginRight: 8,
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
  errorText: {
    fontSize: 12,
    color: "#FCA5A5",
    fontWeight: "600",
    marginTop: 4,
  },
  helperText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  // Step 1 Name & Suffix Layout
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  suffixSelector: {
    flexDirection: "row",
    gap: 4,
    height: 48,
    alignItems: "center",
  },
  suffixChip: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "#0B1E34",
  },
  suffixChipActive: {
    backgroundColor: "#1A5FB4",
    borderColor: "#1A5FB4",
  },
  suffixChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  suffixChipTextActive: {
    color: "#FFFFFF",
  },

  // Gender Options
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "#0B1E34",
    alignItems: "center",
    justifyContent: "center",
  },
  optionPillActive: {
    borderColor: "#1A5FB4",
    backgroundColor: "rgba(26, 95, 180, 0.2)",
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  optionPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // Commuter Category Grid
  categoryGrid: {
    gap: 8,
  },
  categoryCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "#0B1E34",
  },
  categoryCardActive: {
    borderColor: "#1A5FB4",
    backgroundColor: "rgba(26, 95, 180, 0.2)",
  },
  categoryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  categoryCardTitleActive: {
    color: "#62A0EA",
  },
  categoryCardDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },

  // ID Upload Box
  idUploadBox: {
    height: 135,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(56, 189, 248, 0.35)",
    backgroundColor: "#0B1E34",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  idUploadBoxSuccess: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderStyle: "solid",
  },
  idUploadBoxError: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  idUploadEmptyState: {
    alignItems: "center",
    gap: 6,
  },
  idUploadPrompt: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  idUploadSub: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },
  idUploadSuccessState: {
    alignItems: "center",
    gap: 4,
  },
  idFileNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34D399",
    maxWidth: 240,
  },
  idTapChangeText: {
    fontSize: 11,
    color: "#6EE7B7",
    fontWeight: "600",
  },

  // Step 3 OTP Notice & Code Input
  otpNoticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(26, 95, 180, 0.15)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
  },
  otpNoticeText: {
    fontSize: 13,
    color: "#E2E8F0",
  },
  otpWrongEmailLink: {
    fontSize: 11,
    fontWeight: "700",
    color: "#62A0EA",
    marginTop: 3,
  },
  codeInputWrapper: {
    borderWidth: 2,
    borderColor: "#1A5FB4",
    borderRadius: 12,
    backgroundColor: "#0B1E34",
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  codeInput: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 10,
    textAlign: "center",
    width: "100%",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  resendPrompt: {
    fontSize: 12,
    color: "#94A3B8",
  },
  resendCooldown: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  resendAction: {
    fontSize: 12,
    fontWeight: "700",
    color: "#62A0EA",
  },

  // Step 4 Password Rules Checklist
  passwordRulesList: {
    marginTop: 10,
    gap: 6,
  },
  passwordRuleItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordRuleText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  passwordRuleTextMet: {
    color: "#34D399",
    fontWeight: "600",
  },

  // Action Buttons
  actionsContainer: {
    marginTop: 22,
    gap: 10,
    alignItems: "center",
  },
  primaryButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#1A5FB4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A5FB4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  prevStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  prevStepText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  loginPromptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  loginPromptText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  loginPromptLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#62A0EA",
  },

  // Success Screen
  successContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successCard: {
    backgroundColor: "#071A2E",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  successBody: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  successSubtext: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },

  // Choice Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  choiceModalCard: {
    backgroundColor: "#071A2E",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 12,
  },
  choiceModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  choiceModalSub: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 4,
    lineHeight: 18,
  },
  choiceOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1A5FB4",
    paddingHorizontal: 16,
  },
  choiceOptionBtnSecondary: {
    backgroundColor: "#0B1E34",
    borderWidth: 1.5,
    borderColor: "rgba(98, 160, 234, 0.35)",
  },
  choiceOptionBtnGhost: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  choiceOptionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  choiceOptionGhostText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  modalCancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
});
