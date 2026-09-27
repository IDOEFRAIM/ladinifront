// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/src/db', () => ({
  dbConfig: { queueFactor: 12, business: { max: 7, opTimeoutMs: 12000 }, auth: { max: 3, opTimeoutMs: 5000 } },
  dbCounters: { connectionsClosed: 0 },
}));

import { dbOp, getDbMetrics, resetDbMetrics, runWithRequestId } from '@/lib/db-observe';

const pgErr = (code: string) => Object.assign(new Error('x'), { code });
let warn: ReturnType<typeof vi.spyOn>;
let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  resetDbMetrics();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
});
afterEach(() => { warn.mockRestore(); info.mockRestore(); });

const READ = { category: 'interactive' as const, kind: 'read' as const };

describe('dbOp — retries', () => {
  it('DB disponible : 1 tentative, pas de retry', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(dbOp('t.ok', READ, fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getDbMetrics().db_retry_total).toBe(0);
  });
  it('connection reset sur lecture : UN seul retry puis succès', async () => {
    const fn = vi.fn().mockRejectedValueOnce(pgErr('ECONNRESET')).mockResolvedValue('ok');
    await expect(dbOp('t.reset', READ, fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(getDbMetrics().db_retry_total).toBe(1);
    expect(getDbMetrics().db_connection_error_total).toBe(1);
  });
  it('connexion refusée persistante : 2 tentatives maximum, jamais plus', async () => {
    const fn = vi.fn().mockRejectedValue(pgErr('ECONNREFUSED'));
    await expect(dbOp('t.refused', READ, fn)).rejects.toMatchObject({ code: 'ECONNREFUSED' });
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('timeout SQL (57014) : AUCUN retry', async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error('Failed query'), { cause: pgErr('57014') }));
    await expect(dbOp('t.stmt', READ, fn)).rejects.toBeDefined();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getDbMetrics().db_query_timeout_total).toBe(1);
  });
  it('erreur logique / unicité : AUCUN retry', async () => {
    for (const code of ['42601', '23505']) {
      const fn = vi.fn().mockRejectedValue(pgErr(code));
      await expect(dbOp(`t.${code}`, READ, fn)).rejects.toBeDefined();
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });
  it('ÉCRITURE : aucun retry automatique, même sur connection reset', async () => {
    const fn = vi.fn().mockRejectedValue(pgErr('ECONNRESET'));
    await expect(dbOp('t.write', { category: 'interactive', kind: 'write' }, fn)).rejects.toBeDefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('écriture explicitement idempotente : 1 retry autorisé', async () => {
    const fn = vi.fn().mockRejectedValueOnce(pgErr('ECONNRESET')).mockResolvedValue('ok');
    await expect(dbOp('t.idem', { category: 'interactive', kind: 'write', idempotent: true }, fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('dbOp — budgets de temps', () => {
  it('acquisition de pool bloquée : timeout au budget, pas après 30 s', async () => {
    const t0 = Date.now();
    const never = () => new Promise<never>(() => undefined);
    await expect(dbOp('t.hang', { ...READ, timeoutMs: 120 }, never)).rejects.toMatchObject({ code: 'DB_OP_TIMEOUT' });
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(getDbMetrics().db_query_timeout_total).toBe(1);
  });
  it('file saturée → délestage immédiat en 503 (overload), pas d attente qui gonfle', async () => {
    const { dbConfig } = await import('@/src/db');
    const limit = dbConfig.auth.max * dbConfig.queueFactor;
    const hang = () => new Promise<never>(() => undefined);
    const held = Array.from({ length: limit }, (_, i) => dbOp(`t.q${i}`, { category: 'auth', timeoutMs: 400 }, hang).catch(() => undefined));
    const t0 = Date.now();
    await expect(dbOp('t.shed', { category: 'auth' }, async () => 'x')).rejects.toMatchObject({ code: 'DB_QUEUE_FULL' });
    expect(Date.now() - t0).toBeLessThan(100);
    expect(getDbMetrics().db_errors_by_class.overload).toBe(1);
    await Promise.all(held);
  });
  it('le budget auth est plus court que le budget métier', async () => {
    const { dbConfig } = await import('@/src/db');
    expect(dbConfig.auth.opTimeoutMs).toBeLessThan(dbConfig.business.opTimeoutMs);
  });
});

describe('dbOp — observabilité', () => {
  it('métriques : percentiles, actifs, attente jamais négatifs', async () => {
    for (let i = 0; i < 5; i++) await dbOp('t.metric', READ, async () => 1);
    const m = getDbMetrics();
    expect(m.db_query_duration_ms['t.metric'].count).toBe(5);
    expect(m.db_pool_active).toBe(0);
    expect(m.db_pool_waiting).toBe(0);
  });
  it('log structuré : operation_name, error_class, request_id ; aucun secret', async () => {
    const secret = 'postgres://user:TopSecret@db.example.com/x';
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error(`boom ${secret}`), { code: '42601' }));
    await runWithRequestId('req-123', () => dbOp('t.log', READ, fn)).catch(() => undefined);
    const line = warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(line).toContain('"operation_name":"t.log"');
    expect(line).toContain('"error_class":"logic"');
    expect(line).toContain('"request_id":"req-123"');
    expect(line).not.toContain('TopSecret');
    expect(line).not.toContain('db.example.com');
  });
});
