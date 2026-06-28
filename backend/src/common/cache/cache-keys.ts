/** Centralized Redis cache keys so producers and invalidators never drift. */
export const cacheKeys = {
  coachProfile: (coachId: string) => `coach:${coachId}:profile`,
  categories: (coachId: string) => `coach:${coachId}:categories`,
  exercises: (coachId: string) => `coach:${coachId}:exercises`,
};

export const CACHE_TTL = {
  profile: 300,
  categories: 300,
  exercises: 300,
} as const;
