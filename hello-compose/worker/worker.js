// Hello Compose — background half. No HTTP server at all: a compose
// service does not have to speak port 3000, only the manifest's
// `webService` (api) does. Writes a heartbeat row every 5s into the same
// schema `api` reads from.
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS heartbeats (
    id serial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now()
  )`);
}

async function tick() {
  try {
    await pool.query('INSERT INTO heartbeats (at) VALUES (now())');
  } catch (err) {
    console.error('heartbeat insert failed', err);
  }
}

async function main() {
  await ensureTable();
  await tick();
  setInterval(tick, 5000);
}

main().catch((err) => {
  console.error('worker boot failed', err);
  process.exit(1);
});
