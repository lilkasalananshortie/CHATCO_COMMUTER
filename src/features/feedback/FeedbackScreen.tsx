import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Animated,
  Easing,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { commuterColors } from "../../core/theme/colors";
import { commuterService } from "../../core/api/commuter-service";
import type { Trip, ResolvedCrew } from "../../core/domain/types";
import { getMascotErrorState } from "../../shared/ui/mascot-error";
import { feedbackPayload } from "./feedback-payload";
import { Text } from "../../shared/ui/BrandText";
import { WebIcon } from "../../shared/ui/WebIcon";
import Svg, { Path, Circle } from "react-native-svg";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { themedStyles } from "../../core/theme/themed-styles";
import { useReducedMotion } from "../../shared/useReducedMotion";

interface FeedbackScreenProps {
  initialTrip?: Trip | null;
  onFeedbackComplete?: () => void;
  onFormVisibilityChange?: (visible: boolean) => void;
}

type ScanStatus = "scanning" | "resolving" | "resolved" | "error";

const RATING_WORDS = ["Terrible", "Poor", "Average", "Good", "Excellent"];

const POSITIVE_TAGS_DRIVER = [
  "Safe Driving",
  "Polite",
  "Clean Vehicle",
  "Smooth Ride",
  "Helpful",
  "Alert",
  "Quick to Respond",
];

const NEGATIVE_TAGS_DRIVER = [
  "Reckless Driving",
  "Rude Behavior",
  "Dirty Vehicle",
  "Loud Music",
  "Overspeeding",
  "Rough Driving",
  "Distracted",
  "Overloading",
];

const POSITIVE_TAGS_CONDUCTOR = [
  "Polite",
  "Honest Change",
  "Helpful",
  "Accurate Fare",
  "Respectful",
  "Efficient",
];

const NEGATIVE_TAGS_CONDUCTOR = [
  "Rude Behavior",
  "Wrong Change",
  "Overcharging",
  "Unhelpful",
  "Ignored Me",
  "Slow Service",
];

