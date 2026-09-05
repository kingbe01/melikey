export function formatLocation(city: string | null, state: string | null): string | null {
  if (city && state) return `${city}, ${state}`;
  return city || state || null;
}
