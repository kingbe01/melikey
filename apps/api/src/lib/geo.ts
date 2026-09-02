import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface NearbyBusiness {
  id: string;
  name: string;
  category: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceMiles: number;
}

// LEAST/GREATEST clamp guards acos() against NaN from floating-point rounding
// pushing its argument a hair outside [-1, 1] (a classic Haversine-in-SQL bug).
export async function findNearbyBusinesses(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  limit = 20
): Promise<NearbyBusiness[]> {
  return prisma.$queryRaw<NearbyBusiness[]>`
    SELECT * FROM (
      SELECT
        id, name, category, address, latitude, longitude,
        (3959 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude}))
            + sin(radians(${latitude})) * sin(radians(latitude))
          ))
        )) AS "distanceMiles"
      FROM "Business"
    ) AS sub
    WHERE "distanceMiles" <= ${radiusMiles}
    ORDER BY "distanceMiles" ASC
    LIMIT ${limit}
  `;
}

export interface FeedItem {
  id: string;
  tier: "LIKED" | "FINE" | "DISLIKED";
  comment: string | null;
  photoUrl: string | null;
  createdAt: Date;
  authorUsername: string;
  businessId: string;
  businessName: string;
  businessCategory: string;
  businessAddress: string | null;
  latitude: number;
  longitude: number;
  distanceMiles: number;
}

// Sort = tier first (liked > fine > disliked), recency as tiebreaker within
// tier (per product decisions log), scoped to a single fixed radius for v1.
export async function findFeed(
  followeeIds: string[],
  latitude: number,
  longitude: number,
  radiusMiles: number,
  limit = 50
): Promise<FeedItem[]> {
  if (followeeIds.length === 0) return [];

  return prisma.$queryRaw<FeedItem[]>`
    SELECT
      id, tier, comment, "photoUrl", "createdAt", "authorUsername",
      "businessId", "businessName", "businessCategory", "businessAddress",
      latitude, longitude, "distanceMiles"
    FROM (
      SELECT
        l.id, l.tier, l.comment, l."photoUrl", l."createdAt",
        u.username AS "authorUsername",
        b.id AS "businessId", b.name AS "businessName", b.category AS "businessCategory",
        b.address AS "businessAddress", b.latitude, b.longitude,
        (3959 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians(${latitude})) * cos(radians(b.latitude)) * cos(radians(b.longitude) - radians(${longitude}))
            + sin(radians(${latitude})) * sin(radians(b.latitude))
          ))
        )) AS "distanceMiles",
        CASE l.tier WHEN 'LIKED' THEN 0 WHEN 'FINE' THEN 1 ELSE 2 END AS "tierRank"
      FROM "Likey" l
      JOIN "Business" b ON b.id = l."businessId"
      JOIN "User" u ON u.id = l."userId"
      WHERE l."userId" IN (${Prisma.join(followeeIds)})
    ) AS sub
    WHERE "distanceMiles" <= ${radiusMiles}
    ORDER BY "tierRank" ASC, "createdAt" DESC
    LIMIT ${limit}
  `;
}
