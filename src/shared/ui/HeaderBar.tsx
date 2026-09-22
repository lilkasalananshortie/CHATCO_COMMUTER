import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { commuterColors } from "../../core/theme/colors";

interface HeaderBarProps {
  title?: string;
  userName?: string;
  unreadAnnouncements?: number;
  onOpenSos: () => void;
  onOpenAnnouncements?: () => void;
  onOpenProfile?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title = "CHATCO",
  userName,
  unreadAnnouncements = 0,
  onOpenSos,
  onOpenAnnouncements,
  onOpenProfile,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
      <StatusBar barStyle="light-content" backgroundColor={commuterColors.navyDeep} />

      <View style={styles.content}>
        {/* Left: Branding & Greeting */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenProfile}
          style={styles.brandContainer}
        >
          <View style={styles.logoBadge}>
            <Ionicons name="bus" size={16} color="#FFFFFF" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>{title}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>COMMUTER</Text>
              </View>
            </View>
            {userName ? (
              <Text style={styles.greetingText} numberOfLines={1}>
                Hello, {userName}
              </Text>
            ) : (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live Tracking Active</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Right: Actions (Announcements + SOS) */}
        <View style={styles.actionsContainer}>
          {/* Announcements Icon */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenAnnouncements}
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            {unreadAnnouncements > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Urgent SOS Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenSos}
            style={styles.sosButton}
          >
            <Ionicons name="warning" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: commuterColors.navyDeep,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: commuterColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  rolePill: {
    backgroundColor: "rgba(26, 95, 180, 0.4)",
    borderColor: commuterColors.primaryLight,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  rolePillText: {
    color: "#BAE6FD",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  greetingText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: commuterColors.success,
    marginRight: 5,
  },
  liveText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: commuterColors.danger,
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
  sosButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: commuterColors.danger,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    shadowColor: commuterColors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  sosButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
