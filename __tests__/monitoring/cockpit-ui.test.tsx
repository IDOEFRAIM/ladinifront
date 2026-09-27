// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import AdminCockpitPage from '@/features/monitoring/cockpit/ui/AdminCockpitPage';

const OVERVIEW = {
  period: { key: '24h', from: '', to: '' },
  activity: { activeUsers24h: 42, activeUsers7d: 120, conversations: 88, messagesReceived: 1842, messagesSent: 1790, newUsers: 7 },
  understanding: { recognizedTurns: 1731, recognizedRate: 0.94, avgConfidence: 0.88, clarificationRate: 0.06, fallbackRate: 0.02, topIntents: [{ intent: 'SALES_PUBLISH_PRODUCT', count: 300, avgConfidence: 0.9 }], notUnderstood: [{ intent: 'UNKNOWN_INTENT', count: 40 }] },
  execution: { toolCalls: 1300, toolSuccess: 1250, toolErrors: 50, workflowsStarted: 162, workflowsCompleted: 141, workflowsAbandoned: 17 },
  business: { publications: 141, preorders: 72, orders: 90, auctions: 39, bids: 60, payments: 50, deliveries: 20 },
  performance: { p50: 1200, p95: 4800, p99: 9000, previous: { p50: 1000, p95: 4000, p99: 8000 } },
  funnel: [
    { key: 'messages', label: 'Messages reçus', count: 1842, pctOfTotal: 1, pctOfPrevious: null, lost: 0 },
    { key: 'understood', label: 'Intentions comprises', count: 1731, pctOfTotal: 0.94, pctOfPrevious: 0.94, lost: 111 },
    { key: 'workflow', label: 'Workflows démarrés', count: 1420, pctOfTotal: 0.77, pctOfPrevious: 0.82, lost: 311 },
    { key: 'tool', label: 'Outils exécutés', count: 1292, pctOfTotal: 0.7, pctOfPrevious: 0.91, lost: 128 },
    { key: 'mutation', label: 'Actions métier réussies', count: 956, pctOfTotal: 0.52, pctOfPrevious: 0.74, lost: 336 },
    { key: 'sent', label: 'Réponses envoyées', count: 937, pctOfTotal: 0.51, pctOfPrevious: 0.98, lost: 19 },
  ],
  series: [{ bucket: '2026-09-21T00:00:00Z', turns: 10, errors: 1, p95: 4000 }, { bucket: '2026-09-21T01:00:00Z', turns: 20, errors: 0, p95: 3000 }],
  health: { overall: 'DEGRADED', dependencies: [{ key: 'api', label: 'API', state: 'HEALTHY' }, { key: 'bedrock', label: 'Bedrock', state: 'DEGRADED' }] },
};

const CONVERSATIONS = { total: 1, limit: 25, offset: 0, data: [{ id: 'c1', maskedPhone: '+226 •••• 4582', role: 'PRODUCER', intent: 'SALES_PUBLISH_PRODUCT', workflow: 'SALES_PUBLISH_PRODUCT', step: 'ENTER_PRICE', confidence: 0.96, lastMessage: 'Je veux vendre 50 kg de tomates', startedAt: '2026-09-21T10:00:00Z', lastAt: '2026-09-21T10:02:00Z', durationSeconds: 120, turns: 3, toolCalls: 2, status: 'ACTIVE' }] };

const DETAIL = {
  id: 'c1', maskedPhone: '+226 •••• 4582', role: 'PRODUCER',
  turns: [{
    id: 't1', startedAt: '2026-09-21T10:42:01Z', outcome: 'COMPLETED', durationMs: 2340, traceId: 'tr1', traceUrl: 'https://langfuse.example/traces/tr1',
    breakdown: { queue: 72, redis: 118, db: 287, intentLlm: 510, mcp: 196, responseLlm: 832, whatsapp: 211, other: 114 },
    events: [
      { at: '2026-09-21T10:42:01Z', type: 'USER', text: 'Je veux vendre 50 kg de tomates' },
      { at: '2026-09-21T10:42:01Z', type: 'INTENT', intent: 'SALES_PUBLISH_PRODUCT', confidence: 0.96, workflow: 'SALES_PUBLISH_PRODUCT', step: null },
      { at: '2026-09-21T10:42:02Z', type: 'TOOL', name: 'find_product', category: 'READ', status: 'SUCCESS', durationMs: 87, errorCode: null, mutation: false },
      { at: '2026-09-21T10:42:03Z', type: 'TOOL', name: 'create_listing', category: 'WRITE', status: 'SUCCESS', durationMs: 143, errorCode: null, mutation: true },
      { at: '2026-09-21T10:42:03Z', type: 'BUSINESS', kind: 'PRODUCT', ref: 'abcdef123456', amount: 700 },
      { at: '2026-09-21T10:42:04Z', type: 'AGENT', text: 'Votre offre a été créée.', status: 'SENT', durationMs: 211 },
    ],
  }],
};

