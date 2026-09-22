import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { commuterService } from "../../core/api/commuter-service";
import type { LostItem, ClaimData, ClaimStatus } from "../../core/domain/types";

type ViewTab = "ALL" | "WATCHLIST" | "MY_CLAIMS";
type ItemCategory = "ALL" | "ACCESSORY" | "BAG" | "WALLET" | "GADGET" | "CLOTHING" | "DOCUMENT" | "OTHER";
type ClaimFilter = "ALL" | "PENDING" | "VALIDATED" | "RELEASED" | "REJECTED";

const CATEGORIES: { label: string; value: ItemCategory }[] = [
  { label: "All Categories", value: "ALL" },
  { label: "Accessories", value: "ACCESSORY" },
  { label: "Bags & Backpacks", value: "BAG" },
  { label: "Wallets & Purses", value: "WALLET" },
  { label: "Gadgets & Electronics", value: "GADGET" },
  { label: "Clothing & Apparel", value: "CLOTHING" },
  { label: "Documents & IDs", value: "DOCUMENT" },
  { label: "Other Belongings", value: "OTHER" },
];

const CLAIM_FILTERS: { label: string; value: ClaimFilter }[] = [
  { label: "All Statuses", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved / Ready", value: "VALIDATED" },
  { label: "Released", value: "RELEASED" },
  { label: "Rejected", value: "REJECTED" },
];

export const LostFoundScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>("ALL");
  const [items, setItems] = useState<LostItem[]>([]);
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("ALL");
  const [selectedClaimFilter, setSelectedClaimFilter] = useState<ClaimFilter>("ALL");
  const [selectedDate, setSelectedDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal
  const [detailItem, setDetailItem] = useState<LostItem | null>(null);

  // Claim Submission Modal
  const [claimTargetItem, setClaimTargetItem] = useState<LostItem | null>(null);
  const [proofText, setProofText] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Cancel Claim Modal
  const [cancelTargetClaim, setCancelTargetClaim] = useState<ClaimData | null>(null);
  const [isCancellingClaim, setIsCancellingClaim] = useState(false);

  // Expanded timelines in Claims tab
  const [expandedClaimTimelines, setExpandedClaimTimelines] = useState<Set<string>>(new Set());

  // Fetch Items / Claims
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "MY_CLAIMS") {
        const res = await commuterService.getMyClaims({
          page,
          per_page: 15,
          status: selectedClaimFilter !== "ALL" ? selectedClaimFilter : undefined,
          date: selectedDate || undefined,
          search: searchQuery || undefined,
        });
        setClaims(res.claims || []);
        setTotalPages(res.lastPage || 1);
      } else if (activeTab === "WATCHLIST") {
        const res = await commuterService.getMyWatchlist({
          page,
          per_page: 15,
          date: selectedDate || undefined,
          search: searchQuery || undefined,
        });
        setItems(res.items || []);
        setTotalPages(res.lastPage || 1);
        setWatchlistIds(new Set(res.items.map((i) => i.id)));
      } else {
        const res = await commuterService.getLostItems({
          page,
          per_page: 15,
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
          date: selectedDate || undefined,
          search: searchQuery || undefined,
        });
        setItems(res.items || []);
        setTotalPages(res.lastPage || 1);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, selectedCategory, selectedClaimFilter, selectedDate, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleWatchlist = async (item: LostItem) => {
    const isWatched = watchlistIds.has(item.id) || item.is_watched;
    const nextWatched = !isWatched;

    setWatchlistIds((prev) => {
      const copy = new Set(prev);
      if (nextWatched) copy.add(item.id);
      else copy.delete(item.id);
      return copy;
    });

    try {
      await commuterService.toggleWatchlist(item.id, nextWatched);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_watched: nextWatched } : i))
      );
    } catch {
      // revert on error
    }
  };

  const handleSubmitClaim = async () => {
    if (!claimTargetItem) return;
    if (!proofText.trim()) {
      Alert.alert("Required", "Please describe identifying details or unique marks.");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      await commuterService.claimLostItem(claimTargetItem.id, {
        proof_description: proofText.trim(),
        contact_number: contactNumber.trim(),
      });
      Alert.alert(
        "Claim Submitted",
        "Your claim has been submitted to staff for review. You can track status in the Claims tab."
      );
      setClaimTargetItem(null);
      setProofText("");
      setContactNumber("");
      fetchData();
    } catch (err: any) {
      const msg = err?.message || "Could not submit claim. Please try again.";
      Alert.alert("Submission Failed", msg);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleConfirmCancelClaim = async () => {
    if (!cancelTargetClaim) return;
    setIsCancellingClaim(true);
    try {
      await commuterService.cancelClaim(cancelTargetClaim.claimId);
      Alert.alert("Claim Withdrawn", "Your claim has been cancelled.");
      setCancelTargetClaim(null);
      fetchData();
    } catch (err: any) {
      Alert.alert("Notice", err?.message || "Could not cancel claim.");
    } finally {
      setIsCancellingClaim(false);
    }
  };

  const toggleTimeline = (claimId: string) => {
    setExpandedClaimTimelines((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return { bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24", label: "Pending" };
      case "VALIDATED":
      case "APPROVED":
        return { bg: "rgba(16, 185, 129, 0.15)", text: "#34D399", label: "Approved" };
      case "RELEASED":
        return { bg: "rgba(98, 160, 234, 0.15)", text: "#62A0EA", label: "Released" };
      case "REJECTED":
        return { bg: "rgba(239, 68, 68, 0.15)", text: "#F87171", label: "Rejected" };
      default:
        return { bg: "rgba(255, 255, 255, 0.1)", text: "rgba(255, 255, 255, 0.6)", label: status };
    }
  };

  return (
    <View style={styles.container}>
      {/* --- PINNED HEADER --- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.passengerBadge}>
            <Ionicons name="briefcase-outline" size={12} color="#62A0EA" style={{ marginRight: 4 }} />
            <Text style={styles.passengerBadgeText}>PASSENGER DESK</Text>
          </View>
          <View style={styles.activeTabIndicator}>
            <Text style={styles.activeTabText}>
              {activeTab === "ALL" ? "All Items" : activeTab === "WATCHLIST" ? "Watchlist" : "Claims"}
            </Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Lost & Found</Text>

        {/* 3 Tabs (All Items, Watchlist, Claims) */}
        <View style={styles.tabBar}>
          {(
            [
              { key: "ALL", label: "All Items", icon: "cube-outline" },
              { key: "WATCHLIST", label: "Watchlist", icon: "bookmark-outline" },
              { key: "MY_CLAIMS", label: "Claims", icon: "clipboard-outline" },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={activeTab === tab.key ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Bar & Filter Options */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color="rgba(255, 255, 255, 0.4)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === "MY_CLAIMS"
                ? "Search claims by item, plate, crew..."
                : "Search item, plate, driver, or conductor..."
            }
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              setPage(1);
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchClear}>
              <Ionicons name="close-circle" size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Horizontal Category Scroll or Claim Filter */}
        {activeTab === "MY_CLAIMS" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {CLAIM_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedClaimFilter(f.value);
                  setPage(1);
                }}
                style={[styles.categoryPill, selectedClaimFilter === f.value && styles.categoryPillActive]}
              >
                <Text style={[styles.categoryPillText, selectedClaimFilter === f.value && styles.categoryPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedCategory(cat.value);
                  setPage(1);
                }}
                style={[styles.categoryPill, selectedCategory === cat.value && styles.categoryPillActive]}
              >
                <Text style={[styles.categoryPillText, selectedCategory === cat.value && styles.categoryPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* --- BODY SCROLLVIEW --- */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={commuterColors.primaryLight} />
        }
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={commuterColors.primaryLight} />
            <Text style={styles.loadingText}>Loading lost and found items...</Text>
          </View>
        ) : activeTab === "MY_CLAIMS" ? (
          /* --- CLAIMS LIST --- */
          claims.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="clipboard-outline" size={44} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyTitle}>No claims found</Text>
              <Text style={styles.emptySub}>
                When you submit a claim on a found item, its approval status and handover instructions will appear here.
              </Text>
            </View>
          ) : (
            claims.map((c) => {
              const badge = getStatusBadgeStyle(c.status);
              const isExpanded = expandedClaimTimelines.has(c.claimId);

              return (
                <View key={c.claimId} style={styles.claimCard}>
                  {/* Claim Top Info */}
                  <View style={styles.claimTop}>
                    <View style={styles.claimThumb}>
                      {c.item?.imageUrl || c.item?.image_url ? (
                        <Image source={{ uri: (c.item.imageUrl || c.item.image_url) || undefined }} style={styles.claimImage} />
                      ) : (
                        <Ionicons name="cube-outline" size={24} color="rgba(255, 255, 255, 0.3)" />
                      )}
                    </View>
                    <View style={styles.claimMeta}>
                      <Text style={styles.claimItemName}>{c.item?.itemName || c.item?.title || "Recovered Item"}</Text>
                      <Text style={styles.claimSub}>
                        {c.item?.category || "BELONGING"} · {c.item?.plateNumber || "Corridor Unit"}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Status Banner */}
                  <View style={styles.claimStatusBanner}>
                    <Ionicons
                      name={
                        c.status === "VALIDATED"
                          ? "checkmark-circle"
                          : c.status === "RELEASED"
                          ? "shield-checkmark"
                          : c.status === "REJECTED"
                          ? "close-circle"
                          : "time-outline"
                      }
                      size={18}
                      color={badge.text}
                      style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.claimStatusTitle, { color: badge.text }]}>
                        {c.status === "VALIDATED"
                          ? "Ready for Release"
                          : c.status === "RELEASED"
                          ? "Item Released"
                          : c.status === "REJECTED"
                          ? "Claim Rejected"
                          : "Claim Submitted"}
                      </Text>
                      <Text style={styles.claimStatusDesc}>
                        {c.status === "VALIDATED"
                          ? "Your claim was approved! Bring a valid ID to the terminal for physical handover."
                          : c.status === "RELEASED"
                          ? "Staff completed the verification and released the item."
                          : c.status === "REJECTED"
                          ? c.rejectionReason || "Staff could not verify matching ownership details."
                          : "Staff is currently reviewing your submitted proof of ownership."}
                      </Text>
                    </View>
                  </View>

                  {/* Expand Timeline Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleTimeline(c.claimId)}
                    style={styles.timelineToggle}
                  >
                    <Text style={styles.timelineToggleText}>Claim History & Proof</Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="rgba(255, 255, 255, 0.6)"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.timelineBox}>
                      <View style={styles.timelineStep}>
                        <View style={[styles.stepDot, { backgroundColor: "#FBBF24" }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitle}>Claim Submitted</Text>
                          <Text style={styles.stepDate}>{c.claimDate}</Text>
                        </View>
                      </View>

                      {c.approvedAt && (
                        <View style={styles.timelineStep}>
                          <View style={[styles.stepDot, { backgroundColor: "#34D399" }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.stepTitle}>Approved by Terminal Dispatch</Text>
                            <Text style={styles.stepDate}>{c.approvedAt}</Text>
                          </View>
                        </View>
                      )}

                      {c.releasedAt && (
                        <View style={styles.timelineStep}>
                          <View style={[styles.stepDot, { backgroundColor: "#62A0EA" }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.stepTitle}>Item Released to Claimant</Text>
                            <Text style={styles.stepDate}>{c.releasedAt}</Text>
                          </View>
                        </View>
                      )}

                      {/* Submitted Proof */}
                      <View style={styles.proofReviewBox}>
                        <Text style={styles.proofLabel}>Submitted Proof:</Text>
                        <Text style={styles.proofText}>{c.proof || "No specific proof text provided."}</Text>
                      </View>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.claimActionsRow}>
                    {c.item && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setDetailItem(c.item)}
                        style={styles.actionOutlineBtn}
                      >
                        <Text style={styles.actionOutlineText}>View Details</Text>
                      </TouchableOpacity>
                    )}

                    {c.status === "PENDING" && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setCancelTargetClaim(c)}
                        style={styles.actionDangerBtn}
                      >
                        <Text style={styles.actionDangerText}>Cancel Claim</Text>
                      </TouchableOpacity>
                    )}

                    {c.status === "REJECTED" && c.item && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setClaimTargetItem(c.item)}
                        style={styles.actionPrimaryBtn}
                      >
                        <Text style={styles.actionPrimaryText}>Claim Again</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* --- ALL ITEMS / WATCHLIST ITEMS --- */
          items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="search-outline" size={44} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyTitle}>No matching items found</Text>
              <Text style={styles.emptySub}>
                {activeTab === "WATCHLIST"
                  ? "You haven't bookmarked any lost items to your watchlist yet."
                  : "Try searching with a different keyword or category. Staff reports items as soon as found."}
              </Text>
            </View>
          ) : (
            items.map((item) => {
              const isWatched = watchlistIds.has(item.id) || item.is_watched;
              return (
                <View key={item.id} style={styles.itemCard}>
                  {/* Photo / Banner */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setDetailItem(item)}
                    style={styles.cardImageContainer}
                  >
                    {item.imageUrl || item.image_url ? (
                      <Image source={{ uri: (item.imageUrl || item.image_url) || undefined }} style={styles.cardImage} />
                    ) : (
                      <View style={styles.noPhotoPlaceholder}>
                        <Ionicons name="cube-outline" size={32} color="rgba(255, 255, 255, 0.25)" />
                        <Text style={styles.noPhotoText}>No photo yet</Text>
                      </View>
                    )}

                    {/* Category pill on top */}
                    <View style={styles.cardCategoryBadge}>
                      <Text style={styles.cardCategoryText}>{item.category || "OTHER"}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card Content */}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.itemName || item.title}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.description || "Recovered item awaiting claim."}
                    </Text>

                    {/* Metadata Grid */}
                    <View style={styles.cardMetaGrid}>
                      <View style={styles.cardMetaItem}>
                        <Ionicons name="bus-outline" size={12} color="#62A0EA" style={{ marginRight: 4 }} />
                        <Text style={styles.cardMetaText} numberOfLines={1}>
                          {item.plateNumber || "Plate unavailable"}
                        </Text>
                      </View>
                      <View style={styles.cardMetaItem}>
                        <Ionicons name="time-outline" size={12} color="#62A0EA" style={{ marginRight: 4 }} />
                        <Text style={styles.cardMetaText} numberOfLines={1}>
                          {item.estimatedTimeLost || "Time unavailable"}
                        </Text>
                      </View>
                    </View>

                    {/* Crew Info */}
                    {(item.driverName || item.conductorName) && (
                      <View style={styles.cardCrewRow}>
                        <Ionicons name="person-outline" size={12} color="rgba(255, 255, 255, 0.4)" style={{ marginRight: 4 }} />
                        <Text style={styles.cardCrewText} numberOfLines={1}>
                          {item.driverName ? `Driver: ${item.driverName}` : ""}
                          {item.driverName && item.conductorName ? " · " : ""}
                          {item.conductorName ? `Conductor: ${item.conductorName}` : ""}
                        </Text>
                      </View>
                    )}

                    {/* Action Row */}
                    <View style={styles.cardActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setClaimTargetItem(item)}
                        style={styles.claimBtn}
                      >
                        <Text style={styles.claimBtnText}>Claim Item</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setDetailItem(item)}
                        style={styles.iconActionBtn}
                        accessibilityLabel="View Details"
                      >
                        <Ionicons name="eye-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleToggleWatchlist(item)}
                        style={[styles.iconActionBtn, isWatched && styles.iconActionBtnActive]}
                        accessibilityLabel="Watchlist"
                      >
                        <Ionicons
                          name={isWatched ? "bookmark" : "bookmark-outline"}
                          size={18}
                          color={isWatched ? "#62A0EA" : "rgba(255, 255, 255, 0.7)"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>

      {/* --- ITEM DETAIL MODAL --- */}
      {detailItem && (
        <Modal visible={!!detailItem} animationType="fade" transparent onRequestClose={() => setDetailItem(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{detailItem.category}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailItem(null)} style={styles.closeCircle}>
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {detailItem.imageUrl || detailItem.image_url ? (
                  <Image source={{ uri: (detailItem.imageUrl || detailItem.image_url) || undefined }} style={styles.modalDetailImage} />
                ) : (
                  <View style={styles.modalDetailNoImage}>
                    <Ionicons name="cube-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
                    <Text style={styles.noPhotoText}>No photo available</Text>
                  </View>
                )}

                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>{detailItem.itemName || detailItem.title}</Text>
                  <Text style={styles.modalDesc}>{detailItem.description}</Text>

                  <View style={styles.detailInfoGrid}>
                    <View style={styles.detailInfoTile}>
                      <Text style={styles.detailTileLabel}>PLATE NUMBER</Text>
                      <Text style={styles.detailTileValue}>{detailItem.plateNumber || "Unavailable"}</Text>
                    </View>
                    <View style={styles.detailInfoTile}>
                      <Text style={styles.detailTileLabel}>ESTIMATED TIME</Text>
                      <Text style={styles.detailTileValue}>{detailItem.estimatedTimeLost || "Unavailable"}</Text>
                    </View>
                    <View style={styles.detailInfoTile}>
                      <Text style={styles.detailTileLabel}>DRIVER</Text>
                      <Text style={styles.detailTileValue}>{detailItem.driverName || "Unavailable"}</Text>
                    </View>
                    <View style={styles.detailInfoTile}>
                      <Text style={styles.detailTileLabel}>CONDUCTOR</Text>
                      <Text style={styles.detailTileValue}>{detailItem.conductorName || "Unavailable"}</Text>
                    </View>
                  </View>

                  <View style={styles.reminderBanner}>
                    <Ionicons name="alert-circle" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reminderTitle}>Claim Reminder</Text>
                      <Text style={styles.reminderDesc}>
                        Submit specific proof only if this item belongs to you. Staff will require valid government ID during physical retrieval.
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    const item = detailItem;
                    setDetailItem(null);
                    setClaimTargetItem(item);
                  }}
                  style={styles.modalPrimaryBtn}
                >
                  <Text style={styles.modalPrimaryText}>Claim This Item</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* --- CLAIM SUBMISSION MODAL --- */}
      {claimTargetItem && (
        <Modal visible={!!claimTargetItem} animationType="slide" transparent onRequestClose={() => setClaimTargetItem(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <View style={styles.claimRequestPill}>
                    <Text style={styles.claimRequestText}>CLAIM REQUEST</Text>
                  </View>
                  <Text style={styles.modalTitle}>Proof of Ownership</Text>
                  <Text style={styles.modalSubTitle}>{claimTargetItem.itemName || claimTargetItem.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setClaimTargetItem(null)} style={styles.closeCircle}>
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalBody}>
                  <Text style={styles.formLabel}>Proof of Ownership <Text style={{ color: "#F87171" }}>*</Text></Text>
                  <TextInput
                    style={styles.proofInput}
                    multiline
                    numberOfLines={5}
                    placeholder="Describe specific details, where you were seated, unique scratches/stickers, or internal contents that only the owner would know."
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    value={proofText}
                    onChangeText={setProofText}
                  />

                  <Text style={styles.formLabel}>Contact Number (Optional)</Text>
                  <TextInput
                    style={styles.contactInput}
                    placeholder="09171234567"
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    keyboardType="phone-pad"
                    value={contactNumber}
                    onChangeText={setContactNumber}
                  />

                  <View style={styles.reminderBanner}>
                    <Ionicons name="information-circle" size={18} color="#62A0EA" style={{ marginRight: 8 }} />
                    <Text style={styles.reminderDesc}>
                      Your submitted proof is securely reviewed by terminal dispatchers before approval.
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setClaimTargetItem(null)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!proofText.trim() || isSubmittingClaim}
                  onPress={handleSubmitClaim}
                  style={[styles.modalPrimaryBtn, (!proofText.trim() || isSubmittingClaim) && { opacity: 0.5 }]}
                >
                  {isSubmittingClaim ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Submit Claim</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* --- CANCEL CLAIM MODAL --- */}
      {cancelTargetClaim && (
        <Modal visible={!!cancelTargetClaim} animationType="fade" transparent onRequestClose={() => setCancelTargetClaim(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { maxHeight: 300 }]}>
              <View style={styles.modalBody}>
                <View style={styles.warningCircle}>
                  <Ionicons name="alert" size={28} color="#F87171" />
                </View>
                <Text style={styles.confirmTitle}>Cancel this claim?</Text>
                <Text style={styles.confirmDesc}>
                  Are you sure you want to withdraw your claim on &quot;
                  {cancelTargetClaim.item?.itemName || "this item"}&quot;? You can re-apply later if still unclaimed.
                </Text>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCancelTargetClaim(null)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Keep Claim</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isCancellingClaim}
                  onPress={handleConfirmCancelClaim}
                  style={[styles.modalDangerBtn, isCancellingClaim && { opacity: 0.5 }]}
                >
                  {isCancellingClaim ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalDangerText}>Yes, Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commuterColors.background,
  },
  header: {
    backgroundColor: commuterColors.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: commuterColors.border,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  passengerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 95, 180, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  passengerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#8CB9F0",
  },
  activeTabIndicator: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeTabText: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: commuterColors.surfaceSecondary,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: commuterColors.border,
    marginBottom: 10,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: commuterColors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: commuterColors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: commuterColors.border,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 38,
    color: "#FFFFFF",
    fontSize: 12,
  },
  searchClear: {
    padding: 4,
  },
  filterScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  categoryPill: {
    backgroundColor: commuterColors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: commuterColors.border,
  },
  categoryPillActive: {
    backgroundColor: "rgba(98, 160, 234, 0.2)",
    borderColor: commuterColors.primaryLight,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 12,
    color: commuterColors.textMuted,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: commuterColors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: commuterColors.border,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: commuterColors.textMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: commuterColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: commuterColors.border,
    overflow: "hidden",
    marginBottom: 14,
  },
  cardImageContainer: {
    height: 150,
    backgroundColor: "#0A1E33",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  noPhotoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noPhotoText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.3)",
    marginTop: 4,
  },
  cardCategoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cardCategoryText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: commuterColors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardMetaGrid: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: commuterColors.surfaceSecondary,
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  cardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardMetaText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  cardCrewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardCrewText: {
    fontSize: 10,
    color: commuterColors.textMuted,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  claimBtn: {
    flex: 1,
    backgroundColor: commuterColors.accentSignal,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  claimBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: commuterColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: commuterColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActionBtnActive: {
    borderColor: commuterColors.primaryLight,
    backgroundColor: "rgba(98, 160, 234, 0.15)",
  },
  claimCard: {
    backgroundColor: commuterColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: commuterColors.border,
    padding: 14,
    marginBottom: 14,
  },
  claimTop: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  claimThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#0A1E33",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  claimImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  claimMeta: {
    flex: 1,
    justifyContent: "center",
  },
  claimItemName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  claimSub: {
    fontSize: 11,
    color: commuterColors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  claimStatusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: commuterColors.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  claimStatusTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  claimStatusDesc: {
    fontSize: 11,
    color: commuterColors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  timelineToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  timelineToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
  },
  timelineBox: {
    backgroundColor: commuterColors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  timelineStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepDate: {
    fontSize: 10,
    color: commuterColors.textMuted,
  },
  proofReviewBox: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  proofLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: commuterColors.textMuted,
    marginBottom: 2,
  },
  proofText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  claimActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionOutlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: commuterColors.border,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  actionOutlineText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  actionDangerBtn: {
    flex: 1,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  actionDangerText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F87171",
  },
  actionPrimaryBtn: {
    flex: 1,
    backgroundColor: commuterColors.accentSignal,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  actionPrimaryText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: commuterColors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: commuterColors.border,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: commuterColors.border,
  },
  categoryTag: {
    backgroundColor: commuterColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalDetailImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  modalDetailNoImage: {
    height: 140,
    backgroundColor: "#0A1E33",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  modalSubTitle: {
    fontSize: 11,
    color: commuterColors.textMuted,
  },
  modalDesc: {
    fontSize: 13,
    color: commuterColors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  detailInfoGrid: {
    gap: 8,
    marginBottom: 14,
  },
  detailInfoTile: {
    backgroundColor: commuterColors.surfaceSecondary,
    borderRadius: 10,
    padding: 10,
  },
  detailTileLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: commuterColors.textMuted,
  },
  detailTileValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  reminderBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    padding: 12,
    borderRadius: 12,
  },
  reminderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FBBF24",
    marginBottom: 2,
  },
  reminderDesc: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: commuterColors.border,
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: commuterColors.accentSignal,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
  },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDangerText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  claimRequestPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 109, 58, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  claimRequestText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FF9A76",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
    marginTop: 4,
  },
  proofInput: {
    backgroundColor: commuterColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: commuterColors.border,
    borderRadius: 12,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 12,
    textAlignVertical: "top",
    minHeight: 100,
    marginBottom: 12,
  },
  contactInput: {
    backgroundColor: commuterColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: commuterColors.border,
    borderRadius: 12,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 12,
    marginBottom: 12,
  },
  warningCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  confirmDesc: {
    fontSize: 12,
    color: commuterColors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
