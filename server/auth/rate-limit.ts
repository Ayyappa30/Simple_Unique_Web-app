// Simple in-memory limiter. Per-instance only: use a shared store (e.g. Redis) when running multiple instances.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, max = 8, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function clearRateLimit(key: string) {
  attempts.delete(key);
}
