/**
 * Cloudflare Pages Function — all-time per-post view counter, backed by D1.
 *
 *   GET  /api/views?path=/posts/my-post   → read the current count (no write)
 *   POST /api/views   body {"path":"..."}  → record one view, return new count
 *
 * Returns: { "count": "1,243" }  (formatted string, or null when zero/unknown)
 *
 * The D1 database is bound as `env.DB` (see d1_databases in wrangler.jsonc).
 * Counts are a true lifetime total: one row per path, incremented atomically.
 */

/** Only count/serve paths that look like real internal routes. */
function validPath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    path.length <= 256 &&
    !path.includes('..')
  );
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function format(count) {
  return count ? Number(count).toLocaleString('en-US') : null;
}

// Read only — used to display a count without recording a view.
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ count: null }, 500);

  const path = new URL(request.url).searchParams.get('path') || '/';
  if (!validPath(path)) return json({ count: null }, 400);

  try {
    const row = await env.DB.prepare('SELECT count FROM views WHERE path = ?')
      .bind(path)
      .first();
    return json({ count: format(row?.count) }, 200, {
      // Short cache so rapid reloads don't hammer D1; counts are not real-time.
      'Cache-Control': 'public, max-age=30',
    });
  } catch {
    return json({ count: null }, 502);
  }
}

// Record a view: atomic upsert-and-increment, returning the new total in one
// round trip. SQLite's ON CONFLICT + RETURNING makes this race-free.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ count: null }, 500);

  let path = '/';
  try {
    const body = await request.json();
    path = body?.path || '/';
  } catch {
    return json({ count: null }, 400);
  }
  if (!validPath(path)) return json({ count: null }, 400);

  try {
    const row = await env.DB.prepare(
      `INSERT INTO views (path, count) VALUES (?, 1)
       ON CONFLICT(path) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
      .bind(path)
      .first();
    return json({ count: format(row?.count) });
  } catch {
    return json({ count: null }, 502);
  }
}
