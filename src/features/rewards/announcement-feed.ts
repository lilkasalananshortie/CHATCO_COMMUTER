import type { Announcement } from "../../core/domain/types";

/** Add a later page, skipping rows that shifted over when a new update arrived. */
export function appendAnnouncementPage(current: Announcement[], page: Announcement[]): Announcement[] {
  const known = new Set(current.map(item => item.id));
  return [...current, ...page.filter(item => !known.has(item.id))];
}

/** Refresh page 1 without dropping the older pages the commuter already opened. */
export function mergeFirstAnnouncementPage(current: Announcement[], firstPage: Announcement[], loadedPages: number): Announcement[] {
  if (loadedPages <= 1) return firstPage;
  const fresh = new Set(firstPage.map(item => item.id));
  return [...firstPage, ...current.filter(item => !fresh.has(item.id))];
}
