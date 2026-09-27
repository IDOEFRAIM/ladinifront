// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const created: Array<{ url: string; opts: Record<string, unknown> }> = [];
vi.mock('postgres', () => ({
  default: (url: string, opts: Record<string, unknown>) => { created.push({ url, opts }); return { fake: true }; },
}));
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: () => ({ fakeDb: true, transaction: vi.fn(), query: {} }) }));
vi.mock('@/src/db/schema', () => ({}));

beforeEach(() => {
  created.length = 0;
  delete (globalThis as Record<string, unknown>).__ladini_db__;
  vi.resetModules();
  process.env.DATABASE_URL = 'postgres://user:TopSecret@db.example.com:5432/app?sslmode=require';
});

describe('pool', () => {
  it('crée exactement 2 clients (métier + auth) avec la config attendue', async () => {
    await import('@/src/db');
    expect(created).toHaveLength(2);
    const [biz, auth] = created;
    expect(biz.opts).toMatchObject({ prepare: false, connect_timeout: 5 });
    expect((biz.opts.connection as Record<string, unknown>).statement_timeout).toBe(10000);
    expect((auth.opts.connection as Record<string, unknown>).statement_timeout).toBe(4000);
    expect(biz.url).not.toContain('?'); // query string retirée (hint non compris par le driver)
  });
  it('module évalué DEUX fois (bundles dupliqués) → toujours 2 clients, pas 4', async () => {
    await import('@/src/db');
    vi.resetModules();
    await import('@/src/db');
    expect(created).toHaveLength(2);
  });
  it('le log d\'initialisation ne contient ni URL ni mot de passe', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await import('@/src/db');
    const logged = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('db_pool_init');
    expect(logged).not.toContain('TopSecret');
    expect(logged).not.toContain('db.example.com');
    spy.mockRestore();
  });
});
