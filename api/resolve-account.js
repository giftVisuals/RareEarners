const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

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
}
