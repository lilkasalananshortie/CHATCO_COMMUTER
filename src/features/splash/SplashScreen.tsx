import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SplashScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
}

const { width } = Dimensions.get("window");

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 2300,
}) => {
  // Entrance & exit values
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  // Living ambient animations
  const jeepneyHover = useRef(new Animated.Value(0)).current;
  const pulseRing1 = useRef(new Animated.Value(0.85)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.75)).current;
  const pulseRing2 = useRef(new Animated.Value(0.85)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.55)).current;
  const antennaPulse = useRef(new Animated.Value(0.5)).current;
  const routeProgress = useRef(new Animated.Value(0)).current;

  // Status ticker transitions
  const [statusMessage, setStatusMessage] = useState("Connecting to Bulacan transit network…");
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const statusTranslateY = useRef(new Animated.Value(0)).current;

  const triggerStatusTransition = (newMessage: string) => {
    Animated.parallel([
      Animated.timing(statusOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(statusTranslateY, {
        toValue: -6,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStatusMessage(newMessage);
      statusTranslateY.setValue(8);
      Animated.parallel([
        Animated.timing(statusOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(statusTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  useEffect(() => {
    // 1. Kinetic entrance sequence
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 650,
        delay: 260,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 650,
        delay: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Dual-Layer Radial Pulse Waves (Staggered Shockwaves)
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseRing1, {
          toValue: 2.1,
          duration: 1900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity1, {
          toValue: 0,
          duration: 1900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const p2Timeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(pulseRing2, {
            toValue: 2.3,
            duration: 1900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity2, {
            toValue: 0,
            duration: 1900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);

    // 3. Modern Jeepney Chassis Suspension Breathing (Idling Engine)
    Animated.loop(
      Animated.sequence([
        Animated.timing(jeepneyHover, {
          toValue: -5,
          duration: 950,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(jeepneyHover, {
          toValue: 2.5,
          duration: 950,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. GPS Antenna Beacon Glow Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(antennaPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(antennaPulse, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Transit Line Moving Route Blip
    Animated.loop(
      Animated.sequence([
        Animated.timing(routeProgress, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(routeProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Micro-status changes with smooth text transitions
    const t1 = setTimeout(() => {
      triggerStatusTransition("Locating active modern jeepneys…");
    }, 1050);

    const t2 = setTimeout(() => {
      triggerStatusTransition("Fleet online • Welcome commuter!");
    }, 1800);

    // 6. Cinematic dissolve exit handoff (Forward zoom + gradual fade)
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(exitScale, {
          toValue: 1.06,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    }, minDurationMs);

    return () => {
      clearTimeout(p2Timeout);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(exitTimer);
    };
  }, [
    logoScale,
    logoOpacity,
    textOpacity,
    textTranslateY,
    routeProgress,
    pulseRing1,
    pulseOpacity1,
    pulseRing2,
    pulseOpacity2,
    jeepneyHover,
    antennaPulse,
    exitOpacity,
    exitScale,
    minDurationMs,
    onFinish,
  ]);

  // Derived chassis tilt from suspension hover
  const jeepneyTilt = jeepneyHover.interpolate({
    inputRange: [-5, 0, 2.5],
    outputRange: ["-1.5deg", "0deg", "1.2deg"],
  });

  // Derived ground shadow scale and opacity
  const shadowScaleX = jeepneyHover.interpolate({
    inputRange: [-5, 2.5],
    outputRange: [0.82, 1.18],
  });

  const shadowOpacity = jeepneyHover.interpolate({
    inputRange: [-5, 2.5],
    outputRange: [0.22, 0.55],
  });

  // Transit blip progression
  const blipTranslateX = routeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-72, 72],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: exitOpacity,
          transform: [{ scale: exitScale }],
        },
      ]}
    >
      {/* Dynamic ambient luminous backgrounds */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      <View style={styles.content}>
        {/* Living Logo Stage with Dual Shockwaves & Ground Shadow */}
        <View style={styles.logoAnchor}>
          {/* Primary Pulse Shockwave */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseRing1 }],
                opacity: pulseOpacity1,
              },
            ]}
          />

          {/* Secondary Staggered Shockwave */}
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRingSecondary,
              {
                transform: [{ scale: pulseRing2 }],
                opacity: pulseOpacity2,
              },
            ]}
          />

          {/* Dynamic Ground Contact Shadow */}
          <Animated.View
            style={[
              styles.groundShadow,
              {
                transform: [{ scaleX: shadowScaleX }],
                opacity: shadowOpacity,
              },
            ]}
          />

          {/* Chassis Box with Organic Suspension Idle & Rotational Pitch */}
          <Animated.View
            style={[
              styles.logoBox,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { translateY: jeepneyHover },
                  { rotate: jeepneyTilt },
                ],
              },
            ]}
          >
            {/* Top Gloss Highlight Edge */}
            <View style={styles.logoGlossEdge} />

            <View style={styles.logoInner}>
              <Ionicons name="bus" size={46} color="#FFFFFF" />

              {/* Glowing Real-Time GPS Antenna Beacon */}
              <Animated.View
                style={[
                  styles.antennaDot,
                  {
                    opacity: antennaPulse,
                    transform: [{ scale: antennaPulse }],
                  },
                ]}
              />

              {/* Headlight Beams */}
              <View style={styles.headlightContainer}>
                <View style={styles.headlightLeft} />
                <View style={styles.headlightRight} />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Brand Typography Section */}
        <Animated.View
          style={[
            styles.textSection,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>CHATCO</Text>
            <View style={styles.commuterPill}>
              <View style={styles.commuterPillDot} />
              <Text style={styles.commuterPillText}>COMMUTER</Text>
            </View>
          </View>

          <Text style={styles.brandSubtitle}>
            Calumpit • Meycauayan Transit Line
          </Text>

          {/* Dynamic Route Conveyor Track */}
          <View style={styles.routeContainer}>
            <View style={styles.stationLabelLeft}>
              <View style={styles.stationDot} />
              <Text style={styles.stationText}>Calumpit</Text>
            </View>

            <View style={styles.routeTrack}>
              <View style={styles.routeBaseLine} />
              <View style={styles.routeDashedOverlay} />
              <Animated.View
                style={[
                  styles.routeBlip,
                  {
                    transform: [{ translateX: blipTranslateX }],
                  },
                ]}
              >
                <View style={styles.routeBlipHalo} />
                <View style={styles.routeBlipDot} />
              </Animated.View>
            </View>

            <View style={styles.stationLabelRight}>
              <View style={[styles.stationDot, { backgroundColor: "#10B981" }]} />
              <Text style={styles.stationText}>Meycauayan</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Status Indicator with Smooth Slide-and-Fade Morphing */}
      <Animated.View style={[styles.footerStatus, { opacity: textOpacity }]}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>BULACAN COOP TRANSIT</Text>
        </View>

        <Animated.View
          style={{
            opacity: statusOpacity,
            transform: [{ translateY: statusTranslateY }],
          }}
        >
          <Text style={styles.statusTicker}>{statusMessage}</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#050F1A",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 50,
    zIndex: 9999,
  },
  ambientGlowTop: {
    position: "absolute",
    top: -120,
    left: width / 2 - 160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(26, 95, 180, 0.28)",
    ...Platform.select({
      web: { filter: "blur(75px)" },
    }),
  },
  ambientGlowBottom: {
    position: "absolute",
    bottom: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(16, 185, 129, 0.16)",
    ...Platform.select({
      web: { filter: "blur(65px)" },
    }),
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 24,
  },
  logoAnchor: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: "#62A0EA",
    backgroundColor: "rgba(98, 160, 234, 0.14)",
  },
  pulseRingSecondary: {
    borderColor: "#34D399",
    backgroundColor: "rgba(52, 211, 153, 0.08)",
  },
  groundShadow: {
    position: "absolute",
    bottom: 8,
    width: 76,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: "#1A5FB4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#62A0EA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
    overflow: "hidden",
  },
  logoGlossEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 38,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  logoInner: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  antennaDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#34D399",
    shadowColor: "#34D399",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    borderWidth: 1.5,
    borderColor: "#050F1A",
  },
  headlightContainer: {
    position: "absolute",
    bottom: -6,
    flexDirection: "row",
    justifyContent: "space-between",
    width: 32,
  },
  headlightLeft: {
    width: 5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#FDE047",
    shadowColor: "#FDE047",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  headlightRight: {
    width: 5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#FDE047",
    shadowColor: "#FDE047",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  textSection: {
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2.2,
  },
  commuterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(98, 160, 234, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.45)",
  },
  commuterPillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#62A0EA",
  },
  commuterPillText: {
    color: "#62A0EA",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.68)",
    marginTop: 6,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
  },
  stationLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stationLabelRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#62A0EA",
  },
  stationText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.72)",
    fontWeight: "600",
  },
  routeTrack: {
    width: 150,
    height: 16,
    marginHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  routeBaseLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 1,
  },
  routeDashedOverlay: {
    position: "absolute",
    width: "100%",
    height: 2,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.35)",
  },
  routeBlip: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  routeBlipHalo: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(98, 160, 234, 0.25)",
  },
  routeBlipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#62A0EA",
    shadowColor: "#62A0EA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  footerStatus: {
    alignItems: "center",
    gap: 7,
    minHeight: 48,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.28)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  statusTicker: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.52)",
    fontWeight: "500",
    textAlign: "center",
  },
});
