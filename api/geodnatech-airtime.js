const GEODNATECH_API_KEY = process.env.GEODNATECH_API_KEY;
const GEODNATECH_BASE = "https://geodnatech.com/api";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!GEODNATECH_API_KEY) return res.status(500).json({ error: "Server is missing GEODNATECH_API_KEY." });

  const { network, amount, mobile_number } = req.body || {};
  if (!network || !amount || !mobile_number) {
    return res.status(400).json({ error: "network, amount and mobile_number are required." });
  }

  try {
    const r = await fetch(`${GEODNATECH_BASE}/topup/`, {
      method: "POST",
      headers: { Authorization: `Token ${GEODNATECH_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ network, amount, mobile_number, Ported_number: true, airtime_type: "VTU" }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.Status === "failed" || data.transaction_status === "failed") {
      return res.status(r.ok ? 502 : r.status).json({
        error: data.api_response || data.detail || data.error || "Airtime purchase failed.",
      });
    }
    res.json({ reference: data.ident || data.reference || null, message: data.api_response || "Airtime sent." });
  } catch (e) {
    res.status(502).json({ error: "Could not reach GeoDnaTech." });
  }
}
