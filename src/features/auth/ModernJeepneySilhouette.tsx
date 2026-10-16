import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
  Line,
  Polygon,
  Text as SvgText,
} from "react-native-svg";

interface ModernJeepneySilhouetteProps {
  width?: number;
  height?: number;
  showGlow?: boolean;
  isTakingOff?: boolean;
  onTakeoffComplete?: () => void;
  isCruising?: boolean;
}

export const ModernJeepneySilhouette: React.FC<ModernJeepneySilhouetteProps> = ({
  width = 340,
  height = 135,
  showGlow = true,
  isTakingOff = false,
  onTakeoffComplete,
  isCruising = false,
}) => {
  // Idle floating suspension animation
  const floatAnim = useRef(new Animated.Value(0)).current;
  // Headlight and marker glow
  const glowPulseAnim = useRef(new Animated.Value(0.5)).current;
  // Cruising animations (for continuous highway travel in walkthrough)
  const cruisingWheelAnim = useRef(new Animated.Value(0)).current;
  const cruisingRoadAnim = useRef(new Animated.Value(0)).current;

  // Takeoff sequence animations
  const takeoffAnim = useRef(new Animated.Value(0)).current;
  const wheelSpinAnim = useRef(new Animated.Value(0)).current;

  // Cruising loop
  useEffect(() => {
    if (!isCruising || isTakingOff) return;

    const wheelLoop = Animated.loop(
      Animated.timing(cruisingWheelAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const roadLoop = Animated.loop(
      Animated.timing(cruisingRoadAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    wheelLoop.start();
    roadLoop.start();

    return () => {
      wheelLoop.stop();
      roadLoop.stop();
    };
  }, [isCruising, isTakingOff, cruisingWheelAnim, cruisingRoadAnim]);

  // Idle animations loop
  useEffect(() => {
    if (isTakingOff) return;

    // 1. Suspension idle hover
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -2.5,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 2,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Headlight and marker pulse
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 0.95,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 0.5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    glowLoop.start();

    return () => {
      floatLoop.stop();
      glowLoop.stop();
    };
  }, [floatAnim, glowPulseAnim, isTakingOff]);

  // Handle successful login departure takeoff
  useEffect(() => {
    if (isTakingOff) {
      floatAnim.stopAnimation();

      Animated.parallel([
        // 1. Wheels spin rapidly counter-clockwise (since bus faces left)
        Animated.timing(wheelSpinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // 2. Vehicle zooms forward to the left
        Animated.timing(takeoffAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // 3. Headlights flare to full intensity
        Animated.timing(glowPulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onTakeoffComplete?.();
      });
    }
  }, [isTakingOff, onTakeoffComplete, takeoffAnim, wheelSpinAnim, glowPulseAnim, floatAnim]);

  // Interpolations for Takeoff
  const takeoffTranslateX = takeoffAnim.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0, 8, -540],
  });

  const takeoffSquatY = takeoffAnim.interpolate({
    inputRange: [0, 0.12, 0.45, 1],
    outputRange: [0, 2.5, -1, 0],
  });

  const takeoffTilt = takeoffAnim.interpolate({
    inputRange: [0, 0.12, 0.45, 1],
    outputRange: ["0deg", "-1.5deg", "0.6deg", "0deg"],
  });

  const takeoffOpacity = takeoffAnim.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [1, 1, 0],
  });

  const wheelSpinInterpolate = wheelSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-1800deg"],
  });

  const cruisingWheelRotate = cruisingWheelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  const activeWheelRotate = isTakingOff
    ? wheelSpinInterpolate
    : isCruising
    ? cruisingWheelRotate
    : "0deg";

  // Calculate pixel positions for wheels to scale exactly with width
  const scale = width / 380;
  const fx = 108 * scale;
  const fy = 114 * scale;
  const rx = 280 * scale;
  const ry = 114 * scale;
  const wRadius = 16 * scale;
  const wDiameter = 32 * scale;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {/* Animated Vehicle Body Container (Moves with takeoff and suspension) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateX: takeoffTranslateX },
              { translateY: isTakingOff ? takeoffSquatY : floatAnim },
              { rotate: takeoffTilt },
            ],
            opacity: takeoffOpacity,
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 380 155" fill="none">
          <Defs>
            {/* Authentic E-CHATCO White Metallic Body Gradient */}
            <LinearGradient id="chatcoBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="55%" stopColor="#F1F5F9" />
              <Stop offset="100%" stopColor="#CBD5E1" />
            </LinearGradient>

            {/* Rooftop A/C Pod Gradient */}
            <LinearGradient id="rooftopAcGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#94A3B8" />
            </LinearGradient>

            {/* Tinted Panoramic Windows Gradient */}
            <LinearGradient id="tintedWindowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#0F172A" />
              <Stop offset="50%" stopColor="#09101D" />
              <Stop offset="100%" stopColor="#04070D" />
            </LinearGradient>

            {/* Signature Blue Curtains Gradient */}
            <LinearGradient id="blueCurtainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#1E3A8A" />
              <Stop offset="70%" stopColor="#2563EB" />
              <Stop offset="100%" stopColor="#1D4ED8" />
            </LinearGradient>

            {/* Forward Headlight Conical Beam (Facing Left) */}
            <LinearGradient id="leftHeadlightBeamGrad" x1="100%" y1="50%" x2="0%" y2="50%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.75" />
              <Stop offset="45%" stopColor="#38BDF8" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Forward Headlight Beam casting forward to the left */}
          {showGlow && (
            <Polygon
              points="40,90 2,66 2,120"
              fill="url(#leftHeadlightBeamGrad)"
            />
          )}

          {/* Rear Taillight Soft Halo (Red) */}
          <Circle cx="338" cy="88" r="8" fill="rgba(239, 68, 68, 0.25)" />

          {/* 1. Rooftop A/C Unit (Long Pod with Ventilation Louvers) */}
          <Path
            d="
              M 148,30
              L 152,22
              Q 156,20 162,20
              L 262,20
              Q 268,20 271,22
              L 275,30
              Z
            "
            fill="url(#rooftopAcGrad)"
            stroke="#94A3B8"
            strokeWidth="1"
          />
          {/* A/C Louver Slits */}
          <Line x1="166" y1="24" x2="258" y2="24" stroke="#64748B" strokeWidth="1" strokeDasharray="6, 4" />
          <Line x1="168" y1="27" x2="256" y2="27" stroke="#64748B" strokeWidth="1" strokeDasharray="6, 4" />

          {/* 2. Main E-CHATCO Vehicle Body (Hino Poncho / Class 2 Modern PUV) */}
          <Path
            d="
              M 48,114
              L 40,110
              Q 36,106 36,98
              L 36,88
              Q 37,80 40,74
              L 44,70
              L 56,38
              Q 60,30 72,30
              L 330,30
              Q 338,30 338,38
              L 338,106
              Q 338,114 330,114
              L 301,114
              A 21,21 0 0,0 259,114
              L 129,114
              A 21,21 0 0,0 87,114
              L 48,114
              Z
            "
            fill="url(#chatcoBodyGrad)"
            stroke="#94A3B8"
            strokeWidth="1.2"
          />

          {/* 3. Black Mudflaps behind wheels */}
          <Rect x="129" y="108" width="4" height="15" rx="1" fill="#0F172A" />
          <Rect x="301" y="108" width="4" height="15" rx="1" fill="#0F172A" />

          {/* 4. Windows Section */}
          {/* Slanted Front Windshield */}
          <Path
            d="M 44,70 L 56,38 L 78,38 L 74,70 Z"
            fill="url(#tintedWindowGrad)"
            stroke="#1E293B"
            strokeWidth="1"
          />
          {/* Windshield Wiper */}
          <Line x1="56" y1="70" x2="68" y2="52" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

          {/* Route Number Badge '0' on Front Windshield */}
          <Circle cx="64" cy="62" r="5" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="0.8" />
          <SvgText
            x="64"
            y="64.5"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="middle"
          >
            0
          </SvgText>

          {/* Driver Door Window */}
          <Rect
            x="80"
            y="38"
            width="34"
            height="29"
            rx="2"
            fill="url(#tintedWindowGrad)"
            stroke="#1E293B"
            strokeWidth="1"
          />
          {/* Driver Window Vent Divider */}
          <Line x1="90" y1="38" x2="90" y2="67" stroke="#334155" strokeWidth="1" />

          {/* Driver Door Panel Outlines & Handle */}
          <Path
            d="M 77,36 L 77,110 L 116,110 L 116,36"
            stroke="#CBD5E1"
            strokeWidth="1"
            fill="none"
          />
          <Rect x="110" y="74" width="4.5" height="2" rx="0.5" fill="#475569" />

          {/* Circular CHATCO Seal Logo on Driver Door */}
          <Circle cx="96" cy="80" r="7.5" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="0.9" />
          <Circle cx="96" cy="80" r="6" fill="#FFFFFF" />
          <Circle cx="96" cy="80" r="4.6" fill="#1E3A8A" />
          <SvgText
            x="96"
            y="91"
            fill="#1E3A8A"
            fontSize="4.6"
            fontWeight="900"
            textAnchor="middle"
            letterSpacing={0.4}
          >
            CHATCO
          </SvgText>

          {/* Continuous Black Frame for Panoramic Passenger Windows */}
          <Rect
            x="120"
            y="36"
            width="214"
            height="32"
            rx="3"
            fill="#090E17"
            stroke="#1E293B"
            strokeWidth="1.2"
          />

          {/* 3 Main Panoramic Passenger Window Bays */}
          <Rect x="122" y="38" width="67" height="28" rx="1.5" fill="url(#tintedWindowGrad)" />
          <Rect x="192" y="38" width="67" height="28" rx="1.5" fill="url(#tintedWindowGrad)" />
          <Rect x="262" y="38" width="70" height="28" rx="1.5" fill="url(#tintedWindowGrad)" />

          {/* Signature Blue Curtains inside passenger windows */}
          <Path d="M 124,39 Q 138,48 152,39 Q 166,48 186,39 L 186,38 L 124,38 Z" fill="url(#blueCurtainGrad)" />
          <Path d="M 194,39 Q 208,48 222,39 Q 236,48 256,39 L 256,38 L 194,38 Z" fill="url(#blueCurtainGrad)" />
          <Path d="M 264,39 Q 280,48 296,39 Q 312,48 330,39 L 330,38 L 264,38 Z" fill="url(#blueCurtainGrad)" />

          {/* Window Upper Sliding Transom Bar */}
          <Line x1="122" y1="46" x2="332" y2="46" stroke="#334155" strokeWidth="1" />

          {/* 5. Authentic Route Text Printed on Side Body */}
          <SvgText
            x="228"
            y="76"
            fill="#0F172A"
            fontSize="5.5"
            fontWeight="900"
            textAnchor="middle"
            letterSpacing={0.4}
          >
            HAGONOY CALUMPIT MALOLOS MEYCAUAYAN VICE VERSA
          </SvgText>

          {/* Regulatory & Cooperative Badges Row */}
          <G transform="translate(180, 81)">
            <Rect x="0" y="0" width="8" height="5" rx="0.8" fill="#DC2626" />
            <SvgText x="4" y="4" fill="#FFFFFF" fontSize="3" fontWeight="bold" textAnchor="middle">H</SvgText>
            <Circle cx="13" cy="2.5" r="2.5" fill="#1D4ED8" />
            <Circle cx="19" cy="2.5" r="2.5" fill="#0D9488" />
            <Circle cx="25" cy="2.5" r="2.5" fill="#D97706" />
            <Circle cx="31" cy="2.5" r="2.5" fill="#2563EB" />
            <Rect x="36" y="0" width="8" height="5" rx="0.8" fill="#1E3A8A" />
            <SvgText x="40" y="4" fill="#FFFFFF" fontSize="3" fontWeight="bold" textAnchor="middle">OTC</SvgText>
          </G>

          {/* 6. Front Grille, Headlight Assembly & Hino Wing Emblem */}
          <Rect x="37" y="84" width="25" height="4" rx="1" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.8" />
          <Circle cx="44" cy="86" r="2" fill="#CBD5E1" stroke="#475569" strokeWidth="0.5" />
          <Path
            d="M 37,89 L 58,89 L 56,97 L 37,95 Z"
            fill="#38BDF8"
            stroke="#0284C7"
            strokeWidth="0.8"
          />
          <Rect x="40" y="103" width="18" height="5" rx="1.5" fill="#0F172A" />

          {/* Amber Side Indicator Light */}
          <Rect x="148" y="87" width="4" height="2" rx="1" fill="#F59E0B" />

          {/* Rear Taillight Vertical Bar */}
          <Rect x="336" y="82" width="2.5" height="14" rx="1.2" fill="#EF4444" />
        </Svg>

        {/* Pulsing Headlight & Amber Marker Glow Layer */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: glowPulseAnim,
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 380 155" fill="none">
            {/* Intense LED Projector Core */}
            <Circle cx="41" cy="92" r="3" fill="#E0F2FE" />
            {/* Glowing Amber Side Marker */}
            <Circle cx="150" cy="88" r="2.5" fill="#FBBF24" />
          </Svg>
        </Animated.View>

        {/* 7. FRONT SPINNING WHEEL (Rotates on takeoff & cruising) */}
        <Animated.View
          style={[
            styles.wheelContainer,
            {
              left: fx - wRadius,
              top: fy - wRadius,
              width: wDiameter,
              height: wDiameter,
              transform: [{ rotate: activeWheelRotate }],
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 32 32">
            {/* Rubber Tire */}
            <Circle cx="16" cy="16" r="15" fill="#090E17" stroke="#1E293B" strokeWidth="2" />
            {/* Steel Rim */}
            <Circle cx="16" cy="16" r="10.2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
            {/* 6 Ventilation Holes */}
            <Circle cx="16" cy="9.5" r="1.3" fill="#1E293B" />
            <Circle cx="21.6" cy="12.75" r="1.3" fill="#1E293B" />
            <Circle cx="21.6" cy="19.25" r="1.3" fill="#1E293B" />
            <Circle cx="16" cy="22.5" r="1.3" fill="#1E293B" />
            <Circle cx="10.4" cy="19.25" r="1.3" fill="#1E293B" />
            <Circle cx="10.4" cy="12.75" r="1.3" fill="#1E293B" />
            {/* Central Hub */}
            <Circle cx="16" cy="16" r="4.2" fill="#0F172A" stroke="#475569" strokeWidth="0.8" />
            <Circle cx="16" cy="16" r="1.5" fill="#38BDF8" />
          </Svg>
        </Animated.View>

        {/* 8. REAR SPINNING WHEEL (Rotates on takeoff & cruising) */}
        <Animated.View
          style={[
            styles.wheelContainer,
            {
              left: rx - wRadius,
              top: ry - wRadius,
              width: wDiameter,
              height: wDiameter,
              transform: [{ rotate: activeWheelRotate }],
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 32 32">
            {/* Rubber Tire */}
            <Circle cx="16" cy="16" r="15" fill="#090E17" stroke="#1E293B" strokeWidth="2" />
            {/* Steel Rim */}
            <Circle cx="16" cy="16" r="10.2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
            {/* 6 Ventilation Holes */}
            <Circle cx="16" cy="9.5" r="1.3" fill="#1E293B" />
            <Circle cx="21.6" cy="12.75" r="1.3" fill="#1E293B" />
            <Circle cx="21.6" cy="19.25" r="1.3" fill="#1E293B" />
            <Circle cx="16" cy="22.5" r="1.3" fill="#1E293B" />
            <Circle cx="10.4" cy="19.25" r="1.3" fill="#1E293B" />
            <Circle cx="10.4" cy="12.75" r="1.3" fill="#1E293B" />
            {/* Central Hub */}
            <Circle cx="16" cy="16" r="4.2" fill="#0F172A" stroke="#475569" strokeWidth="0.8" />
            <Circle cx="16" cy="16" r="1.5" fill="#38BDF8" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Ground Road Track & Moving Lane Markings */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 380 155" fill="none">
          {/* Solid Highway Baseline */}
          <Line
            x1="12"
            y1="130"
            x2="368"
            y2="130"
            stroke="rgba(56, 189, 248, 0.45)"
            strokeWidth="1.2"
          />
        </Svg>

        {/* Animated Moving Highway Lane Marker Dashes */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: isCruising
                ? [
                    {
                      translateX: cruisingRoadAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -22 * scale],
                      }),
                    },
                  ]
                : undefined,
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 380 155" fill="none">
            <Line
              x1="2"
              y1="138"
              x2="402"
              y2="138"
              stroke="rgba(148, 163, 184, 0.45)"
              strokeWidth="2"
              strokeDasharray="12, 10"
            />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  wheelContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});
