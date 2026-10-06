import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const requireCommercial = vi.fn();
vi.mock('@/lib/api-guard', () => ({ requireCommercial: (...a: unknown[]) => requireCommercial(...a) }));

import { commercialListProxy } from '@/features/commercial/server/proxy';
import { dayKey, dayLabel, fmtClock, initials, roleLabel, MAX_MESSAGE_LENGTH, QUICK_REPLIES } from '@/features/commercial/ui/format';

describe('liste commerciale : recherche et filtre par rôle', () => {
  beforeEach(() => {
    process.env.LADINI_BACKEND_URL = 'http://backend:8000';
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    requireCommercial.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('transmet q et role (liste blanche) et rien d autre', async () => {
    requireCommercial.mockResolvedValue({ error: null, user: { id: 'c-1', role: 'COMMERCIAL' } });
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    await commercialListProxy(new NextRequest('http://localhost/api/admin/commercial/conversations?q=awa&role=BUYER&filter=all&evil=1'));
    expect(f.mock.calls[0][0]).toBe('http://backend:8000/internal/commercial/conversations?filter=all&q=awa&role=BUYER');
  });
});

describe('format commercial', () => {
  it('roleLabel : libellés français, repli sur la valeur brute', () => {
    expect(roleLabel('PRODUCER')).toBe('Producteur');
    expect(roleLabel('BUYER')).toBe('Acheteur');
    expect(roleLabel('AUTRE')).toBe('AUTRE');
    expect(roleLabel(null)).toBe('Rôle inconnu');
  });

  it('initials', () => {
    expect(initials('Awa Traoré')).toBe('AT');
    expect(initials('Jean')).toBe('J');
    expect(initials(null)).toBe('?');
  });

  it('dayLabel : aujourd hui / hier / date', () => {
    const now = new Date(2026, 9, 6, 12, 0, 0);
    expect(dayLabel(new Date(2026, 9, 6, 8, 0, 0).toISOString(), now)).toBe("Aujourd'hui");
    expect(dayLabel(new Date(2026, 9, 5, 23, 0, 0).toISOString(), now)).toBe('Hier');
    expect(dayLabel(new Date(2026, 9, 1, 9, 0, 0).toISOString(), now)).toMatch(/1.+octobre/);
  });

  it('dayKey sépare deux jours, fmtClock tolère une valeur invalide', () => {
    expect(dayKey(new Date(2026, 9, 6, 1).toISOString())).not.toBe(dayKey(new Date(2026, 9, 7, 1).toISOString()));
    expect(fmtClock('pas une date')).toBe('');
    expect(fmtClock(null)).toBe('');
  });

  it('suggestions : toutes sous la limite du backend', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(2000);
    expect(QUICK_REPLIES.every((q) => q.length > 10 && q.length < MAX_MESSAGE_LENGTH)).toBe(true);
  });
});
