const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
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
}
