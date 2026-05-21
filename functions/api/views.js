/**
 * Cloudflare Pages Function — proxy for GoatCounter view counts.
 * Avoids CORS by fetching GoatCounter server-side and forwarding the result.
 *
 * GET /api/views?path=/posts/my-post
 * Returns: { "count": "1,243", "count_unique": "892" }
 */
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/';

  try {
    const res = await fetch(
      `https://thatpentesterguy.goatcounter.com/counter/${encodeURIComponent(path)}.json`,
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ count: null }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch {
    return new Response(JSON.stringify({ count: null }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
