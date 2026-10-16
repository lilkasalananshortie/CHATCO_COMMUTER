import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, useWindowDimensions } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Path,
  G,
} from "react-native-svg";

export const AuthBackgroundGraphic: React.FC = () => {
  const { width, height } = useWindowDimensions();

  // Ambient luminous orb breathing animation
  const orbBreathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slow ambient breathing
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbBreathe, {
          toValue: 1.12,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbBreathe, {
          toValue: 0.95,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    breatheAnimation.start();

    return () => {
      breatheAnimation.stop();
    };
  }, [orbBreathe]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Deep Midnight Ambient Gradient Glows */}
      <Animated.View
        style={[
          styles.glowTopRight,
          {
            transform: [{ scale: orbBreathe }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowBottomLeft,
          {
            transform: [{ scale: orbBreathe }],
          },
        ]}
      />

      {/* Vector Transit Corridors & GPS Radar Map Grid */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Subtle Route Line Gradient */}
          <LinearGradient id="routeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.03" />
            <Stop offset="50%" stopColor="#1A5FB4" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.02" />
          </LinearGradient>
          {/* Radar Ring Glow */}
          <LinearGradient id="radarRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.02" />
            <Stop offset="50%" stopColor="#38BDF8" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Faint GPS Concentric Radar Range Rings */}
        <G opacity={0.6}>
          <Circle
            cx={width * 0.5}
            cy={height * 0.18}
            r="120"
            stroke="url(#radarRingGrad)"
            strokeWidth="1"
            strokeDasharray="4, 8"
          />
          <Circle
            cx={width * 0.5}
            cy={height * 0.18}
            r="220"
            stroke="url(#radarRingGrad)"
            strokeWidth="1"
            strokeDasharray="6, 12"
          />
          <Circle
            cx={width * 0.5}
            cy={height * 0.18}
            r="340"
            stroke="url(#radarRingGrad)"
            strokeWidth="0.8"
            strokeDasharray="8, 16"
          />
        </G>

        {/* Diagonal Transit Corridors (Simulating Calumpit - Meycauayan GPS artery) */}
        <Path
          d={`M -40,${height * 0.22} Q ${width * 0.5},${height * 0.12} ${width + 40},${height * 0.28}`}
          stroke="url(#routeLineGrad)"
          strokeWidth="2"
          fill="none"
        />
        <Path
          d={`M -20,${height * 0.28} Q ${width * 0.45},${height * 0.19} ${width + 50},${height * 0.35}`}
          stroke="url(#routeLineGrad)"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="12, 10"
        />
        <Path
          d={`M -50,${height * 0.75} Q ${width * 0.5},${height * 0.65} ${width + 60},${height * 0.85}`}
          stroke="url(#routeLineGrad)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Static Waypoint Nodes with Subtle Halo */}
        <Circle cx={width * 0.2} cy={height * 0.2} r="3" fill="#38BDF8" opacity={0.2} />
        <Circle cx={width * 0.8} cy={height * 0.26} r="3" fill="#38BDF8" opacity={0.2} />
        <Circle cx={width * 0.3} cy={height * 0.72} r="2.5" fill="#1A5FB4" opacity={0.18} />
        <Circle cx={width * 0.75} cy={height * 0.8} r="3" fill="#10B981" opacity={0.18} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  glowTopRight: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "#1A5FB4",
    opacity: 0.12,
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -120,
    left: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "#0C3663",
    opacity: 0.14,
  },
});
