import type { Business, Likey, LikeyTier, MyLikeysSort } from "./api";

export interface BusinessGroup {
  business: Business;
  items: Likey[];
}

const TIER_RANK: Record<LikeyTier, number> = { LIKED: 0, FINE: 1, DISLIKED: 2 };

// One listing per business, most-recent visit first within it; `sort`
// picks which listing surfaces first, not the order of visits inside it.
export function groupLikeysByPlace(likeys: Likey[], sort: MyLikeysSort): BusinessGroup[] {
  const byBusiness = new Map<string, BusinessGroup>();
  for (const likey of likeys) {
    const key = likey.business.id;
    if (!byBusiness.has(key)) byBusiness.set(key, { business: likey.business, items: [] });
    byBusiness.get(key)!.items.push(likey);
  }

  const result = Array.from(byBusiness.values()).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }));

  const mostRecentTime = (g: BusinessGroup) => new Date(g.items[0].createdAt).getTime();
  const oldestTime = (g: BusinessGroup) => new Date(g.items[g.items.length - 1].createdAt).getTime();
  const bestTierRank = (g: BusinessGroup) => Math.min(...g.items.map((i) => TIER_RANK[i.tier]));

  switch (sort) {
    case "oldest":
      result.sort((a, b) => oldestTime(a) - oldestTime(b));
      break;
    case "tier":
      result.sort((a, b) => bestTierRank(a) - bestTierRank(b) || mostRecentTime(b) - mostRecentTime(a));
      break;
    case "business":
      result.sort((a, b) => a.business.name.localeCompare(b.business.name));
      break;
    default:
      result.sort((a, b) => mostRecentTime(b) - mostRecentTime(a));
  }
  return result;
}
