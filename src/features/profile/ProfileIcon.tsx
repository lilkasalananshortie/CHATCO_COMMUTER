import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { WebIcon } from "../../shared/ui/WebIcon";

const paths = {
  camera: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  pencil: "M21.174 6.812a1 1 0 0 0-3.986-3.986L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.5zM15 5l4 4",
  mail: "m22 7-8.991 5.727a1.94 1.94 0 0 1-2.009 0L2 7",
  key: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
  logout: "m16 17 5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
  chevron: "m9 18 6-6-6-6",
  moon: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.463.402.807a6.25 6.25 0 0 0 8.268 8.268c.344-.215.829-.004.803.397",
  sun: "M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42",
  save: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM17 21v-7H7v7M7 3v5h8",
} as const;
export type ProfileIconName = keyof typeof paths | "user-round" | "shield-check" | "clock" | "shield-alert" | "x" | "check";

/** The same 24px SVG view box, round strokes and geometry as the web icons. */
export function ProfileIcon({ name, size = 22, color = "#99C1F1" }: { name: ProfileIconName; size?: number; color?: string }) {
  if (!(name in paths)) return <WebIcon name={name as "user-round" | "shield-check" | "clock" | "shield-alert" | "x" | "check"} size={size} color={color} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} accessible={false}>
    {name === "mail" && <Rect x={2} y={4} width={20} height={16} rx={2} />}
    <Path d={paths[name as keyof typeof paths]} />
    {name === "camera" && <Circle cx={12} cy={13} r={3} />}
    {name === "key" && <Circle cx={16.5} cy={7.5} r={0.5} fill={color} />}
    {name === "sun" && <Circle cx={12} cy={12} r={4} />}
  </Svg>;
}

export function ProfileIdentityBackground({ isLight }: { isLight: boolean }) {
  return <Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }} preserveAspectRatio="none" accessible={false}>
    <Defs><LinearGradient id="profileIdentity" x1="0%" y1="0%" x2="100%" y2="100%">
      <Stop offset="0%" stopColor={isLight ? "#F0F7FF" : "#102E50"} />
      <Stop offset="100%" stopColor={isLight ? "#FFFFFF" : "#071A2E"} />
    </LinearGradient></Defs>
    <Rect width="100%" height="100%" fill="url(#profileIdentity)" />
  </Svg>;
}
