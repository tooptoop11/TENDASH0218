const DEFAULT_TIMEOUT_MS = 12000;

const withTimeout = async (promiseFactory, ms = DEFAULT_TIMEOUT_MS) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await promiseFactory(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
};

const isBlockedHost = (host) => {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".local") ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    h.startsWith("172.16.") ||
    h.startsWith("172.17.") ||
    h.startsWith("172.18.") ||
    h.startsWith("172.19.") ||
    h.startsWith("172.2")
  );
};

export async function onRequestGet({ request }) {
  try {
    const u = new URL(request.url);
    const target = u.searchParams.get("url");
    if (!target) {
      return new Response(JSON.stringify({ error: "missing_url" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "invalid_url" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
      return new Response(JSON.stringify({ error: "blocked_url" }), {
        status: 403,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const upstream = await withTimeout(async (signal) => {
      return fetch(parsed.toString(), {
        signal,
        redirect: "follow",
        headers: {
          "User-Agent": "TEN-Dashboard-V2/1.0",
          "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain, */*",
        },
      });
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `upstream_${upstream.status}` }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const text = await upstream.text();
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "rss_proxy_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
