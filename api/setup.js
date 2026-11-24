module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");
  const token = process.env.BOT_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: "BOT_TOKEN missing" });
  const webhookUrl = "https://sokany-ten.vercel.app/api/webhook";
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: webhookUrl })
    });
    const result = await response.json();
    return res.status(response.ok ? 200 : 502).json(result);
  } catch (error) {
    console.error(error);
    return res.status(502).json({ ok: false, error: "Telegram connection failed" });
  }
};
