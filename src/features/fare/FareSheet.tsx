import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { useReducedMotion } from "../../shared/useReducedMotion";
import { FareScreen } from "./FareScreen";

/** Keep content mounted until the web-style exit transition has finished. */
export function FareSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useCommuterTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const panelHeight = Math.min(height * 0.9, height - insets.top);
  useEffect(() => {
    if (visible) setMounted(true);
    if (reduceMotion) { progress.setValue(visible ? 1 : 0); setMounted(visible); return; }
    const animation = Animated.timing(progress, { toValue: visible ? 1 : 0, duration: 300, easing: Easing.bezier(0, 0, 0.58, 1), useNativeDriver: Platform.OS !== "web" });
    animation.start(({ finished }) => { if (finished && !visible) setMounted(false); });
    return () => animation.stop();
  }, [visible, reduceMotion, progress]);
  return <Modal visible={visible || mounted} transparent animationType="none" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: progress }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss Fare Matrix" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View accessibilityViewIsModal style={{ height: panelHeight, width: "100%", maxWidth: 672, alignSelf: "center", backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden", paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [panelHeight, 0] }) }] }}>
        {(visible || mounted) && <FareScreen onClose={onClose} />}
      </Animated.View>
    </View>
  </Modal>;
}
