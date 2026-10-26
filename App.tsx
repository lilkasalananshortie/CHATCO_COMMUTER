import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Animated, Easing, Modal } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemeProvider } from "./src/core/theme/ThemeProvider";
import { commuterColors } from "./src/core/theme/colors";
import { authService } from "./src/core/api/auth-service";
import { setSessionEndedHandler } from "./src/core/api/api-client";
import { commuterService } from "./src/core/api/commuter-service";
import type { User, CommuterProfile, CommuterTab, Trip } from "./src/core/domain/types";

// UI Components
import { CommuterBottomNav } from "./src/shared/ui/CommuterBottomNav";

// Screens (6 commuter tabs + Onboarding + Splash)
import { SplashScreen } from "./src/features/splash/SplashScreen";
import { OnboardingScreen, ONBOARDING_STORAGE_KEY } from "./src/features/onboarding/OnboardingScreen";
import { LoginScreen } from "./src/features/auth/LoginScreen";
import { RegisterScreen } from "./src/features/auth/RegisterScreen";
import { SetNewPasswordScreen } from "./src/features/auth/SetNewPasswordScreen";
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
import { MascotErrorBoundary } from "./src/shared/ui/MascotErrorBoundary";
import { FareScreen } from "./src/features/fare/FareScreen";
import { StudentRenewalScreen } from "./src/features/student-renewal/StudentRenewalScreen";
import { RenewalReminder } from "./src/features/student-renewal/RenewalReminder";
import { useStudentRenewal } from "./src/features/student-renewal/useStudentRenewal";
import { subscribeRewardsChanged } from "./src/core/domain/rewards-events";
import { DiscountApplicationScreen } from "./src/features/discount-application/DiscountApplicationScreen";
import { useDiscountApplication } from "./src/features/discount-application/useDiscountApplication";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="light" />
        <MascotErrorBoundary>
          <MainApp />
        </MascotErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function MainApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const currentUserId = useRef<string | undefined>(undefined);
  const sessionEpoch = useRef(0);
  currentUserId.current = user?.id;
  const [profile, setProfile] = useState<CommuterProfile | null>(null);
  const [authView, setAuthView] = useState<"LOGIN" | "REGISTER">("LOGIN");

  // Navigation state — six commuter tabs, including the fare calculator.
  const [activeTab, setActiveTab] = useState<CommuterTab>("home");
  const [feedbackTargetTrip, setFeedbackTargetTrip] = useState<Trip | null>(null);

  // Smooth Dashboard Entrance Animation upon Login
  const dashboardEntranceAnim = useRef(new Animated.Value(1)).current;

  // Modals & Badges
  const [showScanModal, setShowScanModal] = useState(false);
  const [showReceiptScanModal, setShowReceiptScanModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRenewal, setShowRenewal] = useState(false);
  const [showDiscountApplication, setShowDiscountApplication] = useState(false);
  const operationalUserId = user?.must_change_password ? undefined : user?.id;
  const discountApplication = useDiscountApplication(operationalUserId);
  const renewal = useStudentRenewal(operationalUserId);
  useEffect(() => {
    if (!user || !discountApplication.state || profile?.commuter_type === discountApplication.state.commuter_type) return;
    let cancelled = false;
    const requestedFor = user.id;
    void commuterService.getProfile().then((result) => {
      if (!cancelled && currentUserId.current === requestedFor) setProfile(result.profile);
    }).catch(() => { /* Keep server application state visible; retry on the next refresh. */ });
    return () => { cancelled = true; };
  }, [discountApplication.state, user?.id, profile?.commuter_type]);
  const refreshRenewal = async () => {
    const requestedFor = currentUserId.current;
    await renewal.refresh();
    if (!requestedFor || currentUserId.current !== requestedFor) return;
    try {
      const result = await commuterService.getProfile();
      if (currentUserId.current === requestedFor) setProfile(result.profile);
    } catch { /* Renewal errors remain visible in its own screen. */ }
  };
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [availableVouchers, setAvailableVouchers] = useState(0);
  const [lostFoundBadge, setLostFoundBadge] = useState(0);

  const handleLogout = useCallback(() => {
    sessionEpoch.current++;
    currentUserId.current = undefined;
    setUnreadAnnouncements(0); setAvailableVouchers(0); setLostFoundBadge(0);
    setShowScanModal(false); setShowReceiptScanModal(false); setShowSosModal(false); setShowShareModal(false);
    setShowRenewal(false); setShowDiscountApplication(false); setFeedbackTargetTrip(null);
    setUser(null); setProfile(null); setActiveTab("home"); setAuthView("LOGIN");
  }, []);

  useEffect(() => setSessionEndedHandler(handleLogout), [handleLogout]);

  // Initialize session & onboarding check
  useEffect(() => {
    let cancelled = false;
    const epoch = sessionEpoch.current;
    (async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!onboardingCompleted) {
          setShowOnboarding(true);
        }

        const session = await authService.restoreSession();
        if (!cancelled && epoch === sessionEpoch.current && session) {
          currentUserId.current = session.user.id;
          setUser(session.user);
          if (session.user.must_change_password) return;
          if (session.profile) setProfile(session.profile);
          try {
            const profileData = await commuterService.getProfile();
            if (cancelled || epoch !== sessionEpoch.current) return;
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
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Poll unread announcements count & available vouchers if logged in (matching web layout)
  const fetchUnreadCount = useCallback(async () => {
    if (!user || user.must_change_password) return;
    try {
      const [announcementRes, rewardsRes, claimsRes] = await Promise.allSettled([
        commuterService.getUnreadAnnouncementCount(),
        commuterService.getRewards(),
        commuterService.getMyClaims({ per_page: 10 }),
      ]);
      if (currentUserId.current !== user.id) return;

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

  useEffect(() => subscribeRewardsChanged(() => { void fetchUnreadCount(); }), [fetchUnreadCount]);

  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    const epoch = ++sessionEpoch.current;
    currentUserId.current = loggedInUser.id;
    setProfile(null);
    // Reset to 0 and trigger smooth entrance transition into dashboard
    dashboardEntranceAnim.setValue(0);
    setUser(loggedInUser);
    if (loggedInUser.must_change_password) return;

    Animated.timing(dashboardEntranceAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    commuterService
      .getProfile()
      .then((res: any) => {
        if (epoch !== sessionEpoch.current || currentUserId.current !== loggedInUser.id) return;
        if (res?.profile) {
          setProfile(res.profile);
        } else if (res?.id || res?.commuter_type) {
          setProfile(res);
        }
      })
      .catch(() => {});
  };

  const handleNavigateToFeedback = (trip?: Trip) => {
    setFeedbackTargetTrip(trip ?? null);
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

  if (user?.must_change_password) return <SetNewPasswordScreen onDone={handleLogout} />;

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
        <Animated.View
          style={[
            styles.mainShell,
            {
              opacity: dashboardEntranceAnim.interpolate({
                inputRange: [0, 0.25, 1],
                outputRange: [0, 0.65, 1],
              }),
              transform: [
                {
                  translateX: dashboardEntranceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [75, 0],
                  }),
                },
                {
                  scale: dashboardEntranceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Active tab screen (no duplicate HeaderBar) */}
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
            {activeTab === "fare" && <FareScreen />}
            {activeTab === "rewards" && (
              <RewardsScreen
                onOpenReceiptScan={() => setShowReceiptScanModal(true)}
                onOpenRenewal={() => { setShowRenewal(true); void renewal.refresh(); }}
                renewalState={renewal.state}
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
                onProfileSaved={setProfile}
                onEmailChanged={email => {
                  setUser(previous => previous ? { ...previous, email } : previous);
                  setProfile(previous => previous ? { ...previous, email } : previous);
                }}
                onOpenTour={() => setShowOnboarding(true)}
                serverProfile={profile}
                discountApplicationState={discountApplication.state}
                discountApplicationLoading={discountApplication.loading}
                discountApplicationError={discountApplication.error}
                onOpenDiscountApplication={() => {
                  if (discountApplication.state?.application?.request_type === "RENEWAL") {
                    setShowRenewal(true); void renewal.refresh();
                  } else {
                    setShowDiscountApplication(true); void discountApplication.refresh();
                  }
                }}
              />
            )}
          </View>

          {/* Bottom navigation matching the commuter destinations */}
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
            onPaymentSuccess={fetchUnreadCount}
          />

          <Modal visible={showRenewal} animationType="slide" onRequestClose={() => setShowRenewal(false)}>
            <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: "#050F1A" }}>
              {showRenewal && <StudentRenewalScreen state={renewal.state} loading={renewal.loading} loadError={renewal.error} onRefresh={refreshRenewal} onClose={() => setShowRenewal(false)} />}
            </View>
          </Modal>
          <Modal visible={showDiscountApplication} animationType="slide" onRequestClose={() => setShowDiscountApplication(false)}>
            <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: "#050F1A" }}>
              {showDiscountApplication && <DiscountApplicationScreen key={user.id}
                state={discountApplication.state} loading={discountApplication.loading} loadError={discountApplication.error}
                onRefresh={async () => { await discountApplication.refreshAfterMutation(); await refreshRenewal(); }}
                onClose={() => setShowDiscountApplication(false)}
                onOpenRenewal={() => { setShowDiscountApplication(false); setShowRenewal(true); void renewal.refresh(); }} />}
            </View>
          </Modal>
          <RenewalReminder key={user.id} state={renewal.state} enabled={!showDiscountApplication && !showRenewal && !showScanModal && !showReceiptScanModal && !showSosModal && !showShareModal} onOpen={() => setShowRenewal(true)} onRefresh={renewal.refresh} />

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
        </Animated.View>
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
