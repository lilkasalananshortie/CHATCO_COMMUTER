import { useEffect, useState } from "react";
import { request } from "../../core/api/api-client";
import { appStorage } from "../../core/storage/app-storage";
import { ROUTE_POINTS } from "./route-data";
import { coordinatesMatch, routeCoordinates } from "./published-route";
import { foregroundPoll } from "../../shared/foreground-poll";
const KEY = "chatco_commuter_published_route_v1";

export function usePublishedRoute() {
  const [coordinates, setCoordinates] = useState(() => routeCoordinates(ROUTE_POINTS));
  const [source, setSource] = useState<"backend" | "cached" | "fallback">("fallback");
  useEffect(() => {
    let active = true;
    let running = false;
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const route = await request<{ coordinates: unknown; version?: unknown }>("/mobile/routes/active");
        const next = routeCoordinates(route.coordinates);
        if (!next.length) throw new Error("Invalid published route");
        if (active) { setCoordinates(current => coordinatesMatch(current, next) ? current : next); setSource("backend"); }
        await appStorage.setItem(KEY, JSON.stringify({ at: Date.now(), coordinates: next, version: route.version }));
      } catch {
        if (active) setSource(previous => previous === "backend" ? "cached" : previous);
      }
      finally { running = false; }
    };
    const initialize = (async () => {
      try {
        const raw = await appStorage.getItem(KEY);
        const cached = raw ? JSON.parse(raw) : null;
        const next = routeCoordinates(cached?.coordinates);
        if (active && next.length && cached.at <= Date.now() && Date.now() - cached.at < 86400000) {
          setCoordinates(next); setSource("cached");
        }
      } catch { /* A cache failure does not remove the bundled fallback. */ }
    })();
    const poll = foregroundPoll(async () => { await initialize; if (active) await load(); }, 60000);
    return () => { active = false; poll.stop(); };
  }, []);
  return { coordinates, source };
}
