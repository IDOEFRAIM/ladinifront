import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCachedJson } from '@/hooks/useCachedJson';
import { invalidateClientCache } from '@/lib/client-cache';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ url }: { url: string }) {
  const { data, loading, refreshing, error } = useCachedJson<{ v: number }>(url);
  return <p data-loading={String(loading)} data-refreshing={String(refreshing)} data-error={error ?? ''}>{data ? `v=${data.v}` : 'vide'}</p>;
}

let container: HTMLDivElement;
beforeEach(() => { invalidateClientCache(); container = document.createElement('div'); document.body.appendChild(container); });
afterEach(() => { vi.restoreAllMocks(); container.remove(); });

async function mount(url: string) {
  const root = createRoot(container);
  await act(async () => { root.render(<Probe url={url} />); });
  return root;
}
const text = () => container.querySelector('p')!;

describe('useCachedJson', () => {
  it('1re visite : spinner (loading=true) puis données', async () => {
    let release!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>((r) => { release = r; }));
    const root = createRoot(container);
    await act(async () => { root.render(<Probe url="/api/a" />); });
    expect(text().dataset.loading).toBe('true');
    await act(async () => { release(new Response(JSON.stringify({ v: 1 }))); });
    expect(text().textContent).toBe('v=1');
    expect(text().dataset.loading).toBe('false');
  });

  it('REVISITE : les données précédentes s\'affichent au premier rendu (pas de spinner), puis mise à jour discrète', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ v: 1 })));
    const r1 = await mount('/api/b');
    expect(text().textContent).toBe('v=1');
    await act(async () => { r1.unmount(); });

    // Deuxième visite : le serveur est lent ; l'écran doit montrer v=1 IMMÉDIATEMENT.
    let release!: (r: Response) => void;
    f.mockImplementation(() => new Promise<Response>((r) => { release = r; }));
    const root = createRoot(container);
    await act(async () => { root.render(<Probe url="/api/b" />); });
    expect(text().textContent).toBe('v=1');
    expect(text().dataset.loading).toBe('false');
    expect(text().dataset.refreshing).toBe('true');
    await act(async () => { release(new Response(JSON.stringify({ v: 2 }))); });
    expect(text().textContent).toBe('v=2');
    expect(text().dataset.refreshing).toBe('false');
  });

  it('panne réseau à la revisite : les données déjà affichées ne disparaissent pas', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ v: 7 })));
    const r1 = await mount('/api/c');
    await act(async () => { r1.unmount(); });
    f.mockImplementation(async () => new Response('{}', { status: 503 }));
    await mount('/api/c');
    expect(text().textContent).toBe('v=7');
    expect(text().dataset.error).toContain('503');
  });
});
