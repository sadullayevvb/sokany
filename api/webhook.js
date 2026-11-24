const API = "https://api.telegram.org";

async function sendMessage(chatId, text) {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not configured");
  const r = await fetch(`${API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  if (!r.ok) throw new Error("Telegram API error");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("Sokany webhook is online");
  try {
    const m = req.body?.message;
    if (m?.chat?.id) {
      if (m.text === "/start") {
        await sendMessage(m.chat.id, "Assalomu alaykum! Sokany bot ishga tayyor. PDF yoki Excel fayl yuboring.");
      } else if (m.document) {
        await sendMessage(m.chat.id, `Fayl qabul qilindi: ${m.document.file_name || "fayl"}\nFaylni qayta ishlash funksiyasini keyingi bosqichda qo‘shamiz.`);
      } else {
        await sendMessage(m.chat.id, "PDF yoki Excel fayl yuboring.");
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: false });
  }
};
