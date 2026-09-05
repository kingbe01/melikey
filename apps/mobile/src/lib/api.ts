const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Route validation errors come back as either a plain string (our own
// checks) or a Zod .flatten() object ({formErrors, fieldErrors}) — pull the
// first human-readable message out of either shape.
function extractErrorMessage(body: unknown, fallback: string): string {
  const error = (body as { error?: unknown } | null)?.error;
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const flat = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const first = [...(flat.formErrors ?? []), ...Object.values(flat.fieldErrors ?? {}).flat()][0];
    if (typeof first === "string") return first;
  }

  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(extractErrorMessage(body, res.statusText), res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface FollowRequest {
  id: string;
}

export type BusinessCategory = "restaurant" | "entertainment";

export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceMiles?: number;
  externalPlaceId?: string;
}

// A "suggestion:"-prefixed id marks a Places suggestion that isn't a saved
// Business yet — selecting one must go through createBusiness first.
export const PLACE_SUGGESTION_PREFIX = "suggestion:";

export type LikeyTier = "LIKED" | "FINE" | "DISLIKED";
export type MyLikeysSort = "recent" | "oldest" | "tier" | "business";

export interface Likey {
  id: string;
  tier: LikeyTier;
  comment: string | null;
  photoUrl: string | null;
  createdAt: string;
  business: Business;
}

export interface FeedItem {
  id: string;
  tier: LikeyTier;
  comment: string | null;
  photoUrl: string | null;
  createdAt: string;
  authorUsername: string;
  businessId: string;
  businessName: string;
  businessCategory: BusinessCategory;
  businessAddress: string | null;
  latitude: number;
  longitude: number;
  distanceMiles: number;
}

export interface IncomingFollowRequest extends FollowRequest {
  follower: AuthUser;
}

export interface OutgoingFollowRequest extends FollowRequest {
  followee: AuthUser;
}

export const api = {
  signup: (email: string, username: string, password: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) => request<{ user: AuthUser }>("/auth/me", { token }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, password: string) =>
    request<AuthResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code, password }),
    }),

  searchUsers: (token: string, q: string) =>
    request<{ users: AuthUser[] }>(`/users/search?q=${encodeURIComponent(q)}`, { token }),

  sendFollowRequest: (token: string, followeeId: string) =>
    request<{ follow: FollowRequest }>("/follows/requests", {
      method: "POST",
      token,
      body: JSON.stringify({ followeeId }),
    }),

  incomingRequests: (token: string) =>
    request<{ requests: IncomingFollowRequest[] }>("/follows/requests/incoming", { token }),

  outgoingRequests: (token: string) =>
    request<{ requests: OutgoingFollowRequest[] }>("/follows/requests/outgoing", { token }),

  approveRequest: (token: string, id: string) =>
    request(`/follows/requests/${id}/approve`, { method: "POST", token }),

  denyRequest: (token: string, id: string) =>
    request(`/follows/requests/${id}/deny`, { method: "POST", token }),

  nearbyBusinesses: (token: string, lat: number, lng: number) =>
    request<{ businesses: Business[] }>(
      `/businesses/nearby?lat=${lat}&lng=${lng}`,
      { token }
    ),

  createBusiness: (
    token: string,
    data: {
      name: string;
      category: BusinessCategory;
      latitude: number;
      longitude: number;
      externalPlaceId?: string;
    }
  ) =>
    request<{ business: Business }>("/businesses", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  createLikey: (
    token: string,
    data: { businessId: string; tier: LikeyTier; comment?: string; photoBase64?: string }
  ) =>
    request<{ likey: Likey }>("/likeys", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  feed: (token: string, lat: number, lng: number) =>
    request<{ feed: FeedItem[] }>(`/feed?lat=${lat}&lng=${lng}`, { token }),

  following: (token: string) => request<{ following: AuthUser[] }>("/follows/following", { token }),

  followers: (token: string) => request<{ followers: AuthUser[] }>("/follows/followers", { token }),

  userLikeys: (token: string, userId: string) =>
    request<{ likeys: Likey[] }>(`/likeys/user/${userId}`, { token }),

  myLikeys: (
    token: string,
    filters: { q?: string; category?: BusinessCategory; tier?: LikeyTier; sort?: MyLikeysSort } = {}
  ) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.tier) params.set("tier", filters.tier);
    if (filters.sort) params.set("sort", filters.sort);
    const qs = params.toString();
    return request<{ likeys: Likey[] }>(`/likeys/mine${qs ? `?${qs}` : ""}`, { token });
  },

  updateLikey: (
    token: string,
    id: string,
    data: { tier?: LikeyTier; comment?: string | null; photoBase64?: string | null }
  ) =>
    request<{ likey: Likey }>(`/likeys/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  deleteLikey: (token: string, id: string) =>
    request<void>(`/likeys/${id}`, { method: "DELETE", token }),
};
