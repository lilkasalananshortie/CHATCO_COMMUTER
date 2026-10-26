import React from "react";
import { Text } from "./BrandText";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import type { CommuterTab } from "../../core/domain/types";

export type { CommuterTab };

interface CommuterBottomNavProps {
  activeTab: CommuterTab;
  onTabChange: (tab: CommuterTab) => void;
  rewardsBadge?: number;
  lostFoundBadge?: number;
}

export const CommuterBottomNav: React.FC<CommuterBottomNavProps> = ({
  activeTab,
  onTabChange,
  rewardsBadge = 0,
  lostFoundBadge = 0,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isLight } = useCommuterTheme();
  const styles = createStyles(colors, isLight);

  const navItems: {
    id: CommuterTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      id: "home",
      label: "Home",
      icon: "home-outline",
      activeIcon: "home",
    },
    {
      id: "fare",
      label: "Fare",
      icon: "calculator-outline",
      activeIcon: "calculator",
    },
    {
      id: "lostfound",
      label: "Lost & Found",
      icon: "search-outline",
      activeIcon: "search",
    },
    {
      id: "rewards",
      label: "Rewards",
      icon: "gift-outline",
      activeIcon: "gift",
    },
    {
      id: "feedback",
      label: "Feedback",
      icon: "chatbubble-ellipses-outline",
      activeIcon: "chatbubble-ellipses",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "person-outline",
      activeIcon: "person",
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.navRow}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          let badgeCount = 0;
          if (item.id === "rewards") badgeCount = rewardsBadge;
          if (item.id === "lostfound") badgeCount = lostFoundBadge;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onTabChange(item.id)}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${item.label}${badgeCount > 0 ? `, ${badgeCount} unread` : ""}`}
            >
              {/* Web-parity top indicator dot */}
              <View
                style={[
                  styles.topDot,
                  isActive ? styles.topDotActive : styles.topDotHidden,
                ]}
              />

              {/* Icon Chip — #1A5FB4 active rounded chip matching web */}
              <View
                style={[
                  styles.iconChip,
                  isActive ? styles.iconChipActive : styles.iconChipInactive,
                ]}
              >
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={19}
                  color={isActive ? "#FFFFFF" : isLight ? colors.textMuted : "rgba(255, 255, 255, 0.45)"}
                />
                {badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Text Label */}
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

function createStyles(colors: { [K in keyof typeof commuterColors]: string }, isLight: boolean) {
return StyleSheet.create({
  container: {
    backgroundColor: isLight ? colors.surface : "#0B1E33",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 4,
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
  },
  topDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginBottom: 4,
  },
  topDotActive: {
    backgroundColor: colors.primaryLight,
  },
  topDotHidden: {
    backgroundColor: "transparent",
  },
  iconChip: {
    width: 42,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconChipActive: {
    backgroundColor: colors.primary,
    shadowColor: "#1A5FB4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  iconChipInactive: {
    backgroundColor: "transparent",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF6D3A",
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  activeTabLabel: {
    color: isLight ? colors.primary : "#FFFFFF",
    fontWeight: "700",
  },
  inactiveTabLabel: {
    color: colors.textMuted,
    fontWeight: "500",
  },
});
}
