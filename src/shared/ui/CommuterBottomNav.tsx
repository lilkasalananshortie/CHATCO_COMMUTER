import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";
import type { CommuterTab } from "../../core/domain/types";

export type { CommuterTab };

interface CommuterBottomNavProps {
  activeTab: CommuterTab;
  onTabChange: (tab: CommuterTab) => void;
  rewardsBadge?: number;
}

export const CommuterBottomNav: React.FC<CommuterBottomNavProps> = ({
  activeTab,
  onTabChange,
  rewardsBadge = 0,
}) => {
  const insets = useSafeAreaInsets();

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
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.navRow}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const showBadge = item.id === "rewards" && rewardsBadge > 0;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onTabChange(item.id)}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isActive && styles.activeIconWrapper,
                ]}
              >
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={20}
                  color={isActive ? "#62A0EA" : "rgba(255, 255, 255, 0.4)"}
                />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {rewardsBadge > 9 ? "9+" : rewardsBadge}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel,
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#071A2E",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 38,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    position: "relative",
  },
  activeIconWrapper: {
    backgroundColor: "rgba(26, 95, 180, 0.25)",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: 0,
    backgroundColor: "#FF6D3A",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 3,
  },
  activeTabLabel: {
    color: "#62A0EA",
    fontWeight: "800",
  },
});
