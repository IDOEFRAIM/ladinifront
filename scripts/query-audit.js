// Query latest AuditLog entries
// Load .env for standalone script
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

async function main() {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const res = await pool.query(
      `SELECT id, actor_id, action, entity_id, entity_type, old_value, new_value, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10`
    );
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
  } catch (err) {
    console.error('Error querying AuditLog via pg:', err);
    process.exitCode = 2;
  }
}

main();
