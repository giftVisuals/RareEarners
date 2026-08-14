import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://rare-earners.vercel.app";

app.use(cors({ origin: ALLOWED_ORIGIN }));

app.get("/health", (req, res) => res.json({ ok: true }));

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

app.listen(PORT, () => console.log(`Rare Earners server listening on port ${PORT}`));
