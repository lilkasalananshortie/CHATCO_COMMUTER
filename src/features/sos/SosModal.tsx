import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { commuterColors } from "../../core/theme/colors";
import { commuterService } from "../../core/api/commuter-service";
import type { SosAlert } from "../../core/domain/types";

interface SosModalProps {
  visible: boolean;
  onClose: () => void;
}

type SosStatus =
  | "confirming"
  | "locating"
  | "sending"
  | "active"
  | "responded"
  | "error";

const DEFAULT_LOCATION = { latitude: 14.8434, longitude: 120.875 };
const POLL_INTERVAL_MS = 3000;

export const SosModal: React.FC<SosModalProps> = ({ visible, onClose }) => {
  const [status, setStatus] = useState<SosStatus>("confirming");
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [alertId, setAlertId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetState = () => {
    setStatus("confirming");
    setActiveSeconds(0);
    setErrorMessage("");
    setAlertId(null);
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible]);

  // Elapsed active timer
  useEffect(() => {
    if (status === "active") {
      timerRef.current = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // Poll alert status while active
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const checkAlertStatus = useCallback(
    async (id: string) => {
      try {
        const res = await commuterService.getSosStatus(id);
        if (res.status === "ACKNOWLEDGED" || res.status === "RESOLVED") {
          stopPolling();
          setStatus("responded");
        }
      } catch {
        // keep polling
      }
    },
    [stopPolling]
  );

  useEffect(() => {
    if (status === "active" && alertId) {
      pollRef.current = setInterval(() => {
        checkAlertStatus(alertId);
      }, POLL_INTERVAL_MS);
    }
    return stopPolling;
  }, [status, alertId, checkAlertStatus, stopPolling]);

  // Trigger SOS dispatch
  const sendSos = useCallback(async (latitude: number, longitude: number) => {
    setStatus("sending");
    try {
      const res = await commuterService.triggerSos({
        latitude,
        longitude,
        note: "Emergency distress triggered from Commuter Mobile App",
      });

      if (res.status === "ACKNOWLEDGED" || res.status === "RESOLVED") {
        setStatus("responded");
        return;
      }

      setAlertId(res.id);
      setStatus("active");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to send the SOS signal. Please try again."
      );
    }
  }, []);

  const handleActivate = async () => {
    setStatus("locating");
    setErrorMessage("");

    let lat = DEFAULT_LOCATION.latitude;
    let lng = DEFAULT_LOCATION.longitude;

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    } catch {
      // Fallback to central route coordinate so distress alert is always sent
    }

    void sendSos(lat, lng);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleCallHotline = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const canClose =
    status === "confirming" || status === "responded" || status === "error";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={canClose ? onClose : undefined}
    >
      <View
        style={[
          styles.modalOverlay,
          status === "active" && styles.modalOverlayActive,
        ]}
      >
        <View
          style={[
            styles.modalContent,
            status === "active" && styles.modalContentActive,
          ]}
        >
          {/* 1. CONFIRMING */}
          {status === "confirming" && (
            <View style={styles.stateContainer}>
              <View style={styles.confirmIconCircle}>
                <Ionicons name="warning-outline" size={36} color="#EF4444" />
              </View>

              <Text style={styles.stateTitle}>Send Emergency SOS?</Text>
              <Text style={styles.stateSubtitle}>
                This will immediately share your{" "}
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  real-time live location
                </Text>{" "}
                with the CHATCO Admin team.
              </Text>
              <Text style={styles.warningCaution}>
                Only use this in actual emergencies.
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.neutralButton, { flex: 1 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.neutralButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleActivate}
                  style={[styles.dangerButton, { flex: 1 }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="warning" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.dangerButtonText}>Send SOS</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 2. LOCATING */}
          {status === "locating" && (
            <View style={styles.stateContainer}>
              <View style={styles.locatingCircle}>
                <Ionicons name="navigate-circle" size={44} color="#EF4444" />
              </View>
              <Text style={styles.stateTitle}>Getting your location…</Text>
              <Text style={styles.stateSubtitle}>
                Please allow location access. We need your GPS coordinates to
                direct respondents to you.
              </Text>
              <View style={styles.locatingBarContainer}>
                <View style={styles.locatingBarFill} />
              </View>
            </View>
          )}

          {/* 3. SENDING */}
          {status === "sending" && (
            <View style={styles.stateContainer}>
              <View style={styles.locatingCircle}>
                <ActivityIndicator size="large" color="#EF4444" />
              </View>
              <Text style={styles.stateTitle}>Sending distress signal…</Text>
              <Text style={styles.stateSubtitle}>
                Transmitting your location to the CHATCO Admin team.
              </Text>
            </View>
          )}

          {/* 4. ACTIVE (LOCKED SCREEN, POLLING) */}
          {status === "active" && (
            <View style={styles.stateContainer}>
              <View style={styles.activePulsingCircle}>
                <Ionicons name="alert" size={40} color="#FFFFFF" />
              </View>

              <Text style={[styles.stateTitle, { color: "#EF4444" }]}>
                SOS IS ACTIVE
              </Text>
              <Text style={styles.stateSubtitle}>
                Admin is tracking your live location
              </Text>

              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={20} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.timerDigits}>{formatTimer(activeSeconds)}</Text>
              </View>

              <Text style={styles.activeNotice}>
                Please keep the app open. This screen will automatically update
                once the admin responds.
              </Text>
            </View>
          )}

          {/* 5. RESPONDED */}
          {status === "responded" && (
            <View style={styles.stateContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={44} color="#10B981" />
              </View>
              <Text style={styles.stateTitle}>Signal Received</Text>
              <Text style={styles.stateSubtitle}>
                The CHATCO Admin team has successfully received your distress
                signal. Respondents are being dispatched to your location. Please
                stay calm and keep your location services turned on.
              </Text>

              <TouchableOpacity
                onPress={onClose}
                style={[styles.primaryButton, { width: "100%", marginTop: 20 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Understood</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 6. ERROR */}
          {status === "error" && (
            <View style={styles.stateContainer}>
              <View style={styles.confirmIconCircle}>
                <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
              </View>
              <Text style={styles.stateTitle}>SOS Could Not Be Sent</Text>
              <Text style={styles.stateSubtitle}>{errorMessage}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.neutralButton, { flex: 1 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.neutralButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleActivate}
                  style={[styles.dangerButton, { flex: 1 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dangerButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Emergency Hotline Quick Dial Buttons */}
          <View style={styles.hotlinesDivider} />
          <View style={styles.hotlinesSection}>
            <Text style={styles.hotlinesTitle}>Emergency Hotlines</Text>
            <View style={styles.hotlinesGrid}>
              <TouchableOpacity
                onPress={() => handleCallHotline("911")}
                style={styles.hotlineBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={14} color="#EF4444" />
                <Text style={styles.hotlineBtnText}>PNP / 911</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleCallHotline("160")}
                style={styles.hotlineBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="flame" size={14} color="#EA580C" />
                <Text style={styles.hotlineBtnText}>BFP Fire 160</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalOverlayActive: {
    backgroundColor: "rgba(127, 29, 29, 0.7)",
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#071A2E",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalContentActive: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  stateContainer: {
    width: "100%",
    alignItems: "center",
  },
  confirmIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  locatingCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  activePulsingCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  stateSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 290,
  },
  warningCaution: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
    marginTop: 8,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  neutralButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  neutralButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  dangerButton: {
    flexDirection: "row",
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButton: {
    backgroundColor: "#1A5FB4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  locatingBarContainer: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    marginTop: 20,
    overflow: "hidden",
  },
  locatingBarFill: {
    width: "60%",
    height: "100%",
    backgroundColor: "#EF4444",
    borderRadius: 2,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 14,
  },
  timerDigits: {
    fontSize: 22,
    fontWeight: "900",
    color: "#EF4444",
    fontFamily: "monospace",
  },
  activeNotice: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    lineHeight: 16,
    textAlign: "center",
    maxWidth: 240,
  },
  hotlinesDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginTop: 20,
    marginBottom: 14,
  },
  hotlinesSection: {
    width: "100%",
  },
  hotlinesTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  hotlinesGrid: {
    flexDirection: "row",
    gap: 8,
  },
  hotlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingVertical: 8,
  },
  hotlineBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
});
