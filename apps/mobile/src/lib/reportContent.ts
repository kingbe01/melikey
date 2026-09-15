import { Alert } from "react-native";
import { api, type ReportReason, type ReportTargetType } from "./api";

const REASONS: { label: string; value: ReportReason }[] = [
  { label: "Spam", value: "SPAM" },
  { label: "Harassment or abuse", value: "HARASSMENT" },
  { label: "Inappropriate content", value: "INAPPROPRIATE" },
  { label: "Other", value: "OTHER" },
];

// Shared across every screen that shows a Likey card (Home Feed,
// FriendLikeysView, LikeyDetailScreen) so the reporting flow — and its
// wording — stays identical no matter where it's triggered from.
export function promptReport(token: string, targetType: ReportTargetType, targetId: string): void {
  Alert.alert(
    targetType === "LIKEY" ? "Report this Likey" : "Report this user",
    "Why are you reporting this?",
    [
      ...REASONS.map((r) => ({
        text: r.label,
        onPress: () => {
          api
            .report(token, { targetType, targetId, reason: r.value })
            .then(() => Alert.alert("Thanks", "We've received your report and will take a look."))
            .catch((e) => Alert.alert("Couldn't send report", e instanceof Error ? e.message : "Try again later"));
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]
  );
}
