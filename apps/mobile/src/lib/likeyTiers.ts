import { colors } from "../theme/colors";
import type { LikeyTier } from "./api";

export const TIER_LABELS: Record<LikeyTier, string> = {
  LIKED: "Likey",
  FINE: "Soso",
  DISLIKED: "No Likey",
};

export const TIER_COLORS: Record<LikeyTier, string> = {
  LIKED: colors.success,
  FINE: colors.warning,
  DISLIKED: colors.danger,
};
