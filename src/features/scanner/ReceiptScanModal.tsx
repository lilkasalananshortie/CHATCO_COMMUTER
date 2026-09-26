import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { commuterColors } from "../../core/theme/colors";
import { commuterService, type ReceiptClaimResult } from "../../core/api/commuter-service";

interface ReceiptScanModalProps {
  visible: boolean;
  onClose: () => void;
  onClaimed?: () => void;
}

type Step = "scanning" | "verifying" | "success" | "expired" | "failed";

export const ReceiptScanModal: React.FC<ReceiptScanModalProps> = ({
  visible,
  onClose,
  onClaimed,
}) => {
  const [step, setStep] = useState<Step>("scanning");
  const [result, setResult] = useState<ReceiptClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (visible && step === "scanning") {
      setScanned(false);
      setTorch(false);
      if (permission && !permission.granted && permission.canAskAgain) {
        requestPermission().catch(() => {});
      }
    }
  }, [visible, step, permission, requestPermission]);

  const resetState = () => {
    setStep("scanning");
    setResult(null);
    setError(null);
    setManualToken("");
    setShowManualEntry(false);
    setTorch(false);
    setScanned(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const extractReceiptToken = (raw: string): string => {
    let val = raw.trim();
    if (val.startsWith("{") && val.endsWith("}")) {
      try {
        const p = JSON.parse(val);
        if (p.token) return String(p.token);
        if (p.receipt_token) return String(p.receipt_token);
        if (p.code) return String(p.code);
      } catch {}
    }
    if (val.includes("token=")) {
      try {
        const url = new URL(val);
        const t = url.searchParams.get("token") || url.searchParams.get("code");
        if (t) return t;
      } catch {
        const m = val.match(/token=([a-zA-Z0-9_\-]+)/);
        if (m && m[1]) return m[1];
      }
    }
    return val;
  };

  const submitToken = async (qrToken: string) => {
    const cleanToken = extractReceiptToken(qrToken);
    if (!cleanToken.trim()) return;
    setStep("verifying");
    setError(null);

    try {
      const claim = await commuterService.claimReceipt(cleanToken.trim());
      setResult(claim);
      setStep("success");
      if (!claim.alreadyClaimed && onClaimed) {
        onClaimed();
      }
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 410) {
        setStep("expired");
        return;
      }
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (status === 409
          ? "This receipt has already been claimed."
          : status === 404
          ? "We don't recognise this QR code."
          : "This receipt can't be claimed.");
      setError(msg);
      setStep("failed");
    }
  };

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scanned || step !== "scanning") return;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      submitToken(data);
    },
    [scanned, step, submitToken]
  );

  const retry = () => {
    resetState();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Scan Receipt</Text>
              <Text style={styles.headerSubtitle}>
                Scan the QR on your paper receipt to count that cash ride.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Body content based on step */}
          <View style={styles.body}>
            {step === "scanning" && !showManualEntry && (
              <View style={styles.scanningContainer}>
                {!permission ? (
                  <View style={styles.permissionBox}>
                    <ActivityIndicator size="large" color="#62A0EA" />
                    <Text style={styles.permissionText}>Checking camera access…</Text>
                  </View>
                ) : !permission.granted ? (
                  <View style={styles.permissionBox}>
                    <Ionicons name="camera-outline" size={44} color="#62A0EA" />
                    <Text style={styles.permissionTitle}>Camera Access Required</Text>
                    <Text style={styles.permissionText}>
                      ChatCo needs camera access to scan your paper receipt QR.
                    </Text>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      activeOpacity={0.8}
                      onPress={requestPermission}
                    >
                      <Ionicons name="shield-checkmark-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.primaryButtonText}>Enable Camera</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.scannerViewport}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      enableTorch={torch}
                      barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                      }}
                      onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    />

                    {/* Scanner Reticle Overlay */}
                    <View style={styles.reticleOverlay} pointerEvents="none">
                      <View style={styles.reticle}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                        <View style={styles.scanLaser} />
                      </View>
                    </View>

                    {/* Torch toggle button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setTorch((t) => !t)}
                      style={styles.torchBtn}
                      accessibilityLabel={torch ? "Turn off flashlight" : "Turn on flashlight"}
                    >
                      <Ionicons
                        name={torch ? "flash" : "flash-outline"}
                        size={18}
                        color={torch ? "#FBBF24" : "#FFFFFF"}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.reticleHint}>
                  Align paper receipt QR code in the frame
                </Text>

                <TouchableOpacity
                  onPress={() => setShowManualEntry(true)}
                  style={styles.manualEntryLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.manualEntryLinkText}>
                    Enter the code manually instead
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "scanning" && showManualEntry && (
              <View style={styles.manualFormContainer}>
                <Text style={styles.inputLabel}>Receipt code</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Printed under the QR code"
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  value={manualToken}
                  onChangeText={setManualToken}
                  autoCapitalize="characters"
                  autoFocus
                />

                <TouchableOpacity
                  onPress={() => submitToken(manualToken)}
                  disabled={!manualToken.trim()}
                  style={[
                    styles.primaryButton,
                    !manualToken.trim() && styles.disabledButton,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Claim ride</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowManualEntry(false)}
                  style={styles.secondaryLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryLinkText}>
                    Use the camera instead
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "verifying" && (
              <View style={styles.centeredState}>
                <ActivityIndicator size="large" color="#62A0EA" />
                <Text style={styles.stateSubtitle}>Checking your receipt…</Text>
              </View>
            )}

            {step === "success" && result && (
              <View style={styles.centeredState}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={32} color="#10B981" />
                </View>
                <Text style={styles.stateTitle}>
                  {result.alreadyClaimed ? "Already Claimed" : "Ride Counted!"}
                </Text>
                <Text style={styles.stateSubtitle}>
                  {result.alreadyClaimed
                    ? "You have already claimed this receipt."
                    : "This cash ride now counts toward your next free ride."}
                </Text>

                <View style={styles.receiptSummaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Fare</Text>
                    <Text style={styles.summaryValueHighlight}>
                      ₱{result.amount.toFixed(2)}
                    </Text>
                  </View>
                  {(result.pickupName || result.dropoffName) && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Route</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>
                        {result.pickupName ?? "—"} → {result.dropoffName ?? "—"}
                      </Text>
                    </View>
                  )}
                  {result.transactionId && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Ref ID</Text>
                      <Text style={styles.summaryValueMono}>
                        {result.transactionId}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.primaryButton, { width: "100%", marginTop: 20 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "expired" && (
              <View style={styles.centeredState}>
                <View style={styles.warningIconCircle}>
                  <Ionicons name="time-outline" size={32} color="#FBBF24" />
                </View>
                <Text style={styles.stateTitle}>Receipt Expired</Text>
                <Text style={styles.stateSubtitle}>
                  Receipt QR codes stay claimable for a limited time after the
                  ride, and this one is past it. It can no longer be counted.
                </Text>

                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.neutralButton, { width: "100%", marginTop: 20 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.neutralButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "failed" && (
              <View style={styles.centeredState}>
                <View style={styles.errorIconCircle}>
                  <Ionicons name="alert-circle-outline" size={32} color="#F87171" />
                </View>
                <Text style={styles.stateTitle}>Couldn't Claim</Text>
                <Text style={styles.stateSubtitle}>
                  {error || "Something went wrong claiming this receipt."}
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={[styles.neutralButton, { flex: 1 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.neutralButtonText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={retry}
                    style={[styles.primaryButton, { flex: 1 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#071A2E",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 4,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  body: {
    padding: 20,
  },
  scanningContainer: {
    alignItems: "center",
  },
  scannerViewport: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#050F1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
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
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
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
  },
  manualEntryLink: {
    marginTop: 16,
    paddingVertical: 6,
  },
  manualEntryLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#62A0EA",
  },
  manualFormContainer: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  textInput: {
    width: "100%",
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
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
    marginTop: 16,
    shadowColor: "#1A5FB4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.4,
  },
  secondaryLink: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 6,
  },
  secondaryLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.4)",
  },
  centeredState: {
    alignItems: "center",
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
    textAlign: "center",
  },
  stateSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 280,
  },
  receiptSummaryCard: {
    width: "100%",
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
  },
  summaryValueHighlight: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryValue: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    maxWidth: "70%",
  },
  summaryValueMono: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    fontFamily: "monospace",
  },
  neutralButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  neutralButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 20,
  },
});
