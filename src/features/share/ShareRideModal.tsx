import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Share,
  AppState,
} from "react-native";
import { WebIcon } from "../../shared/ui/WebIcon";
import { WebSpinner } from "../../shared/ui/WebSpinner";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import { Text } from "../../shared/ui/BrandText";
import { DashboardDialog, useDashboardDialogStyles } from "../dashboard/DashboardDialog";
import { commuterService } from "../../core/api/commuter-service";

interface ShareRideModalProps {
  visible: boolean;
  onClose: () => void;
  tripInfo?: {
    routeName?: string;
    unitNumber?: string;
    plateNumber?: string;
  };
}

export const ShareRideModal: React.FC<ShareRideModalProps> = ({
  visible,
  onClose,
  tripInfo,
}) => {
  const D = useDashboardDialogStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "requesting" | "success" | "error">("idle");
  const [isStopping, setIsStopping] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const tokenRef = useRef<string | null>(null);
  const stopping = useRef(false);
  const updates = useRef<Promise<unknown>>(Promise.resolve());

  // Initialize and create share link on open
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setIsStopped(false);
    setIsExpired(false);
    setGpsStatus("requesting");
    stopping.current = false;

    (async () => {
      try {
        if (!isMounted) return;
        // Create immediately. Disabled GPS must not leave link creation hanging.
        const res = await commuterService.createShareRide({ rotate: false });
        if (!isMounted) return;

        tokenRef.current = res.token;
        setShareUrl(res.share_url);
        setExpiresAt(res.expires_at);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || "Failed to create share link.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Sharing survives closing the sheet, but stops on expiry, stop or app unmount.
  useEffect(() => {
    if (!expiresAt || isExpired || isStopped) return;
    let alive = true;
    let watcher: Location.LocationSubscription | undefined;
    let latest: { latitude: number; longitude: number } | null = null;
    let lastPush = 0;
    let inFlight = false;
    const push = async () => {
      if (!alive || stopping.current || inFlight || !latest || !tokenRef.current
        || Date.parse(expiresAt) <= Date.now() || Date.now() - lastPush < 15000) return;
      inFlight = true;
      lastPush = Date.now();
      const position = latest;
      const task = commuterService.updateShareRideLocation({ lat: position.latitude, lng: position.longitude, token: tokenRef.current });
      updates.current = task;
      try { await task; lastPush = Date.now(); if (alive) setGpsStatus("success"); }
      catch (reason) {
        if (alive) {
          if ((reason as { status?: number }).status === 409) setIsStopped(true);
          else setGpsStatus("error");
        }
      } finally { inFlight = false; }
    };
    void Location.requestForegroundPermissionsAsync().then(async permission => {
      if (!alive) return;
      if (permission.status !== "granted") { setGpsStatus("error"); return; }
      const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 }, location => {
        latest = location.coords; void push();
      });
      if (!alive) subscription.remove(); else watcher = subscription;
    }).catch(() => { if (alive) setGpsStatus("error"); });
    const timer = setInterval(() => void push(), 15000);
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(location => { if (alive) { latest = location.coords; lastPush = 0; void push(); } }).catch(() => undefined);
    });
    return () => { alive = false; watcher?.remove(); clearInterval(timer); listener.remove(); };
  }, [expiresAt, isExpired, isStopped]);

  // Countdown timer (30-min countdown)
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
        return false;
      }
      setTimeLeft(remaining);
      return true;
    };

    if (!updateTimer()) return;
    const timer = setInterval(() => {
      if (!updateTimer()) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await Clipboard.setStringAsync(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    try {
      await Share.share({
        message: `I'm sharing my live CHATCO ride location. Track me live on the map: ${shareUrl}`,
        url: shareUrl,
        title: "Track My CHATCO Ride",
      });
    } catch {
      // ignore
    }
  };

  const handleStopSharing = async () => {
    if (isStopping || stopping.current) return;
    stopping.current = true;
    setIsStopping(true);
    try {
      await updates.current.catch(() => undefined);
      await commuterService.stopShareRide();
      setIsStopped(true);
      setTimeout(onClose, 1200);
    } catch {
      stopping.current = false;
      setError("Unable to stop location sharing.");
    } finally {
      setIsStopping(false);
    }
  };

  const stopsAt = expiresAt ? new Date(expiresAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }) : null;
  return <DashboardDialog visible={visible} title="Share live location" onClose={onClose}>
    {isLoading ? <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
      <WebSpinner size={32} color={D.blue.color} /><Text style={D.body}>Creating your share link…</Text>
    </View> : isStopped ? <View style={{ alignItems: "center", gap: 12, paddingVertical: 20 }}>
      <WebIcon name="circle-check-big" size={40} color={D.blue.color} />
      <Text style={D.title}>Location sharing stopped</Text><Text style={D.body}>The tracking link is no longer active.</Text>
    </View> : error ? <>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><WebIcon name="triangle-alert" size={16} color={D.red.color} /><Text accessibilityRole="alert" style={[D.body, D.red, { flex: 1 }]}>{error}</Text></View>
      <TouchableOpacity onPress={onClose} style={[D.button, D.secondary]}><Text style={D.onSecondary}>Close</Text></TouchableOpacity>
    </> : <>
      <View><Text style={D.label}>{isExpired ? "Link expired" : "Link active for"}</Text>
        <Text accessibilityRole="timer" style={[D.timer, isExpired && D.red]}>{isExpired ? "00:00" : formatTime(timeLeft)}</Text>
        <Text style={D.body}>{isExpired ? "This link no longer shows your location." : stopsAt ? `${timeLeft <= 300 ? "Ending soon. " : ""}Stops sharing automatically at ${stopsAt}` : "Stops sharing automatically after 30 minutes"}</Text>
      </View>
      {!isExpired && <View style={{ flexDirection: "row", gap: 8 }}>
        {gpsStatus === "requesting" ? <WebSpinner size={16} color={D.blue.color} /> : <WebIcon name="map-pin" size={16} color={gpsStatus === "error" ? D.red.color : D.blue.color} />}
        <Text style={[D.body, { flex: 1 }, gpsStatus === "error" && D.red]}>
          {gpsStatus === "success" ? "GPS connected, sharing your live position" : gpsStatus === "error" ? "GPS unavailable. The link works, but it can't show your position yet. Move to an open area for a better signal." : gpsStatus === "requesting" ? "Connecting to GPS…" : "Waiting for GPS…"}
        </Text>
      </View>}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={[D.field, { flex: 1, justifyContent: "center", minWidth: 0 }]}><Text numberOfLines={1} style={[D.body, { fontFamily: "monospace", fontSize: 12 }]}>{shareUrl}</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={isCopied ? "Link copied" : "Copy link"} accessibilityHint="Long press to share through another app" disabled={isExpired}
          onPress={handleCopy} onLongPress={handleNativeShare} style={[D.button, D.primary, { flexGrow: 0, flexBasis: "auto", opacity: isExpired ? 0.5 : 1 }]}>
          {isCopied && <WebIcon name="check" size={16} color="#FFFFFF" />}<Text style={D.onPrimary}>{isCopied ? "Copied" : "Copy"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[D.body, { fontSize: 12, lineHeight: 18 }]}>Anyone with this link can track your live location on the map for 30 minutes. <Text style={{ fontWeight: "600" }}>Do not share it with people you don't trust.</Text> Keep this app open for live updates.</Text>
      <View style={D.row}>
        {!isExpired && <TouchableOpacity accessibilityRole="button" disabled={isStopping} onPress={handleStopSharing} style={[D.button, D.secondary, { opacity: isStopping ? 0.5 : 1 }]}><Text style={[D.onSecondary, D.red]}>{isStopping ? "Stopping…" : "Stop sharing"}</Text></TouchableOpacity>}
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={[D.button, isExpired ? D.secondary : D.primary]}><Text style={isExpired ? D.onSecondary : D.onPrimary}>{isExpired ? "Close" : "Keep sharing"}</Text></TouchableOpacity>
      </View>
    </>}
  </DashboardDialog>;
};
