import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Mascot } from "../../shared/ui/Mascot";
import { getWalkthroughMascotSize } from "../../shared/ui/mascot-layout";
import { WALKTHROUGH_SLIDES } from "./walkthrough-slides";

export const ONBOARDING_STORAGE_KEY = "@chatco_commuter_onboarding_completed";

interface OnboardingScreenProps {
  onFinish: (initialAuthView?: "LOGIN" | "REGISTER") => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const float = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const slide = WALKTHROUGH_SLIDES[index]!;
  const last = index === WALKTHROUGH_SLIDES.length - 1;
  const mascotSize = getWalkthroughMascotSize(width, height - insets.top - insets.bottom, fontScale);

  useEffect(() => {
    mounted.current = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      preferenceChanged = true;
      setReducedMotion(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted.current && !preferenceChanged) setReducedMotion(value);
    }).catch(() => {});
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) { float.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: -5, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, float]);

  const move = (nextIndex: number) => {
    if (busy.current || nextIndex < 0 || nextIndex >= WALKTHROUGH_SLIDES.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIndex(nextIndex);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const finish = async (view: "LOGIN" | "REGISTER") => {
    if (busy.current) return;
    busy.current = true;
    setFinishing(true);
    setFinishError(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      if (mounted.current) { setFinishError(true); setFinishing(false); }
      busy.current = false;
      return;
    }
    if (mounted.current) onFinish(view);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !busy.current && Math.abs(gesture.dx) > 25 && Math.abs(gesture.dy) < 25,
    onPanResponderRelease: (_, gesture) => {
      // Require an explicit auth choice on the final slide.
      if (gesture.dx < -50 && index < WALKTHROUGH_SLIDES.length - 1) move(index + 1);
      else if (gesture.dx > 50) move(index - 1);
    },
  }), [index]);

  return (
    <View {...panResponder.panHandlers} style={[styles.screen, { backgroundColor: slide.background, paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>CHATCO</Text>
        <Text style={styles.stepCount}>{index + 1} / {WALKTHROUGH_SLIDES.length}</Text>
      </View>
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.slide}>
          <View style={[styles.stage, { width: mascotSize + 32, height: mascotSize + 32 }]}>
            <View pointerEvents="none" accessible={false} style={[styles.halo, { backgroundColor: slide.accent + "20", borderColor: slide.accent + "35" }]} />
            <View pointerEvents="none" accessible={false} style={[styles.orbit, { borderColor: slide.accent + "35" }]} />
            <View pointerEvents="none" accessible={false} style={[styles.dot, styles.dotTop, { backgroundColor: slide.accent }]} />
            <View pointerEvents="none" accessible={false} style={[styles.dot, styles.dotBottom, { backgroundColor: slide.accent + "80" }]} />
            <Animated.View style={{ width: mascotSize, height: mascotSize, transform: [{ translateY: float }] }}>
              <Mascot pose={slide.pose} size={mascotSize} responsive={false} accessibilityLabel={slide.mascotLabel} />
            </Animated.View>
          </View>
          <View style={[styles.tag, { backgroundColor: slide.accent + "20" }]}>
            <Text style={styles.tagText}>{slide.tag}</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.pagination} accessibilityLabel={"Walkthrough step " + (index + 1) + " of " + WALKTHROUGH_SLIDES.length}>
          {WALKTHROUGH_SLIDES.map((item, position) => (
            <View key={item.id} style={[styles.pageDot, position === index && { width: 24, backgroundColor: slide.accent }]} />
          ))}
        </View>
        {finishError && <Text accessibilityRole="alert" style={styles.error}>Couldn't save your progress. Please try again.</Text>}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go to previous slide" accessibilityState={{ disabled: index === 0 || finishing }} disabled={index === 0 || finishing} onPress={() => move(index - 1)} style={({ pressed }) => [styles.backButton, (index === 0 || finishing) && styles.disabled, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={last ? "Create Account" : "Go to next slide"} accessibilityState={{ disabled: finishing, busy: finishing }} disabled={finishing} onPress={() => last ? finish("REGISTER") : move(index + 1)} style={({ pressed }) => [styles.primaryButton, { backgroundColor: slide.accent }, pressed && styles.pressed, finishing && styles.disabled]}>
            <Text style={styles.buttonText}>{finishing ? "Please wait..." : last ? "Create Account" : "Next"}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        {last && (
          <Pressable accessibilityRole="button" accessibilityLabel="Log In" disabled={finishing} onPress={() => finish("LOGIN")} style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}>
            <Text style={styles.loginText}>Already have an account? <Text style={styles.loginHighlight}>Log In</Text></Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 10 },
  brand: { fontSize: 17, letterSpacing: 2, fontWeight: "900", color: "#FFFFFF" },
  stepCount: { fontSize: 13, color: "#AABBD0", fontWeight: "600" },
  scroll: { flex: 1 },
  content: { flexGrow: 1, width: "100%", justifyContent: "center", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16 },
  slide: { width: "100%", maxWidth: 420, alignItems: "center", gap: 14 },
  stage: { alignItems: "center", justifyContent: "center", marginBottom: 6 },
  halo: { position: "absolute", width: "92%", height: "92%", borderRadius: 999, borderWidth: 1 },
  orbit: { position: "absolute", width: "100%", height: "100%", borderRadius: 999, borderWidth: 1, transform: [{ scaleY: 0.85 }, { rotate: "-18deg" }] },
  dot: { position: "absolute", width: 10, height: 10, borderRadius: 5 },
  dotTop: { right: 12, top: 24 },
  dotBottom: { left: 12, bottom: 36, width: 6, height: 6 },
  tag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 10, letterSpacing: 1.2, fontWeight: "800", color: "#DDEBFA", textAlign: "center" },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", textAlign: "center", letterSpacing: -0.6 },
  description: { color: "#B3C2D4", fontSize: 15, lineHeight: 24, textAlign: "center", maxWidth: 340 },
  footer: { width: "100%", maxWidth: 460, alignSelf: "center", paddingHorizontal: 24, paddingTop: 12, gap: 14 },
  pagination: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 7 },
  pageDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#FFFFFF35" },
  actions: { flexDirection: "row", gap: 12 },
  backButton: { width: 52, minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF10" },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, flexShrink: 1 },
  loginButton: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  loginText: { color: "#AABBD0", fontSize: 13, textAlign: "center" },
  loginHighlight: { color: "#FFFFFF", fontWeight: "800" },
  error: { color: "#FCA5A5", fontSize: 13, textAlign: "center" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
