'use client';

import React from 'react';
import { Info } from 'lucide-react';
import type { BusinessData } from '../business';
import type { HealthData } from '../health';
import { useCockpitData } from './useCockpitData';
import { BarList, Card, DataState, DataTable, Funnel, Grid, Stat, StateBadge, C } from './primitives';
import { fmtAgo, fmtInt, fmtMs, fmtPct, fmtXof } from './format';
import type { PeriodParams } from './OverviewTab';

export function BusinessTab({ params }: { params: PeriodParams }) {
  const { data, loading, error, refetch } = useCockpitData<BusinessData>('/api/admin/monitoring/business', params);
  const t = data?.totals;
  return (
    <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
      {data && t && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Valeur créée" subtitle="Chiffres issus des tables métier (commandes, paiements, enchères…) — définitions dans docs/monitoring/METRICS.md" testId="biz-kpis">
            <Grid cols={4}>
              <Stat label="Offres publiées" value={fmtInt(t.publications)} hint={t.publishedVolumeByUnit.map((u) => `${fmtInt(u.quantity)} ${u.unit}`).join(' · ')} />
              <Stat label="Commandes" value={fmtInt(t.orders)} hint={`${fmtInt(t.preorders)} précommandes`} />
              <Stat label="GMV (FCFA)" value={fmtXof(t.gmvXof)} hint="confirmées / livrées / terminées" />
              <Stat label="Commandes via l'agent" value={fmtInt(t.agentOrders)} hint={`${fmtXof(t.agentGmvXof)} de GMV`} />
              <Stat label="Publication → commande" value={fmtPct(data.rates.publicationToOrder)} />
              <Stat label="Enchères terminées" value={fmtInt(t.auctionsCompleted)} hint={`${fmtInt(t.auctionsCreated)} créées · ${fmtInt(t.bids)} bids`} />
              <Stat label="Paiements réussis" value={fmtInt(t.paymentsSucceeded)} hint={`${fmtInt(t.paymentsFailed)} échoués · ${fmtPct(data.rates.paymentSuccess)}`} />
              <Stat label="Annulations" value={fmtInt(t.cancellations)} />
              <Stat label="Livraisons" value={fmtInt(t.deliveries)} />
              <Stat label="Vendeurs actifs" value={fmtInt(data.people.activeSellers)} />
              <Stat label="Acheteurs actifs" value={fmtInt(data.people.activeBuyers)} />
            </Grid>
          </Card>

          <Card title="Entonnoir vendeur" subtitle="Utilisateurs voulant vendre → publications → commandes → paiement">
            <Funnel stages={data.funnel.filter((s) => s.count !== null).map((s, i, arr) => ({ key: s.key, label: s.label, count: s.count as number, pctOfTotal: arr[0].count ? (s.count as number) / (arr[0].count as number) : null, pctOfPrevious: i === 0 || !arr[i - 1].count ? null : (s.count as number) / (arr[i - 1].count as number), lost: i === 0 ? 0 : Math.max(0, (arr[i - 1].count as number) - (s.count as number)) }))} />
            {data.funnel.filter((s) => s.count === null).map((s) => <p key={s.key} style={{ fontSize: 12, color: C.muted, margin: '8px 0 0' }}><Info size={12} style={{ verticalAlign: 'middle' }} /> {s.label} — {s.note}</p>)}
          </Card>

          <Grid cols={2}>
            <Card title="Top produits vendus" subtitle="Lignes de commandes confirmées / livrées / terminées (XOF)">
              {data.topProductsSold.length ? <BarList items={data.topProductsSold.map((p) => ({ label: p.name, value: p.orderLines, sub: fmtXof(p.revenueXof) }))} /> : <p style={{ fontSize: 13, color: C.muted }}>Aucune vente confirmée sur la période.</p>}
            </Card>
            <Card title="Demandes sans offre" subtitle="Produits demandés par des utilisateurs sans offre correspondante" testId="biz-unmet">
              {data.unmetDemand.length ? <BarList color={C.amber} items={data.unmetDemand.map((d) => ({ label: d.term, value: d.occurrences }))} /> : <p style={{ fontSize: 13, color: C.muted }}>Aucune demande non satisfaite enregistrée.</p>}
            </Card>
            <Card title="Zones les plus actives" subtitle="Commandes et publications par zone">
              {data.activeZones.length ? <BarList items={data.activeZones.map((z) => ({ label: z.zone, value: z.orders + z.publications, sub: `${z.orders} cmd · ${z.publications} pub.` }))} /> : <p style={{ fontSize: 13, color: C.muted }}>Aucune activité par zone sur la période.</p>}
            </Card>
            <Card title="Paiements par statut">
              {t.paymentsByStatus.length ? <BarList items={t.paymentsByStatus.map((p) => ({ label: p.status, value: p.count }))} /> : <p style={{ fontSize: 13, color: C.muted }}>Aucun paiement sur la période.</p>}
            </Card>
          </Grid>

          <Card title="Métriques non disponibles" subtitle="Volontairement non estimées : leur définition ne serait pas fiable" testId="biz-unavailable">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.unavailable.map((u) => <li key={u.metric}><b>{u.metric}</b> — <span style={{ color: C.muted }}>{u.reason}</span></li>)}
            </ul>
          </Card>
        </div>
      )}
    </DataState>
  );
}

