import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { commuterColors } from "../../core/theme/colors";

export const ONBOARDING_STORAGE_KEY = "@chatco_commuter_onboarding_completed";

interface OnboardingScreenProps {
  onFinish: () => void;
}

interface OnboardingStep {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  highlights: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[];
  accentColor: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 1,
    badge: "STEP 1 OF 4 • REAL-TIME RADAR",
    title: "Track & Hail Jeepneys in Real Time",
    subtitle:
      "Watch approaching transit units live along the corridor on dark CARTO basemaps. Never guess when the next ride is arriving.",
    icon: "navigate-circle",
    iconBg: "rgba(26, 95, 180, 0.2)",
    iconColor: "#62A0EA",
    accentColor: "#1A5FB4",
    highlights: [
      {
        icon: "map",
        title: "Live GPS Tracking",
        desc: "Accurate positions of active units on the corridor with live ETA countdowns.",
      },
      {
        icon: "hand-right",
        title: "Smart 'Hail Me' Button",
        desc: "Signal the conductor directly when a jeepney is within your 1km service radius.",
      },
      {
        icon: "shield-checkmark",
        title: "Corridor Bounds Check",
        desc: "Live route guard ensures you're on the right corridor before hailing.",
      },
    ],
  },
  {
    id: 2,
    badge: "STEP 2 OF 4 • GCASH & CASH RECEIPTS",
    title: "Instant QR Pay & 100% Free Rides",
    subtitle:
      "Go completely cashless with GCash QR codes, or scan your paper cash receipts to earn points toward free ride vouchers.",
    icon: "qr-code",
    iconBg: "rgba(16, 185, 129, 0.2)",
    iconColor: "#34D399",
    accentColor: "#10B981",
    highlights: [
      {
        icon: "scan",
        title: "Scan Conductor's QR",
        desc: "Scan the vehicle QR code for instant fare calculation and GCash checkout.",
      },
      {
        icon: "receipt",
        title: "Claim Paper Cash Receipts",
        desc: "Paid with cash? Scan the paper ticket QR or enter the 6-character token to count the ride.",
      },
      {
        icon: "gift",
        title: "Loyalty Voucher Wallet",
        desc: "Every 10 completed rides unlocks a free ride voucher you can activate for the conductor.",
      },
    ],
  },
  {
    id: 3,
    badge: "STEP 3 OF 4 • PASSENGER SAFETY",
    title: "Live Ride Share & Emergency SOS",
    subtitle:
      "Travel with peace of mind. Share your live transit progress with loved ones and access rapid emergency response anytime.",
    icon: "shield-checkmark",
    iconBg: "rgba(239, 68, 68, 0.2)",
    iconColor: "#F87171",
    accentColor: "#EF4444",
    highlights: [
      {
        icon: "share-social",
        title: "Live Trip Sharing",
        desc: "Generate a secure 30-minute tracking link with digital countdown timer for family.",
      },
      {
        icon: "warning",
        title: "Emergency SOS Alert",
        desc: "Double-tap SOS to broadcast your live GPS and vehicle details to the admin dispatch.",
      },
      {
        icon: "call",
        title: "Instant Hotline Dials",
        desc: "One-tap direct dial buttons for PNP Police 911 and BFP Fire 160 responders.",
      },
    ],
  },
  {
    id: 4,
    badge: "STEP 4 OF 4 • LOST & FOUND & PROFILE",
    title: "Lost & Found Recovery & Discounts",
    subtitle:
      "Centralized portal for recovered items across all units, plus official Student, Senior, and PWD fare concessions.",
    icon: "archive",
    iconBg: "rgba(167, 139, 250, 0.2)",
    iconColor: "#A78BFA",
    accentColor: "#8B5CF6",
    highlights: [
      {
        icon: "search",
        title: "Centralized Belongings Search",
        desc: "Browse and filter items found by crew across units by category, date, and plate.",
      },
      {
        icon: "bookmark",
        title: "Watchlist & Claims",
        desc: "Pin items to your personal watchlist and file verified claims with proof of ownership.",
      },
      {
        icon: "card",
        title: "Automatic Concession Fares",
        desc: "Verified Student, Senior Citizen, and PWD profiles automatically receive 20% discounts.",
      },
    ],
  },
];

const { width } = Dimensions.get("window");

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const insets = useSafeAreaInsets();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = STEPS[currentStepIndex] ?? STEPS[0]!;
  const isLast = currentStepIndex === STEPS.length - 1;

  const handleNext = async () => {
    if (isLast) {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      onFinish();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    onFinish();
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="bus" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>CHATCO</Text>
          <View style={styles.guideTag}>
            <Text style={styles.guideTagText}>COMMUTER GUIDE</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSkip}
          style={styles.skipBtn}
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Step Content Scroll */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Badge Pill */}
        <View style={[styles.stepBadgePill, { borderColor: step.accentColor + "40" }]}>
          <Text style={[styles.stepBadgeText, { color: step.iconColor }]}>{step.badge}</Text>
        </View>

        {/* Hero Visual Icon Container */}
        <View style={[styles.heroIconBox, { backgroundColor: step.iconBg, borderColor: step.accentColor + "40" }]}>
          <Ionicons name={step.icon} size={48} color={step.iconColor} />
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

        {/* Feature Highlights Card */}
        <View style={styles.highlightsContainer}>
          {step.highlights.map((h, i) => (
            <View key={i} style={styles.highlightRow}>
              <View style={[styles.highlightIconBox, { backgroundColor: step.iconBg }]}>
                <Ionicons name={h.icon} size={18} color={step.iconColor} />
              </View>
              <View style={styles.highlightTextContainer}>
                <Text style={styles.highlightTitle}>{h.title}</Text>
                <Text style={styles.highlightDesc}>{h.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Footer Controls */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((s, i) => {
            const active = i === currentStepIndex;
            return (
              <View
                key={s.id}
                style={[
                  styles.dot,
                  active && [styles.dotActive, { backgroundColor: step.iconColor }],
                ]}
              />
            );
          })}
        </View>

        {/* Buttons Row */}
        <View style={styles.buttonRow}>
          {currentStepIndex > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBack}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleNext}
            style={[styles.nextBtn, { backgroundColor: step.accentColor }]}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? "Get Started" : "Continue"}
            </Text>
            <Ionicons
              name={isLast ? "checkmark-circle" : "arrow-forward"}
              size={18}
              color="#FFFFFF"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050F1A",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#1A5FB4",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  guideTag: {
    backgroundColor: "rgba(98, 160, 234, 0.15)",
    borderColor: "rgba(98, 160, 234, 0.3)",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  guideTagText: {
    color: "#62A0EA",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  skipText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
  stepBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    marginBottom: 20,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroIconBox: {
    width: 96,
    height: 96,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stepTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 28,
  },
  stepSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  highlightsContainer: {
    width: "100%",
    backgroundColor: "#071A2E",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  highlightIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  highlightTextContainer: {
    flex: 1,
  },
  highlightTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  highlightDesc: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "#050F1A",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "700",
  },
  nextBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
