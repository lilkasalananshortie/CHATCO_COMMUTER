import React, { useState, useEffect, useCallback, useRef } from "react";
import { Text } from "../../shared/ui/BrandText";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { maskedEmail } from "./profile-privacy";
import { commuterService } from "../../core/api/commuter-service";
import { authService } from "../../core/api/auth-service";
import type { User, CommuterProfile } from "../../core/domain/types";
import { APPLICATION_LABELS, type ApplicationState } from "../discount-application/application-types";
import { pickProfilePhoto, profilePhotoForm } from "./profile-photo";
import { ChangeEmailModal } from "./ChangeEmailModal";
import { LegalSupportCard } from "../../shared/legal/LegalSupportCard";
import { ProfileIcon } from "./ProfileIcon";
import { ProfileIdentityBackground } from "./ProfileIcon";
import { profileLayout } from "./profile-layout";

interface ProfileScreenProps {
  onLogout: () => void;
  onEmailChanged?: (email: string) => void;
  onProfileSaved?: (profile: CommuterProfile) => void;
  onOpenTour?: () => void;
  serverProfile?: CommuterProfile | null;
  discountApplicationState?: ApplicationState | null;
  discountApplicationLoading?: boolean;
  discountApplicationError?: string;
  onOpenDiscountApplication?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout, onEmailChanged, onProfileSaved, onOpenTour, serverProfile, discountApplicationState = null, discountApplicationLoading = false, discountApplicationError = "", onOpenDiscountApplication }) => {
  const { appearance, setAppearance, isLight = appearance === "light", colors = commuterColors } = useCommuterTheme();
  const styles = createProfileStyles(colors, isLight);
  const mounted = useRef(true);
  const mutation = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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
  const [visiblePasswordField, setVisiblePasswordField] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const handlePhoto = async () => {
    if (mutation.current) return;
    mutation.current = true;
    setPhotoUploading(true); setPhotoError(null);
    try {
      const photo = await pickProfilePhoto();
      if (!photo || !mounted.current) return;
      const updated = await commuterService.uploadProfilePhoto(profilePhotoForm(photo));
      if (!mounted.current) return;
      setProfile(previous => previous ? { ...previous, profile_image_url: updated.profile_image_url } : updated);
      onProfileSaved?.(updated);
      setSuccessMessage("Profile photo updated.");
    } catch (reason) {
      if (mounted.current) setPhotoError(reason instanceof Error ? reason.message : "Couldn't upload your photo. Please try again.");
    } finally {
      mutation.current = false;
      if (mounted.current) setPhotoUploading(false);
    }
  };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await commuterService.getProfile();
      if (!mounted.current) return;
      setUser(data.user);
      setProfile(data.profile);
      setContactNumber(data.profile?.contact_number || "");
    } catch (err: any) {
      // Never invent identity, phone or verification status after a failed read.
      if (mounted.current) setLoadError(err?.message || "Couldn't load profile. Check your connection.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (serverProfile) { setProfile(serverProfile); setContactNumber(serverProfile.contact_number || ""); }
  }, [serverProfile]);

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
    if (mutation.current) return;
    if (!contactNumber.trim()) {
      setSaveError("Please enter a contact number.");
      return;
    }
    mutation.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await commuterService.updateProfile({
        contact_number: contactNumber.trim(),
      });
      if (!mounted.current) return;
      setProfile(updated);
      setContactNumber(updated.contact_number || "");
      onProfileSaved?.(updated);
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");
    } catch (err: any) {
      if (!mounted.current) return;
      setSaveError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update profile."
      );
    } finally {
      mutation.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  const handleRequestPasswordCode = async () => {
    if (mutation.current) return;
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

    mutation.current = true;
    setIsChangingPassword(true);
    setPasswordError(null);
    try {
      await commuterService.requestPasswordChangeCode({ current_password: currentPassword, password: newPassword, password_confirmation: confirmNewPassword });
      if (!mounted.current) return;
      setPasswordStep("code");
      setResendSecondsLeft(60);
    } catch (err: any) {
      if (!mounted.current) return;
      setPasswordError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not send verification code."
      );
    } finally {
      mutation.current = false;
      if (mounted.current) setIsChangingPassword(false);
    }
  };

  const handleConfirmPassword = async () => {
    if (mutation.current) return;
    if (verificationCode.trim().length !== 6) {
      setPasswordError("Please enter the 6-digit verification code.");
      return;
    }

    mutation.current = true;
    setIsChangingPassword(true);
    setPasswordError(null);
    try {
      await commuterService.confirmPasswordChange({
        code: verificationCode.trim(),
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmNewPassword,
      });
      if (!mounted.current) return;
      setShowPasswordModal(false);
      setPasswordStep("form");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setVerificationCode("");
      setSuccessMessage("Password changed successfully!");
    } catch (err: any) {
      if (!mounted.current) return;
      setPasswordError(
        err?.response?.data?.message ||
          err?.message ||
          "Invalid code or password change failed."
      );
    } finally {
      mutation.current = false;
      if (mounted.current) setIsChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    if (mutation.current) return;
    setShowPasswordModal(false);
    setPasswordStep("form");
    setPasswordError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setVerificationCode("");
    setVisiblePasswordField(null);
  };

  const signOut = async () => {
    if (mutation.current) return;
    mutation.current = true;
    try {
      const result = await authService.logout();
      onLogout();
      if (!result.serverRevoked) Alert.alert("Signed out on this device", "The server could not confirm session revocation. Your local login has been removed.");
    } finally { mutation.current = false; }
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
        <TouchableOpacity onPress={() => void signOut()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Log Out</Text></TouchableOpacity>
      </View>
    );
  }

  const firstName = profile.first_name || user?.name?.split(" ")[0] || "Commuter";
  const surname = profile.surname || user?.name?.split(" ")[1] || "";
  const commuterType = (discountApplicationState?.commuter_type ?? profile.commuter_type ?? "REGULAR").toUpperCase();
  const accountStatus = (profile.account_status || "ACTIVE").toUpperCase();
  const effectiveFareType = discountApplicationState?.effective_fare_type ?? profile.effective_fare_type ?? commuterType;
  const discountPercentage = effectiveFareType.toUpperCase() === "REGULAR" ? 0 : 20;

  const getStatusBadge = () => {
    if (accountStatus === "ACTIVE" || accountStatus === "APPROVED") {
      return {
        text: "Verified",
        bg: "#047857",
        border: "#059669",
      };
    }
    if (accountStatus.includes("PENDING")) {
      return {
        text: "Pending Verification",
        bg: "#B45309",
        border: "#D97706",
      };
    }
    if (accountStatus.includes("REJECTED")) {
      return {
        text: "Rejected",
        bg: "#B91C1C",
        border: "#DC2626",
      };
    }
    return {
      text: accountStatus,
      bg: "#475569",
      border: "#64748B",
    };
  };

  const statusBadge = getStatusBadge();
  const commuterTypeLabel = commuterType === "SENIOR" || commuterType === "SENIOR_CITIZEN" ? "Senior Citizen" : commuterType === "PWD" ? "PWD" : commuterType === "STUDENT" ? "Student" : "Regular";
  const iconColor = isLight ? "#1A5FB4" : "#99C1F1";
  const mutedIcon = isLight ? "#9CA3AF" : "rgba(255,255,255,0.4)";
  const application = discountApplicationState?.application;
  const appStatus = discountApplicationState?.status ?? "NOT_APPLIED";
  const openApplication = application && !["CANCELLED", "EXPIRED"].includes(appStatus) ? application : null;
  const applicationStatus = openApplication ? appStatus : "NOT_APPLIED";
  const applicationCategory = openApplication?.requested_type === "STUDENT" ? "Student"
    : openApplication?.requested_type === "PWD" ? "PWD" : "Senior Citizen";
  const applicationCopy = openApplication?.request_type === "RENEWAL"
    ? { text: `Student renewal: ${applicationStatus === "NOT_RENEWED" ? "Not applied" : (APPLICATION_LABELS[applicationStatus] ?? applicationStatus)}`, link: "View Student renewal" }
    : applicationStatus === "PENDING"
      ? { text: "Your discount application is currently under review. Check here for updates on your application status.", link: "View application status" }
      : applicationStatus === "NEEDS_CORRECTION"
        ? { text: `An admin asked for a correction to your ${applicationCategory} discount application. Send corrected documents to continue the review.`, link: "Update your application" }
        : applicationStatus === "REJECTED"
          ? { text: `Your ${applicationCategory} discount application was not approved.`, link: "Apply again" }
          : { text: discountApplicationState ? "Eligible for a Student, PWD, or Senior Citizen discount? Submit your supporting document for verification." : discountApplicationLoading ? "Loading discount application status…" : "Unable to load your discount application status.", link: discountApplicationState ? "Apply for a discount" : "View application status" };

  return (
    <View style={styles.container}>
      <View style={styles.pageHeading}>
        <View style={{ flex: 1 }}><Text style={styles.pageTitle}>My profile</Text><Text style={styles.pageSubtitle}>Your details and account settings.</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Toggle dark and light mode" accessibilityState={{ selected: isLight }} style={styles.themeToggle} onPress={() => { void setAppearance(isLight ? "dark" : "light").catch(() => setSaveError("Could not save appearance. Please retry.")); }}>
          <ProfileIcon name={isLight ? "sun" : "moon"} size={20} color={isLight ? "#D97706" : "#99C1F1"} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.profileHeader}>
          <ProfileIdentityBackground isLight={isLight} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={photoUploading} onPress={() => void handlePhoto()} style={styles.photoColumn}>
            <View style={styles.avatarCircle}>
              {profile.profile_image_url && failedPhotoUrl !== profile.profile_image_url
                ? <Image source={{ uri: profile.profile_image_url }} accessibilityLabel="Your profile photo" style={styles.photoImage} onError={() => setFailedPhotoUrl(profile.profile_image_url ?? null)} />
                : <ProfileIcon name="user-round" size={40} color="#FFFFFF" />}
              <View style={styles.photoBadge}><ProfileIcon name="camera" size={15} color={isLight ? "#FFFFFF" : "#071A2E"} /></View>
            </View>
            <Text style={styles.photoLabel}>{photoUploading ? "Uploading…" : "Change photo"}</Text>
          </TouchableOpacity>
          <View style={styles.profileMeta}>
            <Text style={styles.fullName}>{firstName} {surname}</Text><Text style={styles.username}>@{profile.username || "commuter"}</Text>
            <View style={styles.pillsRow}>
              <View style={[styles.statusPill, { backgroundColor: statusBadge.bg, borderColor: statusBadge.border }]}>
                <ProfileIcon name={accountStatus.includes("PENDING") ? "clock" : accountStatus.includes("REJECTED") ? "shield-alert" : "shield-check"} size={13} color="#FFFFFF" />
                <Text style={styles.statusPillText}>{statusBadge.text}</Text>
              </View>
              <View style={styles.discountPill}><Text style={styles.discountPillText}>{commuterTypeLabel}</Text>{discountPercentage > 0 && <Text style={styles.discountValue}>{discountPercentage}% off</Text>}</View>
            </View>
          </View>
        </View>
        <View>
          <Text style={styles.photoHelp}>Profile photo: JPG, PNG, or WebP. Maximum 3 MB and 4096 × 4096 pixels. Choosing a photo uploads it to your account.</Text>
          {photoError && <Text accessibilityRole="alert" style={[styles.photoHelp, { color: "#FCA5A5", marginTop: 8 }]}>{photoError}</Text>}
          {onOpenDiscountApplication && ["ACTIVE", "APPROVED"].includes(accountStatus) && commuterType === "REGULAR" && (
            <View style={styles.applicationEntry}><Text style={styles.applicationText}>{applicationCopy.text}</Text>
              {(applicationStatus === "REJECTED" || applicationStatus === "NEEDS_CORRECTION") && !!openApplication?.reason && <Text style={[styles.applicationText, { marginTop: 4 }]}>Reason: {openApplication.reason}</Text>}
              {!!discountApplicationError && <Text style={[styles.photoHelp, { marginTop: 4 }]}>Open your application to check its latest status.</Text>}
              {!discountApplicationLoading && <TouchableOpacity onPress={onOpenDiscountApplication} style={styles.applicationLink}><Text style={styles.applicationLinkText}>{applicationCopy.link}</Text></TouchableOpacity>}
            </View>
          )}
        </View>
        {successMessage && <View style={styles.successBanner}><ProfileIcon name="check" size={20} color="#34D399" /><Text style={styles.successBannerText}>{successMessage}</Text></View>}
        {accountStatus.includes("PENDING") && <View style={styles.warningBanner}><ProfileIcon name="shield-alert" size={20} color="#FBBF24" /><View style={{ flex: 1 }}><Text style={styles.warningBannerTitle}>Verification Pending</Text><Text style={styles.warningBannerDesc}>Your discount is on hold until an admin verifies your uploaded ID.</Text></View></View>}
        {accountStatus.includes("REJECTED") && <View style={styles.dangerBanner}><ProfileIcon name="shield-alert" size={20} color="#F87171" /><View style={{ flex: 1 }}><Text style={styles.dangerBannerTitle}>Discount Application Rejected</Text><Text style={styles.dangerBannerDesc}>The ID you uploaded was not approved. You are currently classified as a Regular commuter.</Text></View></View>}
        <View style={styles.infoCard}>
          <View style={styles.cardHeading}><ProfileIcon name="user-round" color={iconColor} /><Text style={styles.cardTitle}>Personal details</Text></View>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}><Text style={styles.fieldLabel}>First name</Text><Text style={styles.fieldValue}>{firstName}</Text></View>
            <View style={styles.detailCell}><Text style={styles.fieldLabel}>Surname</Text><Text style={styles.fieldValue}>{surname}</Text></View>
            <View style={styles.detailCell}><Text style={styles.fieldLabel}>Birthdate</Text><Text style={styles.fieldValue}>{profile.birthdate && Number.isFinite(Date.parse(profile.birthdate)) ? new Date(profile.birthdate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "Not provided"}</Text></View>
            <View style={styles.detailCell}><Text style={styles.fieldLabel}>Commuter type</Text><Text style={styles.fieldValue}>{commuterTypeLabel}</Text></View>
            <View style={styles.detailFull}><Text style={styles.fieldLabel}>Email address</Text><Text style={styles.fieldValue}>{user?.email ? maskedEmail(user.email) : "Not provided"}</Text></View>
          </View>
        </View>
        <View style={styles.infoCard}>
          <View style={styles.contactHeader}><View style={styles.cardHeading}><ProfileIcon name="phone" color={iconColor} /><Text style={styles.cardTitle}>Contact number</Text></View>
            {!isEditing && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit contact number" onPress={() => { setContactNumber(profile.contact_number || ""); setSaveError(null); setIsEditing(true); }} style={styles.contactEdit}><ProfileIcon name="pencil" size={14} color="#FFFFFF" /><Text style={styles.contactEditText}>Edit</Text></TouchableOpacity>}
          </View>
          {isEditing ? <>
            <TextInput accessibilityLabel="Contact number" style={styles.contactInput} value={contactNumber} onChangeText={setContactNumber} editable={!isSaving} maxLength={11} placeholder="09171234567" placeholderTextColor={isLight ? "#9CA3AF" : "rgba(255,255,255,0.3)"} keyboardType="phone-pad" autoFocus />
            {saveError && <Text accessibilityRole="alert" style={[styles.errorBoxText, { marginTop: 8 }]}>{saveError}</Text>}
            <View style={styles.contactActions}><TouchableOpacity onPress={() => { setIsEditing(false); setContactNumber(profile.contact_number || ""); setSaveError(null); }} disabled={isSaving} style={styles.contactCancel}><Text style={styles.contactCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Save contact number" onPress={handleSaveProfile} disabled={isSaving || contactNumber === (profile.contact_number || "")} style={[styles.contactSave, (isSaving || contactNumber === (profile.contact_number || "")) && { opacity: 0.5 }]}>{isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ProfileIcon name="save" size={16} color="#FFFFFF" />}<Text style={styles.contactSaveText}>{isSaving ? "Saving..." : "Save"}</Text></TouchableOpacity>
            </View>
          </> : <Text style={[styles.fieldValue, { marginTop: 8 }]}>{profile.contact_number || "Not provided"}</Text>}
        </View>
        <View style={styles.infoCard}>
          <View style={[styles.cardHeading, { marginBottom: 8 }]}><ProfileIcon name="shield-check" color={iconColor} /><Text style={styles.cardTitle}>Account security</Text></View>
          <TouchableOpacity onPress={() => setShowEmailModal(true)} style={styles.securityRow}><ProfileIcon name="mail" size={18} color={mutedIcon} /><Text style={styles.securityText}>Change email</Text><ProfileIcon name="chevron" size={16} color={mutedIcon} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPasswordModal(true)} style={styles.securityRow}><ProfileIcon name="key" size={18} color={mutedIcon} /><Text style={styles.securityText}>Change password</Text><ProfileIcon name="chevron" size={16} color={mutedIcon} /></TouchableOpacity>
        </View>
        <View style={{ paddingTop: 4 }}><TouchableOpacity onPress={() => setShowLogoutConfirm(true)} style={styles.logoutButton}><ProfileIcon name="logout" size={17} color={isLight ? "#DC2626" : "#F87171"} /><Text style={styles.logoutButtonText}>Log out</Text></TouchableOpacity></View>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showSupport }} onPress={() => setShowSupport(previous => !previous)} style={styles.supportLink}><Text style={styles.supportText}>Help & support</Text><ProfileIcon name="chevron" size={14} color={mutedIcon} /></TouchableOpacity>
        {showSupport && <View>{onOpenTour && <TouchableOpacity onPress={onOpenTour} style={styles.securityRow} accessibilityLabel="Replay App Guide and Walkthrough"><Text style={styles.securityText}>App Features & Guide</Text><ProfileIcon name="chevron" size={16} color={mutedIcon} /></TouchableOpacity>}<LegalSupportCard /></View>}
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
                  await signOut();
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

      <ChangeEmailModal visible={showEmailModal} onClose={() => setShowEmailModal(false)} onChanged={email => {
        setUser(previous => previous ? { ...previous, email } : previous);
        onEmailChanged?.(email);
        void authService.updateStoredEmail(email).catch(() => undefined);
        setSuccessMessage("Email address updated.");
      }} currentEmail={user?.email ?? ""} />
      {/* --- CHANGE PASSWORD MODAL --- */}
      <Modal visible={showPasswordModal} animationType="fade" transparent statusBarTranslucent onRequestClose={() => { if (!isChangingPassword) closePasswordModal(); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.passwordModalCard} accessibilityViewIsModal>
            <View style={styles.passwordModalHeader}>
              <View style={styles.passwordHeaderRow}>
                <View style={styles.passwordHeadingGroup}>
                  <View style={styles.passwordIconTile}><ProfileIcon name="key" size={21} color={isLight ? "#1A5FB4" : "#B6D3F6"} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.passwordEyebrow}>Account security</Text><Text style={styles.passwordModalTitle}>Change password</Text></View>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close change password" disabled={isChangingPassword} onPress={closePasswordModal} style={styles.passwordClose}><ProfileIcon name="x" size={18} color={isLight ? "#6B7280" : "rgba(255,255,255,0.6)"} /></TouchableOpacity>
              </View>
              <Text style={styles.passwordModalSubtitle}>{passwordStep === "form" ? "Choose a new password, then confirm the change with a code sent to your email." : "Verify your email to finish updating your password."}</Text>
            </View>
            <View style={styles.passwordSteps} accessibilityLabel="Password change progress">
              {["New password", "Verify email"].map((label, index) => {
                const active = passwordStep === "form" ? index === 0 : index === 1;
                const complete = passwordStep === "code" && index === 0;
                return <View key={label} style={styles.passwordStepItem}><View style={[styles.passwordStepCircle, active && styles.passwordStepCurrent, complete && styles.passwordStepComplete]}>{complete ? <ProfileIcon name="check" size={14} color={isLight ? "#047857" : "#6EE7B7"} /> : <Text style={[styles.passwordStepNumber, active && styles.passwordStepNumberActive]}>{index + 1}</Text>}</View><Text style={[styles.passwordStepLabel, active && styles.passwordStepLabelActive, complete && styles.passwordStepLabelComplete]}>{label}</Text></View>;
              })}
            </View>
            <ScrollView style={styles.passwordScroll} contentContainerStyle={styles.passwordModalBody} keyboardShouldPersistTaps="handled">
              {passwordError && <Text accessibilityRole="alert" style={styles.passwordError}>{passwordError}</Text>}
              {passwordStep === "form" ? <>
                {([
                  { key: "current", label: "Current password", value: currentPassword, setValue: setCurrentPassword, placeholder: "Enter your current password" },
                  { key: "new", label: "New password", value: newPassword, setValue: setNewPassword, placeholder: "Create a new password" },
                  { key: "confirm", label: "Confirm new password", value: confirmNewPassword, setValue: setConfirmNewPassword, placeholder: "Re-enter your new password" },
                ] as const).map(field => <View key={field.key} style={[styles.passwordField, field.key === "current" && styles.passwordFieldDivider]}>
                  <Text style={styles.passwordFieldLabel}>{field.label}</Text>
                  <View style={styles.passwordInputWrap}><TextInput accessibilityLabel={field.label} autoComplete={field.key === "current" ? "current-password" : "new-password"} style={styles.passwordInput} secureTextEntry={visiblePasswordField !== field.key} value={field.value} onChangeText={field.setValue} placeholder={field.placeholder} placeholderTextColor={isLight ? "#9CA3AF" : "rgba(255,255,255,0.3)"} editable={!isChangingPassword} />
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={visiblePasswordField === field.key ? "Hide password" : "Show password"} onPress={() => setVisiblePasswordField(visiblePasswordField === field.key ? null : field.key)} style={styles.passwordEye}><Ionicons name={visiblePasswordField === field.key ? "eye-off-outline" : "eye-outline"} size={19} color={isLight ? "#6B7280" : "rgba(255,255,255,0.55)"} /></TouchableOpacity>
                  </View>
                </View>)}
                <View style={styles.passwordRules}><View style={styles.passwordRulesTitle}><ProfileIcon name="shield-check" size={15} color={isLight ? "#1A5FB4" : "#B6D3F6"} /><Text style={styles.passwordRulesTitleText}>Your new password needs</Text></View>
                  <View style={styles.passwordRulesGrid}>{[
                    { label: "8+ characters", met: newPassword.length >= 8 },
                    { label: "An uppercase letter", met: /[A-Z]/.test(newPassword) },
                    { label: "A number", met: /[0-9]/.test(newPassword) },
                    { label: "A symbol", met: /[^A-Za-z0-9\s]/.test(newPassword) },
                  ].map(rule => <View key={rule.label} style={styles.passwordRule}><View style={[styles.passwordRuleCheck, rule.met && styles.passwordRuleMet]}>{rule.met && <ProfileIcon name="check" size={10} color={isLight ? "#047857" : "#6EE7B7"} />}</View><Text style={[styles.passwordRuleText, rule.met && styles.passwordRuleTextMet]}>{rule.label}</Text></View>)}</View>
                </View>
              </> : <>
                <View style={styles.inboxCard}><View style={styles.inboxIcon}><ProfileIcon name="mail" size={20} color={isLight ? "#1A5FB4" : "#99C1F1"} /></View><View style={{ flex: 1 }}><Text style={styles.inboxTitle}>Check your inbox</Text><Text style={styles.inboxSubtitle}>We sent a six-digit code to your registered email. Enter it below to confirm your new password.</Text></View></View>
                <Text style={styles.passwordFieldLabel}>Verification code</Text><TextInput accessibilityLabel="Verification code" style={styles.verificationInput} keyboardType="number-pad" maxLength={6} value={verificationCode} onChangeText={value => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" placeholderTextColor={isLight ? "#9CA3AF" : "rgba(255,255,255,0.3)"} editable={!isChangingPassword} />
                <View style={styles.passwordCodeActions}><TouchableOpacity accessibilityRole="button" onPress={() => setPasswordStep("form")} disabled={isChangingPassword} style={styles.passwordTextAction}><Text style={styles.passwordBackText}>← Edit passwords</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={handleRequestPasswordCode} disabled={resendSecondsLeft > 0 || isChangingPassword} style={styles.passwordTextAction}><Text style={[styles.passwordResendText, resendSecondsLeft > 0 && styles.passwordResendDisabled]}>{resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : "Resend code"}</Text></TouchableOpacity></View>
              </>}
            </ScrollView>
            <View style={styles.passwordFooter}>
              <TouchableOpacity accessibilityRole="button" onPress={closePasswordModal} disabled={isChangingPassword} style={styles.passwordCancel}><Text style={styles.passwordCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={passwordStep === "form" ? handleRequestPasswordCode : handleConfirmPassword} disabled={isChangingPassword || (passwordStep === "form" ? !currentPassword || !newPassword || !confirmNewPassword : verificationCode.length !== 6)} style={[styles.passwordSubmit, (isChangingPassword || (passwordStep === "form" ? !currentPassword || !newPassword || !confirmNewPassword : verificationCode.length !== 6)) && styles.disabledButton]}>{isChangingPassword && <ActivityIndicator size="small" color="#FFFFFF" />}<Text style={styles.passwordSubmitText}>{isChangingPassword ? passwordStep === "form" ? "Sending..." : "Updating..." : passwordStep === "form" ? "Send code" : "Update password"}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

function createProfileStyles(colors: { [K in keyof typeof commuterColors]: string }, isLight: boolean) {
  const themedStyles = StyleSheet.create({
    container: { ...baseStyles.container, backgroundColor: colors.background },
    centeredScreen: { ...baseStyles.centeredScreen, backgroundColor: colors.background },
    loadingText: { ...baseStyles.loadingText, color: colors.textMuted },
    fullName: { ...baseStyles.fullName, color: colors.textPrimary },
    username: { ...baseStyles.username, color: colors.textMuted },
    infoCard: { ...baseStyles.infoCard, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14 },
    infoCardHeader: { ...baseStyles.infoCardHeader, color: colors.textMuted },
    fieldLabel: { ...baseStyles.fieldLabel, color: colors.textSecondary },
    fieldHint: { ...baseStyles.fieldHint, color: colors.textMuted },
    inputDisabled: { ...baseStyles.inputDisabled, backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle, color: colors.textMuted },
    inputEnabled: { ...baseStyles.inputEnabled, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary },
    actionButtonNeutral: { ...baseStyles.actionButtonNeutral, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    actionButtonTextNeutral: { ...baseStyles.actionButtonTextNeutral, color: colors.textPrimary },
    confirmModalCard: { ...baseStyles.confirmModalCard, backgroundColor: colors.surface, borderColor: colors.border },
    confirmModalTitle: { ...baseStyles.confirmModalTitle, color: colors.textPrimary },
    confirmModalDesc: { ...baseStyles.confirmModalDesc, color: colors.textSecondary },
    neutralModalButton: { ...baseStyles.neutralModalButton, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    neutralModalButtonText: { ...baseStyles.neutralModalButtonText, color: colors.textPrimary },
    passwordModalCard: { ...baseStyles.passwordModalCard, width: "100%", maxWidth: 512, maxHeight: "90%", backgroundColor: colors.surface, borderColor: isLight ? colors.border : "rgba(98,160,234,0.2)", borderRadius: 16 },
    passwordModalHeader: { ...baseStyles.passwordModalHeader, padding: 20, borderBottomColor: colors.border },
    passwordModalTitle: { ...baseStyles.passwordModalTitle, color: colors.textPrimary, fontSize: 20, lineHeight: 26, fontWeight: "700" },
    passwordModalSubtitle: { ...baseStyles.passwordModalSubtitle, color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 16 },
    passwordHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    passwordHeadingGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    passwordIconTile: { width: 44, height: 44, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: isLight ? "rgba(26,95,180,0.2)" : "rgba(153,193,241,0.25)", backgroundColor: isLight ? "rgba(26,95,180,0.1)" : "rgba(98,160,234,0.15)" },
    passwordEyebrow: { color: isLight ? "#1A5FB4" : "#99C1F1", fontSize: 10, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
    passwordClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: isLight ? "#FFFFFF" : "rgba(255,255,255,0.05)" },
    passwordSteps: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    passwordStepItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    passwordStepCircle: { width: 28, height: 28, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: isLight ? "#F9FAFB" : "rgba(255,255,255,0.05)" },
    passwordStepCurrent: { borderColor: "rgba(98,160,234,0.5)", backgroundColor: "#1A5FB4" },
    passwordStepComplete: { borderColor: "rgba(16,185,129,0.3)", backgroundColor: "rgba(16,185,129,0.1)" },
    passwordStepNumber: { color: colors.textMuted, fontSize: 12 },
    passwordStepNumberActive: { color: "#FFFFFF" },
    passwordStepLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
    passwordStepLabelActive: { color: isLight ? "#1A5FB4" : "#B6D3F6" },
    passwordStepLabelComplete: { color: isLight ? "#047857" : "#6EE7B7" },
    passwordScroll: { flexShrink: 1 },
    passwordModalBody: { padding: 20, gap: 16 },
    passwordError: { color: isLight ? "#B91C1C" : "#FCA5A5", backgroundColor: isLight ? "#FEF2F2" : "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: isLight ? "#FECACA" : "rgba(239,68,68,0.3)", borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20 },
    passwordField: { gap: 8 },
    passwordFieldDivider: { paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    passwordFieldLabel: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontWeight: "500" },
    passwordInputWrap: { position: "relative", justifyContent: "center" },
    passwordInput: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingRight: 56, paddingVertical: 12, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, fontSize: 16 },
    passwordEye: { position: "absolute", right: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    passwordRules: { padding: 16, borderWidth: 1, borderColor: isLight ? "rgba(26,95,180,0.15)" : "rgba(98,160,234,0.15)", borderRadius: 12, backgroundColor: isLight ? "#F0F7FF" : "rgba(98,160,234,0.05)" },
    passwordRulesTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    passwordRulesTitleText: { color: isLight ? "#1A5FB4" : "#B6D3F6", fontSize: 12, fontWeight: "500" },
    passwordRulesGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
    passwordRule: { width: "50%", flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 6 },
    passwordRuleCheck: { width: 14, height: 14, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 7, borderWidth: 1, borderColor: isLight ? "#D1D5DB" : "rgba(255,255,255,0.2)" },
    passwordRuleMet: { borderColor: "rgba(16,185,129,0.4)", backgroundColor: "rgba(16,185,129,0.15)" },
    passwordRuleText: { color: colors.textSecondary, fontSize: 11, flexShrink: 1 },
    passwordRuleTextMet: { color: isLight ? "#047857" : "#6EE7B7" },
    inboxCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderWidth: 1, borderColor: isLight ? "rgba(26,95,180,0.15)" : "rgba(98,160,234,0.2)", borderRadius: 12, backgroundColor: isLight ? "#F0F7FF" : "#0B223A" },
    inboxIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(98,160,234,0.1)" },
    inboxTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
    inboxSubtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
    verificationInput: { minHeight: 52, marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, textAlign: "center", fontSize: 20, letterSpacing: 6, fontFamily: "monospace" },
    passwordCodeActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    passwordTextAction: { minHeight: 40, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
    passwordBackText: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },
    passwordResendText: { color: isLight ? "#1A5FB4" : "#99C1F1", fontSize: 12, fontWeight: "500" },
    passwordResendDisabled: { color: colors.textMuted },
    passwordFooter: { flexDirection: "row", gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: isLight ? "#F9FAFB" : "#0B223A" },
    passwordCancel: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: isLight ? colors.border : "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 12 },
    passwordCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
    passwordSubmit: { flex: 1.4, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: "#1A5FB4", paddingHorizontal: 12 },
    passwordSubmitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
    modalFieldLabel: { ...baseStyles.modalFieldLabel, color: colors.textSecondary },
    modalInput: { ...baseStyles.modalInput, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary },
    codeInstructions: { ...baseStyles.codeInstructions, color: colors.textSecondary },
    tourCard: { ...baseStyles.tourCard, backgroundColor: colors.surface, borderColor: colors.border },
    tourTitle: { ...baseStyles.tourTitle, color: colors.textPrimary },
    tourSubtitle: { ...baseStyles.tourSubtitle, color: colors.textSecondary },
    errorTitle: { ...baseStyles.errorTitle, color: colors.textPrimary },
    errorSubtitle: { ...baseStyles.errorSubtitle, color: colors.textMuted },
  });
  return Object.assign({}, baseStyles, themedStyles, profileLayout(isLight));
}

const baseStyles = StyleSheet.create({
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
