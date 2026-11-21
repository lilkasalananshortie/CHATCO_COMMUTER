import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { setMaintenanceHandler } from "../../core/api/api-client";
import { DEFAULT_MAINTENANCE_MESSAGE, getCommuterMaintenance } from "../../core/api/system-status";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { foregroundPoll } from "../foreground-poll";
import { MaintenanceScreen } from "./MaintenanceScreen";

const FIRST_CHECK_WAIT_MS = 3000;
const NORMAL_CHECK_MS = 60_000;
const MAINTENANCE_CHECK_MS = 20_000;

/** Replaces the app during maintenance. A failed status check leaves it usable. */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { colors } = useCommuterTheme();
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MAINTENANCE_MESSAGE);
  const [checking, setChecking] = useState(false);
  const [stillActive, setStillActive] = useState(false);
  // A refusal newer than a running status read must win over its older answer.
  const generation = useRef(0);

  /** Null means the answer is unknown, so the current screen stays as it is. */
  const check = useCallback(async (): Promise<boolean | null> => {
    const current = ++generation.current;
    try {
      const status = await getCommuterMaintenance();
      if (current !== generation.current) return null;
      setActive(status.active);
      setMessage(status.message);
      return status.active;
    } catch {
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => setMaintenanceHandler((next) => {
    generation.current++;
    setActive(true);
    setReady(true);
    if (next.trim()) setMessage(next.trim());
  }), []);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), FIRST_CHECK_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setStillActive(false);
    const poll = foregroundPoll(async () => { await check(); }, active ? MAINTENANCE_CHECK_MS : NORMAL_CHECK_MS);
    return () => poll.stop();
  }, [active, check]);

  const checkAgain = async () => {
    setChecking(true);
    setStillActive(false);
    try {
      setStillActive((await check()) !== false);
    } finally {
      setChecking(false);
    }
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (active) return <MaintenanceScreen message={message} checking={checking} stillActive={stillActive} onCheck={() => void checkAgain()} />;
  return <>{children}</>;
}
