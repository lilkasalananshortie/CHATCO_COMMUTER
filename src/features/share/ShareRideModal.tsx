import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import { commuterColors } from "../../core/theme/colors";
import { commuterService } from "../../core/api/commuter-service";

interface ShareRideModalProps {
  visible: boolean;
  onClose: () => void;
  tripInfo?: {
    routeName?: string;
    unitNumber?: string;
    plateNumber?: string;
  };
}

export const ShareRideModal: React.FC<ShareRideModalProps> = ({
  visible,
  onClose,
  tripInfo,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "requesting" | "success" | "error">("idle");
  const [isStopping, setIsStopping] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const tokenRef = useRef<string | null>(null);

  // Initialize and create share link on open
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setIsStopped(false);
    setIsExpired(false);
    setGpsStatus("requesting");

    (async () => {
      try {
        let lat: number | undefined;
        let lng: number | undefined;

        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
          if (isMounted) setGpsStatus("success");
        } catch {
          if (isMounted) setGpsStatus("error");
        }

        const res = await commuterService.createShareRide({ lat, lng });
        if (!isMounted) return;

        tokenRef.current = res.token;
        setShareUrl(`https://chatco.app/share/${res.token}`);
        setExpiresAt(res.expires_at);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || "Failed to create share link.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Countdown timer (30-min countdown)
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
        return false;
      }
      setTimeLeft(remaining);
      return true;
    };

    if (!updateTimer()) return;
    const timer = setInterval(() => {
      if (!updateTimer()) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await Clipboard.setStringAsync(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    try {
      await Share.share({
        message: `I'm sharing my live CHATCO ride location. Track me live on the map: ${shareUrl}`,
        url: shareUrl,
        title: "Track My CHATCO Ride",
      });
    } catch {
      // ignore
    }
  };

  const handleStopSharing = async () => {
    if (isStopping) return;
    setIsStopping(true);
    try {
      await commuterService.stopShareRide();
      setIsStopped(true);
      setTimeout(onClose, 1200);
    } catch {
      setError("Unable to stop location sharing.");
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Share Live Location</Text>
              {!isExpired && !isLoading && !isStopped && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#62A0EA" />
                <Text style={styles.loadingText}>Creating your share link…</Text>
              </View>
            ) : isStopped ? (
              <View style={styles.stoppedState}>
                <View style={styles.stoppedIconCircle}>
                  <Ionicons name="checkmark" size={32} color="#34D399" />
                </View>
                <Text style={styles.stoppedTitle}>Location sharing stopped</Text>
                <Text style={styles.stoppedSub}>The tracking link is no longer active.</Text>
              </View>
            ) : error ? (
              <View style={styles.errorState}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={onClose} style={styles.neutralButton}>
                  <Text style={styles.neutralButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* GPS Status pill */}
                <View
                  style={[
                    styles.gpsPill,
                    gpsStatus === "success" && styles.gpsPillSuccess,
                    gpsStatus === "error" && styles.gpsPillError,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={
                      gpsStatus === "success"
                        ? "#34D399"
                        : gpsStatus === "error"
                        ? "#F87171"
                        : "#62A0EA"
                    }
                  />
                  <Text
                    style={[
                      styles.gpsPillText,
                      gpsStatus === "success" && styles.gpsPillTextSuccess,
                      gpsStatus === "error" && styles.gpsPillTextError,
                    ]}
                  >
                    {gpsStatus === "success" && "GPS connected — sharing live position"}
                    {gpsStatus === "error" && "GPS unavailable — sharing link without position"}
                    {gpsStatus === "requesting" && "Connecting to GPS…"}
                    {gpsStatus === "idle" && "Waiting for GPS…"}
                  </Text>
                </View>

                {/* Description */}
                <Text style={styles.instructionsText}>
                  Anyone with this link can track your live location on the map for 30 minutes.{" "}
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                    Do not share with untrusted individuals.
                  </Text>
                </Text>

                {/* Share Link Card */}
                <View style={styles.urlBox}>
                  <Text style={styles.urlText} numberOfLines={1}>
                    {shareUrl}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopy}
                    disabled={isExpired}
                    style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.copyBtnText}>
                      {isCopied ? "Copied!" : "Copy"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Countdown Timer */}
                <View
                  style={[
                    styles.timerCard,
                    isExpired && styles.timerCardExpired,
                    timeLeft <= 300 && !isExpired && styles.timerCardWarning,
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={22}
                    color={
                      isExpired
                        ? "#F87171"
                        : timeLeft <= 300
                        ? "#FBBF24"
                        : "#62A0EA"
                    }
                  />
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={[
                        styles.timerDigits,
                        isExpired && { color: "#F87171" },
                        timeLeft <= 300 && !isExpired && { color: "#FBBF24" },
                      ]}
                    >
                      {isExpired ? "00:00" : formatTime(timeLeft)}
                    </Text>
                    <Text style={styles.timerLabel}>
                      {isExpired ? "Link Expired" : "Time Remaining"}
                    </Text>
                  </View>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimerBox}>
                  <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.disclaimerText}>
                    Link automatically stops sharing after 30 minutes. Keep this app open for live updates.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={handleNativeShare}
                    style={styles.shareViaAppsBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.shareViaAppsText}>Share Link</Text>
                  </TouchableOpacity>

                  {!isExpired && (
                    <TouchableOpacity
                      onPress={handleStopSharing}
                      disabled={isStopping}
                      style={styles.stopSharingBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.stopSharingText}>
                        {isStopping ? "Stopping…" : "Stop Sharing"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#071A2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#34D399",
  },
  liveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#34D399",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 20,
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 36,
  },
  loadingText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 12,
  },
  stoppedState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  stoppedIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stoppedTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stoppedSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 4,
  },
  errorState: {
    alignItems: "center",
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 13,
    color: "#F87171",
    marginBottom: 12,
  },
  neutralButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  neutralButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(98, 160, 234, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  gpsPillSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  gpsPillError: {
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderColor: "rgba(248, 113, 113, 0.2)",
  },
  gpsPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#62A0EA",
    flex: 1,
  },
  gpsPillTextSuccess: {
    color: "#34D399",
  },
  gpsPillTextError: {
    color: "#F87171",
  },
  instructionsText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 17,
    marginBottom: 16,
  },
  urlBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 6,
    marginBottom: 16,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "monospace",
    color: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 10,
  },
  copyBtn: {
    backgroundColor: "#1A5FB4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyBtnSuccess: {
    backgroundColor: "#10B981",
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  timerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.2)",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  timerCardWarning: {
    borderColor: "rgba(251, 191, 36, 0.3)",
    backgroundColor: "rgba(251, 191, 36, 0.05)",
  },
  timerCardExpired: {
    borderColor: "rgba(248, 113, 113, 0.3)",
    backgroundColor: "rgba(248, 113, 113, 0.05)",
  },
  timerDigits: {
    fontSize: 24,
    fontWeight: "900",
    color: "#62A0EA",
    letterSpacing: 1,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  shareViaAppsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1A5FB4",
    borderRadius: 12,
    paddingVertical: 12,
  },
  shareViaAppsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stopSharingBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  stopSharingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F87171",
  },
});
