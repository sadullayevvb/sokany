module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");
  const token = process.env.BOT_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: "BOT_TOKEN missing" });
  const api = `https://api.telegram.org/bot${token}`;
  const webhookUrl = "https://sokany-ten.vercel.app/api/webhook";
  const miniAppUrl = "https://sokany-ten.vercel.app";
  try {
    const [webhookResponse, menuResponse] = await Promise.all([
      fetch(`${api}/setWebhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: webhookUrl })
      }),
      fetch(`${api}/setChatMenuButton`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          menu_button: {
            type: "web_app",
            text: "Sokany do‘koni",
            web_app: { url: miniAppUrl }
          }
        })
      })
    ]);
    const webhook = await webhookResponse.json();
    const menuButton = await menuResponse.json();
    const ok = webhookResponse.ok && webhook.ok && menuResponse.ok && menuButton.ok;
    return res.status(ok ? 200 : 502).json({ ok, webhook, menuButton });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ ok: false, error: "Telegram connection failed" });
  }
};
