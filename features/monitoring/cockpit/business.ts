import { sql } from 'drizzle-orm';
import { rows, bounds, num, numOrNull, ratio } from './db';
import type { Period } from './period';

/**
 * MÉTRIQUES BUSINESS — définitions (docs/monitoring/METRICS.md). Rien n'est estimé : une métrique sans définition fiable
 * est déclarée dans `unavailable` avec la raison.
 *
 *  publication        = produit créé (marketplace.products.created_at) dans la période
 *  commande           = commande non-brouillon (status <> 'DRAFT') créée dans la période
 *  GMV (XOF)          = Σ total_amount des commandes de la période au statut CONFIRMED, DELIVERED ou COMPLETED, devise XOF
 *                       (exclut brouillons, en attente et annulées ; les autres devises ne sont pas additionnées)
 *  paiement réussi    = paiement avec captured_at renseigné ; échoué = statut commençant par FAIL
 *  livraison          = livraison avec delivered_at dans la période
 *  enchère terminée   = enchère avec awarded_at dans la période
 *  commande via l'agent = source WHATSAPP ou AGENT, ou is_agent_order (marqueurs posés à la création par le backend) ;
 *                     GMV agent = même règle que la GMV, restreinte à ces commandes
 *  taux publication→commande = publications de la période ayant ≥ 1 ligne de commande / publications de la période
 */
export interface BusinessData {
  period: { key: string; from: string; to: string };
  totals: {
    publications: number; publishedVolumeByUnit: { unit: string; quantity: number }[];
    orders: number; preorders: number; gmvXof: number; agentOrders: number; agentGmvXof: number; cancellations: number;
    auctionsCreated: number; auctionsCompleted: number; bids: number;
    paymentsSucceeded: number; paymentsFailed: number; paymentsByStatus: { status: string; count: number }[];
    deliveries: number;
  };
  rates: { publicationToOrder: number | null; paymentSuccess: number | null };
  people: { activeSellers: number; activeBuyers: number };
  topProductsSold: { name: string; orderLines: number; revenueXof: number }[];
  /** Termes demandés par des utilisateurs sans offre correspondante (`intelligence.demand_signals`). */
  unmetDemand: { term: string; occurrences: number }[];
  activeZones: { zone: string; orders: number; publications: number }[];
  funnel: { key: string; label: string; count: number | null; note?: string }[];
  unavailable: { metric: string; reason: string }[];
}

