import type { Business, Likey, LikeyTier, MediaItem, MyLikeysSort } from "./api";

// Groups by whichever subject a Likey points to — a place (Business) or a
// book/movie/TV show (MediaItem). Exactly one of business/mediaItem is set,
// mirroring Likey itself.
export interface LikeyGroup {
  key: string;
  business: Business | null;
  mediaItem: MediaItem | null;
  items: Likey[];
}

const TIER_RANK: Record<LikeyTier, number> = { LIKED: 0, FINE: 1, DISLIKED: 2 };

function subjectKey(likey: Likey): string {
  return likey.business?.id ?? likey.mediaItem!.id;
}

function subjectName(group: LikeyGroup): string {
  return group.business?.name ?? group.mediaItem?.title ?? "";
}

// One listing per subject, most-recent visit first within it; `sort`
// picks which listing surfaces first, not the order of visits inside it.
export function groupLikeysByPlace(likeys: Likey[], sort: MyLikeysSort): LikeyGroup[] {
  const byKey = new Map<string, LikeyGroup>();
  for (const likey of likeys) {
    const key = subjectKey(likey);
    if (!byKey.has(key)) byKey.set(key, { key, business: likey.business, mediaItem: likey.mediaItem, items: [] });
    byKey.get(key)!.items.push(likey);
  }

  const result = Array.from(byKey.values()).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }));

  const mostRecentTime = (g: LikeyGroup) => new Date(g.items[0].createdAt).getTime();
  const oldestTime = (g: LikeyGroup) => new Date(g.items[g.items.length - 1].createdAt).getTime();
  const bestTierRank = (g: LikeyGroup) => Math.min(...g.items.map((i) => TIER_RANK[i.tier]));

  switch (sort) {
    case "oldest":
      result.sort((a, b) => oldestTime(a) - oldestTime(b));
      break;
    case "tier":
      result.sort((a, b) => bestTierRank(a) - bestTierRank(b) || mostRecentTime(b) - mostRecentTime(a));
      break;
    case "business":
      result.sort((a, b) => subjectName(a).localeCompare(subjectName(b)));
      break;
    default:
      result.sort((a, b) => mostRecentTime(b) - mostRecentTime(a));
  }
  return result;
}
