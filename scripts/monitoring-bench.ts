/**
 * Mesure le coût des read models du cockpit sur la base pointée par DATABASE_URL (jetable, idéalement volumineuse).
 *   DATABASE_URL=... DISABLE_SSLMODE=true npx tsx scripts/monitoring-bench.ts
 * Chaque vue est mesurée 3 fois par période (médiane) ; affiche aussi le nombre de lignes de télémétrie.
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '@/src/db';
import { resolvePeriod } from '@/features/monitoring/cockpit/period';
import { DEFAULT_THRESHOLDS } from '@/features/monitoring/cockpit/thresholds';
import { fetchOverview } from '@/features/monitoring/cockpit/overview';
import { fetchConversations } from '@/features/monitoring/cockpit/conversations';
import { fetchWorkflows } from '@/features/monitoring/cockpit/workflows';
import { fetchTools } from '@/features/monitoring/cockpit/tools';
import { fetchPerformance } from '@/features/monitoring/cockpit/performance';
import { fetchBusiness } from '@/features/monitoring/cockpit/business';
import { fetchHealth } from '@/features/monitoring/cockpit/health';
import { fetchLiveSummary, fetchNewTurns } from '@/features/monitoring/cockpit/stream';

async function time(fn: () => Promise<unknown>): Promise<number> {
  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await fn();
    runs.push(performance.now() - t0);
  }
  return Math.round(runs.sort((a, b) => a - b)[1]);
}

async function main() {
  const [n] = Array.from(await db.execute(sql`select (select count(*) from intelligence.agent_turns) turns, (select count(*) from intelligence.agent_tool_calls) tools, (select count(*) from intelligence.agent_llm_calls) llms`)) as { turns: string; tools: string; llms: string }[];
  console.log(`Volume : ${n.turns} tours · ${n.tools} appels d'outils · ${n.llms} appels LLM\n`);
  const th = DEFAULT_THRESHOLDS;
  console.log('vue'.padEnd(26) + ['24h', '7d', '30d'].map((p) => p.padStart(9)).join(''));
  const views: [string, (p: ReturnType<typeof resolvePeriod>) => Promise<unknown>][] = [
    ['overview', (p) => fetchOverview(p)],
    ['conversations (page 25)', (p) => fetchConversations(p, th, {}, { limit: 25, offset: 0 })],
    ['workflows', (p) => fetchWorkflows(p, th)],
    ['tools', (p) => fetchTools(p)],
    ['performance', (p) => fetchPerformance(p)],
    ['business', (p) => fetchBusiness(p)],
  ];
  for (const [name, fn] of views) {
    const cells: string[] = [];
    for (const key of ['24h', '7d', '30d']) cells.push(`${await time(() => fn(resolvePeriod(new URLSearchParams({ period: key }))))} ms`.padStart(9));
    console.log(name.padEnd(26) + cells.join(''));
  }
  console.log('health (fenêtre 60 min)'.padEnd(26) + `${await time(() => fetchHealth(60))} ms`.padStart(9));
  console.log('SSE tick (2 requêtes)'.padEnd(26) + `${await time(async () => { await fetchNewTurns(new Date(Date.now() - 60_000)); await fetchLiveSummary(); })} ms`.padStart(9));
  process.exit(0);
}
main();
