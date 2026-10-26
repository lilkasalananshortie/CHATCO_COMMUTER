import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Text } from "../../shared/ui/BrandText";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { commuterColors } from "../../core/theme/colors";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { themedStyles } from "../../core/theme/themed-styles";
import { commuterService } from "../../core/api/commuter-service";
import { ReceiptScanModal } from "../scanner/ReceiptScanModal";
import { Mascot } from "../../shared/ui/Mascot";
import { MascotMessage } from "../../shared/ui/MascotMessage";
import { getMascotErrorState } from "../../shared/ui/mascot-error";
import { loadRewardsAndUpdates } from "./load-rewards";
import { voucherLabel, voucherWalletStatus } from "../../core/domain/rewards";
import { subscribeRewardsChanged } from "../../core/domain/rewards-events";
import { announcementLabel } from "../../core/domain/announcement-category";
import Svg, { Circle } from "react-native-svg";
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
  onOpenDiscountApplication?: () => void;
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

function announcementTheme(type: AnnouncementType, isLight: boolean) {
  const config = announcementConfig[type] || announcementConfig.SYSTEM;
  if (!isLight) return config;
  const lightColors: Record<string, string> = {
    "#99C1F1": "#1A5FB4", "#34D399": "#047857", "#FBBF24": "#B45309",
    "#62A0EA": "#1A5FB4", "#F87171": "#B91C1C", "#A78BFA": "#6D28D9", "#CBD5E1": "#475569",
  };
  return { ...config, color: lightColors[config.color.toUpperCase()] ?? config.color };
}

function formatAnnouncementDate(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "";
}

function voucherValueText(voucher: Voucher): string {
  return voucher.type === "DISCOUNT" ? `₱${Number(voucher.amount ?? 0).toFixed(2)} off` : "Free ride";
}

function voucherDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

