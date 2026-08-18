import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const CHEAPDATAHUB_API_KEY = process.env.CHEAPDATAHUB_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://rare-earners.vercel.app";
const CHEAPDATAHUB_BASE = "https://www.cheapdatahub.ng/api/v1/resellers";

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "12mb" })); // task-proof screenshots come in as base64 JSON

app.get("/health", (req, res) => res.json({ ok: true }));

// Uploads a task-proof screenshot to ImgBB and returns its hosted URL, so
// Firestore only ever stores a short link instead of a multi-hundred-KB
// base64 blob per submission. IMGBB_API_KEY stays server-side.
app.post("/api/upload-image", async (req, res) => {
  if (!IMGBB_API_KEY) return res.status(500).json({ error: "Server is missing IMGBB_API_KEY." });
  const { image } = req.body || {};
  if (!image || typeof image !== "string") {
    return res.status(400).json({ error: "A base64 'image' field is required." });
  }
  try {
    const form = new FormData();
    form.append("image", image);
    const r = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`, {
      method: "POST",
      body: form,
    });
    const data = await r.json();
    if (!data.success) return res.status(502).json({ error: data?.error?.message || "ImgBB upload failed." });
    res.json({ url: data.data.url });
  } catch (e) {
    res.status(502).json({ error: "Could not reach the image host." });
  }
});

// Proxies Paystack's bank list so the frontend gets Paystack's own bank codes
// (the codes that /api/resolve-account actually needs) instead of a hardcoded list.
app.get("/api/banks", async (req, res) => {
  if (!PAYSTACK_SECRET_KEY) return res.status(500).json({ error: "Server is missing PAYSTACK_SECRET_KEY." });
  try {
    const r = await fetch("https://api.paystack.co/bank?country=nigeria&currency=NGN", {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const data = await r.json();
    if (!data.status) return res.status(502).json({ error: data.message || "Could not fetch bank list." });
    const banks = data.data.map((b) => ({ name: b.name, code: b.code, slug: b.slug }));
    res.json({ banks });
  } catch (e) {
    res.status(502).json({ error: "Could not reach Paystack." });
  }
});

// Resolves a Nigerian bank account number to the account holder's name via Paystack.
// This works with a Paystack TEST secret key (no business verification / KYB needed) —
// it's a read-only lookup, not a money-moving transaction.
app.get("/api/resolve-account", async (req, res) => {
  const { account_number, bank_code } = req.query;
  if (!PAYSTACK_SECRET_KEY) return res.status(500).json({ error: "Server is missing PAYSTACK_SECRET_KEY." });
  if (!/^\d{10}$/.test(account_number || "") || !bank_code) {
    return res.status(400).json({ error: "account_number (10 digits) and bank_code are required." });
  }
  try {
    const r = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const data = await r.json();
    if (!data.status) return res.status(404).json({ error: data.message || "Could not resolve this account number." });
    res.json({ account_name: data.data.account_name, account_number: data.data.account_number });
  } catch (e) {
    res.status(502).json({ error: "Could not reach the verification service." });
  }
});

// Proxies CheapDataHub's reseller wallet balance so admin can see if the wallet
// needs funding before airtime auto-pay requests will succeed.
app.get("/api/cheapdatahub/balance", async (req, res) => {
  if (!CHEAPDATAHUB_API_KEY) return res.status(500).json({ error: "Server is missing CHEAPDATAHUB_API_KEY." });
  try {
    const r = await fetch(`${CHEAPDATAHUB_BASE}/wallet/balance/`, {
      headers: { Authorization: `Bearer ${CHEAPDATAHUB_API_KEY}` },
    });
    const data = await r.json();
    if (String(data.status) !== "true") return res.status(502).json({ error: data.message || "Could not fetch wallet balance." });
    res.json({ balance: data.data?.balance });
  } catch (e) {
    res.status(502).json({ error: "Could not reach CheapDataHub." });
  }
});

// Sends real airtime via CheapDataHub's reseller API. Called by admin.html when an
// admin approves a pending airtime withdrawal, so CHEAPDATAHUB_API_KEY stays server-side.
app.post("/api/cheapdatahub/airtime", async (req, res) => {
  if (!CHEAPDATAHUB_API_KEY) return res.status(500).json({ error: "Server is missing CHEAPDATAHUB_API_KEY." });
  const { provider_id, phone_number, amount } = req.body || {};
  if (!provider_id || !phone_number || !amount) {
    return res.status(400).json({ error: "provider_id, phone_number and amount are required." });
  }
  try {
    const r = await fetch(`${CHEAPDATAHUB_BASE}/airtime/purchase/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CHEAPDATAHUB_API_KEY}` },
      body: JSON.stringify({ provider_id, phone_number, amount }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || String(data.status) !== "true") {
      const messages = {
        401: "CheapDataHub rejected the API key.",
        402: "CheapDataHub wallet has insufficient balance.",
        409: "Duplicate request — please requery before retrying.",
        422: "CheapDataHub rejected the request details.",
      };
      return res.status(r.status || 502).json({ error: data.message || messages[r.status] || "Airtime purchase failed." });
    }
    res.json({ reference: data.reference || data.transaction_id || null, message: data.message || "Airtime delivered." });
  } catch (e) {
    res.status(502).json({ error: "Could not reach CheapDataHub." });
  }
});

app.listen(PORT, () => console.log(`Rare Earners server listening on port ${PORT}`));
