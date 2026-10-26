import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { commuterService } from "../../core/api/commuter-service";
import type { Trip } from "../../core/domain/types";

interface PaymentHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFeedback?: (trip: Trip) => void;
}

type TimeFilter = "all" | "today" | "week" | "month";

const PER_PAGE = 20;

function getStatusBadge(status: string) {
  const normalized = (status || "").toLowerCase();
  switch (normalized) {
    case "paid":
      return { bg: "rgba(16, 185, 129, 0.15)", text: "#34D399", label: "Paid" };
    case "pending":
      return { bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24", label: "Pending" };
    case "processing":
      return { bg: "rgba(98, 160, 234, 0.15)", text: "#62A0EA", label: "Processing" };
    case "failed":
      return { bg: "rgba(248, 113, 113, 0.15)", text: "#F87171", label: "Failed" };
    case "refunded":
      return { bg: "rgba(167, 139, 250, 0.15)", text: "#A78BFA", label: "Refunded" };
    default:
      return { bg: "rgba(255, 255, 255, 0.08)", text: "rgba(255, 255, 255, 0.5)", label: status || "Unknown" };
  }
}

function formatDateTime(isoString?: string | null) {
  if (!isoString) return { date: "Recent", time: "" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: isoString, time: "" };
  return {
    date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  visible,
  onClose,
  onSelectFeedback,
}) => {
  const { colors, isLight } = useCommuterTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [history, setHistory] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [summary, setSummary] = useState<{ total_spent: number; ride_count: number; average_fare: number } | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async (target: number, filter: TimeFilter) => {
      const requestId = target === 1 ? ++requestIdRef.current : requestIdRef.current;
      if (target === 1) {
        setIsLoading(true);
        setHistory([]);
        setSummary(null);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const result = await commuterService.getPaymentHistory(target, PER_PAGE, filter);
        if (requestId !== requestIdRef.current) return;
        setHistory((prev) => (target === 1 ? result.items : [...prev, ...result.items]));
        setPage(result.page);
        setLastPage(result.lastPage);
        setSummary(result.summary ?? null);
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        setError(err?.message || "Unable to load payment history.");
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (visible) {
      loadPage(1, timeFilter);
    }
  }, [visible, timeFilter, loadPage]);

  const paid = history.filter((tx) => (tx.status || "").toUpperCase() === "PAID");
  const totalSpent = summary ? Number(summary.total_spent) : paid.reduce((sum, tx) => sum + (tx.final_amount ?? tx.fare_amount ?? tx.gross_amount ?? 0), 0);
  const rideCount = summary ? Number(summary.ride_count) : paid.length;
  const avgFare = summary ? Number(summary.average_fare) : rideCount > 0 ? totalSpent / rideCount : 0;
  const hasMore = page < lastPage;

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
            <View>
              <Text style={styles.headerTitle}>Payment History</Text>
              <Text style={styles.headerSubtitle}>Your ride payments</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Summary Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Total Spent</Text>
              <Text style={styles.statBoxValue}>₱{totalSpent.toFixed(0)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Rides</Text>
              <Text style={styles.statBoxValue}>{rideCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Avg Fare</Text>
              <Text style={styles.statBoxValue}>₱{avgFare.toFixed(0)}</Text>
            </View>
          </View>

          {/* Time Filter Tabs */}
          <View style={styles.filterRow}>
            {(
              [
                { key: "all" as TimeFilter, label: "All" },
                { key: "today" as TimeFilter, label: "Today" },
                { key: "week" as TimeFilter, label: "This Week" },
                { key: "month" as TimeFilter, label: "This Month" },
              ] as const
            ).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setTimeFilter(tab.key)}
                style={[
                  styles.filterTab,
                  timeFilter === tab.key && styles.filterTabActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    timeFilter === tab.key && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List Area */}
          <View style={{ flex: 1 }}>
            {isLoading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator size="large" color="#62A0EA" />
              </View>
            ) : error ? (
              <View style={styles.centeredState}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  onPress={() => loadPage(1, timeFilter)}
                  style={styles.retryBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryBtnText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.centeredState}>
                <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {timeFilter === "all" ? "No transactions found" : "No rides in this period"}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.historyList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={false}
                    onRefresh={() => loadPage(1, timeFilter)}
                    tintColor="#62A0EA"
                  />
                }
              >
                {history.map((tx) => {
                  const { date, time } = formatDateTime(tx.created_at || tx.paid_at || tx.completed_at);
                  const badge = getStatusBadge(tx.status || "PAID");
                  if (isLight) badge.text = ({ Paid: "#047857", Pending: "#92400E", Processing: "#1A5FB4", Failed: "#B91C1C", Refunded: "#6D28D9" } as Record<string, string>)[badge.label] ?? colors.textSecondary;
                  const isExpanded = expandedId === tx.id;
                  const fare = tx.final_amount ?? tx.fare_amount ?? tx.gross_amount ?? 0;

                  return (
                    <View
                      key={tx.id}
                      style={[
                        styles.transactionCard,
                        isExpanded && styles.transactionCardExpanded,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => setExpandedId(isExpanded ? null : tx.id)}
                        style={styles.cardHeaderBtn}
                        activeOpacity={0.7}
                      >
                        <View style={styles.txnIconBox}>
                          <Ionicons name="card-outline" size={18} color="#62A0EA" />
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.routeText} numberOfLines={1}>
                            {tx.pickup_name || tx.origin_name || "Boarding"} →{" "}
                            {tx.dropoff_name || tx.destination_name || "Drop-off"}
                          </Text>
                          <View style={styles.dateTimeRow}>
                            <Text style={styles.dateSubText}>{date}</Text>
                            {time ? (
                              <>
                                <View style={styles.dotSeparator} />
                                <Text style={styles.dateSubText}>{time}</Text>
                              </>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.amountBadgeColumn}>
                          <Text style={styles.amountNumber}>- ₱{fare.toFixed(2)}</Text>
                          <View style={[styles.statusBadgePill, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                              {badge.label}
                            </Text>
                          </View>
                        </View>

                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="rgba(255,255,255,0.4)"
                          style={{ marginLeft: 6 }}
                        />
                      </TouchableOpacity>

                      {/* Expanded details */}
                      {isExpanded && (
                        <View style={styles.expandedContent}>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Pickup</Text>
                            <Text style={styles.detailValue}>
                              {tx.pickup_name || tx.origin_name || "—"}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Drop-off</Text>
                            <Text style={styles.detailValue}>
                              {tx.dropoff_name || tx.destination_name || "—"}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Payment</Text>
                            <Text style={styles.detailValue}>
                              {tx.payment_method || "GCash"}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Ref ID</Text>
                            <Text style={styles.detailValueMono} numberOfLines={1}>
                              {tx.transaction_id || tx.id}
                            </Text>
                          </View>
                          {tx.conductor_name ? (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Conductor</Text>
                              <Text style={styles.detailValue}>{tx.conductor_name}</Text>
                            </View>
                          ) : null}
                          {tx.unit_number ? (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Unit</Text>
                              <Text style={styles.detailValue}>{tx.unit_number}</Text>
                            </View>
                          ) : null}
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Fare</Text>
                            <Text style={styles.detailValueHighlight}>
                              ₱{fare.toFixed(2)}
                            </Text>
                          </View>

                          {/* Leave Feedback Action */}
                          {onSelectFeedback && (tx.can_leave_feedback || (tx.has_feedback && tx.feedback)) && (
                            <TouchableOpacity
                              onPress={() => {
                                onClose();
                                onSelectFeedback(tx);
                              }}
                              style={styles.feedbackBtn}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="star-outline" size={14} color="#62A0EA" />
                              <Text style={styles.feedbackBtnText}>
                                {tx.has_feedback ? "Feedback Submitted · View" : "Leave Feedback"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                {hasMore && (
                  <TouchableOpacity
                    onPress={() => loadPage(page + 1, timeFilter)}
                    disabled={isLoadingMore}
                    style={styles.loadMoreBtn}
                    activeOpacity={0.7}
                  >
                    {isLoadingMore ? (
                      <ActivityIndicator size="small" color="#62A0EA" />
                    ) : (
                      <Text style={styles.loadMoreText}>Load more</Text>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useCommuterTheme>["colors"]) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    height: "85%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statBoxLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  statBoxValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: "#1A5FB4",
    borderColor: "#1A5FB4",
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  errorText: {
    fontSize: 13,
    color: "#F87171",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: "#1A5FB4",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyTitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 10,
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  transactionCardExpanded: {
    borderColor: "rgba(98, 160, 234, 0.3)",
    backgroundColor: "rgba(26, 95, 180, 0.05)",
  },
  cardHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  txnIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(26, 95, 180, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(26, 95, 180, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  routeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  dateSubText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    marginHorizontal: 5,
  },
  amountBadgeColumn: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  amountNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  statusBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 3,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    backgroundColor: colors.background,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textPrimary,
    maxWidth: "70%",
  },
  detailValueMono: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: "monospace",
    maxWidth: "70%",
  },
  detailValueHighlight: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  feedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(26, 95, 180, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(26, 95, 180, 0.3)",
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  feedbackBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#62A0EA",
  },
  loadMoreBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
});
