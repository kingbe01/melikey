const ENTERTAINMENT_TYPES = new Set([
  "movie_theater",
  "bowling_alley",
  "amusement_center",
  "amusement_park",
  "night_club",
  "casino",
  "tourist_attraction",
  "art_gallery",
  "museum",
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

interface PlacesApiPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
}

interface PlacesApiResponse {
  places?: PlacesApiPlace[];
}

// Haversine, matching the SQL formula in geo.ts so distances agree across sources.
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

function categorize(types: string[] | undefined): "restaurant" | "entertainment" {
  if (types?.some((t) => ENTERTAINMENT_TYPES.has(t))) return "entertainment";
  return "restaurant";
}

async function nearbySearch(
  apiKey: string,
  includedTypes: string[],
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<PlacesApiPlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types",
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude, longitude }, radius: radiusMeters },
      },
    }),
  });

  if (!res.ok) {
    console.error("Places API request failed", res.status, await res.text().catch(() => ""));
    return [];
  }

  const body = (await res.json()) as PlacesApiResponse;
  return body.places ?? [];
}

// v1 fallback for cold-start areas with nothing logged yet (see routes/businesses.ts).
// Only called when community results are sparse, to keep API spend down.
export async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMiles: number
): Promise<PlaceSuggestion[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  const radiusMeters = Math.min(radiusMiles * 1609.34, 50000);

  const [restaurants, entertainment] = await Promise.all([
    nearbySearch(apiKey, ["restaurant"], latitude, longitude, radiusMeters),
    nearbySearch(apiKey, [...ENTERTAINMENT_TYPES], latitude, longitude, radiusMeters),
  ]);

  const seen = new Set<string>();
  const results: PlaceSuggestion[] = [];

  for (const place of [...restaurants, ...entertainment]) {
    if (seen.has(place.id) || !place.location || !place.displayName) continue;
    seen.add(place.id);
    results.push({
      name: place.displayName.text,
      category: categorize(place.types),
      address: place.formattedAddress ?? null,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      externalPlaceId: place.id,
      distanceMiles: distanceMiles(latitude, longitude, place.location.latitude, place.location.longitude),
    });
  }

  return results;
}
