import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Text } from "../../shared/ui/BrandText";
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { commuterColors } from "../../core/theme/colors";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { themedStyles } from "../../core/theme/themed-styles";
import {
  commuterService,
  type ClaimGcashResult,
} from "../../core/api/commuter-service";
import { notifyRewardsChanged } from "../../core/domain/rewards-events";
import { voucherLabel } from "../../core/domain/rewards";
import { GroupVoucherPicker } from "./GroupVoucherPicker";

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

type Step =
  | "scanning"
  | "verifying"
  | "voucher_offer"
  | "confirm"
  | "redirecting"
  | "awaiting_payment"
  | "success"
  | "failed";

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  visible,
  onClose,
  onPaymentSuccess,
}) => {
  const { colors: selectedColors, isLight = false } = useCommuterTheme();
  const colors = { ...commuterColors, ...(selectedColors ?? {}) };
  const styles = useMemo(() => themedStyles(baseStyles, colors, isLight), [colors, isLight]);
  const [step, setStep] = useState<Step>("scanning");
  const [claimResult, setClaimResult] = useState<ClaimGcashResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [scanned, setScanned] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const checking = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (visible && step === "scanning") {
      setScanned(false);
      if (permission && !permission.granted && permission.canAskAgain) {
        requestPermission().catch(() => {});
      }
    }
  }, [visible, step, permission, requestPermission]);

  const resetState = () => {
    setStep("scanning");
    setClaimResult(null);
    setError(null);
    setManualToken("");
    setShowManualEntry(false);
    setScanned(false);
  };

  const handleClose = () => {
    generation.current++;
    pending.current = false;
    resetState();
    onClose();
  };

  useEffect(() => {
    if (!visible) { generation.current++; pending.current = false; resetState(); }
    return () => { generation.current++; };
  }, [visible]);

  const extractQrToken = (raw: string): string => {
    let val = raw.trim();
    if (val.startsWith("{") && val.endsWith("}")) {
      try {
        const p = JSON.parse(val);
        if (p.token) return String(p.token);
        if (p.qr_token) return String(p.qr_token);
        if (p.code) return String(p.code);
      } catch {}
    }
    if (val.includes("token=")) {
      try {
        const url = new URL(val);
        const t = url.searchParams.get("token") || url.searchParams.get("qr_token");
        if (t) return t;
      } catch {
        const m = val.match(/token=([a-zA-Z0-9_\-]+)/);
        if (m && m[1]) return m[1];
      }
    }
    return val;
  };

  const proceedToPayment = useCallback(async (result: ClaimGcashResult) => {
    const attempt = generation.current;
    if (result.checkoutUrl) {
      setStep("redirecting");
      try {
        await Linking.openURL(result.checkoutUrl);
        if (generation.current !== attempt) return;
        setStep("awaiting_payment"); // Opening checkout does not prove settlement.
      } catch {
        if (generation.current !== attempt) return;
        setError("Unable to open the GCash payment page.");
        setStep("failed");
      }
      return;
    }

    if (result.amount <= 0) {
      setStep("success");
      if (onPaymentSuccess) onPaymentSuccess();
      return;
    }

    setStep("confirm");
  }, [onPaymentSuccess]);

  const handleScanSuccess = useCallback(async (qrToken: string) => {
    if (pending.current) return;
    const cleanToken = extractQrToken(qrToken);
    if (!cleanToken.trim()) return;
    pending.current = true;
    const attempt = generation.current;
    setStep("verifying");
    setError(null);

    try {
      const result = await commuterService.claimGcash(cleanToken.trim());
      if (generation.current !== attempt) return;
      setClaimResult(result);

      if (result.voucherAvailable) {
        setStep("voucher_offer");
        return;
      }

      await proceedToPayment(result);
    } catch (err: any) {
      if (generation.current !== attempt) return;
      const status = err?.response?.status || err?.status;
      let msg = "Failed to claim this payment. The QR may be invalid or expired.";
      if (status === 404) {
        msg = "This payment QR is invalid or was not found. Please ask the conductor to generate a new one.";
      } else if (status === 410) {
        msg = "This payment QR has expired or already been paid. Please ask the conductor to generate a new one.";
      } else if (status === 409) {
        msg = "This payment has already been claimed by another commuter. Please ask the conductor to generate a new one.";
      } else if (status === 401) {
        msg = "You must be logged in as a commuter to claim a payment.";
      } else if (err?.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      setStep("failed");
    } finally {
      if (generation.current === attempt) pending.current = false;
    }
  }, [proceedToPayment]);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scanned || step !== "scanning") return;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      handleScanSuccess(data);
    },
    [scanned, step, handleScanSuccess]
  );

  const handleUseVoucher = async (voucherIds?: string[]) => {
    if (!claimResult || pending.current) return;
    pending.current = true;
    const attempt = generation.current;
    setStep("verifying");
    try {
      const redeemed = await commuterService.redeemVoucherForGcash(claimResult.transactionId, voucherIds ?? claimResult.availableVoucher?.id);
      if (generation.current !== attempt) return;
      setClaimResult(redeemed);
      await proceedToPayment(redeemed);
    } catch (err: any) {
      if (generation.current !== attempt) return;
      setError(err?.response?.data?.message || err?.message || "Unable to redeem your voucher for this ride.");
      setStep("failed");
    } finally {
      if (generation.current === attempt) pending.current = false;
    }
  };

  const handleDeclineVoucher = async () => {
    if (!claimResult || pending.current) return;
    pending.current = true;
    const attempt = generation.current;
    try { await proceedToPayment(claimResult); }
    finally { if (generation.current === attempt) pending.current = false; }
  };

  const handleConfirmPayment = async () => {
    if (!claimResult || pending.current) return;
    pending.current = true;
    const attempt = generation.current;
    setStep("redirecting");
    try {
      const result = await commuterService.simulatePayment(claimResult.transactionId, "PAID");
      if (generation.current !== attempt) return;
      if (result.status !== "PAID") throw new Error(`Payment is ${result.status.toLowerCase()}, not completed. Check your payment history.`);
      setStep("success");
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err: any) {
      if (generation.current !== attempt) return;
      setError(err?.message || "Unable to complete the payment.");
      setStep("failed");
    } finally {
      if (generation.current === attempt) pending.current = false;
    }
  };

  const checkPayment = useCallback(async () => {
    if (!claimResult || checking.current) return;
    checking.current = true;
    const attempt = generation.current;
    try {
      const result = await commuterService.getPaymentStatus(claimResult.transactionId);
      if (generation.current !== attempt) return;
      if (result.status === "PAID") {
        setError(null); setStep("success"); notifyRewardsChanged(); onPaymentSuccess?.();
      } else if (["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(result.status)) {
        setError(`Payment ${result.status.toLowerCase()}. Check your history before trying another payment.`); setStep("failed");
      } else setError(null);
    } catch (e) { if (generation.current === attempt) setError((e as Error).message); }
    finally { checking.current = false; }
  }, [claimResult, onPaymentSuccess]);

  useEffect(() => {
    if (!visible || step !== "awaiting_payment") return;
    void checkPayment();
    const timer = setInterval(() => { if (AppState.currentState === "active") void checkPayment(); }, 5000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void checkPayment(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [visible, step, checkPayment]);

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
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="qr-code" size={18} color="#62A0EA" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Scan QR Code</Text>
                <Text style={styles.headerSubtitle}>
                  Point your camera at the conductor&apos;s QR
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close scanner"
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Body based on state */}
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {step === "scanning" && (
              <View style={styles.scanningContainer}>
                {!showManualEntry ? (
                  <>
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
                          ChatCo needs camera access to scan the conductor&apos;s fare QR code.
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
                          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
                          facing="back"
                          barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                          }}
                          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        />

                        {/* Scanner Reticle Overlay */}
                        <View style={[styles.reticleOverlay, { pointerEvents: "none" }]}>
                          <View style={styles.reticle}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                            <View style={styles.scanLaser} />
                          </View>
                        </View>

                      </View>
                    )}

                    <Text style={styles.reticleHint}>
                      Align the QR code shown by the conductor within the frame
                    </Text>

                    <TouchableOpacity
                      onPress={() => setShowManualEntry(true)}
                      style={styles.manualEntryLink}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.manualEntryLinkText}>
                        Enter token manually
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.manualFormContainer}>
                    <Text style={styles.inputLabel}>Payment QR Token</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Paste qr_token here"
                      placeholderTextColor="rgba(255, 255, 255, 0.25)"
                      value={manualToken}
                      onChangeText={setManualToken}
                      autoCapitalize="none"
                      autoFocus
                    />

                    <TouchableOpacity
                      onPress={() => handleScanSuccess(manualToken)}
                      disabled={!manualToken.trim()}
                      style={[
                        styles.primaryButton,
                        !manualToken.trim() && styles.disabledButton,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryButtonText}>Claim Payment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowManualEntry(false)}
                      style={styles.secondaryLink}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.secondaryLinkText}>
                        Use camera instead
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {step === "verifying" && (
              <View style={styles.centeredState}>
                <ActivityIndicator size="large" color="#62A0EA" />
                <Text style={styles.stateTitle}>Verifying Transaction</Text>
                <Text style={styles.stateSubtitle}>
                  Claiming this payment + binding it to your account…
                </Text>
              </View>
            )}

            {step === "voucher_offer" && claimResult?.isGroup && Boolean(claimResult.seats?.length) && Boolean(claimResult.availableVouchers?.length) ? (
              <GroupVoucherPicker seats={claimResult.seats!} vouchers={claimResult.availableVouchers!}
                onUse={ids => void handleUseVoucher(ids)} onPayInstead={handleDeclineVoucher} />
            ) : step === "voucher_offer" && claimResult && (
              <View style={styles.centeredState}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="gift-outline" size={32} color="#10B981" />
                </View>
                <Text style={styles.stateTitle}>{claimResult.availableVoucher ? `Use ${voucherLabel(claimResult.availableVoucher)}?` : "Use your voucher?"}</Text>
                <Text style={styles.stateSubtitle}>
                  {claimResult.isGroup
                    ? "The voucher applies to your seat only, not your companions. Discount vouchers may leave a balance. The backend calculates the remaining GCash total."
                    : "Free-ride vouchers cover your fare. Discount vouchers deduct their peso value; any remaining amount is paid through GCash."}
                </Text>

                <View style={styles.fareSummaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      {claimResult.isGroup ? "Group total (GCash)" : "Amount due"}
                    </Text>
                    <Text style={styles.summaryValueHighlight}>
                      ₱{claimResult.amount.toFixed(2)}
                    </Text>
                  </View>
                  {(claimResult.pickupName || claimResult.dropoffName) && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Route</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>
                        {claimResult.pickupName ?? "—"} → {claimResult.dropoffName ?? "—"}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ width: "100%", gap: 10, marginTop: 18 }}>
                  <TouchableOpacity
                    onPress={() => void handleUseVoucher()}
                    style={styles.emeraldButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emeraldButtonText}>Use My Voucher</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeclineVoucher}
                    style={styles.neutralButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.neutralButtonText}>
                      Pay with GCash Instead
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === "confirm" && claimResult && (
              <View style={{ width: "100%" }}>
                <View style={styles.fareBreakdownCard}>
                  <View style={styles.amountDueBox}>
                    <Text style={styles.amountDueLabel}>Amount Due</Text>
                    <Text style={styles.amountDueBig}>
                      ₱{claimResult.amount.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Regular fare</Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        claimResult.discountAmount > 0 && styles.lineThrough,
                      ]}
                    >
                      ₱{claimResult.regularAmount.toFixed(2)}
                    </Text>
                  </View>

                  {claimResult.discountAmount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: "#34D399" }]}>
                        Discount ({claimResult.passengerRole?.replace("_", " ") || "Verified"})
                      </Text>
                      <Text style={[styles.summaryValue, { color: "#34D399", fontWeight: "700" }]}>
                        -₱{claimResult.discountAmount.toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Route</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {claimResult.pickupName ?? "—"} → {claimResult.dropoffName ?? "—"}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Method</Text>
                    <Text style={[styles.summaryValue, { color: "#62A0EA", fontWeight: "700" }]}>
                      GCash
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Ref ID</Text>
                    <Text style={styles.summaryValueMono} numberOfLines={1}>
                      {claimResult.transactionId}
                    </Text>
                  </View>
                </View>

                {/* GCash notice */}
                <View style={styles.noticeBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Ionicons name="shield-checkmark" size={14} color="#62A0EA" />
                    <Text style={styles.noticeTitle}>GCash Secure Payment</Text>
                  </View>
                  <Text style={styles.noticeDesc}>
                    {claimResult.checkoutUrl
                      ? "You'll be redirected to GCash's secure page to authorize this payment."
                      : "Dev mode - tap to simulate instant payment settlement."}
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={[styles.neutralButton, { flex: 1 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.neutralButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmPayment}
                    style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>
                      {claimResult.checkoutUrl ? "Pay with GCash" : "Confirm"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === "redirecting" && (
              <View style={styles.centeredState}>
                <ActivityIndicator size="large" color="#62A0EA" />
                <Text style={styles.stateTitle}>Processing Payment</Text>
                <Text style={styles.stateSubtitle}>
                  Settling transaction and updating conductor poller…
                </Text>
              </View>
            )}

            {step === "awaiting_payment" && <View style={styles.centeredState}>
              <Text style={styles.stateTitle}>Waiting for payment confirmation</Text>
              <Text style={styles.stateSubtitle}>Opening checkout does not mean your fare is paid. We will confirm the status with ChatCo.</Text>
              {!!error && <Text style={styles.stateSubtitle}>{error}</Text>}
              <TouchableOpacity style={styles.primaryButton} onPress={() => void checkPayment()}><Text style={styles.primaryButtonText}>Check payment status</Text></TouchableOpacity>
              <TouchableOpacity style={styles.neutralButton} onPress={handleClose}><Text style={styles.neutralButtonText}>Close and check history later</Text></TouchableOpacity>
            </View>}

            {step === "success" && claimResult && (
              <View style={styles.centeredState}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={32} color="#10B981" />
                </View>
                <Text style={styles.stateTitle}>
                  {claimResult.amount <= 0
                    ? "Ride Covered by Voucher"
                    : "Payment Claimed"}
                </Text>
                <Text style={styles.stateSubtitle}>
                  {claimResult.amount <= 0
                    ? "Your voucher covered this ride in full — nothing left to pay."
                    : "Your payment has been successfully recorded. Check your payment history for details."}
                </Text>

                <View style={styles.fareSummaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount</Text>
                    <Text style={styles.summaryValueHighlight}>
                      ₱{claimResult.amount.toFixed(2)}
                    </Text>
                  </View>
                  {(claimResult.pickupName || claimResult.dropoffName) && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Route</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>
                        {claimResult.pickupName ?? "—"} → {claimResult.dropoffName ?? "—"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Ref ID</Text>
                    <Text style={styles.summaryValueMono}>
                      {claimResult.transactionId}
                    </Text>
                  </View>
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

            {step === "failed" && (
              <View style={styles.centeredState}>
                <View style={styles.errorIconCircle}>
                  <Ionicons name="alert-circle-outline" size={32} color="#F87171" />
                </View>
                <Text style={styles.stateTitle}>Payment Failed</Text>
                <Text style={styles.stateSubtitle}>
                  {error ||
                    "Could not process the payment. The QR code may be invalid, expired, or already claimed by another commuter."}
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
                    onPress={() => {
                      setStep("scanning");
                      setClaimResult(null);
                      setError(null);
                    }}
                    style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const baseStyles = StyleSheet.create({
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
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(26, 95, 180, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(26, 95, 180, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 2,
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
    maxWidth: 240,
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
  fareSummaryCard: {
    width: "100%",
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
    gap: 8,
  },
  fareBreakdownCard: {
    width: "100%",
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  amountDueBox: {
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 4,
  },
  amountDueLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountDueBig: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
  summaryValueHighlight: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryValue: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    maxWidth: "65%",
  },
  summaryValueMono: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    fontFamily: "monospace",
  },
  lineThrough: {
    textDecorationLine: "line-through",
    color: "rgba(255, 255, 255, 0.4)",
  },
  emeraldButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emeraldButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
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
  noticeBox: {
    backgroundColor: "rgba(26, 95, 180, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(26, 95, 180, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#62A0EA",
  },
  noticeDesc: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.4)",
    lineHeight: 14,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
});
