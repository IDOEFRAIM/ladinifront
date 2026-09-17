// Limiteur de débit basique en mémoire, pour protéger les routes publiques
// non authentifiées (catalogue) qui tapent directement le pool DB. Ce n'est
// PAS une protection anti-DoS complète (compteurs perdus au redémarrage, pas
// partagés entre instances/process) — mais ça absorbe l'essentiel des rafales
// d'un même client/bot avant qu'elles n'affament le pool Postgres. Pour une
// vraie protection multi-instance, migrer vers un store partagé (Redis).

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Purge périodique pour éviter une fuite mémoire sous forte charge prolongée.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  { limit = 30, windowMs = 10_000 }: { limit?: number; windowMs?: number } = {}
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
