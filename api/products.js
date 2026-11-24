const { list } = require("@vercel/blob");
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const found = await list({ prefix: "sokany/state.json", limit: 1 });
    if (!found.blobs?.length) return res.status(200).json({ products: [], updatedAt: null });
    const r = await fetch(found.blobs[0].url);
    if (!r.ok) throw new Error("Catalog storage unavailable");
    const state = await r.json();
    return res.status(200).json({ products: state.products || [], updatedAt: state.updatedAt || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Katalogni yuklashda xatolik" });
  }
};
