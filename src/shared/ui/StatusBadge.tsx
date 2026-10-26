import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";

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
  const { colors: theme } = useCommuterTheme();
  const getBadgeColors = () => {
    switch (status) {
      case "success":
        return {
          bg: theme.successBg,
          text: theme.success,
          border: theme.successBorder,
        };
      case "warning":
        return {
          bg: theme.warningBg,
          text: theme.warning,
          border: theme.warningBorder,
        };
      case "danger":
        return {
          bg: theme.dangerBg,
          text: theme.danger,
          border: theme.dangerBorder,
        };
      case "info":
        return {
          bg: theme.infoBg,
          text: theme.info,
          border: theme.infoBorder,
        };
      case "primary":
        return {
          bg: "#EBF3FE",
          text: theme.primary,
          border: theme.border,
        };
      case "neutral":
      default:
        return {
          bg: "#F1F5F9",
          text: theme.textSecondary,
          border: theme.border,
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
