import React, { useEffect, useState } from "react";
import { Animated, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";

export const REWARD_RING_CIRCUMFERENCE = 2 * Math.PI * 40;
const NativeAnimatedCircle = Platform.OS === "web" ? null : Animated.createAnimatedComponent(Circle);

export function RewardsProgressRing({ percent, isLight, reduceMotion, nativeOffset }: {
  percent: number;
  isLight: boolean;
  reduceMotion: boolean;
  nativeOffset: ReturnType<Animated.Value["interpolate"]>;
}) {
  const [webPercent, setWebPercent] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (reduceMotion) {
      setWebPercent(percent);
      return;
    }
    const timer = setTimeout(() => setWebPercent(percent), 0);
    return () => clearTimeout(timer);
  }, [percent, reduceMotion]);

  const trackColor = isLight ? "#E5E7EB" : "rgba(255,255,255,0.05)";
  const progressColor = percent === 100 ? "#10B981" : "#1A5FB4";

  if (Platform.OS === "web") {
    return React.createElement("svg", {
      width: 192, height: 192, viewBox: "0 0 100 100", "aria-hidden": true,
      style: { transform: "rotate(-90deg)", display: "block", pointerEvents: "none" },
    },
    React.createElement("circle", { cx: 50, cy: 50, r: 40, fill: "none", stroke: trackColor, strokeWidth: 8 }),
    React.createElement("circle", {
      cx: 50, cy: 50, r: 40, fill: "none", stroke: progressColor, strokeWidth: 8,
      strokeLinecap: "round", strokeDasharray: REWARD_RING_CIRCUMFERENCE,
      strokeDashoffset: REWARD_RING_CIRCUMFERENCE * (1 - webPercent / 100),
      style: { transition: reduceMotion ? "none" : "stroke-dashoffset 300ms ease" },
    }));
  }

  return <Svg width={192} height={192} viewBox="0 0 100 100" style={{ transform: [{ rotate: "-90deg" }] }}>
    <Circle cx="50" cy="50" r="40" fill="none" stroke={trackColor} strokeWidth="8" />
    {NativeAnimatedCircle && <NativeAnimatedCircle cx="50" cy="50" r="40" fill="none" stroke={progressColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${REWARD_RING_CIRCUMFERENCE}`} strokeDashoffset={nativeOffset} />}
  </Svg>;
}
