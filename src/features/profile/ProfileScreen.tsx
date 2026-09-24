import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { commuterService } from "../../core/api/commuter-service";
import { authService } from "../../core/api/auth-service";
import type { User, CommuterProfile } from "../../core/domain/types";

interface ProfileScreenProps {
  onLogout: () => void;
  onOpenTour?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout, onOpenTour }) => {
  const [profile, setProfile] = useState<CommuterProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [contactNumber, setContactNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Change password modal & 2-step verification
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"form" | "code">("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await commuterService.getProfile();
      setUser(data.user);
      setProfile(data.profile);
      setContactNumber(data.profile?.contact_number || "");
    } catch (err: any) {
      setLoadError("Couldn't load profile. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Resend code countdown timer
  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setResendSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSecondsLeft]);

  // Transient success message auto-dismiss
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleSaveProfile = async () => {
    if (!contactNumber.trim()) {
      setSaveError("Please enter a contact number.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await commuterService.updateProfile({
        contact_number: contactNumber.trim(),
      });
      setProfile((prev) =>
        prev ? { ...prev, contact_number: updated.contact_number } : null
      );
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPasswordCode = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill out all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    try {
      await commuterService.requestPasswordChangeCode();
      setPasswordStep("code");
      setResendSecondsLeft(60);
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not send verification code."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleConfirmPassword = async () => {
    if (verificationCode.trim().length !== 6) {
      setPasswordError("Please enter the 6-digit verification code.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    try {
      await commuterService.confirmPasswordChange({
        code: verificationCode.trim(),
        new_password: newPassword,
        new_password_confirmation: confirmNewPassword,
      });
      setShowPasswordModal(false);
      setPasswordStep("form");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setVerificationCode("");
      setSuccessMessage("Password changed successfully!");
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.message ||
          err?.message ||
          "Invalid code or password change failed."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordStep("form");
    setPasswordError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setVerificationCode("");
  };

  if (loading) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#62A0EA" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  if (loadError || !profile) {
    return (
      <View style={styles.centeredScreen}>
        <View style={styles.errorIconCircle}>
          <Ionicons name="alert-circle-outline" size={32} color="#F87171" />
        </View>
        <Text style={styles.errorTitle}>Couldn&apos;t load profile</Text>
        <Text style={styles.errorSubtitle}>{loadError}</Text>
        <TouchableOpacity
          onPress={fetchProfile}
          style={styles.primaryButton}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const firstName = profile.first_name || user?.name?.split(" ")[0] || "Commuter";
  const surname = profile.surname || user?.name?.split(" ")[1] || "";
  const initialFirst = firstName[0] || "C";
  const initialLast = surname[0] || "";
  const commuterType = (profile.commuter_type || "REGULAR").toUpperCase();
  const accountStatus = (profile.account_status || "ACTIVE").toUpperCase();
  const discountPercentage = commuterType === "REGULAR" ? 0 : 20;

  const getStatusBadge = () => {
    if (accountStatus === "ACTIVE" || accountStatus === "APPROVED") {
      return {
        text: "Verified",
        color: "#34D399",
        bg: "rgba(16, 185, 129, 0.1)",
        border: "rgba(16, 185, 129, 0.3)",
      };
    }
    if (accountStatus.includes("PENDING")) {
      return {
        text: "Pending Verification",
        color: "#FBBF24",
        bg: "rgba(245, 158, 11, 0.1)",
        border: "rgba(245, 158, 11, 0.3)",
      };
    }
    if (accountStatus.includes("REJECTED")) {
      return {
        text: "Rejected",
        color: "#F87171",
        bg: "rgba(239, 68, 68, 0.1)",
        border: "rgba(239, 68, 68, 0.3)",
      };
    }
    return {
      text: accountStatus,
      color: "#CBD5E1",
      bg: "rgba(148, 163, 184, 0.1)",
      border: "rgba(148, 163, 184, 0.3)",
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header & Avatar Row */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {initialFirst}
              {initialLast}
            </Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.fullName}>
              {firstName} {surname}
            </Text>
            <Text style={styles.username}>@{profile.username || "commuter"}</Text>
            <View style={styles.pillsRow}>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: statusBadge.bg,
                    borderColor: statusBadge.border,
                  },
                ]}
              >
                <Text style={[styles.statusPillText, { color: statusBadge.color }]}>
                  {statusBadge.text}
                </Text>
              </View>

              <View style={styles.discountPill}>
                <Text style={styles.discountPillText}>
                  {commuterType}
                  {discountPercentage > 0 && ` (${discountPercentage}% Off)`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transient success banner */}
        {successMessage && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#34D399" />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        )}

        {/* Verification Alert Banner */}
        {accountStatus.includes("PENDING") && (
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle" size={18} color="#FBBF24" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningBannerTitle}>Verification Pending</Text>
              <Text style={styles.warningBannerDesc}>
                Your discount is on hold until an admin verifies your uploaded ID.
              </Text>
            </View>
          </View>
        )}

        {/* Discount Rejected Banner */}
        {accountStatus.includes("REJECTED") && (
          <View style={styles.dangerBanner}>
            <Ionicons name="close-circle" size={18} color="#F87171" />
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerBannerTitle}>
                Discount Application Rejected
              </Text>
              <Text style={styles.dangerBannerDesc}>
                The ID you uploaded was not approved. You are currently classified
                as a Regular commuter.
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            onPress={() => {
              if (isEditing) {
                setIsEditing(false);
                setContactNumber(profile.contact_number || "");
                setSaveError(null);
              } else {
                setIsEditing(true);
              }
            }}
            style={[
              styles.actionButton,
              isEditing ? styles.actionButtonNeutral : styles.actionButtonPrimary,
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.actionButtonText,
                isEditing
                  ? styles.actionButtonTextNeutral
                  : styles.actionButtonTextPrimary,
              ]}
            >
              {isEditing ? "Cancel Editing" : "Edit Profile"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowPasswordModal(true)}
            style={[styles.actionButton, styles.actionButtonNeutral]}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonTextNeutral}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information Form Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardHeader}>Personal Information</Text>

          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={firstName}
                editable={false}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Surname</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={surname}
                editable={false}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Birthdate</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={
                  profile.birthdate
                    ? new Date(profile.birthdate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"
                }
                editable={false}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Commuter Type</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={commuterType}
                editable={false}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.email || "—"}
                editable={false}
              />
              {isEditing && (
                <Text style={styles.fieldHint}>
                  Email changes are not saved — only contact number is editable.
                </Text>
              )}
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Contact Number</Text>
              <TextInput
                style={[
                  styles.input,
                  isEditing ? styles.inputEnabled : styles.inputDisabled,
                ]}
                value={contactNumber}
                onChangeText={setContactNumber}
                editable={isEditing}
                maxLength={11}
                placeholder="09171234567"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {saveError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{saveError}</Text>
            </View>
          )}

          {isEditing && (
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              style={styles.saveChangesButton}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveChangesButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* App Walkthrough Tour Card */}
        {onOpenTour && (
          <TouchableOpacity
            onPress={onOpenTour}
            style={styles.tourCard}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Replay App Guide and Walkthrough"
          >
            <View style={styles.tourCardLeft}>
              <View style={styles.tourIconCircle}>
                <Ionicons name="compass-outline" size={22} color="#62A0EA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tourTitle}>App Features & Guide</Text>
                <Text style={styles.tourSubtitle}>
                  Replay the first-installation walkthrough tour
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.4)" />
          </TouchableOpacity>
        )}

        {/* Log Out Button */}
        <TouchableOpacity
          onPress={() => setShowLogoutConfirm(true)}
          style={styles.logoutButton}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- LOG OUT CONFIRMATION MODAL --- */}
      <Modal visible={showLogoutConfirm} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModalCard}>
            <View style={styles.dangerIconCircle}>
              <Ionicons name="log-out-outline" size={28} color="#F87171" />
            </View>
            <Text style={styles.confirmModalTitle}>Log out?</Text>
            <Text style={styles.confirmModalDesc}>
              You&apos;ll need to sign in again to book rides, scan receipts and
              view your rewards.
            </Text>

            <View style={styles.confirmModalButtonsRow}>
              <TouchableOpacity
                onPress={() => setShowLogoutConfirm(false)}
                style={[styles.neutralModalButton, { flex: 1 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.neutralModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setShowLogoutConfirm(false);
                  await authService.logout();
                  onLogout();
                }}
                style={[styles.dangerModalButton, { flex: 1 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.dangerModalButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- CHANGE PASSWORD MODAL --- */}
      <Modal visible={showPasswordModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.passwordModalCard}>
            <View style={styles.passwordModalHeader}>
              <Text style={styles.passwordModalTitle}>Change Password</Text>
              <Text style={styles.passwordModalSubtitle}>
                {passwordStep === "form"
                  ? "Ensure your account stays secure"
                  : "Confirm it's you to finish changing your password"}
              </Text>
            </View>

            {passwordStep === "form" ? (
              <View style={styles.passwordModalBody}>
                {passwordError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{passwordError}</Text>
                  </View>
                )}

                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Current Password</Text>
                  <TextInput
                    style={styles.modalInput}
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>New Password</Text>
                  <TextInput
                    style={styles.modalInput}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                  />
                  <Text style={styles.fieldHint}>
                    Min 8 characters, with letters and numbers.
                  </Text>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Confirm New Password</Text>
                  <TextInput
                    style={styles.modalInput}
                    secureTextEntry
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    onPress={closePasswordModal}
                    style={[styles.neutralModalButton, { flex: 1 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.neutralModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRequestPasswordCode}
                    disabled={
                      isChangingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmNewPassword
                    }
                    style={[
                      styles.primaryButton,
                      { flex: 1, marginTop: 0 },
                      (!currentPassword || !newPassword || !confirmNewPassword) &&
                        styles.disabledButton,
                    ]}
                    activeOpacity={0.8}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.passwordModalBody}>
                {passwordError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{passwordError}</Text>
                  </View>
                )}

                <Text style={styles.codeInstructions}>
                  We emailed a 6-digit code to your registered address. Enter it
                  below to finish changing your password.
                </Text>

                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Verification Code</Text>
                  <TextInput
                    style={[styles.modalInput, styles.codeMonoInput]}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={verificationCode}
                    onChangeText={(val) =>
                      setVerificationCode(val.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                  />
                </View>

                <View style={styles.resendRow}>
                  <TouchableOpacity
                    onPress={() => setPasswordStep("form")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.backLinkText}>← Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleRequestPasswordCode}
                    disabled={resendSecondsLeft > 0 || isChangingPassword}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.resendLinkText,
                        resendSecondsLeft > 0 && styles.resendDisabled,
                      ]}
                    >
                      {resendSecondsLeft > 0
                        ? `Resend code in ${resendSecondsLeft}s`
                        : "Resend code"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    onPress={closePasswordModal}
                    style={[styles.neutralModalButton, { flex: 1 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.neutralModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmPassword}
                    disabled={
                      isChangingPassword || verificationCode.length !== 6
                    }
                    style={[
                      styles.primaryButton,
                      { flex: 1, marginTop: 0 },
                      verificationCode.length !== 6 && styles.disabledButton,
                    ]}
                    activeOpacity={0.8}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050F1A",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: "#050F1A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 10,
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
    marginBottom: 18,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A5FB4",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  profileMeta: {
    flex: 1,
  },
  fullName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  username: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  discountPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(98, 160, 234, 0.1)",
    borderColor: "rgba(98, 160, 234, 0.3)",
  },
  discountPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#62A0EA",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#34D399",
  },
  warningBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FBBF24",
  },
  warningBannerDesc: {
    fontSize: 11,
    color: "rgba(251, 191, 36, 0.7)",
    marginTop: 2,
    lineHeight: 15,
  },
  dangerBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  dangerBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F87171",
  },
  dangerBannerDesc: {
    fontSize: 11,
    color: "rgba(248, 113, 113, 0.7)",
    marginTop: 2,
    lineHeight: 15,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPrimary: {
    backgroundColor: "#1A5FB4",
  },
  actionButtonNeutral: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionButtonTextPrimary: {
    color: "#FFFFFF",
  },
  actionButtonTextNeutral: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  infoCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
  },
  infoCardHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  formGrid: {
    gap: 12,
  },
  formField: {
    width: "100%",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.3)",
    marginTop: 4,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  inputDisabled: {
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    color: "rgba(255, 255, 255, 0.3)",
  },
  inputEnabled: {
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    color: "#FFFFFF",
  },
  errorBox: {
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  errorBoxText: {
    fontSize: 11,
    color: "#F87171",
    fontWeight: "600",
  },
  saveChangesButton: {
    backgroundColor: "#FF6D3A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#FF6D3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveChangesButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  dangerIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  confirmModalDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 20,
  },
  confirmModalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  neutralModalButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  neutralModalButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  dangerModalButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerModalButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  passwordModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#071A2E",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  passwordModalHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  passwordModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  passwordModalSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 2,
  },
  passwordModalBody: {
    padding: 18,
  },
  modalField: {
    marginBottom: 12,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#FFFFFF",
  },
  codeMonoInput: {
    textAlign: "center",
    fontSize: 18,
    fontFamily: "monospace",
    letterSpacing: 8,
  },
  codeInstructions: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 16,
    marginBottom: 14,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  backLinkText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
  resendLinkText: {
    fontSize: 12,
    color: "#62A0EA",
    fontWeight: "600",
  },
  resendDisabled: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#1A5FB4",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.4,
  },
  tourCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tourCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  tourIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(26, 95, 180, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tourTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  tourSubtitle: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    lineHeight: 15,
  },
});
