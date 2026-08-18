const GEODNATECH_API_KEY = process.env.GEODNATECH_API_KEY;
const GEODNATECH_BASE = "https://geodnatech.com/api";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  if (!GEODNATECH_API_KEY) return res.status(500).json({ error: "Server is missing GEODNATECH_API_KEY." });

  try {
    const r = await fetch(`${GEODNATECH_BASE}/user/`, {
      headers: { Authorization: `Token ${GEODNATECH_API_KEY}`, "Content-Type": "application/json" },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status || 502).json({ error: data.detail || data.error || "Could not fetch wallet balance." });
    const raw = data.user?.wallet_balance ?? data.user?.Account_Balance ?? null;
    const balance = raw !== null ? Number(raw) : null;
    res.json({ balance });
  } catch (e) {
    res.status(502).json({ error: "Could not reach GeoDnaTech." });
  }
}
