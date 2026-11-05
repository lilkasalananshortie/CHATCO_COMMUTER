import React, { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, View } from "react-native";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { Text } from "./BrandText";

/** Mirrors the web SOS confirmation: a deliberate 90% horizontal slide. */
export function SosSlideToSend({ onSend }: { onSend: () => void | Promise<void> }) {
  const { isLight } = useCommuterTheme();
  const [width, setWidth] = useState(280);
  const drag = useRef(new Animated.Value(0)).current;
  const position = useRef(0);
  const busy = useRef(false);
  const max = Math.max(1, width - 56);
  const fillWidth = drag.interpolate({ inputRange: [0, max], outputRange: [0, width], extrapolate: "clamp" });
  const reset = () => { position.current = 0; Animated.spring(drag, { toValue: 0, useNativeDriver: false }).start(); };
  const send = async () => {
    if (busy.current) return;
    busy.current = true;
    try { await onSend(); } finally { busy.current = false; reset(); }
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !busy.current,
    onMoveShouldSetPanResponder: (_, gesture) => !busy.current && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => { position.current = Math.max(0, Math.min(max, gesture.dx)); drag.setValue(position.current); },
    onPanResponderRelease: () => { if (position.current >= max * .9) void send(); else reset(); },
    onPanResponderTerminate: reset,
  }), [max, onSend, drag]);
  return <View accessible accessibilityRole="adjustable" accessibilityLabel="Slide to send SOS" accessibilityActions={[{ name: "activate", label: "Send SOS" }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === "activate") void send(); }}
    onLayout={event => setWidth(event.nativeEvent.layout.width)} {...responder.panHandlers}
    style={{ height: 56, borderRadius: 12, justifyContent: "center", borderWidth: 1, borderColor: isLight ? "#FCA5A5" : "#991B1B", backgroundColor: isLight ? "#FEF2F2" : "#0B1120", overflow: "hidden" }}>
    <Animated.View testID="sos-progress-fill" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: fillWidth, backgroundColor: isLight ? "#DC2626" : "#EF4444", pointerEvents: "none" }} />
    <Text style={{ textAlign: "center", fontSize: 14, fontWeight: "600", color: isLight ? "#991B1B" : "#FFFFFF" }}>Slide to send SOS</Text>
    <Animated.View style={{ position: "absolute", left: 4, top: 4, height: 46, width: 46, borderRadius: 8, backgroundColor: isLight ? "#DC2626" : "#EF4444", alignItems: "center", justifyContent: "center", transform: [{ translateX: drag }] }}><Text style={{ color: "#FFFFFF", fontSize: 24 }}>›</Text></Animated.View>
  </View>;
}
