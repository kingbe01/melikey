import jwt from "jsonwebtoken";

const ENTERTAINMENT_CATEGORIES = new Set([
  "NightClub",
  "MovieTheater",
  "Museum",
  "AmusementPark",
  "Zoo",
  "Aquarium",
  "Casino",
  "Theater",
  "Stadium",
  "Bowling",
  "Winery",
  "Brewery",
  "Bar",
  "TouristAttraction",
  "ArtGallery",
]);

export interface PlaceSuggestion {
  name: string;
  category: "restaurant" | "entertainment";
  address: string | null;
  latitude: number;
  longitude: number;
  externalPlaceId: string;
  distanceMiles: number;
}

interface AppleSearchResult {
  id: string;
  name?: string;
  coordinate?: { latitude: number; longitude: number };
  formattedAddressLines?: string[];
  poiCategory?: string;
}

interface AppleSearchResponse {
  results?: AppleSearchResult[];
}

interface AppleTokenResponse {
  accessToken: string;
  expiresInSeconds: number;
}

// Haversine, matching the SQL formula in geo.ts — Apple's searchLocation is
// only a ranking bias, not a hard radius cutoff, so we filter ourselves.
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const clamped = Math.min(
    1,
    Math.max(
      -1,
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2) - toRad(lng1)) +
        Math.sin(toRad(lat1)) * Math.sin(toRad(lat2))
    )
  );
  return 3959 * Math.acos(clamped);
}

function categorize(poiCategory: string | undefined): "restaurant" | "entertainment" {
  if (poiCategory && ENTERTAINMENT_CATEGORIES.has(poiCategory)) return "entertainment";
  return "restaurant";
}

// The Maps Server API is a two-step auth: sign a short-lived ES256 JWT with
// our Maps key, exchange it for an access token, then use that token on the
// actual endpoints. Access tokens last ~30min, so cache and reuse.
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

// Stored as base64 of the raw .p8 file — a multi-line PEM pasted through a
// dashboard text field is an easy way to silently lose/mangle newlines;
// base64 has no line breaks or special characters to corrupt in transit.
function decodePrivateKey(base64Key: string): string {
  return Buffer.from(base64Key, "base64").toString("utf8");
}

async function getAccessToken(): Promise<string | null> {
  const teamId = process.env.APPLE_MAPS_TEAM_ID;
  const keyId = process.env.APPLE_MAPS_KEY_ID;
  const rawPrivateKey = process.env.APPLE_MAPS_PRIVATE_KEY;
  if (!teamId || !keyId || !rawPrivateKey) return null;

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token;
  }

  const mapsToken = jwt.sign({}, decodePrivateKey(rawPrivateKey), {
    algorithm: "ES256",
    issuer: teamId,
    expiresIn: "30m",
    keyid: keyId,
  });

  const res = await fetch("https://maps-api.apple.com/v1/token", {
    headers: { Authorization: `Bearer ${mapsToken}` },
  });
  if (!res.ok) {
    console.error("Apple Maps token request failed", res.status, await res.text().catch(() => ""));
    return null;
  }

  const body = (await res.json()) as AppleTokenResponse;
  // Refresh a minute early so we never call search() with an about-to-expire token.
  cachedAccessToken = { token: body.accessToken, expiresAt: Date.now() + (body.expiresInSeconds - 60) * 1000 };
  return cachedAccessToken.token;
}

async function search(
  accessToken: string,
  query: string,
  latitude: number,
  longitude: number
): Promise<AppleSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    searchLocation: `${latitude},${longitude}`,
    limit: "20",
  });

  const res = await fetch(`https://maps-api.apple.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error("Apple Maps search failed", res.status, await res.text().catch(() => ""));
    return [];
  }

  const body = (await res.json()) as AppleSearchResponse;
  return body.results ?? [];
}

// v1 fallback for cold-start areas with nothing logged yet (see routes/businesses.ts).
// Only called when community results are sparse, to keep call volume down.
export async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMiles: number
): Promise<PlaceSuggestion[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const [restaurants, entertainment] = await Promise.all([
    search(accessToken, "restaurant", latitude, longitude),
    search(accessToken, "entertainment", latitude, longitude),
  ]);

  const seen = new Set<string>();
  const results: PlaceSuggestion[] = [];

  for (const place of [...restaurants, ...entertainment]) {
    if (seen.has(place.id) || !place.coordinate || !place.name) continue;
    seen.add(place.id);

    const distance = distanceMiles(latitude, longitude, place.coordinate.latitude, place.coordinate.longitude);
    if (distance > radiusMiles) continue;

    results.push({
      name: place.name,
      category: categorize(place.poiCategory),
      address: place.formattedAddressLines?.join(", ") ?? null,
      latitude: place.coordinate.latitude,
      longitude: place.coordinate.longitude,
      externalPlaceId: place.id,
      distanceMiles: distance,
    });
  }

  return results;
}
