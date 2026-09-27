// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJsonDeduped, peekCache, invalidateClientCache, HttpError, CLIENT_CACHE_MAX_AGE_MS } from '@/lib/client-cache';

const okJson = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

beforeEach(() => { invalidateClientCache(); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('client-cache', () => {
  it('dédoublonne : 5 demandes simultanées = 1 seul appel réseau', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okJson({ n: 1 }));
    const results = await Promise.all(Array.from({ length: 5 }, () => fetchJsonDeduped<{ n: number }>('/api/x')));
    expect(f).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.n === 1)).toBe(true);
  });

  it('conserve la dernière réponse : peekCache la renvoie instantanément', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okJson({ a: 1 }));
    expect(peekCache('/api/y')).toBeUndefined();
    await fetchJsonDeduped('/api/y');
    expect(peekCache('/api/y')).toEqual({ a: 1 });
  });

  it('ne sert jamais une donnée plus vieille que la durée maximale', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okJson({ a: 1 }));
    await fetchJsonDeduped('/api/z');
    vi.setSystemTime(Date.now() + CLIENT_CACHE_MAX_AGE_MS + 1000);
    expect(peekCache('/api/z')).toBeUndefined();
  });

  it('une erreur HTTP lève HttpError(status) et ne pollue pas le cache', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 503 }));
    await expect(fetchJsonDeduped('/api/e')).rejects.toMatchObject({ name: 'HttpError', status: 503 });
    expect(peekCache('/api/e')).toBeUndefined();
    expect(new HttpError(500)).toBeInstanceOf(Error);
  });

  it('après un échec, la demande suivante réessaie (pas de promesse figée)', async () => {
    const f = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () => new Response('{}', { status: 500 }))
      .mockImplementationOnce(async () => okJson({ ok: true }));
    await expect(fetchJsonDeduped('/api/r')).rejects.toBeDefined();
    await expect(fetchJsonDeduped('/api/r')).resolves.toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('invalidateClientCache(prefix) ne purge que les clés concernées ; sans argument, tout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okJson({ v: 1 }));
    await fetchJsonDeduped('/api/buyer/dashboard'); await fetchJsonDeduped('/api/zones');
    invalidateClientCache('/api/buyer');
    expect(peekCache('/api/buyer/dashboard')).toBeUndefined();
    expect(peekCache('/api/zones')).toBeDefined();
    invalidateClientCache();
    expect(peekCache('/api/zones')).toBeUndefined();
  });
});
