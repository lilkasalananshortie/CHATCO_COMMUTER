import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Mirrors the web's prefers-reduced-motion behavior using the device setting. */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      preferenceChanged = true;
      setReducedMotion(value);
    });

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!preferenceChanged) setReducedMotion(value);
      })
      .catch(() => {});

    return () => subscription.remove();
  }, []);

  return reducedMotion;
}
