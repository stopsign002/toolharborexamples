// Hello Compose — web half. Shows the latest row the `worker` service
// writes into the schema both services share (same DATABASE_URL, same
// tool_hello_compose role/schema — one DB per TOOL, not per service).
import express from 'express';
import pg from 'pg';

const PORT = process.env.PORT || 3000;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function boot() {
  await pool.query(`CREATE TABLE IF NOT EXISTS heartbeats (
    id serial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now()
  )`);
}

const app = express();

app.get('/health', (_req, res) => res.sendStatus(200));

app.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT at FROM heartbeats ORDER BY id DESC LIMIT 1',
  );
  const at = rows[0] ? new Date(rows[0].at).toISOString() : '(none yet)';
  res.set('Content-Type', 'text/html').send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>Hello Compose</title></head>
<body>
  <p>Latest heartbeat, written every 5s by the <code>worker</code> service:</p>
  <p id="heartbeat">${at}</p>
</body>
</html>`);
});

boot()
  .then(() => app.listen(PORT, () => console.log(`hello-compose api listening on ${PORT}`)))
  .catch((err) => {
    console.error('boot failed', err);
    process.exit(1);
  });
