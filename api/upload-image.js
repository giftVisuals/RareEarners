const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
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
}
