import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

/** Web animate-fade-in: opacity plus 10px upward movement, 300ms ease-out. */
export function useWebDialogEntrance(visible: boolean, enabled = true) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (!enabled || reducedMotion) {
      progress.setValue(visible ? 1 : 0);
      setMounted(visible);
      return;
    }
    if (visible) {
      setMounted(true);
      progress.setValue(0);
    }
    const animation = Animated.timing(progress, { toValue: visible ? 1 : 0, duration: 300, easing: Easing.bezier(0, 0, 0.58, 1), useNativeDriver: Platform.OS !== "web" });
    animation.start(({ finished }) => { if (finished && !visible) setMounted(false); });
    return () => animation.stop();
  }, [visible, enabled, reducedMotion, progress]);
  return { progress, reducedMotion, mounted };
}
