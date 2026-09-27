// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { fetchWithRetry, parseRetryAfter } from '@/lib/client-retry';

const res = (status: number, headers: Record<string, string> = {}) => new Response(null, { status, headers });
const noSleep = () => vi.fn().mockResolvedValue(undefined);

describe('fetchWithRetry', () => {
  it('503 persistant : 1 appel + 2 retries maximum puis renvoie le 503 (pas de boucle infinie)', async () => {
    const f = vi.fn().mockResolvedValue(res(503));
    const sleep = noSleep();
    const out = await fetchWithRetry(f, { maxRetries: 2, sleep });
    expect(out.status).toBe(503);
    expect(f).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
  it('503 puis 200 : un seul retry', async () => {
    const f = vi.fn().mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(200));
    const out = await fetchWithRetry(f, { sleep: noSleep() });
    expect(out.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('429 : respecte Retry-After', async () => {
    const f = vi.fn().mockResolvedValueOnce(res(429, { 'Retry-After': '3' })).mockResolvedValueOnce(res(200));
    const sleep = noSleep();
    await fetchWithRetry(f, { sleep });
    expect(sleep).toHaveBeenCalledWith(3000);
  });
  it('Retry-After abusif plafonné', () => {
    expect(parseRetryAfter('3600', 8000)).toBe(8000);
    expect(parseRetryAfter(null, 8000)).toBeNull();
  });
  it('500 : aucun retry', async () => {
    const f = vi.fn().mockResolvedValue(res(500));
    expect((await fetchWithRetry(f, { sleep: noSleep() })).status).toBe(500);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('401, 403, 409 : rendus tels quels, aucun retry', async () => {
    for (const status of [401, 403, 409]) {
      const f = vi.fn().mockResolvedValue(res(status));
      expect((await fetchWithRetry(f, { sleep: noSleep() })).status).toBe(status);
      expect(f).toHaveBeenCalledTimes(1);
    }
  });
  it('erreur réseau : retry borné puis propage', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('network'));
    await expect(fetchWithRetry(f, { maxRetries: 2, sleep: noSleep() })).rejects.toThrow('network');
    expect(f).toHaveBeenCalledTimes(3);
  });
  it('backoff court et borné (jamais > maxDelay)', async () => {
    const f = vi.fn().mockResolvedValue(res(503));
    const sleep = noSleep();
    await fetchWithRetry(f, { maxRetries: 2, baseDelayMs: 800, maxDelayMs: 2000, sleep });
    for (const [ms] of sleep.mock.calls) expect(ms).toBeLessThanOrEqual(2000 * 1.25);
  });
});
