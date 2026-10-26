import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Text } from "../../shared/ui/BrandText";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Vibration,
  Platform,
  AppState,
  useWindowDimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { commuterColors } from "../../core/theme/colors";
import { CommuterLiveMap } from "./CommuterLiveMap";
import { PaymentHistoryModal } from "./PaymentHistoryModal";
import { commuterService } from "../../core/api/commuter-service";
import type { HailRequest, VehicleLocation, Trip, CommuterProfile, User } from "../../core/domain/types";
import { distanceMeters, PICKUP_RADIUS_METERS } from "./route-data";
import { MascotMessage } from "../../shared/ui/MascotMessage";
import { getMascotErrorState } from "../../shared/ui/mascot-error";
import { hailIsTerminal, hailSecondsRemaining } from "./hail-state";
import { useHoldToConfirm } from "./useHoldToConfirm";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { themedStyles } from "../../core/theme/themed-styles";
import { HailRangeHint } from "./HailRangeHint";
import { hailDockBottom, isSosDoubleTap, SOS_DOUBLE_TAP_MS } from "./dashboard-ui";
import { WebIcon } from "../../shared/ui/WebIcon";
import { WebSpinner } from "../../shared/ui/WebSpinner";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

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
  const { colors: selectedColors, isLight = false } = useCommuterTheme();
  const colors = selectedColors ?? commuterColors;
  const styles = useMemo(() => themedStyles(dashboardStyles(colors), colors, isLight), [colors, isLight]);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [vehicleError, setVehicleError] = useState<unknown>(null);
  const [retryingVehicles, setRetryingVehicles] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "available" | "denied" | "unavailable">("loading");
  const [activeHail, setActiveHail] = useState<HailRequest | null>(null);
  const hailMutation = useRef(0);
  const hailBusy = useRef(false);
  const [hailPending, setHailPending] = useState(false);
  const [hailTimerSeconds, setHailTimerSeconds] = useState(0);
  const [showSheet, setShowSheet] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sosTapHint, setSosTapHint] = useState(false);
  const [hailError, setHailError] = useState<string | null>(null);
  const [hailNotification, setHailNotification] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(windowHeight);
  const hailBottom = hailDockBottom(viewportHeight, sheetHeight, insets.top, showSheet);
  const lastSosTapRef = useRef<number | null>(null);
  const sosHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive display values matching web layout
  const displayName = profile?.first_name || user?.name || user?.email?.split("@")[0] || "Commuter";
  const commuterType = String(profile?.commuter_type || "REGULAR");
  const commuterTypeLabel =
    commuterType === "REGULAR" || commuterType === "Regular"
      ? "Regular"
      : commuterType === "STUDENT" || commuterType === "Student"
      ? "Student"
      : commuterType === "SENIOR" || commuterType === "SENIOR_CITIZEN" || commuterType === "Senior"
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
      setVehicleError(null);
    } catch (error) {
      setVehicleError(error);
    }
  }, []);

  const retryVehicles = async () => {
    if (retryingVehicles) return;
    setRetryingVehicles(true);
    try { await fetchVehicles(); } finally { setRetryingVehicles(false); }
  };

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
      const vLat = Number(v.latitude ?? (v as any).lat ?? 0);
      const vLng = Number(v.longitude ?? (v as any).lng ?? 0);
      if (!Number.isFinite(vLat) || !Number.isFinite(vLng) || (vLat === 0 && vLng === 0)) {
        continue;
      }
      const dist = distanceMeters(userLocation, {
        latitude: vLat,
        longitude: vLng,
      });
      if (!isNaN(dist) && dist < minDistance) {
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

  const isUnitFull =
    nearestVehicleInfo?.vehicle?.capacity_status === "FULL" ||
    (nearestVehicleInfo?.vehicle as any)?.vehicle_capacity_status === "FULL";

  const isUnitOnBreak = Boolean(
    (nearestVehicleInfo?.vehicle as any)?.is_on_break ||
    (nearestVehicleInfo?.vehicle as any)?.isOnBreak
  );

  const canHail =
    gpsStatus === "available" &&
    nearestVehicleInfo?.isNearby === true &&
    !isUnitFull &&
    !isUnitOnBreak;

  // Capacity alone does not cancel a server-owned hail.
  useEffect(() => {
    if (activeHail && isUnitFull) {
      setHailNotification("Unit is currently at maximum capacity. Please hail the next approaching unit.");
    }
  }, [activeHail, isUnitFull]);

  // Handle Double Tap SOS (matches web safety convention)
  const handleSosPress = () => {
    const now = Date.now();
    if (isSosDoubleTap(lastSosTapRef.current, now)) {
      if (sosHintTimerRef.current) clearTimeout(sosHintTimerRef.current);
      lastSosTapRef.current = null;
      setSosTapHint(false);
      onOpenSos();
      return;
    }

    lastSosTapRef.current = now;
    setSosTapHint(true);
    if (sosHintTimerRef.current) clearTimeout(sosHintTimerRef.current);
    sosHintTimerRef.current = setTimeout(() => {
      lastSosTapRef.current = null;
      setSosTapHint(false);
    }, SOS_DOUBLE_TAP_MS);
  };
  useEffect(() => () => { if (sosHintTimerRef.current) clearTimeout(sosHintTimerRef.current); }, []);

  // Handle Hail Toggle with Web-Matching Countdown & Audio/Vibration Loop
  const handleToggleHail = async () => {
    if (hailBusy.current) return;
    hailMutation.current++;
    if (activeHail) {
      hailBusy.current = true;
      setHailPending(true);
      try {
        await commuterService.cancelHail(activeHail.id);
        setActiveHail(null);
        setHailError(null);
        if (Platform.OS !== "web") Vibration.vibrate(100);
      } catch {
        setHailError("Unable to cancel your hail. It remains active until the server confirms cancellation. Please retry.");
      } finally {
        hailBusy.current = false;
        setHailPending(false);
      }
      return;
    }

    if (isUnitOnBreak) {
      setHailError("Vehicle is currently on break. Nearest active unit will be hailed.");
      return;
    }

    if (isUnitFull) {
      setHailError("Unit is currently at maximum capacity. Please hail the next approaching unit.");
      return;
    }

    if (!userLocation || !canHail || !nearestVehicleInfo?.vehicle) {
      setHailError("Move within 1km of a conductor unit to hail.");
      return;
    }

    const vehicleId =
      nearestVehicleInfo.vehicle.vehicle_id ||
      nearestVehicleInfo.vehicle.id;

    if (!vehicleId) {
      setHailError("Cannot identify vehicle unit. Please refresh.");
      return;
    }

    hailBusy.current = true;
    setHailPending(true);
    setHailError(null);
    setHailNotification(null);
    try {
      if (Platform.OS !== "web") Vibration.vibrate([100, 50, 100]);
      const hail = await commuterService.sendHail({
        vehicle_id: vehicleId,
        commuter_lat: userLocation.latitude,
        commuter_lng: userLocation.longitude,
        pickup_name: "Commuter GPS Location",
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        passenger_count: 1,
      });
      setActiveHail(hail);
      setHailTimerSeconds(hailSecondsRemaining(hail));
    } catch (err: any) {
      const msg = String(err?.response?.data?.message || err?.message || "");
      if (msg.toLowerCase().includes("break")) {
        setHailError("Vehicle is currently on break. Nearest active unit will be hailed.");
      } else if (msg.toLowerCase().includes("capacity") || msg.toLowerCase().includes("full")) {
        setHailError("Unit is currently at maximum capacity. Please hail the next approaching unit.");
      } else {
        setHailError(msg || "Unable to send hail. Move within 1km of an active unit.");
      }
    } finally {
      hailBusy.current = false;
      setHailPending(false);
    }
  };

  useEffect(() => {
    let active = true;
    let running = false;
    setActiveHail(null);
    const restore = async () => {
      if (running || hailBusy.current) return;
      const generation = hailMutation.current;
      running = true;
      try {
        const current = await commuterService.getActiveHail();
        if (active && !hailBusy.current && generation === hailMutation.current) {
          setActiveHail(current && !hailIsTerminal(current) ? current : null);
        }
      } catch { /* Do not discard a known hail on a network error. */ }
      finally { running = false; }
    };
    void restore();
    const timer = setInterval(() => void restore(), 15000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void restore(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [user?.id]);

  const hailHold = useHoldToConfirm(() => { void handleToggleHail(); }, canHail && !activeHail && !hailPending);

  // Server expiry drives display; only server status ends the hail.
  useEffect(() => {
    if (!activeHail) return;
    const update = () => setHailTimerSeconds(hailSecondsRemaining(activeHail));
    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [activeHail]);

  // Poll active hail status every 2s for instant conductor accept/reject feedback (TC-COND-HAIL-169)
  useEffect(() => {
    if (!activeHail?.id) return;
    let cancelled = false;

    const checkHailStatus = async () => {
      try {
        const generation = hailMutation.current;
        const current = await commuterService.getHailStatus(activeHail.id);
        if (cancelled || hailBusy.current || generation !== hailMutation.current) return;
        if (!current) { setActiveHail(null); return; }

        const st = String(current.status).toUpperCase();
        if (st === "REJECTED" || st === "DECLINED") {
          setActiveHail(null);
          setHailNotification("Unit is currently at maximum capacity. Please hail the next approaching unit.");
          if (Platform.OS !== "web") Vibration.vibrate([100, 100, 100]);
        } else if (hailIsTerminal(current)) {
          setActiveHail(null);
          setHailNotification(st === "EXPIRED" ? "Your hail expired. You can hail again." : "Your hail has ended.");
        } else if (st === "ACCEPTED" && activeHail.status !== "ACCEPTED") {
          setActiveHail(current);
          const unit = current.accepted_by?.unit_number || nearestVehicleInfo?.vehicle?.unit_number || "jeepney";
          setHailNotification(`Conductor Accepted! Unit ${unit} is approaching your stop.`);
          if (Platform.OS !== "web") Vibration.vibrate(200);
        } else if (st === "CANCELLED") {
          setActiveHail(null);
        }
      } catch {}
    };

    const poll = setInterval(checkHailStatus, 2000);
    void checkHailStatus();

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [activeHail?.id, activeHail?.status, nearestVehicleInfo?.vehicle?.unit_number]);

  return (
    <View testID="dashboard-hail-overlay" style={styles.container} onLayout={event => { if (event.nativeEvent.layout.height > 0) setViewportHeight(event.nativeEvent.layout.height); }}>
      {/* ======================================================== */}
      {/* --- 1. FULL-BLEED MAP (Runs underneath everything) --- */}
      {/* ======================================================== */}
      <View style={StyleSheet.absoluteFill}>
        <CommuterLiveMap
          vehicles={vehicles}
          userLocation={gpsStatus === "available" ? userLocation : null}
          isHailing={!!activeHail}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ======================================================== */}
      {/* --- 2. TOP FLOATING BAR (1:1 Web Mobile UI) --- */}
      {/* ======================================================== */}
      <View
        style={[
          styles.topBarOverlay,
          {
            pointerEvents: "box-none",
            top: Math.max(insets.top, 14) + 6,
            left: isTablet ? Math.max(16, (windowWidth - 640) / 2) : 16,
            right: isTablet ? Math.max(16, (windowWidth - 640) / 2) : 16,
          },
        ]}
      >
        {/* Web phone header: clickable avatar, greeting and plain divided fare type. */}
        <View style={styles.topGreetingCard}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenProfile}
            style={styles.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel="View Profile"
            hitSlop={8}
          >
            {profile?.profile_image_url && failedAvatar !== profile.profile_image_url ? <Image source={{ uri: profile.profile_image_url }} onError={() => setFailedAvatar(profile.profile_image_url ?? null)} accessibilityLabel="Your profile photo" style={{ width: "100%", height: "100%", borderRadius: 999 }} /> : <WebIcon name="user-round" size={18} color="#FFFFFF" />}
          </TouchableOpacity>
          <Text style={styles.topGreetingText} numberOfLines={1} ellipsizeMode="tail">
            <Text style={{ color: colors.textMuted, fontWeight: "500" }}>{getGreeting()}, </Text>
            <Text style={{ fontWeight: "700" }}>{displayName}</Text>
          </Text>
          <View style={{ borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 12, alignSelf: "stretch", justifyContent: "center" }}>
            <Text style={[styles.commuterTypeText, { color: colors.primaryLight, textTransform: "uppercase", letterSpacing: 0.8 }]}>{commuterTypeLabel}</Text>
          </View>
        </View>
      </View>

      {/* ======================================================== */}
      {/* --- 3. BOTTOM SLIDING SHEET (1:1 Web Mobile UI) --- */}
      {/* ======================================================== */}
      <View
        onLayout={event => setSheetHeight(event.nativeEvent.layout.height)}
        style={[
          styles.bottomSheet,
          {
            paddingBottom: Math.max(insets.bottom, 12) + 6,
            left: isTablet ? Math.max(0, (windowWidth - 640) / 2) : 0,
            right: isTablet ? Math.max(0, (windowWidth - 640) / 2) : 0,
          },
        ]}
      >

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
              <WebIcon name="tools-chevron" size={13} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.toolsHintText}>TOOLS</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Sheet Content (when expanded) */}
        {showSheet && (
          <ScrollView
            style={[styles.sheetScroll, { maxHeight: windowHeight * 0.6 }]}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Boolean(vehicleError) && (
              <MascotMessage
                {...getMascotErrorState(vehicleError)}
                message="Live vehicle updates are unavailable. Displayed positions may be out of date."
                compact onRetry={retryVehicles} retrying={retryingVehicles}
              />
            )}
            {/* Live ETA / GPS Status Card */}
            {gpsStatus === "loading" && (
              <View style={styles.statusBox}>
                <View style={{ marginRight: 10 }}><WebSpinner size={16} color={commuterColors.primaryLight} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBoxText}>Locating you... Waiting for GPS signal</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={requestGps}
                  style={styles.retryGpsSmallBtn}
                >
                  <WebIcon name="refresh-cw" size={14} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
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

            {hailNotification && (
              <View style={[styles.statusBox, styles.statusBoxOutside, { borderColor: "#F59E0B" }]}>
                <WebIcon name="info" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusBoxOutsideTitle, { color: "#FBBF24" }]}>Hail Update</Text>
                  <Text style={styles.statusBoxOutsideSub}>{hailNotification}</Text>
                </View>
                <TouchableOpacity onPress={() => setHailNotification(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <WebIcon name="x" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}

            {gpsStatus === "available" && isUnitFull && (
              <View style={[styles.statusBox, styles.statusBoxOutside, { borderColor: "#EF4444" }]}>
                <WebIcon name="triangle-alert" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusBoxOutsideTitle, { color: "#EF4444" }]}>Unit at Maximum Capacity</Text>
                  <Text style={styles.statusBoxOutsideSub}>
                    Unit is currently at maximum capacity. Please hail the next approaching unit.
                  </Text>
                </View>
              </View>
            )}

            {gpsStatus === "available" && isUnitOnBreak && (
              <View style={[styles.statusBox, styles.statusBoxOutside, { borderColor: "#F59E0B" }]}>
                <WebIcon name="history" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusBoxOutsideTitle, { color: "#FBBF24" }]}>Vehicle on Break</Text>
                  <Text style={styles.statusBoxOutsideSub}>
                    Vehicle is currently on break. Nearest active unit will be hailed.
                  </Text>
                </View>
              </View>
            )}


            {hailError && (
              <View style={[styles.statusBox, styles.statusBoxDenied]}>
                <WebIcon name="triangle-alert" size={16} color="#F87171" style={{ marginRight: 8 }} />
                <Text style={[styles.statusBoxDeniedSub, { color: "#F87171" }]}>{hailError}</Text>
              </View>
            )}

            {/* GCash Pay Card (1:1 Web Commuter Dashboard) */}
            <View style={styles.gcashCardWrapper}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onOpenScan}
              accessibilityRole="button"
              accessibilityLabel="Pay with GCash"
              style={styles.gcashPayCard}
            >
              <Svg style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]} width="100%" height="100%">
                <Defs><LinearGradient id="gcash-card" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#1A5FB4" /><Stop offset="1" stopColor="#123B6E" /></LinearGradient></Defs>
                <Rect width="100%" height="100%" fill="url(#gcash-card)" />
              </Svg>
              {/* Subtle decorative circle matching web */}
              <View style={styles.gcashDecoCircle} />

              {/* QR Icon Box */}
              <View style={styles.gcashIconBox}>
                <WebIcon name="qr-code" size={28} color="#FFFFFF" />
              </View>

              {/* Card Content */}
              <View style={styles.gcashContent}>
                <View style={styles.gcashTitleRow}>
                  <Text style={styles.gcashTitle}>Pay with GCash</Text>
                  <View style={styles.historyBtnPlaceholder} />
                </View>
                <Text style={styles.gcashSubtitle}>Tap to scan conductor's QR code</Text>
                <View style={styles.scanPill}>
                  <WebIcon name="scan" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.scanPillText}>Scan to Pay</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowHistoryModal(true)}
              style={[styles.historyBtn, styles.historyBtnOverlay]}
              accessibilityRole="button"
              accessibilityLabel="Payment History"
            >
              <WebIcon name="history" size={16} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
            </View>

            {/* Quick Actions Grid (Share Ride & Emergency SOS 1:1) */}
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onOpenShareRide}
                style={styles.quickActionBtn}
              >
                <WebIcon name="share-ride" size={16} color="#62A0EA" style={{ marginRight: 6 }} />
                <Text style={styles.quickActionText}>Share Ride</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSosPress}
                style={styles.sosActionBtn}
              >
                <WebIcon name="sos" size={16} color="#F87171" style={{ marginRight: 6 }} />
                <Text style={styles.sosActionText}>
                  {sosTapHint ? "Tap SOS again" : "SOS"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Small independent floating controls; avoid a full-screen touch layer over the sheet. */}
      <View testID="dashboard-hail-dock" style={[styles.hailFloatingContainer, { bottom: hailBottom, right: isTablet ? Math.max(0, (windowWidth - 640) / 2) + 18 : 18 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={hailPending || (!activeHail && !canHail)}
            onPressIn={hailHold.start}
            onPressOut={hailHold.cancel}
            onPress={() => { const justConfirmed = hailHold.consumeCompleted(); if (activeHail && !justConfirmed) void handleToggleHail(); }}
            accessibilityActions={[{ name: "activate", label: activeHail ? "Cancel hail" : "Confirm hail" }]}
            onAccessibilityAction={event => { if (event.nativeEvent.actionName === "activate" && !hailPending) void handleToggleHail(); }}
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
              <WebSpinner size={28} color="#FFFFFF" />
            ) : activeHail ? (
              <WebIcon name="x" size={28} strokeWidth={2.5} color="#FFFFFF" />
            ) : (
              <WebIcon name="hail-pin" size={28} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <Text style={styles.hailSubtext}>
            {hailPending
              ? activeHail
                ? "Cancelling…"
                : "Sending…"
              : activeHail
              ? "Cancel"
              : isUnitFull
              ? "Full"
              : isUnitOnBreak
              ? "On Break"
              : canHail
              ? hailHold.holding ? "Keep holding…" : "Hold to hail"
              : gpsStatus === "loading"
              ? "Locating..."
              : gpsStatus === "denied"
              ? "No GPS"
              : "Too Far"}
          </Text>
        </View>

      {!activeHail && gpsStatus !== "loading" && !canHail && <View style={{ pointerEvents: "box-none", position: "absolute", bottom: hailBottom + 62, right: isTablet ? Math.max(0, (windowWidth - 640) / 2) : 0, width: 44, height: 44, zIndex: 70 }}><HailRangeHint
          reason={gpsStatus === "denied" ? "denied" : gpsStatus === "unavailable" ? "unavailable" : "out-of-range"}
          onRetry={() => void requestGps()} /></View>}

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

function dashboardStyles(colors: { [K in keyof typeof commuterColors]: string }) {
  return {
    ...baseStyles,
    container: { ...baseStyles.container, backgroundColor: colors.background },
    topGreetingCard: { ...baseStyles.topGreetingCard, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingLeft: 8, paddingRight: 16, paddingVertical: 8, marginRight: 0 },
    topGreetingText: { ...baseStyles.topGreetingText, fontSize: 14, flex: 1, minWidth: 0, color: colors.textPrimary },
    avatarBtn: { ...baseStyles.avatarBtn, width: 36, height: 36, borderRadius: 18, shadowOpacity: 0, elevation: 0 },
    bottomSheet: { ...baseStyles.bottomSheet, backgroundColor: colors.surface, borderTopColor: colors.border },
    hailFloatingContainer: { ...baseStyles.hailFloatingContainer },
    quickActionBtn: { ...baseStyles.quickActionBtn, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, paddingVertical: 10 },
    quickActionText: { ...baseStyles.quickActionText, color: colors.textSecondary, fontWeight: "600" as const },
    sosActionBtn: { ...baseStyles.sosActionBtn, paddingVertical: 10 },
    sosActionText: { ...baseStyles.sosActionText, color: colors.danger, fontWeight: "600" as const },
    quickActionsGrid: { ...baseStyles.quickActionsGrid, gap: 12, marginTop: 16 },
    gcashPayCard: { ...baseStyles.gcashPayCard, padding: 20, borderRadius: 16, marginBottom: 0 },
    gcashTitle: { ...baseStyles.gcashTitle, fontSize: 18, fontWeight: "700" as const },
    gcashSubtitle: { ...baseStyles.gcashSubtitle, color: "rgba(255,255,255,0.5)", marginTop: 4 },
    gcashIconBox: { ...baseStyles.gcashIconBox, width: 56, height: 56, borderRadius: 16, marginRight: 16, backgroundColor: "rgba(255,255,255,0.1)" },
    historyBtn: { ...baseStyles.historyBtn, backgroundColor: "transparent" },
    scanPill: { ...baseStyles.scanPill, marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.15)" },
  };
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050F1A",
    position: "relative",
  },

  // 1. Top Floating Bar (Responsive, high-contrast over map tiles)
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
    /* Frosted obsidian background guarantees WCAG AA contrast over any light or dark map tiles */
    backgroundColor: "rgba(5, 15, 26, 0.88)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    flexShrink: 1,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
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
    backgroundColor: "rgba(98, 160, 234, 0.22)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  commuterTypeText: {
    /* High-contrast blue token (#93C5FD) ensures 4.8:1 contrast on dark pill */
    color: "#93C5FD",
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
    backgroundColor: "rgba(5, 15, 26, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
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
    borderColor: "rgba(255, 255, 255, 0.3)",
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

  // 2. Bottom Sliding Sheet (Responsive width, clamped on tablets)
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: "#071A2E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
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
    width: 64,
    height: 88,
    right: 18,
    alignItems: "center",
    zIndex: 40,
    overflow: "visible",
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
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
    minWidth: 64,
    paddingHorizontal: 4,
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
    color: "rgba(255, 255, 255, 0.65)",
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
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 0,
  },
  statusBoxText: {
    fontSize: 12,
    color: "#E2E8F0",
    lineHeight: 17,
  },
  statusBoxDenied: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusBoxDeniedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FCA5A5",
  },
  statusBoxDeniedSub: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 2,
    lineHeight: 16,
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
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    marginBottom: 10,
  },
  statusBoxOutsideTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FBBF24",
  },
  statusBoxOutsideSub: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 2,
    lineHeight: 16,
  },
  etaCard: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
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
    color: "#94A3B8",
  },
  etaDistanceText: {
    fontSize: 11,
    color: "#F1F5F9",
    fontWeight: "600",
  },
  etaExtraUnits: {
    fontSize: 10,
    color: "rgba(52, 211, 153, 0.85)",
    marginTop: 4,
  },

  // GCash Pay Card (High visual weight, vibrant blue)
  gcashPayCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A5FB4",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    marginBottom: 0,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#1A5FB4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gcashCardWrapper: {
    position: "relative",
    marginBottom: 10,
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
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
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
  historyBtnPlaceholder: {
    width: 28,
    height: 28,
  },
  historyBtnOverlay: {
    position: "absolute",
    top: 14,
    right: 14,
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
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  gcashSubtitle: {
    /* Blue-100 token ensures accessible 8.4:1 contrast against #1A5FB4 background */
    fontSize: 11,
    color: "#DBEAFE",
    marginTop: 2,
    lineHeight: 15,
  },
  scanPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
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

  // Quick Actions Grid (Minimum 44pt touch target compliance)
  quickActionsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  quickActionBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F1F5F9",
  },
  sosActionBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  sosActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FCA5A5",
  },
});
