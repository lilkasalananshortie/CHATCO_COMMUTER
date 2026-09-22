import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { commuterColors } from "../../core/theme/colors";

export type ButtonVariant = "primary" | "signal" | "secondary" | "danger" | "ghost";

interface CommuterButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const CommuterButton: React.FC<CommuterButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "signal":
        return {
          backgroundColor: disabled ? "#FFB59E" : commuterColors.accentSignal,
          borderColor: "transparent",
        };
      case "secondary":
        return {
          backgroundColor: commuterColors.surface,
          borderColor: commuterColors.border,
          borderWidth: 1.5,
        };
      case "danger":
        return {
          backgroundColor: disabled ? "#FCA5A5" : commuterColors.danger,
          borderColor: "transparent",
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
        };
      case "primary":
      default:
        return {
          backgroundColor: disabled ? "#93C5FD" : commuterColors.primary,
          borderColor: "transparent",
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case "secondary":
        return {
          color: disabled ? commuterColors.textMuted : commuterColors.primary,
        };
      case "ghost":
        return {
          color: disabled ? commuterColors.textMuted : commuterColors.textSecondary,
        };
      case "signal":
      case "danger":
      case "primary":
      default:
        return {
          color: "#FFFFFF",
        };
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getVariantStyle(),
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "secondary" ? commuterColors.primary : "#FFFFFF"}
        />
      ) : (
        <>
          {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
          <Text style={[styles.text, getTextStyle(), textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#071A2E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidth: {
    width: "100%",
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