export async function fetchBusiness(p: Period): Promise<BusinessData> {
  const b = bounds(p);
  const inP = (col: string) => sql.raw(`${col} >= '${p.from.toISOString()}'::timestamptz AND ${col} < '${p.to.toISOString()}'::timestamptz`);
  const [t] = await rows<Record<string, unknown>>(sql`
    SELECT
      (SELECT count(*) FROM marketplace.products WHERE ${inP('created_at')}) AS publications,
      (SELECT count(*) FROM marketplace.orders WHERE status <> 'DRAFT' AND ${inP('created_at')}) AS orders,
      (SELECT count(*) FROM marketplace.orders WHERE status <> 'DRAFT' AND order_type = 'PREORDER' AND ${inP('created_at')}) AS preorders,
      (SELECT coalesce(sum(total_amount), 0) FROM marketplace.orders WHERE status IN ('CONFIRMED','DELIVERED','COMPLETED') AND currency = 'XOF' AND ${inP('created_at')}) AS gmv,
      (SELECT count(*) FROM marketplace.orders WHERE status <> 'DRAFT' AND (is_agent_order OR source IN ('WHATSAPP','AGENT')) AND ${inP('created_at')}) AS agent_orders,
      (SELECT coalesce(sum(total_amount), 0) FROM marketplace.orders WHERE status IN ('CONFIRMED','DELIVERED','COMPLETED') AND currency = 'XOF' AND (is_agent_order OR source IN ('WHATSAPP','AGENT')) AND ${inP('created_at')}) AS agent_gmv,
      (SELECT count(*) FROM marketplace.orders WHERE status = 'CANCELLED' AND ${inP('created_at')}) AS cancels,
      (SELECT count(*) FROM marketplace.auctions WHERE ${inP('created_at')}) AS auctions,
      (SELECT count(*) FROM marketplace.auctions WHERE awarded_at IS NOT NULL AND ${inP('awarded_at')}) AS auctions_done,
      (SELECT count(*) FROM marketplace.bids WHERE ${inP('created_at')}) AS bids,
      (SELECT count(*) FROM marketplace.payments WHERE captured_at IS NOT NULL AND ${inP('created_at')}) AS pay_ok,
      (SELECT count(*) FROM marketplace.payments WHERE status ILIKE 'FAIL%' AND ${inP('created_at')}) AS pay_ko,
      (SELECT count(*) FROM marketplace.deliveries WHERE delivered_at IS NOT NULL AND ${inP('delivered_at')}) AS deliveries,
      (SELECT count(*) FROM marketplace.products p WHERE ${inP('p.created_at')} AND EXISTS (SELECT 1 FROM marketplace.order_items oi WHERE oi.product_id = p.id)) AS pub_with_order,
      (SELECT count(DISTINCT s) FROM (
         SELECT producer_id AS s FROM marketplace.products WHERE ${inP('created_at')}
         UNION SELECT producer_id FROM marketplace.bids WHERE ${inP('created_at')}
         UNION SELECT p.producer_id FROM marketplace.order_items oi JOIN marketplace.products p ON p.id = oi.product_id
               JOIN marketplace.orders o ON o.id = oi.order_id WHERE o.status <> 'DRAFT' AND ${inP('o.created_at')}) x) AS sellers,
      (SELECT count(DISTINCT s) FROM (
         SELECT buyer_id AS s FROM marketplace.orders WHERE buyer_id IS NOT NULL AND status <> 'DRAFT' AND ${inP('created_at')}
         UNION SELECT buyer_id FROM marketplace.auctions WHERE ${inP('created_at')}) y) AS buyers,
      (SELECT count(DISTINCT phone_hash) FROM intelligence.agent_turns WHERE workflow = 'SALES_PUBLISH_PRODUCT' AND created_at >= ${b.from} AND created_at < ${b.to}) AS want_sell,
      (SELECT count(DISTINCT o.id) FROM marketplace.orders o JOIN marketplace.order_items oi ON oi.order_id = o.id
         JOIN marketplace.products p ON p.id = oi.product_id
         WHERE ${inP('p.created_at')} AND o.status <> 'DRAFT') AS orders_on_published,
      (SELECT count(DISTINCT o.id) FROM marketplace.orders o JOIN marketplace.order_items oi ON oi.order_id = o.id
         JOIN marketplace.products p ON p.id = oi.product_id
         WHERE ${inP('p.created_at')} AND o.status <> 'DRAFT' AND o.payment_status IN ('PAID','ESCROWED','PAID_OUT')) AS paid_on_published`);
  const units = await rows<Record<string, unknown>>(sql`
    SELECT coalesce(unit, '?') AS unit, sum(quantity_for_sale) AS q FROM marketplace.products WHERE ${inP('created_at')} GROUP BY 1 ORDER BY q DESC LIMIT 6`);
  const payStatus = await rows<Record<string, unknown>>(sql`
    SELECT status, count(*) AS n FROM marketplace.payments WHERE ${inP('created_at')} GROUP BY 1 ORDER BY n DESC`);
  const top = await rows<Record<string, unknown>>(sql`
    SELECT p.name, count(*) AS lines, coalesce(sum(oi.quantity * oi.price_at_sale), 0) AS rev
    FROM marketplace.order_items oi JOIN marketplace.orders o ON o.id = oi.order_id JOIN marketplace.products p ON p.id = oi.product_id
    WHERE o.status IN ('CONFIRMED','DELIVERED','COMPLETED') AND o.currency = 'XOF' AND ${inP('o.created_at')}
    GROUP BY p.name ORDER BY lines DESC, rev DESC LIMIT 10`);
  const unmet = await rows<Record<string, unknown>>(sql`
    SELECT normalized_term AS term, occurrences FROM intelligence.demand_signals
    WHERE ${inP('updated_at')} ORDER BY occurrences DESC LIMIT 10`);
  const zones = await rows<Record<string, unknown>>(sql`
    SELECT z.name AS zone,
      (SELECT count(*) FROM marketplace.orders o WHERE o.zone_id = z.id AND o.status <> 'DRAFT' AND ${inP('o.created_at')}) AS orders,
      (SELECT count(*) FROM marketplace.products p JOIN marketplace.producers pr ON pr.id = p.producer_id WHERE pr.zone_id = z.id AND ${inP('p.created_at')}) AS pubs
    FROM governance.zones z ORDER BY orders DESC, pubs DESC LIMIT 8`);

  const publications = num(t?.publications);
  const paymentsOk = num(t?.pay_ok), paymentsKo = num(t?.pay_ko);
  return {
    period: { key: p.key, from: p.from.toISOString(), to: p.to.toISOString() },
    totals: {
      publications, publishedVolumeByUnit: units.map((u) => ({ unit: String(u.unit), quantity: num(u.q) })),
      orders: num(t?.orders), preorders: num(t?.preorders), gmvXof: num(t?.gmv), agentOrders: num(t?.agent_orders), agentGmvXof: num(t?.agent_gmv), cancellations: num(t?.cancels),
      auctionsCreated: num(t?.auctions), auctionsCompleted: num(t?.auctions_done), bids: num(t?.bids),
      paymentsSucceeded: paymentsOk, paymentsFailed: paymentsKo, paymentsByStatus: payStatus.map((r) => ({ status: String(r.status), count: num(r.n) })),
      deliveries: num(t?.deliveries),
    },
    rates: { publicationToOrder: ratio(num(t?.pub_with_order), publications), paymentSuccess: ratio(paymentsOk, paymentsOk + paymentsKo) },
    people: { activeSellers: num(t?.sellers), activeBuyers: num(t?.buyers) },
    topProductsSold: top.map((r) => ({ name: String(r.name), orderLines: num(r.lines), revenueXof: num(r.rev) })),
    unmetDemand: unmet.map((r) => ({ term: String(r.term), occurrences: num(r.occurrences) })),
    activeZones: zones.filter((z) => num(z.orders) + num(z.pubs) > 0).map((z) => ({ zone: String(z.zone), orders: num(z.orders), publications: num(z.pubs) })),
    funnel: [
      { key: 'want', label: 'Utilisateurs voulant vendre (workflow de publication)', count: num(t?.want_sell) },
      { key: 'published', label: 'Publications créées', count: publications },
      { key: 'interest', label: 'Publications avec intérêt', count: null, note: 'non disponible : aucune mesure de vues ou de paniers par offre' },
      { key: 'ordered', label: 'Commandes sur des publications de la période', count: num(t?.orders_on_published) },
      { key: 'paid', label: 'dont payées (PAID / ESCROWED / PAID_OUT)', count: numOrNull(t?.paid_on_published) },
    ],
    unavailable: [
      { metric: 'Produits « recherchés » (volume de recherche)', reason: "les recherches réussies ne sont pas journalisées ; seules les demandes sans offre le sont (demand_signals)" },
      { metric: 'GMV multi-devises', reason: 'seules les commandes en XOF sont additionnées' },
      { metric: 'Intérêt par publication', reason: 'aucune mesure de vues / paniers par offre' },
    ],
  };
}
