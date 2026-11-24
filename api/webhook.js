const API = "https://api.telegram.org";
const ADMIN_ID = 6154625204;
const MINI_APP_URL = "https://sokany-ten.vercel.app";

async function telegram(method, payload) {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not configured");
  const r = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!r.ok || !data.ok) throw new Error(data.description || "Telegram API error");
  return data.result;
}

async function sendMessage(chatId, text) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: [[{
        text: "🛍 Mini App’ni ochish",
        web_app: { url: MINI_APP_URL }
      }]]
    }
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("Sokany webhook is online");
  try {
    const m = req.body?.message;
    if (m?.chat?.id) {
      const chatId = m.chat.id;
      const isAdmin = Number(m.from?.id) === ADMIN_ID;

      if (m.text === "/start") {
        if (isAdmin) {
          await sendMessage(chatId, "Assalomu alaykum, admin! Mini App’ni ochish uchun quyidagi tugmani bosing.");
        } else {
          await sendMessage(chatId, "Assalomu alaykum! Sokany rasmiy do‘koniga xush kelibsiz. Mahsulotlarni ko‘rish va buyurtma berish uchun do‘konni oching.");
        }
      } else if (m.document && isAdmin) {
        await sendMessage(chatId, "Katalog fayllarini botga yuborish shart emas. Mini App’ni ochish uchun quyidagi tugmani bosing.");
      } else if (isAdmin) {
        await sendMessage(chatId, "Mini App’ni ochish uchun quyidagi tugmani bosing.");
      } else {
        await sendMessage(chatId, "Mahsulotlarni ko‘rish uchun Sokany do‘konini oching.");
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: false });
  }
};
