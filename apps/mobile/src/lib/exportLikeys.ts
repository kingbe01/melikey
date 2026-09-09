import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { LikeyCategory } from "./api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export type ExportScope = "mine" | "friends" | "both";

// No native "Downloads" folder in a bare RN app — fetch the generated .xlsx,
// write it to a local file, then hand it to the OS share sheet (AirDrop,
// Files, email, etc.) so the user can actually keep it somewhere. Uses plain
// fetch (not the new File.createDownloadTask, which doesn't expose the HTTP
// status) so a validation error can be reported instead of "downloaded" as
// a corrupt spreadsheet.
export async function exportLikeys(
  token: string,
  scope: ExportScope,
  categories: LikeyCategory[]
): Promise<void> {
  const params = new URLSearchParams({ scope });
  if (categories.length > 0) params.set("categories", categories.join(","));

  let res: Response;
  try {
    res = await fetch(`${API_URL}/export/likeys?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Couldn't connect. Check your internet connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.error === "string" ? body.error : "Export failed");
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  const file = new File(Paths.cache, `melikey-export-${Date.now()}.xlsx`);
  file.write(bytes);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing isn't available on this device");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Export Likeys",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
