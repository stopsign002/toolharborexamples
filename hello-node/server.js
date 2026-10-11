// Hello Node — ToolHarbor container-tier example.
//
// Demonstrates the two things every container/compose tool must get right:
//   1. Verify the portal's identity headers yourself (never just trust
//      "the network says so" — see verifyPortalHeaders below).
//   2. Build any absolute, browser-visible URL from X-Forwarded-Prefix,
//      never assume you are mounted at "/". Plain relative links need
//      neither — see the redirect below for why one call needs it and the
//      other does not.
import express from 'express';
import crypto from 'node:crypto';
import pg from 'pg';

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.PORTAL_TOOL_TOKEN;
if (!TOKEN) {
  console.error('PORTAL_TOOL_TOKEN is not set — refusing to start');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function boot() {
  // No schema prefix needed: this role's search_path is already its own
  // schema (tool_hello_node), set once at install by api/engine/dbseg.js.
  await pool.query(`CREATE TABLE IF NOT EXISTS visits (
    id serial PRIMARY KEY,
    who text NOT NULL,
    at timestamptz NOT NULL DEFAULT now()
  )`);
}

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check: polled directly by the engine at container_ip:3000/health
// with NO identity headers, so it must stay outside verifyPortalHeaders.
app.get('/health', (_req, res) => res.sendStatus(200));

// --- identity verification ----------------------------------------------
// The gateway strips any client-sent copy of these headers before adding
// its own, so in practice they can be trusted as-is. Verify anyway: this
// file is a template other tools copy, and "the gateway already checked
// it" stops being true the moment someone reaches this container by any
// other path (a shared network, a copy-pasted route, a future rewrite).
function verifyPortalHeaders(req, res, next) {
  const user = req.get('X-Portal-User');
  const admin = req.get('X-Portal-Admin');
  const ts = req.get('X-Portal-Ts');
  const sig = req.get('X-Portal-Sig');
  if (!user || admin === undefined || !ts || !sig) {
    return res.status(401).send('missing portal identity headers');
  }
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) {
    return res.status(401).send('stale portal signature');
  }
  const expected = crypto
    .createHmac('sha256', TOKEN)
    .update(`${user}|${admin}|${ts}`)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).send('bad portal signature');
  }
  req.portalUser = user;
  req.portalAdmin = admin === '1';
  next();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

app.get('/', verifyPortalHeaders, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT who, at FROM visits ORDER BY id DESC LIMIT 50',
  );
  const items = rows
    .map((r) => `<li>${escapeHtml(r.who)} — ${new Date(r.at).toISOString()}</li>`)
    .join('\n    ');
  res.set('Content-Type', 'text/html').send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Hello Node</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/toolkit/toolharbor.css">
</head>
<body>
<div class="th-page">
  <h1>Hello Node</h1>
  <p class="th-muted" id="whoami">Signed in as ${escapeHtml(req.portalUser)}${req.portalAdmin ? ' (admin)' : ''}</p>

  <div class="th-card">
    <h2>Recent visits</h2>
    ${rows.length ? '' : '<p class="th-empty">No visits yet.</p>'}
    <ul id="visits">
      ${items}
    </ul>
    <form id="visit-form" method="post" action="visit">
      <button id="visit-submit" type="submit" class="th-btn-primary">Log a visit</button>
    </form>
  </div>
</div>
</body>
</html>`);
});

app.post('/visit', verifyPortalHeaders, async (req, res) => {
  await pool.query('INSERT INTO visits (who) VALUES ($1)', [req.portalUser]);
  // The form's own action ("visit") was a plain relative link and needed no
  // help — the browser resolved it against the page it was on. A redirect
  // is different: the Location header's browser-visible path is
  // /t/hello-node/ even though THIS process only ever sees "/", so building
  // it from X-Forwarded-Prefix is what keeps the browser landing back on
  // the tool instead of bouncing to the portal's own root.
  const prefix = req.get('X-Forwarded-Prefix') || '';
  res.redirect(`${prefix}/`);
});

boot()
  .then(() => app.listen(PORT, () => console.log(`hello-node listening on ${PORT}`)))
  .catch((err) => {
    console.error('boot failed', err);
    process.exit(1);
  });
