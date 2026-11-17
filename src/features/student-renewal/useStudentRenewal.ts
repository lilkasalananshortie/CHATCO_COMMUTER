import { useCallback, useEffect, useRef, useState } from "react";
import { studentRenewalService } from "../../core/api/student-renewal-service";
import { commuterService } from "../../core/api/commuter-service";
import { latestRenewalNoticeId, renewalReminderKey } from "./renewal-reminder-state";
import { foregroundPoll } from "../../shared/foreground-poll";
import type { RenewalState } from "./renewal-types";

export function useStudentRenewal(userId?: string) {
  const [state, setState] = useState<RenewalState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const generation = useRef(0);
  const owner = useRef(userId);
  owner.current = userId;
  const poll = useRef<ReturnType<typeof foregroundPoll> | null>(null);
  const load = useCallback(async () => {
    if (!userId || owner.current !== userId) return;
    const request = ++generation.current;
    setLoading(true);
    try {
      const result = await studentRenewalService.state();
      if (generation.current !== request || owner.current !== userId) return;
      let latest: string | null | undefined;
      if (renewalReminderKey(result)) {
        try { latest = latestRenewalNoticeId(await commuterService.getAnnouncements()); }
        catch { /* A notice outage must not prevent an authoritative due reminder. */ }
      }
      if (generation.current === request && owner.current === userId) {
        if (latest !== undefined) setNoticeId(latest);
        setState(result); setError("");
      }
    } catch (e: any) {
      if (generation.current === request && owner.current === userId) {
        setState(null); // Never show stale eligibility or invent a reminder during an outage.
        setError(e.message || "Unable to load student renewal.");
      }
    } finally { if (generation.current === request && owner.current === userId) setLoading(false); }
  }, [userId]);
  const refresh = useCallback(() => poll.current?.refresh(true) ?? load(), [load]);
  useEffect(() => {
    setState(null); setError(""); setLoading(false); setNoticeId(null);
    if (!userId) return;
    const active = foregroundPoll(load, 60000);
    poll.current = active;
    return () => {
      generation.current++;
      active.stop();
      if (poll.current === active) poll.current = null;
    };
  }, [load, userId]);
  return { state, error, loading, refresh, noticeId };
}
