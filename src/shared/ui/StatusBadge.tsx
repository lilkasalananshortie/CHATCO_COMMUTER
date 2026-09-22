import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { commuterColors } from "../../core/theme/colors";

export type BadgeStatus =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "primary";

interface StatusBadgeProps {
  label: string;
  status?: BadgeStatus;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  status = "neutral",
  style,
  icon,
}) => {
  const getBadgeColors = () => {
    switch (status) {
      case "success":
        return {
          bg: commuterColors.successBg,
          text: commuterColors.success,
          border: "#86EFAC",
        };
      case "warning":
        return {
          bg: commuterColors.warningBg,
          text: "#B45309",
          border: "#FDE68A",
        };
      case "danger":
        return {
          bg: commuterColors.dangerBg,
          text: commuterColors.danger,
          border: "#FECACA",
        };
      case "info":
        return {
          bg: commuterColors.infoBg,
          text: "#0284C7",
          border: "#BAE6FD",
        };
      case "primary":
        return {
          bg: "#EBF3FE",
          text: commuterColors.primary,
          border: commuterColors.border,
        };
      case "neutral":
      default:
        return {
          bg: "#F1F5F9",
          text: commuterColors.textSecondary,
          border: "#E2E8F0",
        };
    }
  };

  const colors = getBadgeColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
