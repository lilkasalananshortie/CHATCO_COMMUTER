import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { commuterColors as colors } from "../../core/theme/colors";
import { Mascot, type MascotPose } from "./Mascot";

interface Props {
  pose: MascotPose;
  title: string;
  message?: string;
  compact?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}

export function MascotMessage({ pose, title, message, compact = false, onRetry, retrying = false }: Props) {
  const { width, fontScale } = useWindowDimensions();
  const horizontal = compact && width >= 360 && fontScale < 1.4;
  return (
    <View style={[styles.card, horizontal && styles.compact]}>
      <Mascot pose={pose} size={compact ? 80 : 136} />
      <View style={horizontal ? styles.compactCopy : styles.copy}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {onRetry ? (
          <TouchableOpacity
            onPress={onRetry}
            disabled={retrying}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            accessibilityState={{ disabled: retrying, busy: retrying }}
            style={styles.retry}
          >
            {retrying ? <ActivityIndicator color={colors.primaryLight} /> : <Text style={styles.retryText}>Try again</Text>}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", gap: 10, width: "100%" },
  compact: { flexDirection: "row", alignItems: "center", padding: 12 },
  copy: { alignItems: "center", gap: 6, width: "100%" },
  compactCopy: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  message: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, flexShrink: 1 },
  retry: { minHeight: 44, minWidth: 80, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 8 },
  retryText: { color: colors.primaryLight, fontWeight: "700", fontSize: 14 },
});
