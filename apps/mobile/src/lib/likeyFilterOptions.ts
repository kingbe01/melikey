import type { BusinessCategory, LikeyTier, MyLikeysSort } from "./api";

export const CATEGORY_FILTERS: { value: BusinessCategory | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "restaurant", label: "Restaurant" },
  { value: "entertainment", label: "Entertainment" },
];

export const TIER_FILTERS: { value: LikeyTier | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "LIKED", label: "Likey" },
  { value: "FINE", label: "Soso" },
  { value: "DISLIKED", label: "No Likey" },
];

export const SORTS: { value: MyLikeysSort; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "oldest", label: "Oldest" },
  { value: "tier", label: "Tier" },
  { value: "business", label: "Place name" },
];