const HEALTH = {
  windowMinutes: 60, overall: 'DEGRADED', generatedAt: new Date().toISOString(),
  thresholds: { toolErrorRate: { degraded: 0.05, critical: 0.15 }, llmErrorRate: { degraded: 0.05, critical: 0.2 }, turnP95Ms: { degraded: 5000, critical: 10000 }, dbP95Ms: { degraded: 200, critical: 800 }, redisP95Ms: { degraded: 100, critical: 400 }, whatsappFailureRate: { degraded: 0.02, critical: 0.1 }, stalledMinutes: 10, abandonedMinutes: 30 },
  dependencies: [
    { key: 'api', label: 'API', state: 'UNKNOWN', lastSuccess: null, lastFailure: null, p50: null, p95: null, errorRate: null, samples: 0, source: 'probe', detail: 'MONITORING_BACKEND_HEALTH_URL non défini' },
    { key: 'bedrock', label: 'Bedrock', state: 'DEGRADED', lastSuccess: null, lastFailure: null, p50: 900, p95: 2500, errorRate: 0.08, samples: 50, source: 'telemetry', detail: '50 appels LLM' },
  ],
};

let handlers: Record<string, () => { status?: number; body: unknown }>;
const calls: string[] = [];

beforeEach(() => {
  calls.length = 0;
  handlers = {
    '/api/admin/monitoring/overview': () => ({ body: OVERVIEW }),
    '/api/admin/monitoring/conversations': () => ({ body: CONVERSATIONS }),
    '/api/admin/monitoring/conversations/c1': () => ({ body: DETAIL }),
    '/api/admin/monitoring/health': () => ({ body: HEALTH }),
    '/api/admin/monitoring/workflows': () => ({ body: { workflows: [], steps: null } }),
  };
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    calls.push(input);
    const path = input.split('?')[0];
    const h = handlers[path];
    const r = h ? h() : { status: 404, body: { error: 'no handler ' + path } };
    return { ok: (r.status ?? 200) < 400, status: r.status ?? 200, json: async () => r.body } as Response;
  }));
  vi.stubGlobal('EventSource', class { onopen: (() => void) | null = null; onerror = null; onmessage = null; close() {} constructor() { setTimeout(() => this.onopen?.(), 0); } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Vue d\'ensemble', () => {
  it('affiche le chargement puis les KPI et le funnel central avec pertes', async () => {
    render(<AdminCockpitPage />);
    expect(screen.getByTestId('state-loading')).toBeInTheDocument();
    await screen.findByTestId('funnel');
    const funnel = screen.getByTestId('funnel');
    expect(within(funnel).getByText('Messages reçus')).toBeInTheDocument();
    expect(within(screen.getByTestId('funnel-mutation')).getByText(/74 %/)).toBeInTheDocument();
    expect(within(screen.getByTestId('funnel-mutation')).getByText(/−336/)).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-activity')).getByText('42')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-performance')).getByText('1,20 s')).toBeInTheDocument();
  });

  it('montre l\'état de santé agrégé DEGRADED et les dépendances', async () => {
    render(<AdminCockpitPage />);
    const health = await screen.findByTestId('overview-health');
    expect(within(health).getAllByTestId('state-DEGRADED').length).toBeGreaterThan(0);
    expect(within(health).getByText('Bedrock')).toBeInTheDocument();
  });

  it('état vide explicite quand aucun message n\'a été traité', async () => {
    handlers['/api/admin/monitoring/overview'] = () => ({ body: { ...OVERVIEW, activity: { ...OVERVIEW.activity, messagesReceived: 0 } } });
    render(<AdminCockpitPage />);
    expect(await screen.findByTestId('state-empty')).toHaveTextContent(/Aucun message traité/);
  });

  it('erreur : message clair + bouton Réessayer qui recharge', async () => {
    handlers['/api/admin/monitoring/overview'] = () => ({ status: 500, body: { error: 'Erreur lors du chargement des données de monitoring.' } });
    render(<AdminCockpitPage />);
    const err = await screen.findByTestId('state-error');
    expect(err).toHaveTextContent(/Erreur lors du chargement/);
    handlers['/api/admin/monitoring/overview'] = () => ({ body: OVERVIEW });
    fireEvent.click(within(err).getByText('Réessayer'));
    await screen.findByTestId('funnel');
  });

  it('accès refusé (403) : message dédié', async () => {
    handlers['/api/admin/monitoring/overview'] = () => ({ status: 403, body: { error: 'x' } });
    render(<AdminCockpitPage />);
    expect(await screen.findByTestId('state-error')).toHaveTextContent('Accès réservé aux administrateurs.');
  });

  it('le sélecteur de période recharge avec le paramètre demandé', async () => {
    render(<AdminCockpitPage />);
    await screen.findByTestId('funnel');
    fireEvent.click(within(screen.getByTestId('period-selector')).getByText('7 j'));
    await waitFor(() => expect(calls.some((c) => c.includes('/overview?period=7d'))).toBe(true));
  });

  it('le mode temps réel ouvre le flux', async () => {
    render(<AdminCockpitPage />);
    await screen.findByTestId('funnel');
    fireEvent.click(screen.getByTestId('live-toggle'));
    expect(await screen.findByTestId('live-feed')).toBeInTheDocument();
    expect(await screen.findByText('Connecté')).toBeInTheDocument();
    expect(screen.getByTestId('live-empty')).toBeInTheDocument();
  });
});

