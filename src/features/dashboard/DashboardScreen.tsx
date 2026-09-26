import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Vibration,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  onOpenProfile?: () => void;
  onOpenTour?: () => void;
  user?: User | null;
  profile?: CommuterProfile | null;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenScan,
  onOpenShareRide,
  onOpenSos,
  onNavigateToFeedback,
  onOpenProfile,
  onOpenTour,
  user,
  profile,
}) => {
  const insets = useSafeAreaInsets();

  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "available" | "denied" | "unavailable">("loading");
  const [activeHail, setActiveHail] = useState<HailRequest | null>(null);
  const [hailPending, setHailPending] = useState(false);
  const [hailTimerSeconds, setHailTimerSeconds] = useState(180);
  const [showSheet, setShowSheet] = useState(true);
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

  // Request GPS permission and coordinates
  const requestGps = useCallback(async () => {
    setGpsStatus("loading");

    // 1. Web browser geolocation prompt
    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            setGpsStatus("available");
          },
          (err) => {
            if (err.code === 1) {
              setGpsStatus("denied");
            } else {
              setGpsStatus("unavailable");
            }
            setUserLocation({ latitude: 14.8459, longitude: 120.8342 });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
        return;
      }
    }

    // 2. Native mobile expo-location
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
    } catch {
      setGpsStatus("unavailable");
      setUserLocation({ latitude: 14.8459, longitude: 120.8342 });
    }
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let webWatchId: number | null = null;

    requestGps();

    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        webWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            setUserLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            setGpsStatus("available");
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      }
    } else {
      (async () => {
        try {
          const perm = await Location.getForegroundPermissionsAsync();
          if (perm.granted) {
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
                setGpsStatus("available");
              }
            );
          }
        } catch {
          // ignore
        }
      })();
    }

    return () => {
      if (sub) sub.remove();
      if (webWatchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(webWatchId);
      }
    };
  }, [requestGps]);

  // Poll vehicle locations every 5s
  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 5000);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  // Find nearest vehicle within 1km radius
  const nearestVehicleInfo = useMemo(() => {
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
      {/* ======================================================== */}
      {/* --- 1. FULL-BLEED MAP (Runs underneath everything) --- */}
      {/* ======================================================== */}
      <View style={StyleSheet.absoluteFill}>
        <CommuterLiveMap
          vehicles={vehicles}
          userLocation={userLocation}
          isHailing={!!activeHail}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ======================================================== */}
      {/* --- 2. TOP FLOATING BAR (1:1 Web Mobile UI) --- */}
      {/* ======================================================== */}
      <View
        pointerEvents="box-none"
        style={[styles.topBarOverlay, { top: Math.max(insets.top, 14) + 6 }]}
      >
        {/* Left: Greeting Frosted Card */}
        <View style={styles.topGreetingCard}>
          <Text style={styles.topGreetingText}>
            {getGreeting()}, {displayName}!
          </Text>
          <View style={styles.commuterTypePill}>
            <Text style={styles.commuterTypeText}>{commuterTypeLabel}</Text>
          </View>
        </View>

        {/* Right: Actions (Tour Guide + Avatar) */}
        <View style={styles.topActionsRow}>
          {onOpenTour && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onOpenTour}
              style={styles.topIconBtn}
              accessibilityRole="button"
              accessibilityLabel="App Guide & Walkthrough"
            >
              <Ionicons name="help-circle-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenProfile}
            style={styles.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel="View Profile"
          >
            <Text style={styles.avatarLetter}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ======================================================== */}
      {/* --- 3. BOTTOM SLIDING SHEET (1:1 Web Mobile UI) --- */}
      {/* ======================================================== */}
      <View style={styles.bottomSheet}>
        {/* Floating Circular Hail Button at -top-12 right-4 */}
        <View style={styles.hailFloatingContainer}>
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
            accessibilityRole="button"
            accessibilityLabel={
              hailPending
                ? activeHail
                  ? "Cancelling hail"
                  : "Sending hail"
                : activeHail
                ? "Cancel hail"
                : canHail
                ? "Hail modern jeepney"
                : "Cannot hail"
            }
          >
            {hailPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : activeHail ? (
              <Ionicons name="close" size={30} color="#FFFFFF" />
            ) : (
              <Ionicons name="location" size={26} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <Text style={styles.hailSubtext}>
            {hailPending
              ? activeHail
                ? "Cancelling…"
                : "Sending…"
              : activeHail
              ? "Cancel"
              : canHail
              ? "Hail Me"
              : gpsStatus === "loading"
              ? "Locating..."
              : gpsStatus === "denied"
              ? "No GPS"
              : "Too Far"}
          </Text>
        </View>

        {/* Drag Handle to collapse / expand sheet */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowSheet(!showSheet)}
          style={styles.sheetHandleContainer}
          accessibilityRole="button"
          accessibilityLabel={showSheet ? "Collapse tools sheet" : "Expand tools sheet"}
        >
          <View style={[styles.sheetHandle, showSheet ? styles.sheetHandleOpen : styles.sheetHandleClosed]} />
          {!showSheet && (
            <View style={styles.toolsHintRow}>
              <Ionicons name="chevron-up" size={13} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.toolsHintText}>TOOLS</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Sheet Content (when expanded) */}
        {showSheet && (
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Live ETA / GPS Status Card */}
            {gpsStatus === "loading" && (
              <View style={styles.statusBox}>
                <ActivityIndicator size="small" color={commuterColors.primaryLight} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBoxText}>Locating you... Waiting for GPS signal</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={requestGps}
                  style={styles.retryGpsSmallBtn}
                >
                  <Ionicons name="refresh" size={14} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
            )}

            {gpsStatus === "denied" && (
              <View style={[styles.statusBox, styles.statusBoxDenied]}>
                <Ionicons name="alert-circle" size={20} color="#F87171" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBoxDeniedTitle}>Location access required</Text>
                  <Text style={styles.statusBoxDeniedSub}>
                    Allow location permission to see nearby jeepneys, live ETA, and hail rides.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={requestGps}
                    style={styles.enableGpsBtn}
                  >
                    <Ionicons name="location-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.enableGpsBtnText}>Allow Location Access</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {gpsStatus === "unavailable" && (
              <View style={[styles.statusBox, styles.statusBoxOutside]}>
                <Ionicons name="warning" size={20} color="#FBBF24" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBoxOutsideTitle}>Location signal unavailable</Text>
                  <Text style={styles.statusBoxOutsideSub}>GPS signal was not detected on this device.</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={requestGps}
                    style={styles.retryGpsBtn}
                  >
                    <Ionicons name="refresh-outline" size={14} color="#FBBF24" style={{ marginRight: 6 }} />
                    <Text style={styles.retryGpsBtnText}>Retry Location</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {gpsStatus === "available" && canHail && nearestVehicleInfo && (
              <View style={styles.etaCard}>
                <View style={styles.etaTopRow}>
                  <View style={styles.etaLiveIndicator}>
                    <View style={styles.etaPulseDot} />
                    <Text style={styles.etaLiveText}>LIVE</Text>
                  </View>
                  <Text style={styles.etaMinutesText}>~{nearestVehicleInfo.etaMinutes} min</Text>
                </View>
                <View style={styles.etaBottomRow}>
                  <Text style={styles.etaPlateText}>
                    {nearestVehicleInfo.vehicle.plate_number || nearestVehicleInfo.vehicle.unit_number || "JEEP"}
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
                  <Text style={styles.statusBoxOutsideTitle}>Outside service radius</Text>
                  <Text style={styles.statusBoxOutsideSub}>
                    Move within 1km of a conductor unit to hail.
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

            {/* GCash Pay Card (1:1 Web Commuter Dashboard) */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onOpenScan}
              style={styles.gcashPayCard}
            >
              {/* Subtle decorative circle matching web */}
              <View style={styles.gcashDecoCircle} />

              {/* QR Icon Box */}
              <View style={styles.gcashIconBox}>
                <Ionicons name="qr-code-outline" size={26} color="#FFFFFF" />
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
                    accessibilityRole="button"
                    accessibilityLabel="Payment History"
                  >
                    <Ionicons name="time-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.gcashSubtitle}>Tap to scan conductor's QR code</Text>
                <View style={styles.scanPill}>
                  <Ionicons name="scan-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.scanPillText}>Scan to Pay</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Quick Actions Grid (Share Ride & Emergency SOS 1:1) */}
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onOpenShareRide}
                style={styles.quickActionBtn}
              >
                <Ionicons name="share-social-outline" size={16} color="#62A0EA" style={{ marginRight: 6 }} />
                <Text style={styles.quickActionText}>Share Ride</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSosPress}
                style={styles.sosActionBtn}
              >
                <Ionicons name="warning-outline" size={16} color="#F87171" style={{ marginRight: 6 }} />
                <Text style={styles.sosActionText}>
                  {sosTapHint ? "Tap SOS again" : "Emergency SOS"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Payment History Modal */}
      <PaymentHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectFeedback={(trip: Trip) => {
          setShowHistoryModal(false);
          onNavigateToFeedback?.(trip);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050F1A",
    position: "relative",
  },

  // 1. Top Floating Bar (1:1 Web Mobile UI)
  topBarOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topGreetingCard: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  topGreetingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  commuterTypePill: {
    backgroundColor: "rgba(98, 160, 234, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  commuterTypeText: {
    color: "#62A0EA",
    fontSize: 10,
    fontWeight: "700",
  },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1A5FB4",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  // 2. Bottom Sliding Sheet (1:1 Web Mobile UI)
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#071A2E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
    paddingBottom: 6,
  },
  hailFloatingContainer: {
    position: "absolute",
    top: -44,
    right: 18,
    alignItems: "center",
    zIndex: 35,
  },
  hailCircleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
  },
  hailCircleAvailable: {
    backgroundColor: "#FF6D3A",
    borderColor: "#FF9A76",
    shadowColor: "#FF6D3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  hailCircleActive: {
    backgroundColor: "#EF4444",
    borderColor: "#FCA5A5",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  hailCircleDisabled: {
    backgroundColor: "#374151",
    borderColor: "#4B5563",
    opacity: 0.55,
  },
  hailSubtext: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: 0.6,
    textAlign: "center",
    textTransform: "uppercase",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  sheetHandleContainer: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHandleOpen: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  sheetHandleClosed: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  toolsHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  toolsHintText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 0.8,
  },

  sheetScroll: {
    maxHeight: 380,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },

  // Status / ETA Blocks
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 10,
  },
  statusBoxText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
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
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  enableGpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#1A5FB4",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  enableGpsBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  retryGpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  retryGpsBtnText: {
    color: "#FBBF24",
    fontSize: 11,
    fontWeight: "700",
  },
  retryGpsSmallBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  statusBoxOutside: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    marginBottom: 10,
  },
  statusBoxOutsideTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FBBF24",
  },
  statusBoxOutsideSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  etaCard: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    marginBottom: 10,
  },
  etaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  etaLiveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  etaPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
  },
  etaLiveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34D399",
    letterSpacing: 0.8,
  },
  etaMinutesText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  etaBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  etaPlateText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
  },
  etaDistanceText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  etaExtraUnits: {
    fontSize: 10,
    color: "rgba(52, 211, 153, 0.7)",
    marginTop: 4,
  },

  // GCash Pay Card
  gcashPayCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A5FB4",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 10,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#1A5FB4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gcashDecoCircle: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  gcashIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    width: 28,
    height: 28,
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
    marginTop: 6,
  },
  scanPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.75)",
  },
  sosActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  sosActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F87171",
  },
});
