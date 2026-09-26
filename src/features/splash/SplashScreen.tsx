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
import { commuterColors } from "../../core/theme/colors";

interface SplashScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
}

const { width } = Dimensions.get("window");

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 2200,
}) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(18)).current;
  const routeProgress = useRef(new Animated.Value(0)).current;
  const pulseRing1 = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.8)).current;
  const jeepneyHover = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const [statusMessage, setStatusMessage] = useState("Connecting to Bulacan transit network…");

  useEffect(() => {
    // 1. Entrance animation sequence
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 700,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 700,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Pulse ring loop
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseRing1, {
          toValue: 1.8,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity1, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Subtle jeepney suspension hover loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(jeepneyHover, {
          toValue: -4,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(jeepneyHover, {
          toValue: 2,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Moving transit blip along the route line
    Animated.loop(
      Animated.sequence([
        Animated.timing(routeProgress, {
          toValue: 1,
          duration: 1600,
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

    // Micro-status changes
    const t1 = setTimeout(() => {
      setStatusMessage("Locating active modern jeepneys…");
    }, 1100);

    const t2 = setTimeout(() => {
      setStatusMessage("Fleet online • Welcome commuter!");
    }, 1800);

    // 5. Exit transition
    const exitTimer = setTimeout(() => {
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, minDurationMs);

    return () => {
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
    jeepneyHover,
    exitOpacity,
    minDurationMs,
    onFinish,
  ]);

  const blipTranslateX = routeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-70, 70],
  });

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      {/* Background ambient light circles */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      <View style={styles.content}>
        {/* Pulsing ring + Brand Logo Box */}
        <View style={styles.logoAnchor}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseRing1 }],
                opacity: pulseOpacity1,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoBox,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }, { translateY: jeepneyHover }],
              },
            ]}
          >
            <View style={styles.logoInner}>
              <Ionicons name="bus" size={44} color="#FFFFFF" />
              <View style={styles.antennaDot} />
            </View>
          </Animated.View>
        </View>

        {/* Brand Text Section */}
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
              <Text style={styles.commuterPillText}>COMMUTER</Text>
            </View>
          </View>

          <Text style={styles.brandSubtitle}>
            Calumpit • Meycauayan Transit Line
          </Text>

          {/* Lively Route Track Simulation */}
          <View style={styles.routeContainer}>
            <View style={styles.stationLabelLeft}>
              <View style={styles.stationDot} />
              <Text style={styles.stationText}>Calumpit</Text>
            </View>

            <View style={styles.routeTrack}>
              <View style={styles.routeBaseLine} />
              <Animated.View
                style={[
                  styles.routeBlip,
                  {
                    transform: [{ translateX: blipTranslateX }],
                  },
                ]}
              >
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

      {/* Bottom Status Indicator */}
      <Animated.View style={[styles.footerStatus, { opacity: textOpacity }]}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>BULACAN COOP TRANSIT</Text>
        </View>
        <Text style={styles.statusTicker}>{statusMessage}</Text>
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
    backgroundColor: "rgba(26, 95, 180, 0.25)",
    ...Platform.select({
      web: { filter: "blur(70px)" },
    }),
  },
  ambientGlowBottom: {
    position: "absolute",
    bottom: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    ...Platform.select({
      web: { filter: "blur(60px)" },
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
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: "#62A0EA",
    backgroundColor: "rgba(98, 160, 234, 0.15)",
  },
  logoBox: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: "#1A5FB4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#62A0EA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
    borderWidth: 1.5,
    borderColor: "#050F1A",
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
    letterSpacing: 2,
  },
  commuterPill: {
    backgroundColor: "rgba(98, 160, 234, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(98, 160, 234, 0.4)",
  },
  commuterPillText: {
    color: "#62A0EA",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 6,
    fontWeight: "500",
    letterSpacing: 0.4,
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
    borderColor: "rgba(255, 255, 255, 0.08)",
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
    color: "rgba(255, 255, 255, 0.7)",
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
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 1,
  },
  routeBlip: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  routeBlipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#62A0EA",
    shadowColor: "#62A0EA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  footerStatus: {
    alignItems: "center",
    gap: 6,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
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
    color: "rgba(255, 255, 255, 0.45)",
    fontWeight: "500",
  },
});
