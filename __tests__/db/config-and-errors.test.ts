// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveDbConfig, redactSecrets } from '@/src/db/config';
import { classifyDbError, DbOpTimeoutError, OptimisticConflictError, retryAfterSeconds } from '@/lib/db-errors';

const pgError = (code: string, message = 'pg') => Object.assign(new Error(message), { code });
const wrapped = (inner: Error) => Object.assign(new Error('Failed query: select ... params: secret'), { cause: inner });

describe('pool config', () => {
  it('long-running : budget 10 = 7 métier + 3 auth, connexions gardées au chaud', () => {
    const c = resolveDbConfig({});
    expect(c.mode).toBe('long-running');
    expect(c.business.max + c.auth.max).toBe(10);
    expect(c.auth.max).toBe(3);
    expect(c.idleTimeoutSec).toBeGreaterThanOrEqual(60);
    expect(c.maxLifetimeSec).toBeGreaterThanOrEqual(600);
    expect(c.connectTimeoutSec).toBe(5);
  });
  it('serverless (VERCEL) : pool minuscule, idle court', () => {
    const c = resolveDbConfig({ VERCEL: '1' });
    expect(c.mode).toBe('serverless');
    expect(c.business.max + c.auth.max).toBe(4);
    expect(c.idleTimeoutSec).toBeLessThanOrEqual(30);
  });
  it('budgets de temps : auth strict, pas de timeout universel à 30 s', () => {
    const c = resolveDbConfig({});
    expect(c.auth.statementTimeoutMs).toBeLessThan(c.business.statementTimeoutMs);
    expect(c.auth.opTimeoutMs).toBeLessThanOrEqual(5000);
    expect(c.business.opTimeoutMs).toBeLessThanOrEqual(15000);
    expect(c.business.statementTimeoutMs).toBeLessThan(30000);
  });
  it('budget théorique = pool × instances ; valeurs invalides ignorées', () => {
    const c = resolveDbConfig({ DB_POOL_MAX: '8', DB_SITE_INSTANCES: '3', DB_AUTH_POOL_MAX: 'abc' });
    expect(c.theoreticalSiteConnections).toBe(24);
    expect(c.business.max + c.auth.max).toBe(8);
  });
  it('le pool auth ne peut jamais absorber tout le pool', () => {
    const c = resolveDbConfig({ DB_POOL_MAX: '3', DB_AUTH_POOL_MAX: '50' });
    expect(c.business.max).toBeGreaterThanOrEqual(1);
  });
});

describe('aucune fuite de secrets', () => {
  it('redactSecrets retire URL de connexion et mots de passe', () => {
    const url = 'postgres://user:S3cretPass@host.rds.amazonaws.com:5432/db?sslmode=require';
    const out = redactSecrets(`connect failed ${url} password=S3cretPass token: abc123`);
    expect(out).not.toContain('S3cretPass');
    expect(out).not.toContain('host.rds.amazonaws.com');
    expect(out).not.toContain('abc123');
  });
});

describe('classification des erreurs (y compris dans cause)', () => {
  it('connexion refusée / reset / socket fermé → transitoire ET rejouable', () => {
    for (const code of ['ECONNREFUSED', 'ECONNRESET', 'CONNECTION_CLOSED', 'CONNECT_TIMEOUT', '08006', '57P01']) {
      const i = classifyDbError(wrapped(pgError(code)));
      expect(i.errorClass, code).toBe('connection');
      expect(i.retryable, code).toBe(true);
      expect(i.status).toBe(503);
    }
  });
  it('timeout SQL (57014) → transitoire mais JAMAIS rejouable', () => {
    const i = classifyDbError(wrapped(pgError('57014')));
    expect(i).toMatchObject({ errorClass: 'statement_timeout', transient: true, retryable: false, status: 503 });
  });
  it('timeout d\'appel côté site → 503, non rejouable', () => {
    expect(classifyDbError(new DbOpTimeoutError('x', 100))).toMatchObject({ transient: true, retryable: false, status: 503 });
  });
  it('unicité / FK → 409 ; autre contrainte → 422 ; conflit optimiste → 409', () => {
    expect(classifyDbError(wrapped(pgError('23505'))).status).toBe(409);
    expect(classifyDbError(wrapped(pgError('23503'))).status).toBe(409);
    expect(classifyDbError(wrapped(pgError('23502'))).status).toBe(422);
    expect(classifyDbError(new OptimisticConflictError('product')).status).toBe(409);
  });
  it('SQL invalide / bug → 500 non transitoire (jamais masqué en 503)', () => {
    const i = classifyDbError(wrapped(pgError('42601')));
    expect(i).toMatchObject({ errorClass: 'logic', transient: false, retryable: false, status: 500 });
    expect(classifyDbError(new Error('boom')).status).toBe(500);
  });
  it('surcharge / verrous → 503 non rejouable, Retry-After adapté', () => {
    expect(classifyDbError(pgError('53300'))).toMatchObject({ errorClass: 'overload', retryable: false, status: 503 });
    expect(classifyDbError(pgError('40P01')).retryable).toBe(false);
    expect(retryAfterSeconds(classifyDbError(pgError('53300')))).toBeGreaterThan(retryAfterSeconds(classifyDbError(pgError('ECONNRESET'))));
  });
});
