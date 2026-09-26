import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

export const ONBOARDING_STORAGE_KEY = "@chatco_commuter_onboarding_completed";

interface OnboardingScreenProps {
  onFinish: (initialAuthView?: "LOGIN" | "REGISTER") => void;
}

interface StepItem {
  id: number;
  tag: string;
  tagColor: string;
  accentColor: string;
  title: string;
  oneLiner: string;
  renderArt: (floatAnim: Animated.Value) => React.ReactNode;
}

const { width } = Dimensions.get("window");

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Floating ambient loop for icon art
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const animateTransition = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -18,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      slideAnim.setValue(18);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleFinishWithAuth = async (view: "LOGIN" | "REGISTER") => {
    triggerHaptic();
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    onFinish(view);
  };

  const handleNext = async () => {
    triggerHaptic();
    if (currentIndex >= STEPS.length - 1) {
      handleFinishWithAuth("REGISTER");
    } else {
      animateTransition(currentIndex + 1);
    }
  };

  const handleBack = () => {
    triggerHaptic();
    if (currentIndex > 0) {
      animateTransition(currentIndex - 1);
    }
  };

  const handleSkip = async () => {
    triggerHaptic();
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    onFinish("LOGIN");
  };

  const STEPS: StepItem[] = [
    {
      id: 1,
      tag: "REAL-TIME FLEET",
      tagColor: "#62A0EA",
      accentColor: "#1A5FB4",
      title: "Live GPS Radar",
      oneLiner: "See approaching modern jeeps & exact arrival times.",
      renderArt: (float) => (
        <View style={styles.artStage}>
          {/* Concentric Radar Rings */}
          <View style={[styles.radarRing, styles.radarRing3]} />
          <View style={[styles.radarRing, styles.radarRing2]} />
          <View style={[styles.radarRing, styles.radarRing1]} />

          {/* Floating Hero Centerpiece */}
          <Animated.View style={[styles.heroCenterGlow, { transform: [{ translateY: float }] }]}>
            <View style={[styles.heroIconBox, { backgroundColor: "#1A5FB4" }]}>
              <Ionicons name="bus" size={44} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Floating Art Badge 1 (Top Right) */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.badgeTopRight,
              { transform: [{ translateY: Animated.multiply(float, -0.6) }] },
            ]}
          >
            <View style={styles.pulseDotGreen} />
            <Ionicons name="flash" size={13} color="#FBBF24" />
            <Text style={styles.floatingBadgeText}>~3 mins away</Text>
          </Animated.View>

          {/* Floating Art Badge 2 (Bottom Left) */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.badgeBottomLeft,
              { transform: [{ translateY: Animated.multiply(float, 0.7) }] },
            ]}
          >
            <Ionicons name="navigate" size={14} color="#62A0EA" />
            <Text style={styles.floatingBadgeText}>Unit J-04 • Calumpit</Text>
          </Animated.View>
        </View>
      ),
    },
    {
      id: 2,
      tag: "CASHLESS & REWARDS",
      tagColor: "#34D399",
      accentColor: "#10B981",
      title: "Cashless QR & Perks",
      oneLiner: "Pay with GCash in seconds & unlock 100% free rides.",
      renderArt: (float) => (
        <View style={styles.artStage}>
          {/* Glowing HUD Grid */}
          <View style={[styles.hudReticle, styles.hudReticleOuter]} />
          <View style={[styles.hudReticle, styles.hudReticleInner]} />

          {/* Centerpiece Scanner Shield */}
          <Animated.View style={[styles.heroCenterGlow, { transform: [{ translateY: float }] }]}>
            <View style={[styles.heroIconBox, { backgroundColor: "#10B981" }]}>
              <Ionicons name="qr-code" size={44} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Floating Art Badge 1 (Top Left): GCash Fare */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.badgeTopLeft,
              { transform: [{ translateY: Animated.multiply(float, -0.7) }] },
            ]}
          >
            <View style={styles.badgeIconCircleBlue}>
              <Ionicons name="wallet" size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.floatingBadgeText}>₱15.00 Exact Fare</Text>
          </Animated.View>

          {/* Floating Art Badge 2 (Bottom Right): Reward Star */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.badgeBottomRight,
              { transform: [{ translateY: Animated.multiply(float, 0.6) }] },
            ]}
          >
            <Ionicons name="gift" size={14} color="#FBBF24" />
            <Text style={styles.floatingBadgeText}>Free Ride Voucher</Text>
          </Animated.View>
        </View>
      ),
    },
    {
      id: 3,
      tag: "TRIP SAFETY",
      tagColor: "#F87171",
      accentColor: "#EF4444",
      title: "Family Share & SOS",
      oneLiner: "Share your live route link & alert dispatch in 1 tap.",
      renderArt: (float) => (
        <View style={styles.artStage}>
          {/* Shield Aura Concentric Waves */}
          <View style={[styles.radarRing, styles.shieldRing3]} />
          <View style={[styles.radarRing, styles.shieldRing2]} />
          <View style={[styles.radarRing, styles.shieldRing1]} />

          {/* Centerpiece Guardian Shield */}
          <Animated.View style={[styles.heroCenterGlow, { transform: [{ translateY: float }] }]}>
            <View style={[styles.heroIconBox, { backgroundColor: "#DC2626" }]}>
              <Ionicons name="shield-checkmark" size={44} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Floating Art Badge 1 (Top Right): Family Share */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.badgeTopRight,
              { transform: [{ translateY: Animated.multiply(float, -0.6) }] },
            ]}
          >
            <Ionicons name="people" size={14} color="#60A5FA" />
            <Text style={styles.floatingBadgeText}>Shared with Family</Text>
          </Animated.View>

          {/* Floating Art Badge 2 (Bottom Left): 24/7 SOS Beacon */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.badgeBottomLeft,
              { transform: [{ translateY: Animated.multiply(float, 0.7) }] },
            ]}
          >
            <View style={styles.pulseDotRed} />
            <Ionicons name="radio" size={13} color="#F87171" />
            <Text style={styles.floatingBadgeText}>1-Tap SOS Beacon</Text>
          </Animated.View>
        </View>
      ),
    },
    {
      id: 4,
      tag: "LOST & FOUND",
      tagColor: "#A78BFA",
      accentColor: "#8B5CF6",
      title: "Lost & Found Vault",
      oneLiner: "Conductors log recovered items so nothing is left behind.",
      renderArt: (float) => (
        <View style={styles.artStage}>
          {/* Concentric Vault Rings */}
          <View style={[styles.radarRing, styles.vaultRing3]} />
          <View style={[styles.radarRing, styles.vaultRing2]} />
          <View style={[styles.radarRing, styles.vaultRing1]} />

          {/* Centerpiece Vault Lock / Archive */}
          <Animated.View style={[styles.heroCenterGlow, { transform: [{ translateY: float }] }]}>
            <View style={[styles.heroIconBox, { backgroundColor: "#7C3AED" }]}>
              <Ionicons name="briefcase" size={42} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Floating Art Badge 1 (Top Left): Item Recovered */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.badgeTopLeft,
              { transform: [{ translateY: Animated.multiply(float, -0.6) }] },
            ]}
          >
            <Ionicons name="search" size={13} color="#A78BFA" />
            <Text style={styles.floatingBadgeText}>Found on Unit J-04</Text>
          </Animated.View>

          {/* Floating Art Badge 2 (Bottom Right): Verified Claim */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.badgeBottomRight,
              { transform: [{ translateY: Animated.multiply(float, 0.7) }] },
            ]}
          >
            <Ionicons name="checkmark-circle" size={14} color="#34D399" />
            <Text style={styles.floatingBadgeText}>1-Tap Claim Proof</Text>
          </Animated.View>
        </View>
      ),
    },
  ];

  const currentStep = STEPS[currentIndex] ?? STEPS[0]!;
  const isLast = currentIndex === STEPS.length - 1;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      {/* Ambient Radial Lighting in Background */}
      <View style={styles.ambientTopGlow} />
      <View style={styles.ambientBottomGlow} />

      {/* Top Header Row */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="bus" size={15} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>CHATCO</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSkip}
          style={styles.skipBtn}
          accessibilityLabel="Skip intro walkthrough"
        >
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Art & Minimal Text Showcase */}
      <Animated.View
        style={[
          styles.mainShowcase,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Visual Hero Icon Art Stage */}
        <View style={styles.stageWrapper}>
          {currentStep.renderArt(floatAnim)}
        </View>

        {/* Minimal Typography: Tag, Bold Title, 1-Line Subtitle */}
        <View style={styles.textContainer}>
          <View style={[styles.tagPill, { borderColor: currentStep.tagColor + "40" }]}>
            <Text style={[styles.tagPillText, { color: currentStep.tagColor }]}>
              {currentStep.tag}
            </Text>
          </View>

          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepOneLiner}>{currentStep.oneLiner}</Text>
        </View>
      </Animated.View>

      {/* Footer Controls: Pagination Dots + Navigation Action */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((s, i) => {
            const active = i === currentIndex;
            return (
              <View
                key={s.id}
                style={[
                  styles.dot,
                  active && [styles.dotActive, { backgroundColor: currentStep.tagColor }],
                ]}
              />
            );
          })}
        </View>

        {/* Action Controls: Centered Primary + Centered Previous underneath */}
        <View style={styles.actionsColumn}>
          {isLast ? (
            <View style={styles.authChoicesContainer}>
              {/* App Creation (Register) Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleFinishWithAuth("REGISTER")}
                style={[styles.primaryCenteredBtn, { backgroundColor: currentStep.accentColor }]}
                accessibilityLabel="Create Account"
              >
                <Text style={styles.primaryBtnText}>Create Account</Text>
                <Ionicons name="person-add" size={17} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              {/* Log In Option */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleFinishWithAuth("LOGIN")}
                style={styles.loginOptionBtn}
                accessibilityLabel="Log In"
              >
                <Text style={styles.loginOptionText}>
                  Already have an account? <Text style={styles.loginOptionHighlight}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleNext}
              style={[styles.primaryCenteredBtn, { backgroundColor: currentStep.accentColor }]}
              accessibilityLabel="Go to next step"
            >
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons
                name="arrow-forward"
                size={17}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          )}

          {/* Previous on the bottom (centered) */}
          {currentIndex > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBack}
              style={styles.previousBottomBtn}
              accessibilityLabel="Go to previous step"
            >
              <Text style={styles.previousBottomText}>Previous</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previousPlaceholder} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050F1A",
    justifyContent: "space-between",
    position: "relative",
  },
  ambientTopGlow: {
    position: "absolute",
    top: -80,
    left: width / 2 - 130,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(26, 95, 180, 0.18)",
    ...Platform.select({
      web: { filter: "blur(60px)" },
    }),
  },
  ambientBottomGlow: {
    position: "absolute",
    bottom: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    ...Platform.select({
      web: { filter: "blur(50px)" },
    }),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    zIndex: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#1A5FB4",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  skipBtnText: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 13,
    fontWeight: "600",
  },
  mainShowcase: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stageWrapper: {
    width: width - 56,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  artStage: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  // Radar / Aura Rings
  radarRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
  },
  radarRing1: {
    width: 140,
    height: 140,
    borderColor: "rgba(98, 160, 234, 0.35)",
    backgroundColor: "rgba(98, 160, 234, 0.05)",
  },
  radarRing2: {
    width: 200,
    height: 200,
    borderColor: "rgba(98, 160, 234, 0.2)",
    borderStyle: "dashed",
  },
  radarRing3: {
    width: 260,
    height: 260,
    borderColor: "rgba(98, 160, 234, 0.1)",
  },

  // Reticles for Cashless HUD
  hudReticle: {
    position: "absolute",
    borderRadius: 28,
    borderWidth: 1.5,
  },
  hudReticleInner: {
    width: 160,
    height: 160,
    borderColor: "rgba(52, 211, 153, 0.35)",
    backgroundColor: "rgba(16, 185, 129, 0.06)",
  },
  hudReticleOuter: {
    width: 230,
    height: 230,
    borderColor: "rgba(52, 211, 153, 0.18)",
    borderStyle: "dashed",
  },

  // Shield Waves
  shieldRing1: {
    width: 140,
    height: 140,
    borderColor: "rgba(248, 113, 113, 0.35)",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
  },
  shieldRing2: {
    width: 200,
    height: 200,
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderStyle: "dashed",
  },
  shieldRing3: {
    width: 260,
    height: 260,
    borderColor: "rgba(248, 113, 113, 0.1)",
  },

  // Vault Waves
  vaultRing1: {
    width: 140,
    height: 140,
    borderColor: "rgba(167, 139, 250, 0.35)",
    backgroundColor: "rgba(139, 92, 246, 0.06)",
  },
  vaultRing2: {
    width: 200,
    height: 200,
    borderColor: "rgba(167, 139, 250, 0.2)",
    borderStyle: "dashed",
  },
  vaultRing3: {
    width: 260,
    height: 260,
    borderColor: "rgba(167, 139, 250, 0.1)",
  },

  // Hero Centerpiece Box
  heroCenterGlow: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  heroIconBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },

  // Floating Micro-Badges
  floatingBadge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(13, 27, 42, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 6,
  },
  floatingBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  badgeTopRight: {
    top: 14,
    right: -10,
  },
  badgeBottomLeft: {
    bottom: 14,
    left: -10,
  },
  badgeTopLeft: {
    top: 14,
    left: -10,
  },
  badgeBottomRight: {
    bottom: 14,
    right: -10,
  },

  // Badge Micro Elements
  pulseDotGreen: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  pulseDotRed: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  badgeIconCircleBlue: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#007DFE",
    alignItems: "center",
    justifyContent: "center",
  },

  // Minimal Typography
  textContainer: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  stepTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: 8,
  },
  stepOneLiner: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.62)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 290,
  },

  // Footer & Navigation Controls
  footer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    zIndex: 10,
    gap: 20,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  actionsColumn: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  authChoicesContainer: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  primaryCenteredBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  loginOptionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  loginOptionText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  loginOptionHighlight: {
    color: "#62A0EA",
    fontWeight: "800",
  },
  previousBottomBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previousBottomText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  previousPlaceholder: {
    height: 36,
  },
});
