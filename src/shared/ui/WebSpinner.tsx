import { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";
import { WebIcon } from "./WebIcon";

export function WebSpinner({ size = 24, color = "#FFFFFF" }: { size?: number; color?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }));
    animation.start();
    return () => animation.stop();
  }, [rotation]);
  return <Animated.View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ width: size, height: size, transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}><WebIcon name="loader-circle" size={size} color={color} /></Animated.View>;
}
