import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemeProvider } from "./src/core/theme/ThemeProvider";
import { commuterColors } from "./src/core/theme/colors";
import { authService } from "./src/core/api/auth-service";
import { commuterService } from "./src/core/api/commuter-service";
import type { User, CommuterProfile, CommuterTab, Trip } from "./src/core/domain/types";

// UI Components
import { CommuterBottomNav } from "./src/shared/ui/CommuterBottomNav";

// Screens (5 web-parity tabs + Onboarding + Splash)
import { SplashScreen } from "./src/features/splash/SplashScreen";
import { OnboardingScreen, ONBOARDING_STORAGE_KEY } from "./src/features/onboarding/OnboardingScreen";
import { LoginScreen } from "./src/features/auth/LoginScreen";
import { RegisterScreen } from "./src/features/auth/RegisterScreen";
import { DashboardScreen } from "./src/features/dashboard/DashboardScreen";
import { LostFoundScreen } from "./src/features/lostfound/LostFoundScreen";
import { RewardsScreen } from "./src/features/rewards/RewardsScreen";
import { FeedbackScreen } from "./src/features/feedback/FeedbackScreen";
import { ProfileScreen } from "./src/features/profile/ProfileScreen";

// Modals
import { QrScannerModal } from "./src/features/scanner/QrScannerModal";
import { ReceiptScanModal } from "./src/features/scanner/ReceiptScanModal";
import { SosModal } from "./src/features/sos/SosModal";
import { ShareRideModal } from "./src/features/share/ShareRideModal";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="light" />
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function MainApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CommuterProfile | null>(null);
  const [authView, setAuthView] = useState<"LOGIN" | "REGISTER">("LOGIN");

  // Navigation State — 5 tabs 1:1 with web layout
  const [activeTab, setActiveTab] = useState<CommuterTab>("home");
  const [feedbackTargetTrip, setFeedbackTargetTrip] = useState<Trip | null>(null);

  // Modals & Badges
  const [showScanModal, setShowScanModal] = useState(false);
  const [showReceiptScanModal, setShowReceiptScanModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [availableVouchers, setAvailableVouchers] = useState(0);
  const [lostFoundBadge, setLostFoundBadge] = useState(0);

  // Initialize session & onboarding check
  useEffect(() => {
    (async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!onboardingCompleted) {
          setShowOnboarding(true);
        }

        const storedUser = await authService.getStoredUser();
        const token = await authService.getStoredToken();
        if (token && storedUser && storedUser.role === "COMMUTER") {
          setUser(storedUser);
          try {
            const profileData = await commuterService.getProfile();
            if (profileData?.profile) {
              setProfile(profileData.profile);
            } else if ((profileData as any)?.id || (profileData as any)?.commuter_type) {
              setProfile(profileData as any);
            }
          } catch {
            // offline profile fallback
          }
        }
      } catch {
        // start clean
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  // Poll unread announcements count & available vouchers if logged in (matching web layout)
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const [announcementRes, rewardsRes, claimsRes] = await Promise.allSettled([
        commuterService.getUnreadAnnouncementCount(),
        commuterService.getRewards(),
        commuterService.getMyClaims({ per_page: 10 }),
      ]);

      if (announcementRes.status === "fulfilled") {
        setUnreadAnnouncements(announcementRes.value);
      }
      if (rewardsRes.status === "fulfilled") {
        setAvailableVouchers(rewardsRes.value.availableVoucherCount || 0);
      }
      if (claimsRes.status === "fulfilled") {
        const validatedClaims = claimsRes.value.claims.filter(
          (c) => c.status === "VALIDATED" || (c.status as string) === "APPROVED"
        ).length;
        setLostFoundBadge(validatedClaims);
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    setUser(loggedInUser);
    commuterService
      .getProfile()
      .then((res: any) => {
        if (res?.profile) {
          setProfile(res.profile);
        } else if (res?.id || res?.commuter_type) {
          setProfile(res);
        }
      })
      .catch(() => {});
  };

  const handleLogout = () => {
    setUser(null);
    setProfile(null);
    setActiveTab("home");
    setAuthView("LOGIN");
  };

  const handleNavigateToFeedback = (trip?: Trip) => {
    if (trip) setFeedbackTargetTrip(trip);
    setActiveTab("feedback");
  };

  const insets = useSafeAreaInsets();

  // Lively animated splash screen on startup
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (initializing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={commuterColors.primary} />
      </View>
    );
  }

  // First-installation onboarding walkthrough screen (zero AI-slop, authentic local commuter guide)
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onFinish={(targetAuthView) => {
          if (targetAuthView) {
            setAuthView(targetAuthView);
          }
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <View style={styles.appContainer}>
      {!user ? (
        authView === "LOGIN" ? (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onGoToRegister={() => setAuthView("REGISTER")}
            onResetOnboarding={async () => {
              await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
              setShowOnboarding(true);
            }}
          />
        ) : (
          <RegisterScreen
            onRegisterSuccess={() => setAuthView("LOGIN")}
            onGoToLogin={() => setAuthView("LOGIN")}
          />
        )
      ) : (
        <View style={styles.mainShell}>
          {/* Active Tab Screen (5 web-parity tabs, no duplicate HeaderBar) */}
          <View
            style={[
              styles.screenViewport,
              activeTab !== "home" && { paddingTop: insets.top },
            ]}
          >
            {activeTab === "home" && (
              <DashboardScreen
                user={user}
                profile={profile}
                onOpenScan={() => setShowScanModal(true)}
                onOpenShareRide={() => setShowShareModal(true)}
                onOpenSos={() => setShowSosModal(true)}
                onOpenProfile={() => setActiveTab("profile")}
                onOpenTour={() => setShowOnboarding(true)}
                onNavigateToFeedback={handleNavigateToFeedback}
              />
            )}
            {activeTab === "lostfound" && <LostFoundScreen />}
            {activeTab === "rewards" && (
              <RewardsScreen
                onOpenReceiptScan={() => setShowReceiptScanModal(true)}
              />
            )}
            {activeTab === "feedback" && (
              <FeedbackScreen
                initialTrip={feedbackTargetTrip}
                onFeedbackComplete={() => {
                  setFeedbackTargetTrip(null);
                  setActiveTab("home");
                }}
              />
            )}
            {activeTab === "profile" && (
              <ProfileScreen
                onLogout={handleLogout}
                onOpenTour={() => setShowOnboarding(true)}
              />
            )}
          </View>

          {/* Bottom Navigation (5 tabs matching web layout) */}
          <CommuterBottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            rewardsBadge={unreadAnnouncements + availableVouchers}
            lostFoundBadge={lostFoundBadge}
          />

          {/* Global Modals matching web dashboard */}
          <QrScannerModal
            visible={showScanModal}
            onClose={() => setShowScanModal(false)}
          />

          <ReceiptScanModal
            visible={showReceiptScanModal}
            onClose={() => setShowReceiptScanModal(false)}
            onClaimed={fetchUnreadCount}
          />

          <SosModal
            visible={showSosModal}
            onClose={() => setShowSosModal(false)}
          />

          <ShareRideModal
            visible={showShareModal}
            onClose={() => setShowShareModal(false)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: "#050F1A",
    alignItems: "center",
    justifyContent: "center",
  },
  appContainer: {
    flex: 1,
    backgroundColor: "#050F1A",
  },
  mainShell: {
    flex: 1,
  },
  screenViewport: {
    flex: 1,
  },
});