describe('Conversations', () => {
  const openTab = async (name: string) => { render(<AdminCockpitPage />); await screen.findByTestId('funnel'); fireEvent.click(screen.getByRole('tab', { name })); };

  it('liste les sessions avec numéro masqué et statut', async () => {
    await openTab('Conversations');
    expect(await screen.findByText('+226 •••• 4582')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Active')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\+226\s?\d{2}\s?\d{2}\s?\d{2}/);
  });

  it('les filtres relancent la requête avec les bons paramètres', async () => {
    await openTab('Conversations');
    await screen.findByText('+226 •••• 4582');
    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'ERROR' } });
    fireEvent.change(screen.getByLabelText('Outil'), { target: { value: 'create_listing' } });
    await waitFor(() => expect(calls.some((c) => c.includes('status=ERROR') && c.includes('tool=create_listing'))).toBe(true));
  });

  it('état vide quand aucun résultat', async () => {
    handlers['/api/admin/monitoring/conversations'] = () => ({ body: { data: [], total: 0, limit: 25, offset: 0 } });
    await openTab('Conversations');
    expect(await screen.findByText(/Aucune session ne correspond/)).toBeInTheDocument();
  });

  it('drill-down : la timeline montre message → intent → outils → résultat métier → réponse, avec durées et lien de trace', async () => {
    await openTab('Conversations');
    fireEvent.click(await screen.findByText('+226 •••• 4582'));
    const drawer = await screen.findByTestId('session-drawer');
    await within(drawer).findByText('find_product');
    const text = drawer.textContent ?? '';
    for (const expected of ['UTILISATEUR', 'INTENT', 'OUTIL', 'RÉSULTAT MÉTIER', 'AGENT', '87 ms', '143 ms', 'écriture en base', 'Offre publiée', 'Votre offre a été créée.']) expect(text).toContain(expected);
    expect(within(drawer).getByText('Trace').closest('a')).toHaveAttribute('href', 'https://langfuse.example/traces/tr1');
    fireEvent.click(within(drawer).getByLabelText('Fermer'));
    await waitFor(() => expect(screen.queryByTestId('session-drawer')).not.toBeInTheDocument());
  });
});

describe('Santé', () => {
  it('affiche les états, distingue sonde directe / dérivé et n\'invente rien quand la sonde est absente', async () => {
    render(<AdminCockpitPage />);
    await screen.findByTestId('funnel');
    fireEvent.click(screen.getByRole('tab', { name: 'Santé' }));
    const overall = await screen.findByTestId('health-overall');
    expect(within(overall).getAllByTestId('state-UNKNOWN').length).toBeGreaterThan(0);
    expect(within(overall).getAllByTestId('state-DEGRADED').length).toBeGreaterThan(0);
    expect(within(overall).getByText(/MONITORING_BACKEND_HEALTH_URL non défini/)).toBeInTheDocument();
    expect(within(overall).getByText('sonde directe')).toBeInTheDocument();
  });
});
