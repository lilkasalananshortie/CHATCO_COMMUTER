import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { commuterColors } from "../../core/theme/colors";
import { CommuterLiveMap } from "./CommuterLiveMap";
import { PaymentHistoryModal } from "./PaymentHistoryModal";
import { commuterService } from "../../core/api/commuter-service";
import type { HailRequest, VehicleLocation, Trip, CommuterProfile, User } from "../../core/domain/types";
import { distanceMeters, PICKUP_RADIUS_METERS } from "./route-data";

interface DashboardScreenProps {
  onOpenScan: () => void;
  onOpenShareRide: () => void;
  onOpenSos: () => void;
  onNavigateToFeedback?: (trip?: Trip) => void;
  user?: User | null;
  profile?: CommuterProfile | null;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenScan,
  onOpenShareRide,
  onOpenSos,
  onNavigateToFeedback,
  user,
  profile,
}) => {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "available" | "denied" | "unavailable">("loading");
  const [activeHail, setActiveHail] = useState<HailRequest | null>(null);
  const [hailPending, setHailPending] = useState(false);
  const [hailTimerSeconds, setHailTimerSeconds] = useState(180);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sosTapHint, setSosTapHint] = useState(false);
  const [hailError, setHailError] = useState<string | null>(null);
  const lastSosTapRef = useRef<number>(0);
  const sosHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive display values matching web layout
  const displayName = profile?.first_name || user?.name || user?.email?.split("@")[0] || "Commuter";
  const commuterType = profile?.commuter_type || "REGULAR";
  const commuterTypeLabel =
    commuterType === "REGULAR" || commuterType === "Regular"
      ? "Regular"
      : commuterType === "STUDENT" || commuterType === "Student"
      ? "Student"
      : commuterType === "SENIOR" || commuterType === "Senior"
      ? "Senior Citizen"
      : commuterType === "PWD"
      ? "PWD"
      : commuterType;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Fetch vehicles from API
  const fetchVehicles = useCallback(async () => {
    try {
      const data = await commuterService.getVehicleLocations();
      setVehicles(data || []);
    } catch {
      // offline fallback
    }
  }, []);

  // Request GPS
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setGpsStatus("denied");
          setUserLocation({ latitude: 14.8459, longitude: 120.8342 });
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setGpsStatus("available");

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
          },
          (newLoc) => {
            setUserLocation({
              latitude: newLoc.coords.latitude,
              longitude: newLoc.coords.longitude,
            });
          }
        );
      } catch {
        setGpsStatus("unavailable");
        setUserLocation({ latitude: 14.8459, longitude: 120.8342 });
      }
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // Poll vehicle locations every 5s
  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 5000);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  // Find nearest vehicle within 1km radius
  const nearestVehicleInfo = React.useMemo(() => {
    if (!userLocation || vehicles.length === 0) return null;
    let minDistance = Infinity;
    let nearest: VehicleLocation | null = null;

    for (const v of vehicles) {
      const dist = distanceMeters(userLocation, {
        latitude: v.latitude,
        longitude: v.longitude,
      });
      if (dist < minDistance) {
        minDistance = dist;
        nearest = v;
      }
    }

    if (!nearest) return null;
    const isNearby = minDistance <= PICKUP_RADIUS_METERS;
    const etaMinutes = Math.max(1, Math.round(minDistance / 416));

    return {
      vehicle: nearest,
      distanceMeters: Math.round(minDistance),
      isNearby,
      etaMinutes,
    };
  }, [userLocation, vehicles]);

  const canHail = gpsStatus === "available" && nearestVehicleInfo?.isNearby === true;

  // Handle Double Tap SOS (matches web safety convention)
  const handleSosPress = () => {
    const now = Date.now();
    if (now - lastSosTapRef.current <= 1500) {
      if (sosHintTimerRef.current) clearTimeout(sosHintTimerRef.current);
      lastSosTapRef.current = 0;
      setSosTapHint(false);
      onOpenSos();
      return;
    }

    lastSosTapRef.current = now;
    setSosTapHint(true);
    if (sosHintTimerRef.current) clearTimeout(sosHintTimerRef.current);
    sosHintTimerRef.current = setTimeout(() => {
      lastSosTapRef.current = 0;
      setSosTapHint(false);
    }, 1500);
  };

  // Handle Hail Toggle with Web-Matching Countdown & Audio/Vibration Loop
  const handleToggleHail = async () => {
    if (activeHail) {
      setHailPending(true);
      try {
        await commuterService.cancelHail(activeHail.id);
        setActiveHail(null);
        setHailError(null);
        if (Platform.OS !== "web") Vibration.vibrate(100);
      } catch {
        setActiveHail(null);
      } finally {
        setHailPending(false);
      }
      return;
    }

    if (!userLocation || !canHail) {
      setHailError("Move within 1km of a conductor unit to hail.");
      return;
    }

    setHailPending(true);
    setHailError(null);
    try {
      if (Platform.OS !== "web") Vibration.vibrate([100, 50, 100]);
      const hail = await commuterService.sendHail({
        pickup_name: "Commuter GPS Location",
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        passenger_count: 1,
      });
      setActiveHail(hail);
      setHailTimerSeconds(180);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to send hail. Move within 1km of an active unit.";
      setHailError(msg);
    } finally {
      setHailPending(false);
    }
  };

  // Hail countdown timer (3-min TTL)
  useEffect(() => {
    if (!activeHail) return;
    const timer = setInterval(() => {
      setHailTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveHail(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeHail]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* --- 1. WEB-PARITY GREETING HEADER CARD --- */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingTitle}>
              {getGreeting()}, {displayName}!
            </Text>
            <View style={styles.commuterTypePill}>
              <Text style={styles.commuterTypeText}>{commuterTypeLabel}</Text>
            </View>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* --- 2. LIVE MAP CARD WITH HAIL BUTTON --- */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>Live Modern Jeepney Corridor</Text>
              <Text style={styles.mapSubtitle}>
                {vehicles.length} {vehicles.length === 1 ? "unit" : "units"} online on McArthur Highway
              </Text>
            </View>
            <View style={styles.activeFleetBadge}>
              <View style={styles.fleetDot} />
              <Text style={styles.activeFleetText}>
                {vehicles.length > 0 ? "Fleet Live" : "Searching"}
              </Text>
            </View>
          </View>

          <CommuterLiveMap
            vehicles={vehicles}
            userLocation={userLocation}
            isHailing={!!activeHail}
          />

          {/* Prominent Floating "Hail Me" Button matching Web layout */}
          <View style={styles.hailControlRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={hailPending || (!activeHail && !canHail)}
              onPress={handleToggleHail}
              style={[
                styles.hailCircleBtn,
                activeHail
                  ? styles.hailCircleActive
                  : canHail
                  ? styles.hailCircleAvailable
                  : styles.hailCircleDisabled,
              ]}
            >
              {hailPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={activeHail ? "close" : "hand-left"}
                  size={26}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>

            <View style={styles.hailTextWrapper}>
              <Text style={styles.hailBtnLabel}>
                {hailPending
                  ? activeHail ? "CANCELLING..." : "SENDING..."
                  : activeHail
                  ? `HAIL ACTIVE (${Math.floor(hailTimerSeconds / 60)}:${(hailTimerSeconds % 60)
                      .toString()
                      .padStart(2, "0")})`
                  : canHail
                  ? "HAIL ME (PICK ME UP)"
                  : gpsStatus === "loading"
                  ? "LOCATING GPS..."
                  : gpsStatus === "denied"
                  ? "LOCATION ACCESS DENIED"
                  : "OUTSIDE HAIL RANGE"}
              </Text>
              <Text style={styles.hailBtnSub}>
                {activeHail
                  ? "Approaching units within 1km are alerted to pick you up"
                  : canHail
                  ? "Tap to notify nearest approaching unit"
                  : "Move within 1km of an active modern jeepney"}
              </Text>
            </View>
          </View>
        </View>

        {/* --- 3. GPS / ETA STATUS BLOCK (Matching Web Dashboard) --- */}
        {gpsStatus === "loading" && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color={commuterColors.primaryLight} style={{ marginRight: 10 }} />
            <Text style={styles.statusBoxText}>Locating you... Waiting for GPS signal</Text>
          </View>
        )}

        {gpsStatus === "denied" && (
          <View style={[styles.statusBox, styles.statusBoxDenied]}>
            <Ionicons name="alert-circle" size={18} color="#F87171" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusBoxDeniedTitle}>Location access denied</Text>
              <Text style={styles.statusBoxDeniedSub}>Enable location permission to see ETA and hail vehicles.</Text>
            </View>
          </View>
        )}

        {gpsStatus === "available" && canHail && nearestVehicleInfo && (
          <View style={styles.etaCard}>
            <View style={styles.etaTopRow}>
              <View style={styles.etaLiveIndicator}>
                <View style={styles.etaPulseDot} />
                <Text style={styles.etaLiveText}>LIVE TRACKING</Text>
              </View>
              <Text style={styles.etaMinutesText}>~{nearestVehicleInfo.etaMinutes} min</Text>
            </View>
            <View style={styles.etaBottomRow}>
              <Text style={styles.etaPlateText}>
                Unit {nearestVehicleInfo.vehicle.unit_number || "JEEP"} · {nearestVehicleInfo.vehicle.plate_number}
              </Text>
              <Text style={styles.etaDistanceText}>
                {(nearestVehicleInfo.distanceMeters / 1000).toFixed(1)} km away
              </Text>
            </View>
            {vehicles.length > 1 && (
              <Text style={styles.etaExtraUnits}>
                +{vehicles.length - 1} more vehicle{vehicles.length > 2 ? "s" : ""} in range
              </Text>
            )}
          </View>
        )}

        {gpsStatus === "available" && !canHail && (
          <View style={styles.statusBoxOutside}>
            <Ionicons name="warning" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusBoxOutsideTitle}>Outside conductor service radius</Text>
              <Text style={styles.statusBoxOutsideSub}>
                Move within 1km of a conductor unit to hail. Vehicles are still visible on the map.
              </Text>
            </View>
          </View>
        )}

        {hailError && (
          <View style={[styles.statusBox, styles.statusBoxDenied]}>
            <Ionicons name="alert-circle" size={16} color="#F87171" style={{ marginRight: 8 }} />
            <Text style={[styles.statusBoxDeniedSub, { color: "#F87171" }]}>{hailError}</Text>
          </View>
        )}

        {/* --- 4. GCASH PAY CARD (1:1 Matching Web Commuter Dashboard) --- */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onOpenScan}
          style={styles.gcashPayCard}
        >
          {/* QR Icon Box */}
          <View style={styles.gcashIconBox}>
            <Ionicons name="qr-code-outline" size={28} color="#FFFFFF" />
          </View>

          {/* Card Content */}
          <View style={styles.gcashContent}>
            <View style={styles.gcashTitleRow}>
              <Text style={styles.gcashTitle}>Pay with GCash</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setShowHistoryModal(true);
                }}
                style={styles.historyBtn}
                accessibilityLabel="Payment History"
              >
                <Ionicons name="time-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.gcashSubtitle}>Tap to scan conductor&apos;s QR code</Text>
            <View style={styles.scanPill}>
              <Ionicons name="scan-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.scanPillText}>Scan to Pay</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* --- 5. QUICK ACTIONS GRID (Share Ride & SOS 1:1) --- */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenShareRide}
            style={styles.quickActionBtn}
          >
            <Ionicons name="share-social-outline" size={18} color={commuterColors.primaryLight} style={{ marginRight: 6 }} />
            <Text style={styles.quickActionText}>Share Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSosPress}
            style={[styles.quickActionBtn, styles.sosQuickActionBtn]}
          >
            <Ionicons name="warning-outline" size={18} color="#F87171" style={{ marginRight: 6 }} />
            <Text style={styles.sosQuickActionText}>
              {sosTapHint ? "Tap SOS again" : "SOS"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment History Modal */}
      <PaymentHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectFeedback={(trip) => {
          if (onNavigateToFeedback) onNavigateToFeedback(trip);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commuterColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  greetingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: commuterColors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: commuterColors.border,
    marginBottom: 14,
  },
  greetingLeft: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  commuterTypePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(98, 160, 234, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 6,
  },
  commuterTypeText: {
    fontSize: 10,
    fontWeight: "700",
    color: commuterColors.primaryLight,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: commuterColors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  mapCard: {
    backgroundColor: commuterColors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: commuterColors.border,
    marginBottom: 14,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  mapSubtitle: {
    fontSize: 11,
    color: commuterColors.textMuted,
    marginTop: 1,
  },
  activeFleetBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  fleetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: commuterColors.success,
    marginRight: 5,
  },
  activeFleetText: {
    fontSize: 10,
    fontWeight: "800",
    color: commuterColors.success,
  },
  hailControlRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: commuterColors.surfaceSecondary,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: commuterColors.border,
    gap: 12,
  },
  hailCircleBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  hailCircleAvailable: {
    backgroundColor: commuterColors.accentSignal,
    borderColor: "#FF9A76",
  },
  hailCircleActive: {
    backgroundColor: commuterColors.danger,
    borderColor: "#FCA5A5",
  },
  hailCircleDisabled: {
    backgroundColor: "#4B5563",
    borderColor: "#6B7280",
    opacity: 0.6,
  },
  hailTextWrapper: {
    flex: 1,
  },
  hailBtnLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  hailBtnSub: {
    fontSize: 11,
    color: commuterColors.textMuted,
    marginTop: 2,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: commuterColors.border,
    marginBottom: 12,
  },
  statusBoxText: {
    fontSize: 12,
    color: commuterColors.textSecondary,
  },
  statusBoxDenied: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  statusBoxDeniedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F87171",
  },
  statusBoxDeniedSub: {
    fontSize: 11,
    color: commuterColors.textMuted,
    marginTop: 2,
  },
  statusBoxOutside: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    marginBottom: 12,
  },
  statusBoxOutsideTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FBBF24",
  },
  statusBoxOutsideSub: {
    fontSize: 11,
    color: commuterColors.textMuted,
    marginTop: 2,
  },
  etaCard: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    marginBottom: 12,
  },
  etaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  etaLiveIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  etaPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: commuterColors.success,
    marginRight: 6,
  },
  etaLiveText: {
    fontSize: 10,
    fontWeight: "800",
    color: commuterColors.success,
    letterSpacing: 0.5,
  },
  etaMinutesText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  etaBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  etaPlateText: {
    fontSize: 11,
    color: commuterColors.textMuted,
  },
  etaDistanceText: {
    fontSize: 11,
    color: commuterColors.textSecondary,
  },
  etaExtraUnits: {
    fontSize: 10,
    color: "rgba(16, 185, 129, 0.7)",
    marginTop: 4,
  },
  gcashPayCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A5FB4",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 12,
    shadowColor: "#1A5FB4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
  },
  gcashIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  gcashContent: {
    flex: 1,
  },
  gcashTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gcashTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  historyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  gcashSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  scanPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8,
  },
  scanPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: commuterColors.surface,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: commuterColors.border,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: commuterColors.textSecondary,
  },
  sosQuickActionBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  sosQuickActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F87171",
  },
});
