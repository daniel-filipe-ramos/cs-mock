/**
 * Mock ConversionSync Internal API for local development.
 *
 * Handles the three endpoints called by CSAdapter (cs-adapter.ts):
 *   POST  /api/internal/v1/visitors/identify
 *   POST  /api/internal/v1/track
 *   PATCH /api/internal/v1/visitors/:id/traits
 *
 * All responses are 200 JSON. Logs every request so you can see
 * what SOS24 is sending to CS without needing a real CS instance.
 */

import http from 'node:http';

const PORT = process.env.PORT || 3050;

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function stableId(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `mock-cs-${hash.toString(16).padStart(8, '0')}`;
}

const server = http.createServer(async (req, res) => {
  const body = await readBody(req);
  const { method, url } = req;

  console.log(`[cs-mock] ${method} ${url}`, JSON.stringify(body));

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;

  // GET /api/internal/v1/health
  if (url.includes('/health')) {
    res.end(JSON.stringify({ status: 'ok', service: 'conversionsync-mock', uptime: process.uptime() }));
    return;
  }

  // POST /api/internal/v1/visitors/identify
  if (method === 'POST' && url.includes('/identify')) {
    const email = body.email || body.traits?.email || 'unknown';
    const customerId = stableId(email);
    res.end(JSON.stringify({
      customerId,
      id: customerId,
      email,
      tenantId: 'sos24-dev-tenant',
      projectId: 'sos24-dev-project',
      lifecycleStage: 'lead',
      createdAt: new Date().toISOString(),
    }));
    return;
  }

  // POST /api/internal/v1/track
  if (method === 'POST' && url.includes('/track')) {
    res.end(JSON.stringify({ ok: true, queued: true }));
    return;
  }

  // PATCH /api/internal/v1/visitors/:id/traits
  if (method === 'PATCH' && url.includes('/traits')) {
    res.end(JSON.stringify({ ok: true, updated: Object.keys(body).length }));
    return;
  }

  // Catch-all
  res.end(JSON.stringify({ ok: true }));
});

server.listen(PORT, () => {
  console.log(`[cs-mock] ConversionSync Internal API mock running on :${PORT}`);
  console.log('[cs-mock] Tenant: sos24-dev-tenant / Project: sos24-dev-project');
});
