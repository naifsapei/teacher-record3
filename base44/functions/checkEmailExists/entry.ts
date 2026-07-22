import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// In-memory per-IP rate limiter as defense-in-depth against abuse.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const ipHits = new Map();

function rateLimited(req) {
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 2000) { // bound memory
    for (const [k] of [...ipHits.entries()].slice(0, 500)) ipHits.delete(k);
  }
  return hits.length > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  try {
    if (rateLimited(req)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    // منع تعداد البريد عبر المستخدمين: يُسمح للإدارة فقط بالاستعلام عن وجود بريد.
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const email = (body?.email || '').toString().trim().toLowerCase();
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }
    const candidates = await base44.asServiceRole.entities.User.filter({ email }, undefined, 1);
    const exists = candidates.some((u) => (u.email || '').toLowerCase() === email);
    return Response.json({ exists });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});