import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { commuterColors } from "../../core/theme/colors";
import { commuterService } from "../../core/api/commuter-service";
import { ReceiptScanModal } from "../scanner/ReceiptScanModal";
import { Mascot } from "../../shared/ui/Mascot";
import { MascotMessage } from "../../shared/ui/MascotMessage";
import { getMascotErrorState } from "../../shared/ui/mascot-error";
import { loadRewardsAndUpdates } from "./load-rewards";
import { isVoucherAvailable, voucherLabel } from "../../core/domain/rewards";
import { subscribeRewardsChanged } from "../../core/domain/rewards-events";
import { FeatureButton } from "../../shared/ui/FeatureControls";
import { announcementLabel } from "../../core/domain/announcement-category";
import type { RenewalState } from "../student-renewal/renewal-types";
import type {
  RewardProgress,
  Voucher,
  Announcement,
  AnnouncementType,
} from "../../core/domain/types";

interface RewardsScreenProps {
  onOpenReceiptScan?: () => void;
  onOpenRenewal?: () => void;
  renewalState?: RenewalState | null;
}

const announcementConfig: Record<
  AnnouncementType,
  { color: string; bg: string; border: string; label: string; emoji: string }
> = {
  SAVED_ITEM: { color: "#99C1F1", bg: "rgba(98,160,234,0.1)", border: "rgba(98,160,234,0.2)", label: "Saved item", emoji: "🔖" },
  VOUCHER: { color: "#34D399", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", label: "Voucher", emoji: "🎟️" },
  PROMO: {
    color: "#FBBF24",
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.2)",
    label: "Promo",
    emoji: "🎉",
  },
  SAFETY: {
    color: "#34D399",
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.2)",
    label: "Safety",
    emoji: "🛡️",
  },
  SYSTEM: {
    color: "#62A0EA",
    bg: "rgba(26, 95, 180, 0.1)",
    border: "rgba(26, 95, 180, 0.2)",
    label: "System",
    emoji: "🔔",
  },
  MAINTENANCE: {
    color: "#F87171",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.2)",
    label: "Advisory",
    emoji: "🚧",
  },
  CLAIM_UPDATE: {
    color: "#A78BFA",
    bg: "rgba(139, 92, 246, 0.1)",
    border: "rgba(139, 92, 246, 0.2)",
    label: "Claim Update",
    emoji: "📦",
  },
  CUSTOM: {
    color: "#CBD5E1",
    bg: "rgba(148, 163, 184, 0.1)",
    border: "rgba(148, 163, 184, 0.2)",
    label: "Other",
    emoji: "🏷️",
  },
};

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  onOpenReceiptScan,
  onOpenRenewal,
  renewalState,
}) => {
  const [data, setData] = useState<RewardProgress | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [announcementsError, setAnnouncementsError] = useState<unknown>(null);
  const fetching = useRef(false);
  const mounted = useRef(true);

  // Modals
  const [showReceiptScanLocal, setShowReceiptScanLocal] = useState(false);
  const [showRewardsHelp, setShowRewardsHelp] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [activeVoucherCode, setActiveVoucherCode] = useState<string | null>(null);
  const [voucherCopied, setVoucherCopied] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchData = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const { rewards: rewardRes, announcements: announcementRes } = await loadRewardsAndUpdates(commuterService);
      if (!mounted.current) return;

      if (rewardRes.status === "fulfilled") {
        setData(rewardRes.value);
        setError(null);
      } else {
        setError(rewardRes.reason ?? new Error("Rewards unavailable"));
      }

      if (announcementRes.status === "fulfilled") {
        setAnnouncements(announcementRes.value || []);
        setAnnouncementsError(null);
      } else {
        setAnnouncementsError(announcementRes.reason ?? new Error("Updates unavailable"));
      }
    } catch (err) {
      if (mounted.current) setError(err ?? new Error("Rewards unavailable"));
    } finally {
      fetching.current = false;
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void fetchData();
    const unsubscribe = subscribeRewardsChanged(() => { void fetchData(); });
    const interval = setInterval(() => { if (AppState.currentState === "active") void fetchData(); }, 30000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void fetchData(); });
    return () => { mounted.current = false; unsubscribe(); clearInterval(interval); subscription.remove(); };
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenReceiptScanner = () => {
    if (onOpenReceiptScan) {
      onOpenReceiptScan();
    } else {
      setShowReceiptScanLocal(true);
    }
  };

  const unreadCount = announcements.filter((a) => !a.is_read).length;

  const markAllAsRead = async () => {
    try {
      await commuterService.markAllAnnouncementsRead();
      setAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })));
    } catch {
      // ignore
    }
  };

  const openAnnouncement = async (item: Announcement) => {
    setSelectedAnnouncement(item);
    if (!item.is_read) {
      try {
        await commuterService.markAnnouncementRead(item.id);
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a))
        );
      } catch {
        // ignore
      }
    }
  };

  const redeemVoucher = (voucher: Voucher) => {
    if (error || !isVoucherAvailable(voucher)) return;
    setActiveVoucherCode(voucher.code);
    setVoucherCopied(false);
    setShowVoucherModal(true);
  };

  const copyVoucherCode = async () => {
    if (!activeVoucherCode) return;
    try {
      await Clipboard.setStringAsync(activeVoucherCode);
      setVoucherCopied(true);
      setTimeout(() => setVoucherCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#62A0EA" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorScreen}>
        <MascotMessage {...getMascotErrorState(error)} onRetry={onRefresh} retrying={refreshing} />
        {onOpenRenewal && <FeatureButton label="Student renewal" onPress={onOpenRenewal} />}
      </View>
    );
  }

  const currentRides = data.currentCycleRides ?? data.current_rides ?? 0;
  const targetRides = data.ridesNeeded ?? data.target_rides ?? 10;
  const ridesRemaining = Math.max(0, targetRides - currentRides);
  const progressPercent = Math.min(100, Math.round((currentRides / targetRides) * 100));
  const vouchers = data.vouchers || [];

  return (
    <View style={styles.container}>
      {/* --- HEADER (fixed top matching web) --- */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rewards & Updates</Text>
          <Text style={styles.headerSubtitle}>
            Your perks, progress, and latest alerts.
          </Text>
        </View>

        {/* Only GCash transactions earn rewards per specification */}
      </View>

      {/* --- SCROLLING BODY --- */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#62A0EA"
          />
        }
      >
        {onOpenRenewal && <View style={{ marginBottom: 16, gap: 8 }}>
          {renewalState?.notice_active && <Text style={{ color: "#FBBF24", lineHeight: 21 }}>Student renewal: {renewalState.renewal_period}. Check your eligibility and submit enrollment proof.</Text>}
          <FeatureButton label={renewalState?.notice_active ? "Review student renewal" : "Student renewal and eligibility"} onPress={onOpenRenewal} />
        </View>}
        {Boolean(error) && (
          <MascotMessage
            {...getMascotErrorState(error)}
            message="Showing your last loaded rewards. Reconnect and refresh before using a voucher."
            compact onRetry={onRefresh} retrying={refreshing}
          />
        )}
        {/* --- 1. LATEST UPDATES (ANNOUNCEMENTS) --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Latest Updates</Text>
            <TouchableOpacity
              onPress={markAllAsRead}
              disabled={unreadCount === 0}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.markAllReadText,
                  unreadCount === 0 && styles.markAllReadDisabled,
                ]}
              >
                Mark all read
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.announcementsList}>
            {announcements.map((item) => {
              const type = (item.type || "SYSTEM") as AnnouncementType;
              const config = announcementConfig[type] || announcementConfig.SYSTEM;
              const badgeLabel = announcementLabel(item, config.label);

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => openAnnouncement(item)}
                  style={[
                    styles.announcementCard,
                    item.is_read && styles.announcementCardRead,
                  ]}
                  activeOpacity={0.8}
                >
                  {!item.is_read && <View style={styles.unreadDot} />}
                  <View style={styles.announcementRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: config.bg,
                          borderColor: config.border,
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{config.emoji}</Text>
                      <Text
                        style={[styles.categoryLabel, { color: config.color }]}
                      >
                        {badgeLabel}
                      </Text>
                    </View>

                    <View style={styles.announcementBody}>
                      <View style={styles.announcementTitleRow}>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text
                            style={[
                              styles.announcementTitle,
                              item.is_read && styles.announcementTitleRead,
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          {!item.is_read && (
                            <View style={styles.newBadge}>
                              <Text style={styles.newBadgeText}>NEW</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.announcementTime}>
                          {formatRelativeTime(item.published_at || item.created_at)}
                        </Text>
                      </View>
                      <Text
                        style={styles.announcementMessage}
                        numberOfLines={2}
                      >
                        {item.content || item.message}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {Boolean(announcementsError) ? (
              <MascotMessage {...getMascotErrorState(announcementsError)} message="We couldn't refresh announcements. Please try again." compact onRetry={onRefresh} retrying={refreshing} />
            ) : announcements.length === 0 && (
              <MascotMessage pose="noticeboard" title="All caught up" message="No announcements right now. Check back for updates." compact />
            )}
          </View>
        </View>

        {/* --- 2. PROGRESS RING SECTION --- */}
        <View style={styles.progressCard}>
          {/* Help Button "?" */}
          <TouchableOpacity
            onPress={() => setShowRewardsHelp(true)}
            style={styles.helpButton}
            activeOpacity={0.7}
          >
            <Text style={styles.helpButtonText}>?</Text>
          </TouchableOpacity>

          <View style={styles.progressRingWrapper}>
            {/* Visual Ring Gauge */}
            <View style={styles.ringOuter}>
              <View
                style={[
                  styles.ringInner,
                  {
                    borderColor:
                      progressPercent === 100 ? "#10B981" : "#1A5FB4",
                  },
                ]}
              >
                <Text style={styles.ringBigNumber}>{currentRides}</Text>
                <Text style={styles.ringSubNumber}>of {targetRides} rides</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressTextColumn}>
            <Text style={styles.progressBannerTitle}>
              {ridesRemaining === 0
                ? "Free Ride Unlocked! 🎉"
                : `${ridesRemaining} Rides to Free Ride`}
            </Text>
            <Text style={styles.progressDescription}>
              Complete {targetRides} eligible paid rides to earn a free ride voucher. Eligible GCash rides count automatically; claim eligible cash receipts to add those rides. Your total completed rides:{" "}
              <Text style={{ color: "#62A0EA", fontWeight: "700" }}>
                {data.totalRides}
              </Text>
              .
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Total Rides</Text>
                <Text style={styles.statBoxValue}>{data.totalRides}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Vouchers Available</Text>
                <Text style={[styles.statBoxValue, { color: "#34D399" }]}>
                  {data.availableVoucherCount}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- 3. VOUCHERS LIST --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Vouchers</Text>
          {!error && vouchers.some((voucher) => voucher.status === "AVAILABLE" && (!voucher.expires_at || new Date(voucher.expires_at).getTime() > Date.now())) && (
            <MascotMessage pose="reward" title="You have vouchers!" message="Check each voucher's value and expiry below." compact />
          )}
          <View style={styles.vouchersList}>
            {vouchers.map((voucher) => {
              const isAvailable = !error && isVoucherAvailable(voucher);

              return (
                <View
                  key={voucher.id}
                  style={[
                    styles.voucherCard,
                    voucher.status === "AVAILABLE" && styles.voucherCardAvailable,
                    voucher.status === "USED" && styles.voucherCardUsed,
                    voucher.status === "EXPIRED" && styles.voucherCardExpired,
                  ]}
                >
                  <View style={styles.voucherLeft}>
                    <View style={styles.voucherIconBox}>
                      <Ionicons
                        name="ticket-outline"
                        size={22}
                        color={
                          isAvailable
                            ? "#34D399"
                            : voucher.status === "EXPIRED"
                            ? "#F87171"
                            : "rgba(255,255,255,0.4)"
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.voucherTitle}>{voucherLabel(voucher)}</Text>
                      <Text style={styles.voucherMeta}>
                        Source: {voucher.rideOrigin || "Completed Ride"} • Exp:{" "}
                        {voucher.expires_at
                          ? new Date(voucher.expires_at).toLocaleDateString()
                          : "Ongoing"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.voucherRight}>
                    {isAvailable && (
                      <TouchableOpacity
                        onPress={() => redeemVoucher(voucher)}
                        style={styles.useVoucherBtn}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.useVoucherBtnText}>Use Voucher</Text>
                      </TouchableOpacity>
                    )}
                    {voucher.status === "USED" && (
                      <Text style={styles.voucherStatusUsed}>REDEEMED</Text>
                    )}
                    {voucher.status === "EXPIRED" && (
                      <Text style={styles.voucherStatusExpired}>EXPIRED</Text>
                    )}
                  </View>
                </View>
              );
            })}

            {vouchers.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>
                  No vouchers yet. Keep riding to earn your first free ride!
                </Text>
              </View>
            )}

            {(data.archivedVoucherCount ?? 0) > 0 && (
              <Text style={styles.archivedVouchersNote}>
                {data.archivedVoucherCount} older redeemed or expired voucher
                {data.archivedVoucherCount === 1 ? " is" : "s are"} archived.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* --- RECEIPT SCAN MODAL --- */}
      <ReceiptScanModal
        visible={showReceiptScanLocal}
        onClose={() => setShowReceiptScanLocal(false)}
        onClaimed={() => {
          fetchData();
        }}
      />

      {/* --- "HOW REWARDS WORK" EXPLAINER MODAL --- */}
      <Modal visible={showRewardsHelp} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.explainerCard}>
            <View style={styles.explainerHeader}>
              <Text style={styles.explainerTitle}>How free rides work</Text>
              <Text style={styles.explainerSub}>
                Every {targetRides} paid rides earns you one free ride.
              </Text>
            </View>

            <ScrollView style={styles.explainerBody}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumberCircle}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Ride and pay with GCash</Text>
                  <Text style={styles.stepDesc}>
                    Every ride you pay with{" "}
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>GCash</Text>{" "}
                    automatically counts as{" "}
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>+1 reward ride</Text>{" "}
                    toward your next free ride.
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumberCircle}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Reach {targetRides} rides</Text>
                  <Text style={styles.stepDesc}>
                    1 GCash ride = 1 reward step. Complete {targetRides} rides to finish the cycle and unlock your reward.
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumberCircle}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>
                    1 Free Ride Voucher Unlocked
                  </Text>
                  <Text style={styles.stepDesc}>
                    At {targetRides} rides, a free ride voucher (₱0.00 fare) is added to &ldquo;My
                    Vouchers&rdquo; below, and your counter resets to start your next cycle.
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumberCircle}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Redeem it on your next ride</Text>
                  <Text style={styles.stepDesc}>
                    Tap <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Use Voucher</Text>
                    , then show the code to the conductor. They enter it and the ride is free.
                  </Text>
                </View>
              </View>

              <View style={styles.catchNoticeBox}>
                <Text style={styles.catchNoticeText}>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>
                    One catch:
                  </Text>{" "}
                  a ride you pay for with a voucher is free, so it doesn&apos;t count
                  toward the next one. Only rides you actually pay for move the
                  counter.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowRewardsHelp(false)}
                style={styles.neutralModalButton}
                activeOpacity={0.8}
              >
                <Text style={styles.neutralModalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- ACTIVE VOUCHER MODAL --- */}
      <Modal visible={showVoucherModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.voucherModalCard}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.voucherModalHeader}>
              <Mascot pose="reward" size={96} />
              <Text style={styles.voucherModalTitle}>{voucherLabel(vouchers.find((v) => v.code === activeVoucherCode) ?? {})}</Text>
              <Text style={styles.voucherModalSubtitle}>
                No scan is required—the conductor enters this code.
              </Text>
            </View>

            <View style={styles.voucherModalBody}>
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>VOUCHER CODE</Text>
                <Text style={styles.codeDisplay}>{activeVoucherCode}</Text>
              </View>

              <View style={styles.instructionsList}>
                <Text style={styles.instructionItem}>
                  <Text style={{ color: "#34D399", fontWeight: "700" }}>1. </Text>
                  Tell the conductor you are using this voucher. Discount vouchers may leave a fare balance to collect in cash.
                </Text>
                <Text style={styles.instructionItem}>
                  <Text style={{ color: "#34D399", fontWeight: "700" }}>2. </Text>
                  Show this code so they can enter it in Fare Payment.
                </Text>
                <Text style={styles.instructionItem}>
                  <Text style={{ color: "#34D399", fontWeight: "700" }}>3. </Text>
                  The voucher becomes used when applied to the fare. Showing the code does not activate or redeem it.
                </Text>
              </View>

              <TouchableOpacity
                onPress={copyVoucherCode}
                style={styles.copyCodeButton}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={voucherCopied ? "checkmark" : "copy-outline"}
                  size={16}
                  color="#34D399"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.copyCodeButtonText}>
                  {voucherCopied ? "Code copied" : "Copy code"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowVoucherModal(false)}
                style={styles.neutralModalButton}
                activeOpacity={0.8}
              >
                <Text style={styles.neutralModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- ANNOUNCEMENT DETAIL MODAL --- */}
      {selectedAnnouncement && (() => {
        const type = (selectedAnnouncement.type || "SYSTEM") as AnnouncementType;
        const config = announcementConfig[type] || announcementConfig.SYSTEM;
        const badgeLabel = announcementLabel(selectedAnnouncement, config.label);

        return (
          <Modal visible={true} animationType="fade" transparent>
            <View style={styles.modalBackdrop}>
              <View style={styles.announcementModalCard}>
                <View style={styles.announcementModalHeader}>
                  <View style={styles.announcementModalBadgeRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: config.bg, borderColor: config.border },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{config.emoji}</Text>
                      <Text style={[styles.categoryLabel, { color: config.color }]}>
                        {badgeLabel}
                      </Text>
                    </View>
                    <Text style={styles.announcementTime}>
                      {formatRelativeTime(
                        selectedAnnouncement.published_at ||
                          selectedAnnouncement.created_at
                      )}
                    </Text>
                  </View>
                  <Text style={styles.announcementModalTitle}>
                    {selectedAnnouncement.title}
                  </Text>
                </View>

                <ScrollView style={styles.announcementModalBody}>
                  <Text style={styles.announcementModalText}>
                    {selectedAnnouncement.content || selectedAnnouncement.message}
                  </Text>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    onPress={() => setSelectedAnnouncement(null)}
                    style={styles.neutralModalButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.neutralModalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050F1A",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#050F1A",
    alignItems: "center",
    justifyContent: "center",
  },
  errorScreen: {
    flex: 1,
    backgroundColor: "#050F1A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1A5FB4",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    backgroundColor: "#071A2E",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
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
  receiptScanIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  markAllReadText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#62A0EA",
  },
  markAllReadDisabled: {
    color: "rgba(255, 255, 255, 0.25)",
  },
  announcementsList: {
    gap: 10,
  },
  announcementCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    padding: 14,
    position: "relative",
  },
  announcementCardRead: {
    opacity: 0.6,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  unreadDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#62A0EA",
    borderWidth: 2,
    borderColor: "#071A2E",
  },
  announcementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 11,
  },
  categoryLabel: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  announcementBody: {
    flex: 1,
  },
  announcementTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 4,
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  announcementTitleRead: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  newBadge: {
    backgroundColor: "rgba(98, 160, 234, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.3)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#62A0EA",
  },
  announcementTime: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.3)",
  },
  announcementMessage: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    lineHeight: 16,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCardText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.3)",
  },
  progressCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    position: "relative",
    alignItems: "center",
  },
  helpButton: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  helpButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.5)",
  },
  progressRingWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  ringOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 8,
    borderColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  ringBigNumber: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  ringSubNumber: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  progressTextColumn: {
    width: "100%",
    alignItems: "center",
  },
  progressBannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  progressDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  vouchersList: {
    gap: 12,
  },
  voucherCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  voucherCardAvailable: {
    borderColor: "rgba(16, 185, 129, 0.25)",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  voucherCardUsed: {
    opacity: 0.5,
  },
  voucherCardExpired: {
    borderColor: "rgba(248, 113, 113, 0.2)",
    backgroundColor: "rgba(248, 113, 113, 0.05)",
  },
  voucherLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  voucherIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  voucherMeta: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  voucherRight: {
    alignItems: "flex-end",
  },
  useVoucherBtn: {
    backgroundColor: "#FF6D3A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: "#FF6D3A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  useVoucherBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  voucherStatusUsed: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: 0.5,
  },
  voucherStatusExpired: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F87171",
    letterSpacing: 0.5,
  },
  archivedVouchersNote: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.35)",
    textAlign: "center",
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  explainerCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#071A2E",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  explainerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  explainerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  explainerSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 4,
  },
  explainerBody: {
    padding: 20,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1A5FB4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 17,
  },
  catchNoticeBox: {
    backgroundColor: "#050F1A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  catchNoticeText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
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
  voucherModalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "90%",
    backgroundColor: "#071A2E",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  voucherModalHeader: {
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  voucherModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  voucherModalSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 4,
    textAlign: "center",
  },
  voucherModalBody: {
    padding: 24,
    backgroundColor: "#050F1A",
    alignItems: "center",
  },
  codeContainer: {
    width: "100%",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(52, 211, 153, 0.6)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  codeDisplay: {
    fontSize: 22,
    fontWeight: "900",
    color: "#34D399",
    letterSpacing: 3,
    marginTop: 6,
  },
  instructionsList: {
    width: "100%",
    marginTop: 16,
    gap: 8,
  },
  instructionItem: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 16,
  },
  copyCodeButton: {
    marginTop: 18,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
  },
  copyCodeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34D399",
  },
  announcementModalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#071A2E",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  announcementModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  announcementModalBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  announcementModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  announcementModalBody: {
    padding: 20,
  },
  announcementModalText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
  },
});
