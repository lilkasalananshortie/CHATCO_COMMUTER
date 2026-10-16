import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";

// Complete rendered frames show handrail/step contact and doorway occlusion.
const BOARDING_SHEET = require("../../../assets/mascot/mascot-boarding-sheet-v2.png");
const FRAME_MS = 340;
const FRAME_COUNT = 6;

/** Cosmetic only: authentication has already succeeded before this mounts. */
export function LoginBoardingAnimation({ onComplete }: { onComplete: () => void }) {
  const { width } = useWindowDimensions();
  const sceneWidth = Math.max(160, Math.min(width - 32, 420));
  // This 1536x1024 sheet has three columns and two rows of square frames.
  // Image.resolveAssetSource is native-only; calling it crashes Expo web.
  const sceneHeight = sceneWidth;
  const [frame, setFrame] = useState(0);
  const departure = useRef(new Animated.Value(0)).current;
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    let disposed = false;
    let completed = false;
    let animation: Animated.CompositeAnimation | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => {
      if (disposed || completed) return;
      completed = true;
      completeRef.current();
    };
    // Animation callbacks must never strand an authenticated user here.
    timers.push(setTimeout(finish, 5000));
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduced) => {
      if (disposed || completed) return;
      if (reduced) { finish(); return; }
      for (let next = 1; next < FRAME_COUNT; next++) {
        timers.push(setTimeout(() => {
          if (!disposed && !completed) setFrame(next);
        }, next * FRAME_MS));
      }
      timers.push(setTimeout(() => {
        if (disposed || completed) return;
        animation = Animated.timing(departure, {
          toValue: 1, duration: 650, easing: Easing.in(Easing.cubic), useNativeDriver: true,
        });
        animation.start(({ finished }) => { if (finished) finish(); });
      }, FRAME_COUNT * FRAME_MS + 200));
    });
    return () => { disposed = true; timers.forEach(clearTimeout); animation?.stop(); };
  }, [departure]);

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Text style={styles.brand}>CHATCO.</Text>
      <Animated.View style={[styles.scene, { width: sceneWidth, height: sceneHeight,
        opacity: departure.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateY: departure.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}>
        <Image source={BOARDING_SHEET} resizeMode="stretch" fadeDuration={0}
          accessibilityLabel="ChatCo mascot grips the jeepney handrail, climbs the steps, and sits inside"
          style={{ position: "absolute", width: sceneWidth * 3, height: sceneHeight * 2,
            left: -(frame % 3) * sceneWidth, top: -Math.floor(frame / 3) * sceneHeight }} />
      </Animated.View>
      <Text style={styles.title}>You're in. All aboard!</Text>
      <Text style={styles.subtitle}>Taking you to your dashboard…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050F1A", alignItems: "center", justifyContent: "center", padding: 16 },
  brand: { color: "white", fontWeight: "900", fontSize: 28, letterSpacing: 1.5 },
  scene: { marginVertical: 24, borderRadius: 28, overflow: "hidden" },
  title: { color: "white", fontSize: 23, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#94A3B8", fontSize: 14, marginTop: 10, textAlign: "center" },
});