function AnimatedVoucherStub({ voucher, tab, index }: { voucher: Voucher; tab: "AVAILABLE" | "USED" | "EXPIRED"; index: number }) {
  const { colors: selectedColors, isLight = false } = useCommuterTheme();
  const colors = selectedColors ?? commuterColors;
  const styles = useMemo(() => themedStyles(baseStyles, colors, isLight), [colors, isLight]);
  const opacity = useRef(new Animated.Value(0)).current;
  const expiresAt = voucher.expiresAt ?? voucher.expires_at;

  useEffect(() => {
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      delay: Math.min(index, 14) * 35,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, opacity, tab, voucher.id]);

  const available = tab === "AVAILABLE";
  const label = tab === "USED" ? "Used" : tab === "EXPIRED" ? "Expired" : expiresAt ? "Valid until" : "Validity";
  const detail = tab === "USED" ? voucherDate(voucher.usedAt) || "Recorded" : tab === "EXPIRED" ? voucherDate(expiresAt) || "Expired" : expiresAt ? voucherDate(expiresAt) : "No expiry";

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
      <View style={[styles.voucherCard, !available && styles.voucherCardMuted]}>
        <View style={styles.voucherMain}>
          <Text numberOfLines={1} style={styles.voucherOrigin}>{voucher.rideOrigin || "Reward"}</Text>
          <Text style={[styles.voucherValue, !available && styles.voucherValueMuted]}>{voucherValueText(voucher)}</Text>
          <Text numberOfLines={1} style={styles.voucherCode}>{voucher.code}</Text>
        </View>
        <View pointerEvents="none" style={styles.voucherDivider} />
        <View pointerEvents="none" style={[styles.voucherNotch, styles.voucherNotchTop]} />
        <View pointerEvents="none" style={[styles.voucherNotch, styles.voucherNotchBottom]} />
        <View style={styles.voucherStub}>
          <View>
            <Text style={styles.voucherStubLabel}>{label}</Text>
            <Text style={styles.voucherStubValue}>{detail}</Text>
            {tab === "USED" && voucher.usedRoute && <Text numberOfLines={2} style={styles.voucherStubHint}>{voucher.usedRoute}</Text>}
          </View>
          {available && <Text style={styles.voucherStubHint}>Offered when you pay by GCash</Text>}
        </View>
      </View>
    </Animated.View>
  );
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  onOpenReceiptScan,
  onOpenRenewal,
  onOpenDiscountApplication,
  renewalState,
}) => {
  const { colors: selectedColors, isLight = false } = useCommuterTheme();
  const colors = selectedColors ?? commuterColors;
  const styles = useMemo(() => themedStyles(baseStyles, colors, isLight), [colors, isLight]);
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
  const [voucherTab, setVoucherTab] = useState<"AVAILABLE" | "USED" | "EXPIRED">("AVAILABLE");
  const [section, setSection] = useState<"rewards" | "announcements">("rewards");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [walletItems, setWalletItems] = useState<Record<"AVAILABLE" | "USED" | "EXPIRED", Voucher[]>>({ AVAILABLE: [], USED: [], EXPIRED: [] });
  const walletCursors = useRef<Record<"AVAILABLE" | "USED" | "EXPIRED", string | null>>({ AVAILABLE: null, USED: null, EXPIRED: null });
  const [walletHasMore, setWalletHasMore] = useState<Record<"AVAILABLE" | "USED" | "EXPIRED", boolean>>({ AVAILABLE: false, USED: false, EXPIRED: false });
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<unknown>(null);
  const previousAvailableVoucherKey = useRef<string | null>(null);

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

  const fetchWallet = useCallback(async (tab: "AVAILABLE" | "USED" | "EXPIRED", reset = false) => {
    const cursor = reset ? null : walletCursors.current[tab];
    if (reset) walletCursors.current[tab] = null;
    setWalletLoading(true);
    try {
      const result = await commuterService.getVoucherWallet(tab.toLowerCase() as "available" | "used" | "expired", cursor);
      if (!mounted.current) return;
      walletCursors.current[tab] = result.nextCursor;
      setWalletHasMore(previous => ({ ...previous, [tab]: result.nextCursor !== null }));
      setWalletItems(previous => {
        if (!cursor) return { ...previous, [tab]: result.items };
        const known = new Set(previous[tab].map(item => item.id));
        return { ...previous, [tab]: [...previous[tab], ...result.items.filter(item => !known.has(item.id))] };
      });
      setWalletError(null);
    } catch (err) {
      if (mounted.current) setWalletError(err);
    } finally {
      if (mounted.current) setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWallet(voucherTab, true);
  }, [fetchWallet, voucherTab]);

  const availableVoucherKey = data
    ? (data.vouchers ?? []).filter(voucher => voucherWalletStatus(voucher) === "AVAILABLE").map(voucher => voucher.id).sort().join(",")
    : null;
  useEffect(() => {
    if (availableVoucherKey === null) return;
    if (previousAvailableVoucherKey.current === null) {
      previousAvailableVoucherKey.current = availableVoucherKey;
      return;
    }
    if (previousAvailableVoucherKey.current === availableVoucherKey) return;
    previousAvailableVoucherKey.current = availableVoucherKey;
    // Match the web wallet: reload every tab after a voucher is earned, used,
    // or expired, including when the Used tab is already open.
    void Promise.all(["AVAILABLE", "USED", "EXPIRED"].map(tab => fetchWallet(tab as "AVAILABLE" | "USED" | "EXPIRED", true)));
  }, [availableVoucherKey, fetchWallet]);

  const onRefresh = () => {
    setRefreshing(true);
    void Promise.all([fetchData(), fetchWallet(voucherTab, true)]);
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

  const copyVoucherCode = async () => {
    if (!activeVoucherCode) return;
    try {
      await Clipboard.setStringAsync(activeVoucherCode);
      setVoucherCopied(true);
      setTimeout(() => setVoucherCopied(false), 2000);
    } catch {
      // Clipboard is optional; the voucher remains visible in the modal.
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
      </View>
    );
  }

  const currentRides = data.currentCycleRides ?? data.current_rides ?? 0;
  const targetRides = data.ridesNeeded ?? data.target_rides ?? 10;
  const ridesRemaining = Math.max(0, targetRides - currentRides);
  const progressPercent = Math.min(100, Math.max(0, (currentRides / targetRides) * 100));
  const vouchers = data.vouchers || [];
  const availableVoucherCount = data.availableVoucherCount ?? vouchers.filter(voucher => voucherWalletStatus(voucher) === "AVAILABLE").length;
  const visibleVouchers = walletItems[voucherTab];

  return (
    <View style={styles.container}>
      {/* --- HEADER (fixed top matching web) --- */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rewards & Updates</Text>
        </View>

        <TouchableOpacity onPress={handleOpenReceiptScanner} style={styles.receiptScanIconBtn} accessibilityRole="button" accessibilityLabel="Scan receipt">
          <Ionicons name="qr-code-outline" size={20} color={isLight ? colors.textSecondary : "#FFFFFF"} />
        </TouchableOpacity>
      </View>

      <View accessibilityRole="tablist" style={styles.sectionTabs}>
        <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: section === "rewards" }} onPress={() => setSection("rewards")} style={[styles.sectionTab, section === "rewards" && styles.sectionTabActive]}>
          <Ionicons name="ticket-outline" size={16} color={section === "rewards" ? (isLight ? colors.primary : "#FFFFFF") : (isLight ? colors.textMuted : "#94A3B8")} />
          <Text style={[styles.sectionTabText, section === "rewards" && styles.sectionTabTextActive, section === "rewards" && isLight && { color: colors.textPrimary }]}>Rewards</Text>
          {availableVoucherCount > 0 && <Text style={[styles.sectionTabCount, section === "rewards" && styles.sectionTabCountActive]}>{availableVoucherCount}</Text>}
          <View pointerEvents="none" style={[styles.sectionTabUnderline, section === "rewards" && { backgroundColor: isLight ? colors.primary : "#62A0EA" }, section === "rewards" && styles.sectionTabUnderlineActive]} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: section === "announcements" }} onPress={() => setSection("announcements")} style={[styles.sectionTab, section === "announcements" && styles.sectionTabActive]}>
          <Ionicons name="notifications-outline" size={16} color={section === "announcements" ? (isLight ? colors.primary : "#FFFFFF") : (isLight ? colors.textMuted : "#94A3B8")} />
          <Text style={[styles.sectionTabText, section === "announcements" && styles.sectionTabTextActive, section === "announcements" && isLight && { color: colors.textPrimary }]}>Updates</Text>
          {unreadCount > 0 && <Text style={styles.sectionTabCount}>{unreadCount}</Text>}
          <View pointerEvents="none" style={[styles.sectionTabUnderline, section === "announcements" && { backgroundColor: isLight ? colors.primary : "#62A0EA" }, section === "announcements" && styles.sectionTabUnderlineActive]} />
        </TouchableOpacity>
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
        {Boolean(error) && (
          <MascotMessage
            {...getMascotErrorState(error)}
            message="Showing your last loaded rewards. Reconnect and refresh before using a voucher."
            compact onRetry={onRefresh} retrying={refreshing}
          />
        )}
        {section === "announcements" && <>
        {onOpenRenewal && renewalState?.notice_active && <View style={styles.renewalNotice}>
          <Text style={styles.renewalNoticeText}>Student renewal: {renewalState.renewal_period}. Check your eligibility and submit enrollment proof.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={onOpenRenewal} style={styles.renewalAction}><Text style={styles.renewalActionText}>Review student renewal</Text></TouchableOpacity>
        </View>}
        {/* --- 1. LATEST UPDATES (ANNOUNCEMENTS) --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            <TouchableOpacity
              onPress={markAllAsRead}
              disabled={unreadCount === 0}
              activeOpacity={0.7}
              style={styles.markAllReadAction}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={unreadCount === 0 ? "rgba(255,255,255,0.25)" : "#62A0EA"} />
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

          <TouchableOpacity onPress={() => setUnreadOnly((value) => !value)} style={styles.unreadFilter} accessibilityRole="checkbox" accessibilityState={{ checked: unreadOnly }}>
            <View style={[styles.unreadCheckbox, unreadOnly && styles.unreadCheckboxActive]}>{unreadOnly && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}</View>
            <Text style={styles.unreadFilterText}>Unread only</Text>
          </TouchableOpacity>

          <View style={styles.announcementsList}>
            {announcements.filter((item) => !unreadOnly || !item.is_read).map((item) => {
              const type = (item.type || "SYSTEM") as AnnouncementType;
              const config = announcementTheme(type, isLight);
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
                  <View style={[styles.unreadDot, item.is_read && styles.unreadDotRead]} />
                  <View style={styles.announcementBody}>
                    <View style={styles.announcementMetaRow}>
                      <Text style={[styles.announcementCategory, { color: config.color }]}>
                        {badgeLabel}
                        {!item.is_read && <Text style={styles.announcementUnreadLabel}>Unread</Text>}
                      </Text>
                      <Text style={styles.announcementTime}>
                        {formatAnnouncementDate(item.published_at || item.created_at)}
                      </Text>
                    </View>
                    <Text style={[styles.announcementTitle, item.is_read && styles.announcementTitleRead]}>
                      {item.title}
                    </Text>
                    <Text style={styles.announcementMessage} numberOfLines={2}>
                      {item.content || item.message}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" style={styles.announcementChevron} />
                </TouchableOpacity>
              );
            })}

            {Boolean(announcementsError) ? (
              <MascotMessage {...getMascotErrorState(announcementsError)} message="We couldn't refresh announcements. Please try again." compact onRetry={onRefresh} retrying={refreshing} />
            ) : announcements.filter((item) => !unreadOnly || !item.is_read).length === 0 && (
              <MascotMessage pose="noticeboard" title="All caught up" message="No announcements right now. Check back for updates." compact />
            )}
          </View>
        </View>
        </>}

        {section === "rewards" && <>
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
            <View accessibilityRole="progressbar" accessibilityLabel="Paid rides toward your next free ride" accessibilityValue={{ min: 0, max: 100, now: progressPercent }}>
              <Svg width={192} height={192} viewBox="0 0 100 100" style={{ transform: [{ rotate: "-90deg" }] }}>
                <Circle cx="50" cy="50" r="40" fill="none" stroke={isLight ? "#E5E7EB" : "rgba(255,255,255,0.05)"} strokeWidth="8" />
                <Circle cx="50" cy="50" r="40" fill="none" stroke={progressPercent === 100 ? "#10B981" : "#1A5FB4"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`} />
              </Svg>
              <View pointerEvents="none" style={styles.ringCenter}>
                <Text style={styles.ringBigNumber}>{currentRides}</Text>
                <Text style={styles.ringSubNumber}>of {targetRides} rides</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressTextColumn}>
            <Text style={styles.progressBannerTitle}>
              {ridesRemaining === 0
                ? "Free Ride Unlocked!"
                : `${ridesRemaining} Ride${ridesRemaining === 1 ? "" : "s"} to Free Ride`}
            </Text>
            <Text style={styles.progressDescription}>
              Complete {targetRides} paid rides to earn a free ride voucher. GCash counts automatically; cash counts once you scan the receipt QR.
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Total Rides</Text>
                <Text style={styles.statBoxValue}>{data.totalRides}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Vouchers Available</Text>
                <Text style={[styles.statBoxValue, { color: "#34D399" }]}>
                  {availableVoucherCount}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- 3. VOUCHERS LIST --- */}
        <View style={styles.section}>
          <View style={styles.voucherHeaderRow}>
          <Text style={styles.voucherSectionTitle}>My vouchers</Text>
          <View accessibilityRole="tablist" accessibilityLabel="Voucher status" style={styles.voucherTabs}>
            {(["AVAILABLE", "USED", "EXPIRED"] as const).map(tab => <TouchableOpacity key={tab}
              accessibilityRole="tab" accessibilityState={{ selected: tab === voucherTab }}
              onPress={() => setVoucherTab(tab)}
              style={[styles.voucherTab, tab === voucherTab && styles.voucherTabActive]}>
              <Text style={[styles.voucherTabText, tab === voucherTab && styles.voucherTabTextActive]}>{tab === "AVAILABLE" ? "Available" : tab === "USED" ? "Used" : "Expired"}{tab === "AVAILABLE" && availableVoucherCount > 0 ? ` ${availableVoucherCount}` : ""}</Text>
            </TouchableOpacity>)}
          </View>
          </View>
          <View style={styles.vouchersList}>
            {walletLoading && <View style={styles.walletLoading}><ActivityIndicator size="small" color="#62A0EA" /></View>}
            {!walletLoading && visibleVouchers.map((voucher, index) => (
              <AnimatedVoucherStub key={`${voucherTab}-${voucher.id}`} voucher={voucher} tab={voucherTab} index={index} />
            ))}

            {!walletLoading && Boolean(walletError) && (
              <View style={styles.walletError}>
                <Text style={styles.emptyCardText}>We couldn&apos;t load this voucher list.</Text>
                <TouchableOpacity onPress={() => void fetchWallet(voucherTab, true)} style={styles.walletRetry}><Text style={styles.walletRetryText}>Try again</Text></TouchableOpacity>
              </View>
            )}

            {!walletLoading && !walletError && visibleVouchers.length === 0 && (
              <View style={[styles.emptyCard, voucherTab === "AVAILABLE" && styles.availableEmptyCard]}>
                {voucherTab === "AVAILABLE" ? (
                  <>
                    <Mascot pose="reward" size={92} />
                    <Text style={styles.emptyCardTitle}>No vouchers yet</Text>
                    <Text style={styles.emptyCardText}>
                      Your next free ride arrives after {ridesRemaining} more paid ride{ridesRemaining === 1 ? "" : "s"}. GCash rides count automatically.
                    </Text>
                    <TouchableOpacity onPress={handleOpenReceiptScanner} style={[styles.scanReceiptLink, styles.scanReceiptLinkCentered]}>
                      <Ionicons name="qr-code-outline" size={16} color={isLight ? colors.primary : "#99C1F1"} />
                      <Text style={styles.scanReceiptLinkText}>Scan a cash receipt</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.emptyCardText}>
                    {voucherTab === "USED" ? "No used vouchers. When a conductor records a voucher fare, it shows here with the ride it paid for." : "Nothing has expired. Vouchers you don't use before their date move here."}
                  </Text>
                )}
              </View>
            )}
            {!walletError && walletHasMore[voucherTab] && (
              <TouchableOpacity accessibilityRole="button" disabled={walletLoading} onPress={() => void fetchWallet(voucherTab)} style={styles.walletRetry}>
                {walletLoading ? <ActivityIndicator size="small" color="#62A0EA" /> : <Text style={styles.walletRetryText}>Load more vouchers</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
        </>}
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
        const config = announcementTheme(type, isLight);
        const badgeLabel = announcementLabel(selectedAnnouncement, config.label);

        return (
          <Modal visible={true} animationType="fade" transparent onRequestClose={() => setSelectedAnnouncement(null)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.announcementModalCard}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close announcement"
                  onPress={() => setSelectedAnnouncement(null)}
                  style={styles.announcementModalClose}
                >
                  <Ionicons name="close" size={20} color="rgba(255,255,255,0.55)" />
                </TouchableOpacity>
                <View style={styles.announcementModalHeader}>
                  <View style={styles.announcementModalMetaRow}>
                    <Text style={[styles.announcementCategory, { color: config.color }]}>{badgeLabel}</Text>
                    <Text style={styles.announcementTime}>
                      {formatAnnouncementDate(
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
                  {selectedAnnouncement.rawType?.startsWith("DISCOUNT_APPLICATION") && onOpenDiscountApplication && (
                    <TouchableOpacity
                      onPress={() => { setSelectedAnnouncement(null); onOpenDiscountApplication(); }}
                      style={styles.announcementPrimaryAction}
                    >
                      <Text style={styles.announcementPrimaryActionText}>View discount application</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                  {selectedAnnouncement.rawType?.startsWith("STUDENT_RENEWAL") && onOpenRenewal && (
                    <View style={styles.announcementActions}>
                      <TouchableOpacity
                        onPress={() => { setSelectedAnnouncement(null); onOpenRenewal(); }}
                        style={styles.announcementPrimaryAction}
                      >
                        <Text style={styles.announcementPrimaryActionText}>{renewalState?.can_submit ? "Renew student status" : "View renewal status"}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      {renewalState?.can_switch_to_regular && renewalState.status !== "PENDING" && renewalState.status !== "APPROVED" && (
                        <TouchableOpacity
                          onPress={() => { setSelectedAnnouncement(null); onOpenRenewal(); }}
                          style={styles.announcementSecondaryAction}
                        >
                          <Text style={styles.announcementSecondaryActionText}>No Longer a Student</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {selectedAnnouncement.type === "VOUCHER" && (
                    <TouchableOpacity
                      onPress={() => { setSelectedAnnouncement(null); setSection("rewards"); setVoucherTab("AVAILABLE"); }}
                      style={styles.announcementPrimaryAction}
                    >
                      <Text style={styles.announcementPrimaryActionText}>View vouchers</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        );
      })()}
    </View>
  );
};

const baseStyles = StyleSheet.create({
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
    borderBottomWidth: 0,
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
  sectionTabs: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "#071A2E",
    borderBottomWidth: 1,
    borderBottomColor: "#1E2D45",
  },
  sectionTab: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    position: "relative",
  },
  sectionTabActive: { backgroundColor: "transparent" },
  sectionTabText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  sectionTabTextActive: { color: "#FFFFFF" },
  sectionTabCount: { color: "#64748B", fontSize: 11, fontWeight: "700", backgroundColor: "#1A2540", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  sectionTabCountActive: { color: "#8CB9F0", backgroundColor: "rgba(98,160,234,0.15)" },
  sectionTabUnderline: { position: "absolute", left: 8, right: 8, bottom: 0, height: 2, borderRadius: 2, backgroundColor: "#62A0EA", opacity: 0 },
  sectionTabUnderlineActive: { opacity: 1 },
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
    marginBottom: 20,
  },
  renewalNotice: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(98,160,234,0.3)",
    backgroundColor: "#071A2E",
    gap: 12,
  },
  renewalNoticeText: { color: "#99C1F1", fontSize: 13, lineHeight: 20 },
  renewalAction: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#1A5FB4" },
  renewalActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  unreadFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  unreadCheckbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadCheckboxActive: {
    borderColor: "#1A5FB4",
    backgroundColor: "#1A5FB4",
  },
  unreadFilterText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  markAllReadAction: { flexDirection: "row", alignItems: "center", gap: 8 },
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
    borderRadius: 12,
    padding: 16,
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  announcementCardRead: {
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  unreadDot: {
    width: 6,
    height: 6,
    marginTop: 6,
    borderRadius: 3,
    backgroundColor: "#62A0EA",
    flexShrink: 0,
  },
  unreadDotRead: { backgroundColor: "transparent" },
  announcementBody: {
    flex: 1,
    minWidth: 0,
  },
  announcementMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  announcementCategory: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  announcementUnreadLabel: {
    marginLeft: 8,
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  announcementChevron: {
    marginTop: 2,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 19,
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
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
  announcementMessage: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    lineHeight: 16,
    marginTop: 4,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  availableEmptyCard: { minHeight: 270 },
  emptyCardTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", textAlign: "center" },
  emptyCardText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.3)",
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 320,
  },
  progressCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 24,
    paddingTop: 48,
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
    marginBottom: 32,
    marginTop: 0,
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
  ringCenter: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
    fontSize: 30,
    fontWeight: "800",
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
    fontSize: 20,
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
    gap: 24,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  statBox: {
    minWidth: 92,
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
  voucherHeaderRow: {
    gap: 12,
    marginBottom: 16,
  },
  voucherSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  voucherTabs: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#071A2E",
  },
  voucherTab: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  voucherTabActive: { backgroundColor: "#1A5FB4" },
  voucherTabText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  voucherTabTextActive: { color: "#FFFFFF" },
  voucherCard: {
    backgroundColor: "#071A2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 0,
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 140,
    overflow: "hidden",
    position: "relative",
  },
  voucherCardMuted: { opacity: 0.6 },
  voucherMain: {
    flex: 1,
    minWidth: 0,
    padding: 20,
    justifyContent: "space-between",
    gap: 16,
  },
  voucherOrigin: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  voucherValue: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginTop: 6 },
  voucherValueMuted: { color: "rgba(255,255,255,0.55)" },
  voucherCode: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "monospace" },
  voucherStub: {
    width: 142,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderLeftColor: "rgba(255,255,255,0.15)",
    padding: 16,
    paddingLeft: 20,
    justifyContent: "space-between",
  },
  voucherStubLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", letterSpacing: 0.7 },
  voucherStubValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 4 },
  voucherStubHint: { color: "rgba(255,255,255,0.45)", fontSize: 10, lineHeight: 14, marginTop: 4 },
  voucherDivider: { position: "absolute", top: 12, bottom: 12, right: 142, borderLeftWidth: 1, borderStyle: "dashed", borderLeftColor: "rgba(255,255,255,0.15)" },
  voucherNotch: { position: "absolute", right: 132, width: 20, height: 20, borderRadius: 10, backgroundColor: "#050F1A", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  voucherNotchTop: { top: -10 },
  voucherNotchBottom: { bottom: -10 },
  walletLoading: { minHeight: 140, alignItems: "center", justifyContent: "center" },
  walletError: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: 10 },
  walletRetry: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  walletRetryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  scanReceiptLink: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  scanReceiptLinkCentered: { alignSelf: "center" },
  scanReceiptLinkText: { color: "#99C1F1", fontSize: 14, fontWeight: "500" },
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
    paddingRight: 52,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  announcementModalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  announcementModalClose: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
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
  announcementPrimaryAction: {
    minHeight: 44,
    marginTop: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1A5FB4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  announcementActions: { gap: 12 },
  announcementPrimaryActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  announcementSecondaryAction: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  announcementSecondaryActionText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
});
