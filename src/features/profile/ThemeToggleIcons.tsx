import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { useReducedMotion } from "../../shared/useReducedMotion";
import { ProfileIcon } from "./ProfileIcon";

export function ThemeToggleIcons({ isLight }: { isLight: boolean }) {
  const reducedMotion = useReducedMotion();
  const value = useRef(new Animated.Value(isLight ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) { value.setValue(isLight ? 1 : 0); return; }
    const animation = Animated.timing(value, { toValue: isLight ? 1 : 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [isLight, reducedMotion, value]);
  const moon = { opacity: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [
    { rotate: value.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-90deg"] }) },
    { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
  ] };
  const sun = { opacity: value, transform: [
    { rotate: value.interpolate({ inputRange: [0, 1], outputRange: ["90deg", "0deg"] }) },
    { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
  ] };
  return <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
    <Animated.View style={[{ position: "absolute" }, moon]}><ProfileIcon name="moon" size={20} color="#99C1F1" /></Animated.View>
    <Animated.View style={[{ position: "absolute" }, sun]}><ProfileIcon name="sun" size={20} color="#D97706" /></Animated.View>
  </View>;
}
