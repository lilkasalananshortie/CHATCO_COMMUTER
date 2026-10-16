import React from "react";
import { Image, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { getMascotSize } from "./mascot-layout";

// Static requires let Metro bundle every pose for native and offline use.
const assets = {
  greeting: require("../../../assets/mascot/mascot-greeting.png"),
  phone: require("../../../assets/mascot/mascot-phone.png"),
  envelope: require("../../../assets/mascot/mascot-envelope.png"),
  key: require("../../../assets/mascot/mascot-key.png"),
  reward: require("../../../assets/mascot/mascot-reward.png"),
  thanks: require("../../../assets/mascot/mascot-thanks.png"),
  noticeboard: require("../../../assets/mascot/mascot-noticeboard.png"),
  offline: require("../../../assets/mascot/mascot-offline.png"),
  "not-found": require("../../../assets/mascot/mascot-not-found.png"),
  "fleet-action": require("../../../assets/mascot/mascot-fleet-action.png"),
  "scan-action": require("../../../assets/mascot/mascot-scan-action.png"),
  "guardian-action": require("../../../assets/mascot/mascot-guardian-action.png"),
  "vault-action": require("../../../assets/mascot/mascot-vault-action.png"),
} as const;

export type MascotPose = keyof typeof assets;

interface MascotProps {
  pose: MascotPose;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Disable only inside a composition that already scales as a whole. */
  responsive?: boolean;
}

export function Mascot({ pose, size = 144, style, accessibilityLabel, responsive = true }: MascotProps) {
  const { width, height } = useWindowDimensions();
  const targetSize = responsive ? getMascotSize(size, width, height) : size;
  return (
    <View
      pointerEvents="none"
      style={[styles.frame, style, { width: targetSize, height: targetSize }]}
    >
      <Image
        source={assets[pose]}
        resizeMode="contain"
        style={styles.image}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
        accessibilityElementsHidden={!accessibilityLabel}
        importantForAccessibility={accessibilityLabel ? "yes" : "no"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: "center", flexShrink: 0 },
  image: { width: "100%", height: "100%" },
});
