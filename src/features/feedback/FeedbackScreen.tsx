import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { commuterService } from "../../core/api/commuter-service";
import type { Trip, ResolvedCrew } from "../../core/domain/types";

interface FeedbackScreenProps {
  initialTrip?: Trip | null;
  onFeedbackComplete?: () => void;
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
}) => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>(
    initialTrip ? "resolved" : "scanning"
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState(
    initialTrip?.transaction_id || ""
  );

  // Resolved crew info
  const [crew, setCrew] = useState<ResolvedCrew | null>(
    initialTrip
      ? {
          unitNumber: initialTrip.unit_number || "J-04",
          plateNumber: initialTrip.plate_number || "NDB-5821",
          driverName: initialTrip.driver_name || "Assigned Driver",
          conductorName: initialTrip.conductor_name || "Assigned Conductor",
          routeTitle: initialTrip.route_name || "Calumpit - Meycauayan Line",
        }
      : null
  );

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

  const driverComplete = driverRating > 0 && driverTags.length > 0;
  const conductorComplete = conductorRating > 0 && conductorTags.length > 0;

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

  const handleResolveToken = async (rawToken: string) => {
    if (!rawToken.trim()) return;
    setScanStatus("resolving");
    setScanError(null);

    try {
      const resolved = await commuterService.scanQr(rawToken.trim());
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
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not resolve active crew for this vehicle. Feedback is only available during or after a ride.";
      setScanError(msg);
      setScanStatus("error");
    }
  };

  const handleRescan = () => {
    setScanStatus("scanning");
    setScanError(null);
    setManualToken("");
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
    if (!driverComplete || !conductorComplete) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await commuterService.submitFeedback({
        token: manualToken || undefined,
        shift_id: initialTrip?.id || undefined,
        driver_rating: driverRating,
        driver_tags: driverTags,
        driver_comment: driverComment.trim() || undefined,
        conductor_rating: conductorRating,
        conductor_tags: conductorTags,
        conductor_comment: conductorComment.trim() || undefined,
        rating: Math.round((driverRating + conductorRating) / 2),
        comment: `Driver: ${driverRating} stars (${driverTags.join(", ")}). ${driverComment} | Conductor: ${conductorRating} stars (${conductorTags.join(", ")}). ${conductorComment}`,
      });
      setIsSubmitted(true);
      setCountdown(3);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not submit feedback. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. SCANNING STATE
  if (scanStatus === "scanning") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rate your ride</Text>
          <Text style={styles.headerSubtitle}>
            Scan the feedback QR posted inside the modern jeepney
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.scannerViewport}>
            <View style={styles.reticle}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <Ionicons
                name="qr-code-outline"
                size={54}
                color="rgba(98, 160, 234, 0.4)"
              />
            </View>
            <Text style={styles.reticleHint}>
              Align the feedback QR code posted inside the vehicle
            </Text>
          </View>

          <View style={styles.manualEntryCard}>
            <Text style={styles.manualLabel}>Or Enter Unit Code / Token</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. UNIT-04 or scan payload token"
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              value={manualToken}
              onChangeText={setManualToken}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              onPress={() => handleResolveToken(manualToken)}
              disabled={!manualToken.trim()}
              style={[
                styles.primaryButton,
                !manualToken.trim() && styles.disabledButton,
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Verify Unit & Crew</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // 2. RESOLVING STATE
  if (scanStatus === "resolving") {
    return (
      <View style={styles.centeredScreen}>
        <View style={styles.statusBox}>
          <ActivityIndicator size="large" color="#62A0EA" />
          <Text style={styles.statusTitle}>Resolving today&apos;s crew…</Text>
          <Text style={styles.statusSubtitle}>
            Looking up the driver and conductor on duty for this unit.
          </Text>
        </View>
      </View>
    );
  }

  // 3. ERROR STATE
  if (scanStatus === "error") {
    return (
      <View style={styles.centeredScreen}>
        <View style={styles.statusBox}>
          <View style={styles.errorCircle}>
            <Ionicons name="alert-circle-outline" size={32} color="#F87171" />
          </View>
          <Text style={styles.statusTitle}>Crew Not Found</Text>
          <Text style={styles.statusSubtitle}>{scanError}</Text>
          <TouchableOpacity
            onPress={handleRescan}
            style={[styles.primaryButton, { width: "100%", marginTop: 16 }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4. SUCCESS STATE (POST-SUBMIT)
  if (isSubmitted) {
    return (
      <View style={styles.centeredScreen}>
        <View style={styles.statusBox}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={36} color="#10B981" />
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
      </View>
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
                  name={star <= driverRating ? "star" : "star-outline"}
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
        </View>

        {/* ── CONDUCTOR SECTION (unlocked when driver complete) ── */}
        {driverComplete && (
          <View style={[styles.ratingSection, styles.conductorSectionTopBorder]}>
            <Text style={styles.conductorIntroTitle}>Now the conductor</Text>
            <Text style={styles.conductorIntroSub}>
              One more, then you&apos;re done.
            </Text>

            <Text style={[styles.ratingSectionPrompt, { marginTop: 16 }]}>
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
                    name={star <= conductorRating ? "star" : "star-outline"}
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
          </View>
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

const styles = StyleSheet.create({
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
    maxHeight: 260,
    backgroundColor: "#071A2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  reticle: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#62A0EA",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  reticleHint: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 16,
    textAlign: "center",
    maxWidth: 240,
  },
  manualEntryCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 8,
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
    flex: 1,
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
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
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
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 2,
  },
  starsRow: {
    flexDirection: "row",
    gap: 10,
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
    marginTop: 14,
  },
  tagsHeader: {
    fontSize: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    fontSize: 11,
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
    marginTop: 16,
  },
  commentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
  },
  commentCounter: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.4)",
  },
  commentInput: {
    backgroundColor: "#050F1A",
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
});
