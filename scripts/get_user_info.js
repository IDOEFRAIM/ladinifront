// scripts/get_user_info.js
// Usage: node scripts/get_user_info.js <userId>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

// For local environments with self-signed certs, allow Node to accept them.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const userId = process.argv[2] || 'fa987f63-fafa-4147-9676-52c9af0edc75';

async function main() {
  // Allow connecting to DBs with self-signed certs in local/dev setups
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Retrieving info for user:', userId);

    const client = await pool.connect();
    try {
      let user = null;
      try {
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        user = userRes.rows[0] || null;
      } catch (e) {
        console.warn('Warning: failed to query users table:', e.message);
      }

      let producer = null;
      try {
        const producerRes = await client.query('SELECT * FROM producers WHERE user_id = $1', [userId]);
        producer = producerRes.rows[0] || null;
      } catch (e) {
        console.warn('Warning: failed to query producers table:', e.message);
      }

      async function tableExists(name) {
        const res = await client.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`,
          [name]
        );
        return res.rowCount > 0;
      }

      let membershipsRes = { rows: [] };
      if (await tableExists('user_organizations')) {
        try {
          membershipsRes = await client.query(
            `SELECT uo.*, o.name as organization_name
             FROM user_organizations uo
             LEFT JOIN organizations o ON o.id = uo.organization_id
             WHERE uo.user_id = $1`,
            [userId]
          );
        } catch (e) {
          console.warn('Warning: failed to query user_organizations:', e.message);
        }
      } else if (await tableExists('user_organization')) {
        try {
          membershipsRes = await client.query(
            `SELECT uo.*, o.name as organization_name
             FROM user_organization uo
             LEFT JOIN organizations o ON o.id = uo.organization_id
             WHERE uo.user_id = $1`,
            [userId]
          );
        } catch (e) {
          console.warn('Warning: failed to query user_organization:', e.message);
        }
      }

      let sessionsRes = { rows: [] };
      try {
        sessionsRes = await client.query('SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);
      } catch (e) {
        console.warn('Warning: failed to query sessions table:', e.message);
      }

      let products = [];
      if (producer && producer.id) {
        try {
          const prodRes = await client.query('SELECT * FROM products WHERE producer_id = $1 ORDER BY created_at DESC LIMIT 50', [producer.id]);
          products = prodRes.rows;
        } catch (e) {
          console.warn('Warning: failed to query products for producer:', e.message);
        }
      }

      const output = {
        user,
        producer,
        memberships: membershipsRes.rows,
        recent_sessions: sessionsRes.rows,
        products,
      };

      console.log(JSON.stringify(output, null, 2));
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error retrieving user info:', err);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

main();
