export default function handler(req, res) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket.remoteAddress || "";
  res.json({ ip: ip.trim() });
}
