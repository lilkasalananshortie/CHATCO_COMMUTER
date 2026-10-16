import type { Announcement, RewardProgress } from "../../core/domain/types";

/** Keep empty success separate from failure; never invent usable vouchers offline. */
export async function loadRewardsAndUpdates(source: {
  getRewards: () => Promise<RewardProgress>;
  getAnnouncements: () => Promise<Announcement[]>;
}) {
  const [rewards, announcements] = await Promise.allSettled([
    source.getRewards(), source.getAnnouncements(),
  ]);
  return { rewards, announcements };
}