const SOURCE_LABEL = { probe: 'sonde directe', telemetry: 'télémétrie des tours', derived: 'dérivé (pas de sonde)' } as const;

export function HealthTab({ windowMinutes = 60 }: { windowMinutes?: number }) {
  const { data, loading, error, refetch } = useCockpitData<HealthData>('/api/admin/monitoring/health', { windowMinutes }, { refreshMs: 30000 });
  return (
    <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="État global" subtitle={`Fenêtre d'observation : ${data.windowMinutes} min · mesuré ${fmtAgo(data.generatedAt)}`} right={<StateBadge state={data.overall} />} testId="health-overall">
            <DataTable rowKey={(d) => d.key} rows={data.dependencies}
              columns={[
                { header: 'Dépendance', render: (d) => <><b>{d.label}</b><div style={{ fontSize: 11, color: C.muted }}>{SOURCE_LABEL[d.source]}</div></> },
                { header: 'État', render: (d) => <StateBadge state={d.state} /> },
                { header: 'Dernier succès', render: (d) => fmtAgo(d.lastSuccess) }, { header: 'Dernier échec', render: (d) => fmtAgo(d.lastFailure) },
                { header: 'p50', align: 'right', render: (d) => fmtMs(d.p50) }, { header: 'p95', align: 'right', render: (d) => fmtMs(d.p95) },
                { header: "Taux d'erreur", align: 'right', render: (d) => fmtPct(d.errorRate, 1) },
                { header: 'Détail', render: (d) => <span style={{ fontSize: 12, color: C.muted }}>{d.detail}</span> },
              ]} />
          </Card>
          <Card title="Seuils appliqués" subtitle="Configurables via MONITORING_THRESHOLDS">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.muted, columns: 2 }}>
              <li>Erreurs d&apos;outils : dégradé ≥ {fmtPct(data.thresholds.toolErrorRate.degraded)}, critique ≥ {fmtPct(data.thresholds.toolErrorRate.critical)}</li>
              <li>Erreurs LLM : ≥ {fmtPct(data.thresholds.llmErrorRate.degraded)} / {fmtPct(data.thresholds.llmErrorRate.critical)}</li>
              <li>Latence p95 d&apos;un tour : ≥ {fmtMs(data.thresholds.turnP95Ms.degraded)} / {fmtMs(data.thresholds.turnP95Ms.critical)}</li>
              <li>SQL p95 par tour : ≥ {fmtMs(data.thresholds.dbP95Ms.degraded)} / {fmtMs(data.thresholds.dbP95Ms.critical)}</li>
              <li>Redis p95 par tour : ≥ {fmtMs(data.thresholds.redisP95Ms.degraded)} / {fmtMs(data.thresholds.redisP95Ms.critical)}</li>
              <li>Échecs WhatsApp : ≥ {fmtPct(data.thresholds.whatsappFailureRate.degraded)} / {fmtPct(data.thresholds.whatsappFailureRate.critical)}</li>
              <li>Session bloquée après {data.thresholds.stalledMinutes} min, abandonnée après {data.thresholds.abandonedMinutes} min</li>
            </ul>
          </Card>
        </div>
      )}
    </DataState>
  );
}
