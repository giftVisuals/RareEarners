const GEODNATECH_API_KEY = process.env.GEODNATECH_API_KEY;
const GEODNATECH_BASE = "https://geodnatech.com/api";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  if (!GEODNATECH_API_KEY) return res.status(500).json({ error: "GEODNATECH_API_KEY not set in environment." });

  try {
    const r = await fetch(`${GEODNATECH_BASE}/user/`, {
      method: "GET",
      headers: { Authorization: `Token ${GEODNATECH_API_KEY}`, "Content-Type": "application/json" },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error(`GeoDnaTech error (${r.status}):`, data);
      return res.status(r.status || 502).json({ error: data.detail || data.error || "GeoDnaTech API error." });
    }
    const raw = data.user?.wallet_balance ?? data.user?.Account_Balance ?? data?.wallet_balance ?? data?.Account_Balance ?? null;
    const balance = raw !== null ? Number(raw) : null;
    if (balance === null) {
      console.warn("Could not parse wallet balance from response:", data);
      return res.status(502).json({ error: "Wallet balance not found in response." });
    }
    res.json({ balance });
  } catch (e) {
    console.error("GeoDnaTech fetch error:", e.message);
    res.status(502).json({ error: "Could not reach GeoDnaTech: " + e.message });
  }
}
