import type { Likey } from "./api";
import { formatLocation } from "./formatLocation";

// Exactly one of business/mediaItem is set on a Likey — these read whichever
// one is there so screens don't have to branch themselves.
export function subjectName(item: Pick<Likey, "business" | "mediaItem">): string {
  return item.business?.name ?? item.mediaItem?.title ?? "";
}

export function subjectLine(item: Pick<Likey, "business" | "mediaItem">): string {
  if (item.business) {
    const location = formatLocation(item.business.city, item.business.state);
    return `${item.business.category}${location ? ` · ${location}` : ""}`;
  }
  if (item.mediaItem) {
    const details = [item.mediaItem.creator, item.mediaItem.year].filter(Boolean).join(", ");
    return `${item.mediaItem.type}${details ? ` · ${details}` : ""}`;
  }
  return "";
}
