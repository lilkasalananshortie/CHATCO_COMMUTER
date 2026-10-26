import React, { type ReactNode } from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";

interface CommuterCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CommuterCard({ children, style }: CommuterCardProps) {
  const { colors } = useCommuterTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          shadowColor: "#1A5FB4",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
