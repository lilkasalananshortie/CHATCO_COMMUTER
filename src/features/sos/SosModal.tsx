import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { WebIcon } from "../../shared/ui/WebIcon";
import { WebSpinner } from "../../shared/ui/WebSpinner";
import { getSosLocation } from "./location-fix";
import { Text } from "../../shared/ui/BrandText";
import { DashboardDialog, useDashboardDialogStyles } from "../dashboard/DashboardDialog";
import { SosActions } from "./SosActions";
import { commuterService } from "../../core/api/commuter-service";
import type { SosAlert } from "../../core/domain/types";

interface SosModalProps {
  visible: boolean;
  onClose: () => void;
}

type SosStatus =
  | "confirming"
  | "locating"
  | "sending"
  | "active"
  | "acknowledged"
  | "stopped"
  | "responded"
  | "error";

const POLL_INTERVAL_MS = 3000;

export const SosModal: React.FC<SosModalProps> = ({ visible, onClose }) => {
  const D = useDashboardDialogStyles();
  const pending = useRef(false);
  const generation = useRef(0);
  const [status, setStatus] = useState<SosStatus>("confirming");
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [alertId, setAlertId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSosSentRef = useRef<number>(0);

  const resetState = () => {
    setStatus("confirming");
    setActiveSeconds(0);
    setErrorMessage("");
    setAlertId(null);
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!visible) {
      generation.current++; pending.current = false;
      // Closing the screen does not resolve the server alert. Keep it available
      // when this mounted dialog is reopened during the same signed-in session.
      if (status !== "active" && status !== "acknowledged") resetState();
    }
    return () => { generation.current++; };
  }, [visible]);

  // Elapsed active timer
  useEffect(() => {
    if (status === "active" || status === "acknowledged") {
      timerRef.current = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // Poll alert status while active
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const checkAlertStatus = useCallback(
    async (id: string) => {
      const attempt = generation.current;
      try {
        const res = await commuterService.getSosStatus(id);
        if (generation.current !== attempt) return;
        if (res.status === "RESOLVED") {
          stopPolling();
          setStatus("responded");
        } else if (res.status === "ACKNOWLEDGED") {
          setStatus("acknowledged");
        }
      } catch {
        // keep polling
      }
    },
    [stopPolling]
  );

  useEffect(() => {
    if (visible && (status === "active" || status === "acknowledged") && alertId) {
      void checkAlertStatus(alertId);
      pollRef.current = setInterval(() => {
        checkAlertStatus(alertId);
      }, POLL_INTERVAL_MS);
    }
    return stopPolling;
  }, [visible, status, alertId, checkAlertStatus, stopPolling]);

  // Trigger SOS dispatch
  const sendSos = useCallback(async (latitude: number, longitude: number) => {
    const attempt = generation.current;
    setStatus("sending");
    try {
      const res = await commuterService.triggerSos({
        lat: latitude,
        lng: longitude,
        latitude,
        longitude,
        note: "Emergency distress triggered from Commuter Mobile App",
      });

      if (generation.current !== attempt) return;
      lastSosSentRef.current = Date.now();

      setAlertId(res.id);
      if (res.status === "RESOLVED") {
        setStatus("responded");
        return;
      }
      setStatus(res.status === "ACKNOWLEDGED" ? "acknowledged" : "active");
    } catch (err: any) {
      if (generation.current !== attempt) return;
      setStatus("error");
      const rawMsg = String(err?.response?.data?.message || err?.message || "");
      if (err?.status === 429 || rawMsg.toLowerCase().includes("too many") || rawMsg.toLowerCase().includes("recently") || rawMsg.toLowerCase().includes("slow down")) {
        setErrorMessage("You have already sent an SOS recently. Please wait before trying again.");
      } else {
        setErrorMessage(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to send the SOS signal. Please try again."
        );
      }
    }
  }, []);

  const handleActivate = async () => {
    if (pending.current) return;
    if (Date.now() - lastSosSentRef.current < 60000) {
      setStatus("error");
      setErrorMessage("You have already sent an SOS recently. Please wait before trying again.");
      return;
    }

    setStatus("locating");
    setErrorMessage("");
    pending.current = true;
    const attempt = generation.current;
    try {
      const loc = await getSosLocation();
      if (generation.current !== attempt) return;
      await sendSos(loc.latitude, loc.longitude);
    } catch (error) {
      if (generation.current !== attempt) return;
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Location unavailable. Enable GPS and retry, or use the emergency call buttons below.");
    } finally {
      if (generation.current === attempt) pending.current = false;
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleCallHotline = async (phone: string) => {
    try { await Linking.openURL(`tel:${phone}`); }
    catch { Alert.alert("Unable to open the phone dialer", `Please dial ${phone} manually if you need emergency assistance.`); }
  };

  const handleStopSos = async () => {
    if (!alertId) throw new Error("No active SOS to stop.");
    const attempt = generation.current;
    const result = await commuterService.stopSos(alertId);
    if (result.status !== "RESOLVED") throw new Error("SOS is still active. Please try again.");
    if (generation.current !== attempt) return;
    // Ignore a poll that started before the stop won the server transition.
    generation.current += 1;
    stopPolling(); setAlertId(null); setStatus("stopped");
  };
  const canClose = status === "confirming" || status === "responded" || status === "stopped" || status === "error";

  return <DashboardDialog visible={visible} onClose={canClose ? onClose : undefined}>
    {status === "confirming" && <>
      <WebIcon name="shield-alert" size={40} color={D.red.color} />
      <Text style={D.title}>Send emergency SOS?</Text>
      <Text style={D.body}>This will immediately share your <Text style={{ fontWeight: "600" }}>real-time live location</Text> with the CHATCO Admin dispatch team.</Text>
      <Text style={[D.body, D.red, { fontWeight: "600" }]}>Only use this in actual emergencies.</Text>
      <View style={D.row}>
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={[D.button, D.secondary]}><Text style={D.onSecondary}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={handleActivate} style={[D.button, D.danger]}><WebIcon name="triangle-alert" size={16} color="#FFFFFF" /><Text style={D.onPrimary}>Send SOS</Text></TouchableOpacity>
      </View>
    </>}
    {(status === "locating" || status === "sending") && <>
      <WebSpinner size={36} color={D.red.color} />
      <Text style={D.title}>{status === "locating" ? "Getting your location…" : "Sending distress signal…"}</Text>
      <Text style={D.body}>Please wait while we connect you to CHATCO dispatch.</Text>
    </>}
    {(status === "active" || status === "acknowledged") && <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><WebIcon name="shield-alert" size={32} color={D.red.color} /><Text style={D.title}>SOS is active</Text></View>
      <Text style={D.body}>Your emergency alert has been sent to CHATCO dispatch.</Text>
      <View><Text style={D.label}>Time elapsed</Text><Text accessibilityRole="timer" style={D.timer}>{formatTimer(activeSeconds)}</Text></View>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><WebIcon name="check" size={16} color={D.blue.color} /><Text style={D.body}>Alert sent</Text></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{status === "acknowledged" ? <WebIcon name="check" size={16} color={D.blue.color} /> : <WebSpinner size={16} color={D.blue.color} />}<Text accessibilityLiveRegion="polite" style={[D.body, { flex: 1 }]}>{status === "acknowledged" ? "Dispatch has received your alert" : "Waiting for dispatch to respond"}</Text></View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><WebIcon name="info" size={15} color={D.blue.color} /><Text style={[D.body, { flex: 1, fontSize: 12, lineHeight: 18 }]}>You can close this screen. Your SOS stays active and dispatch can still respond.</Text></View>
      <SosActions onClose={onClose} onStop={handleStopSos} />
    </>}
    {(status === "responded" || status === "stopped") && <>
      <WebIcon name={status === "stopped" ? "circle-check-big" : "shield-check"} size={40} color={D.blue.color} />
      <Text style={D.title}>{status === "stopped" ? "SOS stopped" : "SOS closed"}</Text>
      <Text style={D.body}>{status === "stopped" ? "Your alert is closed. Dispatch has been notified." : "Dispatch has closed your emergency alert."}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onClose} style={[D.button, D.primary]}><Text style={D.onPrimary}>{status === "stopped" ? "Done" : "Understood"}</Text></TouchableOpacity>
    </>}
    {status === "error" && <>
      <WebIcon name="triangle-alert" size={40} color={D.red.color} />
      <Text style={D.title}>SOS could not be sent</Text>
      <Text accessibilityRole="alert" style={D.body}>{errorMessage}</Text>
      <View style={D.row}>
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={[D.button, D.secondary]}><Text style={D.onSecondary}>Close</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => setStatus("confirming")} style={[D.button, D.danger]}><Text style={D.onPrimary}>Try again</Text></TouchableOpacity>
      </View>
      <Text style={D.label}>Emergency calls</Text>
      <View style={D.row}>
        <TouchableOpacity accessibilityRole="button" onPress={() => void handleCallHotline("911")} style={[D.button, D.secondary]}><Text style={D.onSecondary}>PNP / 911</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => void handleCallHotline("160")} style={[D.button, D.secondary]}><Text style={D.onSecondary}>BFP Fire 160</Text></TouchableOpacity>
      </View>
    </>}
  </DashboardDialog>;
};
