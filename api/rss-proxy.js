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

// Vercel Node handler
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const target = req.query?.url;

    if (!target) {
      return res.status(400).json({ error: "missing_url" });
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return res.status(400).json({ error: "invalid_url" });
    }

    if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
      return res.status(403).json({ error: "blocked_url" });
    }

    const upstream = await withTimeout(async (signal) => {
      return fetch(parsed.toString(), {
        signal,
        redirect: "follow",
        headers: {
          "User-Agent": "TEN-Dashboard-V2/1.0",
          "Accept":
            "application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain, */*",
        },
      });
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `upstream_${upstream.status}` });
    }

    const text = await upstream.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    return res.status(200).send(text);
  } catch {
    return res.status(500).json({ error: "rss_proxy_failed" });
  }
}