export const FeedbackScreen: React.FC<FeedbackScreenProps> = ({
  initialTrip,
  onFeedbackComplete,
  onFormVisibilityChange,
}) => {
  const pending = useRef(false);
  const lastScan = useRef<string | null>(null);
  const noCrew = useRef(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const [scanStatus, setScanStatus] = useState<ScanStatus>(
    initialTrip ? "resolved" : "scanning"
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanErrorPose, setScanErrorPose] = useState<"offline" | "not-found">("not-found");
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (scanStatus === "scanning") {
      setScanned(false);
      setTorch(false);
      if (permission && !permission.granted && permission.canAskAgain) {
        requestPermission().catch(() => {});
      }
    }
  }, [scanStatus, permission, requestPermission]);

  // Resolved crew info
  const [crew, setCrew] = useState<ResolvedCrew | null>(
    initialTrip
      ? {
          shiftId: initialTrip.shift_id ?? "",
          unitNumber: initialTrip.unit_number || "",
          plateNumber: initialTrip.plate_number || "",
          driverName: initialTrip.driver_name || "Assigned Driver",
          conductorName: initialTrip.conductor_name || "Assigned Conductor",
          routeTitle: initialTrip.route_name || "",
        }
      : null
  );

  const { colors: selectedColors, isLight = false } = useCommuterTheme();
  const conductorSectionOpacity = useRef(new Animated.Value(0)).current;
  const conductorSectionOffset = useRef(new Animated.Value(10)).current;
  const colors = selectedColors ?? commuterColors;
  const styles = useMemo(() => themedStyles(baseStyles, colors, isLight), [colors, isLight]);
  useEffect(() => { onFormVisibilityChange?.(scanStatus === "resolved"); }, [scanStatus, onFormVisibilityChange]);

  // Driver rating state
  const [driverRating, setDriverRating] = useState(0);
  const [driverTags, setDriverTags] = useState<string[]>([]);
  const [driverComment, setDriverComment] = useState("");

  // Conductor rating state
  const [conductorRating, setConductorRating] = useState(0);
  const [conductorTags, setConductorTags] = useState<string[]>([]);
  const [conductorComment, setConductorComment] = useState("");

  // Submit & countdown
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  const reduceMotion = useReducedMotion();
  const driverComplete = driverRating > 0 && driverTags.length > 0;
  const conductorComplete = conductorRating > 0 && conductorTags.length > 0;

  useEffect(() => {
    if (!driverComplete) {
      conductorSectionOpacity.setValue(0);
      conductorSectionOffset.setValue(10);
      return;
    }
    if (reduceMotion) {
      conductorSectionOpacity.setValue(1);
      conductorSectionOffset.setValue(0);
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(conductorSectionOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(conductorSectionOffset, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [conductorSectionOffset, conductorSectionOpacity, driverComplete, reduceMotion]);

  // Auto countdown back to home
  useEffect(() => {
    if (!isSubmitted) return;
    if (countdown === 0) {
      if (onFeedbackComplete) onFeedbackComplete();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSubmitted, countdown, onFeedbackComplete]);

  const extractFeedbackToken = (raw: string): string => {
    let val = raw.trim();
    if (val.startsWith("{") && val.endsWith("}")) {
      try {
        const p = JSON.parse(val);
        if (p.token) return String(p.token);
        if (p.unit_code) return String(p.unit_code);
        if (p.qr_token) return String(p.qr_token);
      } catch {}
    }
    if (val.includes("token=")) {
      try {
        const url = new URL(val);
        const t = url.searchParams.get("token") || url.searchParams.get("unit");
        if (t) return t;
      } catch {
        const m = val.match(/token=([a-zA-Z0-9_\-]+)/);
        if (m && m[1]) return m[1];
      }
    }
    return val;
  };

  const handleResolveToken = async (rawToken: string) => {
    if (pending.current) return;
    // Keep permanent vehicle JSON intact so the API adapter can select scan-public.
    const cleanToken = rawToken.trim().startsWith("{") ? rawToken.trim() : extractFeedbackToken(rawToken);
    if (!cleanToken.trim()) return;
    pending.current = true;
    lastScan.current = rawToken;
    noCrew.current = false;
    const attempt = generation.current;
    setScanStatus("resolving");
    setScanError(null);

    try {
      const resolved = await commuterService.scanQr(cleanToken.trim());
      if (generation.current !== attempt) return;
      setCrew(resolved);
      setDriverRating(0);
      setDriverTags([]);
      setDriverComment("");
      setConductorRating(0);
      setConductorTags([]);
      setConductorComment("");
      setIsSubmitted(false);
      setScanStatus("resolved");
    } catch (err: any) {
      if (generation.current !== attempt) return;
      noCrew.current = (err?.status ?? err?.response?.status) === 404 && rawToken.trim().startsWith("{");
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not resolve active crew for this vehicle. Feedback is only available during or after a ride.";
      setScanError(msg);
      setScanErrorPose(getMascotErrorState(err).pose);
      setScanStatus("error");
    } finally { if (generation.current === attempt) pending.current = false; }
  };

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scanned || scanStatus !== "scanning") return;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      handleResolveToken(data);
    },
    [scanned, scanStatus]
  );

  const handleRescan = () => {
    generation.current++; pending.current = false;
    setCrew(null);
    setScanned(false);
    setScanStatus("scanning");
    setScanError(null);
    setIsSubmitted(false);
    setCountdown(3);
  };

  const toggleDriverTag = (tag: string) => {
    setDriverTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleConductorTag = (tag: string) => {
    setConductorTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!driverComplete || !conductorComplete || pending.current || initialTrip?.has_feedback) return;
    if (initialTrip && initialTrip.can_leave_feedback !== true) {
      setSubmitError("This payment is not eligible for feedback. Refresh Payment History first."); return;
    }
    pending.current = true;
    const attempt = generation.current;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await commuterService.submitFeedback(feedbackPayload({
        shiftId: crew?.shiftId ?? initialTrip?.shift_id ?? "",
        driverRating, driverTags, driverComment, conductorRating, conductorTags, conductorComment,
      }));
      if (generation.current !== attempt) return;
      setIsSubmitted(true);
      setCountdown(3);
    } catch (err: any) {
      if (generation.current !== attempt) return;
      setSubmitError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not submit feedback. Please try again."
      );
    } finally {
      if (generation.current === attempt) { pending.current = false; setIsSubmitting(false); }
    }
  };

  if (initialTrip?.has_feedback) {
    const feedback = initialTrip.feedback;
    return <ScrollView contentContainerStyle={styles.centeredScreen}>
      <Text style={styles.statusTitle}>Feedback Submitted</Text>
      <Text style={styles.statusSubtitle}>This ride has already been rated. Your saved feedback cannot be submitted again.</Text>
      {feedback && <View style={styles.statusBox}>
        <Text style={styles.statusSubtitle}>Driver: {feedback.rating}/5</Text>
        {!!feedback.comment && <Text style={styles.statusSubtitle}>{feedback.comment}</Text>}
        <Text style={styles.statusSubtitle}>Conductor: {feedback.conductor_rating ?? "Not rated"}/5</Text>
        {!!feedback.conductor_comment && <Text style={styles.statusSubtitle}>{feedback.conductor_comment}</Text>}
      </View>}
      <TouchableOpacity style={styles.neutralButton} onPress={onFeedbackComplete}><Text style={styles.neutralButtonText}>Back to Home</Text></TouchableOpacity>
    </ScrollView>;
  }

  // 1. SCANNING STATE
  if (scanStatus === "scanning") {
    return (
      <View style={[styles.scanContainer, isLight && { backgroundColor: "#FFFFFF" }]}>
        <View style={[styles.scanHeader, isLight && { borderBottomColor: "#E5E7EB" }]}>
          <View style={styles.scanHeaderRow}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={isLight ? "#1A5FB4" : "#62A0EA"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <Circle cx={12} cy={13} r={3} />
            </Svg>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.scanTitle, isLight && { color: "#111827" }]}>Scan Feedback QR</Text>
              <Text numberOfLines={1} style={[styles.scanSubtitle, isLight && { color: "#6B7280" }]}>
                Point your camera at the QR inside the jeepney
              </Text>
            </View>
            {onFeedbackComplete && (
              <TouchableOpacity
                onPress={onFeedbackComplete}
                style={{ flexShrink: 0 }}
                activeOpacity={0.7}
                accessibilityLabel="Close feedback scanner"
              >
                <WebIcon name="x" size={20} color={isLight ? "#9CA3AF" : "rgba(255,255,255,0.4)"} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.scanBody}>
          {!permission ? (
            <View style={styles.permissionBox}>
              <ActivityIndicator size="large" color="#62A0EA" />
              <Text style={styles.permissionText}>Checking camera access…</Text>
            </View>
          ) : !permission.granted ? (
            <View style={[styles.permissionBox, isLight && { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }]}>
              <View style={[styles.permissionIcon, isLight && { backgroundColor: "rgba(26,95,180,0.05)", borderColor: "rgba(26,95,180,0.15)" }]}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={isLight ? "#1A5FB4" : "#99C1F1"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="m2 2 20 20M9.5 4h5L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-.59 1.41M6.5 6.5 6 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14M10 10a3 3 0 0 0 4 4" />
                </Svg>
              </View>
              <Text style={[styles.permissionTitle, isLight && { color: "#111827" }]}>Camera access blocked</Text>
              <Text style={[styles.permissionText, isLight && { color: "#6B7280" }]}>
                Allow camera access in your device settings, then try again.
              </Text>
              <TouchableOpacity
                style={styles.permissionRetry}
                activeOpacity={0.8}
                onPress={requestPermission}
              >
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.scannerViewport, isLight && { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }]}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                onMountError={() => { noCrew.current = false; setScanError("The camera could not start. Check camera permission, close other camera apps, then try again."); setScanStatus("error"); }}
              />

              {/* Scanner Reticle Overlay */}
              <View style={styles.reticleOverlay} pointerEvents="none">
                <View style={styles.reticle}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
              </View>

            </View>
          )}

           <Text style={[styles.scanHint, isLight && { color: "#6B7280" }]}>
             The QR is printed inside the jeepney unit, near the conductor.
           </Text>
        </ScrollView>
      </View>
    );
  }

  // 2. RESOLVING STATE
  if (scanStatus === "resolving") {
    return (
      <ScrollView contentContainerStyle={styles.centeredScreen}>
        <View style={styles.statusBox}>
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color="#62A0EA" />
          </View>
          <Text style={styles.statusTitle}>Resolving today&apos;s crew…</Text>
          <Text style={styles.statusSubtitle}>
            Looking up the driver and conductor on duty.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // 3. ERROR STATE
  if (scanStatus === "error") {
    let unitLabel = "This unit";
    try { const unit = JSON.parse(lastScan.current ?? "{}"); unitLabel = unit.unit_number ?? unit.unitNumber ?? unit.plate_number ?? unitLabel; } catch { /* Signed QR has no public unit label. */ }
    if (noCrew.current) return <ScrollView contentContainerStyle={styles.centeredScreen}><View style={styles.statusBox}>
      <Ionicons name="bus-outline" size={44} color="#62A0EA" />
      <Text style={styles.statusTitle}>No crew on duty</Text>
      <Text style={styles.statusSubtitle}>{unitLabel} has no crew recorded today. Check again after the conductor starts a shift.</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.primaryButton} onPress={() => { if (lastScan.current) void handleResolveToken(lastScan.current); }}><Text style={styles.primaryButtonText}>Check again</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.neutralButton} onPress={handleRescan}><Text style={styles.neutralButtonText}>Scan another unit</Text></TouchableOpacity>
    </View></ScrollView>;
    return (
      <ScrollView contentContainerStyle={styles.centeredScreen}>
        <View style={[styles.statusBox, styles.errorStatusBox]}>
          <View style={styles.errorCircle}>
            <Ionicons name="warning-outline" size={28} color="#F87171" />
          </View>
          <Text style={styles.statusTitle}>{scanErrorPose === "offline" ? "Connection interrupted" : "Crew Not Found"}</Text>
          <Text style={styles.statusSubtitle}>{scanError}</Text>
          <TouchableOpacity
            onPress={handleRescan}
            style={[styles.primaryButton, { width: "100%", marginTop: 16 }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 4. SUCCESS STATE (POST-SUBMIT)
  if (isSubmitted) {
    return (
      <ScrollView contentContainerStyle={styles.centeredScreen}>
        <View style={[styles.statusBox, styles.successStatusBox]}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={34} color="#34D399" />
          </View>
          <Text style={styles.statusTitle}>Thank You!</Text>
          <Text style={styles.statusSubtitle}>
            Your feedback has been recorded and will help us improve our service.
          </Text>

          {/* Circular countdown gauge */}
          <View style={styles.countdownGauge}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </View>
          <Text style={styles.countdownHint}>Returning to Home…</Text>

          <TouchableOpacity
            onPress={handleRescan}
            style={[styles.neutralButton, { width: "100%", marginTop: 16 }]}
            activeOpacity={0.8}
          >
            <Text style={styles.neutralButtonText}>Scan another unit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 5. RESOLVED CREW FEEDBACK FORM
  const driverActiveTags =
    driverRating >= 4 ? POSITIVE_TAGS_DRIVER : NEGATIVE_TAGS_DRIVER;
  const conductorActiveTags =
    conductorRating >= 4 ? POSITIVE_TAGS_CONDUCTOR : NEGATIVE_TAGS_CONDUCTOR;

  return (
    <View style={styles.container}>
      {/* Pinned Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Rate your ride</Text>
            <Text style={styles.headerSubtitle}>
              Your reviews are anonymous to the crew.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRescan}
            style={styles.rescanButton}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.rescanButtonText}>Rescan</Text>
          </TouchableOpacity>
        </View>

        {/* Step Progress Chips */}
        <View style={styles.stepProgressRow}>
          <View
            style={[
              styles.stepChip,
              driverComplete && styles.stepChipDone,
              !driverComplete && styles.stepChipActive,
            ]}
          >
            {driverComplete && (
              <Ionicons name="checkmark" size={11} color="#34D399" />
            )}
            <Text
              style={[
                styles.stepChipText,
                driverComplete && styles.stepChipTextDone,
                !driverComplete && styles.stepChipTextActive,
              ]}
            >
              Driver
            </Text>
          </View>

          <View
            style={[
              styles.stepLine,
              driverComplete && styles.stepLineDone,
            ]}
          />

          <View
            style={[
              styles.stepChip,
              conductorComplete && styles.stepChipDone,
              driverComplete && !conductorComplete && styles.stepChipActive,
            ]}
          >
            {conductorComplete && (
              <Ionicons name="checkmark" size={11} color="#34D399" />
            )}
            <Text
              style={[
                styles.stepChipText,
                conductorComplete && styles.stepChipTextDone,
                driverComplete && !conductorComplete && styles.stepChipTextActive,
              ]}
            >
              Conductor
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Unit Card */}
        {crew && (
          <View style={styles.crewCard}>
            <View style={styles.unitHeaderRow}>
              <Text style={styles.unitLabel}>
                {crew.unitNumber ? `Unit ${crew.unitNumber}` : "Unit"}
              </Text>
              <View style={styles.plateBadge}>
                <Text style={styles.plateText}>{crew.plateNumber}</Text>
              </View>
            </View>

            <View style={styles.crewMembersList}>
              <View style={styles.crewMemberRow}>
                <View
                  style={[
                    styles.crewAvatar,
                    driverComplete && styles.crewAvatarRated,
                  ]}
                >
                  {driverComplete ? (
                    <Ionicons name="checkmark" size={15} color="#34D399" />
                  ) : (
                    <Text style={styles.crewAvatarText}>
                      {crew.driverName ? crew.driverName[0] : "D"}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.crewName} numberOfLines={1}>
                    {crew.driverName}
                  </Text>
                  <Text style={styles.crewRole}>Driver</Text>
                </View>
                {driverComplete && (
                  <Text style={styles.ratedStatus}>RATED</Text>
                )}
              </View>

              <View style={styles.crewMemberRow}>
                <View
                  style={[
                    styles.crewAvatar,
                    conductorComplete && styles.crewAvatarRated,
                  ]}
                >
                  {conductorComplete ? (
                    <Ionicons name="checkmark" size={15} color="#34D399" />
                  ) : (
                    <Text style={styles.crewAvatarText}>
                      {crew.conductorName ? crew.conductorName[0] : "C"}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.crewName} numberOfLines={1}>
                    {crew.conductorName}
                  </Text>
                  <Text style={styles.crewRole}>Conductor</Text>
                </View>
                {conductorComplete && (
                  <Text style={styles.ratedStatus}>RATED</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── DRIVER SECTION ── */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingSectionPrompt}>How was your driver?</Text>
          {crew?.driverName && (
            <Text style={styles.ratingSectionSub}>{crew.driverName}</Text>
          )}

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={`driver-star-${star}`}
                onPress={() => {
                  setDriverRating(star);
                  setDriverTags([]);
                }}
                style={styles.starTouch}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="star"
                  size={36}
                  color={
                    star <= driverRating ? "#FBBF24" : "rgba(255,255,255,0.15)"
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={[
              styles.ratingWord,
              driverRating >= 4
                ? { color: "#34D399" }
                : driverRating > 0
                ? { color: "#FBBF24" }
                : { color: "transparent" },
            ]}
          >
            {driverRating > 0 ? RATING_WORDS[driverRating - 1] : " "}
          </Text>

        </View>

        {/* Tags */}
        {driverRating > 0 && (
          <View style={styles.tagsContainer}>
              <Text style={styles.tagsHeader}>
                {driverRating >= 4 ? "What went well?" : "What could be improved?"}{" "}
                <Text style={{ fontWeight: "400", color: "rgba(255,255,255,0.3)" }}>
                  (pick at least one)
                </Text>
              </Text>

              <View style={styles.tagsWrap}>
                {driverActiveTags.map((tag) => {
                  const isSelected = driverTags.includes(tag);
                  const isPositive = driverRating >= 4;

                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleDriverTag(tag)}
                      style={[
                        styles.tagPill,
                        isSelected &&
                          (isPositive
                            ? styles.tagPillPositive
                            : styles.tagPillNegative),
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tagPillText,
                          isSelected &&
                            (isPositive
                              ? styles.tagPillTextPositive
                              : styles.tagPillTextNegative),
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
          </View>
        )}

        {/* Driver Comment Box */}
        {driverRating > 0 && driverTags.length > 0 && (
          <View style={styles.commentContainer}>
              <View style={styles.commentHeaderRow}>
                <Text style={styles.commentLabel}>
                  Additional comments{" "}
                  <Text style={{ fontWeight: "400", color: "rgba(255,255,255,0.3)" }}>
                    (optional)
                  </Text>
                </Text>
                {driverComment.length > 1600 && (
                  <Text style={styles.commentCounter}>
                    {driverComment.length}/2000
                  </Text>
                )}
              </View>
              <TextInput
                style={styles.commentInput}
                placeholder="Tell us more about your experience…"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={driverComment}
                onChangeText={setDriverComment}
                multiline
                numberOfLines={3}
                maxLength={2000}
              />
          </View>
        )}

        {/* ── CONDUCTOR SECTION (unlocked when driver complete) ── */}
        {driverComplete && (
          <Animated.View style={[styles.conductorForm, { opacity: conductorSectionOpacity, transform: [{ translateY: conductorSectionOffset }] }]}>
            <Text style={styles.conductorIntroTitle}>Now the conductor</Text>
            <Text style={styles.conductorIntroSub}>
              One more, then you&apos;re done.
            </Text>

            <View style={[styles.ratingSection, styles.conductorRatingCard]}>
            <Text style={styles.ratingSectionPrompt}>
              How was your conductor?
            </Text>
            {crew?.conductorName && (
              <Text style={styles.ratingSectionSub}>{crew.conductorName}</Text>
            )}

            {/* Conductor Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={`conductor-star-${star}`}
                  onPress={() => {
                    setConductorRating(star);
                    setConductorTags([]);
                  }}
                  style={styles.starTouch}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="star"
                    size={36}
                    color={
                      star <= conductorRating
                        ? "#FBBF24"
                        : "rgba(255,255,255,0.15)"
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={[
                styles.ratingWord,
                conductorRating >= 4
                  ? { color: "#34D399" }
                  : conductorRating > 0
                  ? { color: "#FBBF24" }
                  : { color: "transparent" },
              ]}
            >
              {conductorRating > 0 ? RATING_WORDS[conductorRating - 1] : " "}
            </Text>

            </View>

            {/* Conductor Tags */}
            {conductorRating > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsHeader}>
                  {conductorRating >= 4
                    ? "What went well?"
                    : "What could be improved?"}{" "}
                  <Text style={{ fontWeight: "400", color: "rgba(255,255,255,0.3)" }}>
                    (pick at least one)
                  </Text>
                </Text>

                <View style={styles.tagsWrap}>
                  {conductorActiveTags.map((tag) => {
                    const isSelected = conductorTags.includes(tag);
                    const isPositive = conductorRating >= 4;

                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => toggleConductorTag(tag)}
                        style={[
                          styles.tagPill,
                          isSelected &&
                            (isPositive
                              ? styles.tagPillPositive
                              : styles.tagPillNegative),
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.tagPillText,
                            isSelected &&
                              (isPositive
                                ? styles.tagPillTextPositive
                                : styles.tagPillTextNegative),
                          ]}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Conductor Comment Box */}
            {conductorRating > 0 && conductorTags.length > 0 && (
              <View style={styles.commentContainer}>
                <View style={styles.commentHeaderRow}>
                  <Text style={styles.commentLabel}>
                    Additional comments{" "}
                    <Text style={{ fontWeight: "400", color: "rgba(255,255,255,0.3)" }}>
                      (optional)
                    </Text>
                  </Text>
                  {conductorComment.length > 1600 && (
                    <Text style={styles.commentCounter}>
                      {conductorComment.length}/2000
                    </Text>
                  )}
                </View>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Tell us more about the conductor…"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={conductorComment}
                  onChangeText={setConductorComment}
                  multiline
                  numberOfLines={3}
                  maxLength={2000}
                />
              </View>
            )}
          </Animated.View>
        )}

        {/* Submit Error Banner */}
        {submitError && (
          <View style={styles.submitErrorBox}>
            <Ionicons name="alert-circle" size={16} color="#F87171" />
            <Text style={styles.submitErrorText}>{submitError}</Text>
          </View>
        )}

        {/* Submit Button Area */}
        {driverComplete && (
          <View style={{ marginTop: 20, marginBottom: 30 }}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || !conductorComplete}
              style={[
                styles.submitFeedbackButton,
                (!conductorComplete || isSubmitting) && styles.disabledButton,
              ]}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitFeedbackButtonText}>Submitting…</Text>
                </View>
              ) : (
                <Text style={styles.submitFeedbackButtonText}>
                  Submit Feedback
                </Text>
              )}
            </TouchableOpacity>

            {!conductorComplete && !isSubmitting && (
              <Text style={styles.submitHelperText}>
                {conductorRating === 0
                  ? "Rate the conductor to submit."
                  : "Pick at least one conductor tag to submit."}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const baseStyles = StyleSheet.create({
  scanContainer: {
    flexShrink: 1,
    backgroundColor: "#050F1A",
  },
  scanHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    flexShrink: 0,
  },
  scanHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scanTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22.5,
  },
  scanSubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  scanBody: {
    padding: 20,
  },
  scanHint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    lineHeight: 16.5,
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#050F1A",
  },
  header: {
    backgroundColor: "#071A2E",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 2,
  },
  rescanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rescanButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
  },
  stepProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  stepChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  stepChipActive: {
    backgroundColor: "rgba(26, 95, 180, 0.15)",
    borderColor: "rgba(26, 95, 180, 0.4)",
  },
  stepChipDone: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  stepChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.3)",
  },
  stepChipTextActive: {
    color: "#62A0EA",
  },
  stepChipTextDone: {
    color: "#34D399",
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  stepLineDone: {
    backgroundColor: "rgba(16, 185, 129, 0.4)",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scannerViewport: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#071A2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  reticleOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scanLaser: {
    width: "100%",
    height: 2,
    backgroundColor: "rgba(98, 160, 234, 0.85)",
    shadowColor: "#62A0EA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  torchBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(5, 15, 26, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  permissionBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#071A2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 12,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(98,160,234,0.2)",
    backgroundColor: "rgba(98,160,234,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  permissionRetry: {
    width: "100%",
    maxWidth: 256,
    minHeight: 44,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1A5FB4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 24.75,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.55)",
    textAlign: "center",
    lineHeight: 22.75,
    marginTop: 8,
    maxWidth: 256,
  },
  reticle: {
    width: 192,
    height: 192,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#62A0EA",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  reticleHint: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 16,
    textAlign: "center",
    maxWidth: 240,
  },
  textInput: {
    width: "100%",
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#FFFFFF",
  },
  primaryButton: {
    backgroundColor: "#1A5FB4",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.4,
  },
  centeredScreen: {
    flexGrow: 1,
    backgroundColor: "#050F1A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  statusBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    textAlign: "center",
  },
  loadingCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: "rgba(98, 160, 234, 0.25)",
    borderTopColor: "#62A0EA",
    alignItems: "center",
    justifyContent: "center",
  },
  errorStatusBox: {
    borderColor: "rgba(248, 113, 113, 0.2)",
  },
  successStatusBox: {
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 14,
    marginBottom: 4,
    textAlign: "center",
  },
  statusSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 17,
    textAlign: "center",
    maxWidth: 260,
  },
  errorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownGauge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(98, 160, 234, 0.1)",
    borderWidth: 3,
    borderColor: "#62A0EA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  countdownHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.3)",
  },
  neutralButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  neutralButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  crewCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  unitHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  unitLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  plateBadge: {
    backgroundColor: "rgba(26, 95, 180, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(26, 95, 180, 0.3)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plateText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#62A0EA",
    fontFamily: "monospace",
  },
  crewMembersList: {
    gap: 12,
  },
  crewMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  crewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A5FB4",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  crewAvatarRated: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  crewAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  crewName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  crewRole: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
  },
  ratedStatus: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34D399",
    letterSpacing: 0.5,
  },
  ratingSection: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  conductorForm: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 24,
    marginTop: 8,
  },
  conductorRatingCard: {
    marginTop: 24,
  },
  conductorSectionTopBorder: {
    borderColor: "rgba(98, 160, 234, 0.2)",
  },
  conductorIntroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    alignSelf: "flex-start",
  },
  conductorIntroSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 2,
    alignSelf: "flex-start",
  },
  ratingSectionPrompt: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  ratingSectionSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 2,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  starTouch: {
    padding: 2,
  },
  ratingWord: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    height: 18,
  },
  tagsContainer: {
    width: "100%",
    marginTop: 0,
  },
  tagsHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 8,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tagPillPositive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  tagPillNegative: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    borderColor: "rgba(248, 113, 113, 0.4)",
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  tagPillTextPositive: {
    color: "#34D399",
    fontWeight: "700",
  },
  tagPillTextNegative: {
    color: "#F87171",
    fontWeight: "700",
  },
  commentContainer: {
    width: "100%",
    marginTop: 24,
  },
  commentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
  },
  commentCounter: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.4)",
  },
  commentInput: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 13,
    textAlignVertical: "top",
    minHeight: 70,
  },
  submitErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  submitErrorText: {
    fontSize: 11,
    color: "#F87171",
    fontWeight: "600",
    flex: 1,
  },
  submitFeedbackButton: {
    backgroundColor: "#FF6D3A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6D3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitFeedbackButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  submitHelperText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
    marginTop: 8,
  },
  demoTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(98, 160, 234, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.25)",
  },
  demoTripBtnText: {
    color: "#62A0EA",
    fontSize: 13,
    fontWeight: "700",
  },
});
