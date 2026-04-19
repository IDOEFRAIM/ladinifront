/*
Simple agent action worker:
- claims one pending DISTRIBUTION_VERIFICATION SEND_VERIFICATION action
- for IN_APP channel marks action as SENT and appends deliveredAt to payload
- marks FAILED on error

Run with:

$env:DATABASE_URL='postgresql://...'; $env:NODE_TLS_REJECT_UNAUTHORIZED='0'; node scripts/agent_action_worker.js
*/

const { Client } = require('pg');

const SLEEP_MS = 3000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('Please set DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  console.log('agent_action_worker connected');

  while (true) {
    try {
      // atomically claim one pending action
      const claimSql = `
        WITH c AS (
          SELECT id FROM intelligence.agent_actions
          WHERE status = 'PENDING' AND agent_name = 'DISTRIBUTION_VERIFICATION' AND action_type = 'SEND_VERIFICATION'
          ORDER BY created_at
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE intelligence.agent_actions a
        SET status = 'IN_PROGRESS', updated_at = now()
        FROM c
        WHERE a.id = c.id
        RETURNING a.*;
      `;
      const res = await client.query(claimSql);
      if (!res.rows || res.rows.length === 0) {
        await sleep(SLEEP_MS);
        continue;
      }

      const action = res.rows[0];
      console.log('claimed action', action.id);
      let payload = null;
      try {
        payload = action.payload ? (typeof action.payload === 'object' ? action.payload : JSON.parse(action.payload)) : {};
      } catch (e) {
        payload = {};
      }

      // deliver based on channel
      const channel = (payload && payload.channel) || 'IN_APP';

      if (channel === 'IN_APP') {
        // For in-app delivery we mark the action as SENT and attach deliveredAt
        payload.deliveredAt = new Date().toISOString();
        const updateSql = `UPDATE intelligence.agent_actions SET status = $1, payload = $2::jsonb, updated_at = now() WHERE id = $3`;
        await client.query(updateSql, ['SENT', JSON.stringify(payload), action.id]);
        console.log('action sent (in-app)', action.id, 'assignedTo=', payload.assignedTo || payload.agentId);
      } else if (channel === 'SMS') {
        // SMS provider integration would go here
        // For now, mark SENT and attach deliveredAt
        payload.deliveredAt = new Date().toISOString();
        const updateSql = `UPDATE intelligence.agent_actions SET status = $1, payload = $2::jsonb, updated_at = now() WHERE id = $3`;
        await client.query(updateSql, ['SENT', JSON.stringify(payload), action.id]);
        console.log('action sent (sms) — placeholder', action.id);
      } else {
        // unknown channel
        payload.error = `unknown channel ${channel}`;
        await client.query(`UPDATE intelligence.agent_actions SET status = $1, payload = $2::jsonb, updated_at = now() WHERE id = $3`, ['FAILED', JSON.stringify(payload), action.id]);
        console.warn('unknown channel for action', action.id, channel);
      }
    } catch (err) {
      console.error('worker error', err);
      await sleep(SLEEP_MS);
    }
  }
}

main().catch((e) => {
  console.error('fatal', e);
  process.exit(1);
});
