const API = "https://api.telegram.org";
const ADMIN_ID = 6154625204;

async function telegram(method, payload) {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not configured");
  const r = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error("Telegram API error");
  return r.json();
}

async function sendMessage(chatId, text, extra = {}) {
  return telegram("sendMessage", { chat_id: chatId, text, ...extra });
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
          await sendMessage(chatId, "Assalomu alaykum, admin! PDF katalog va Excel narxlar faylini yuboring.");
        } else {
          await sendMessage(chatId, "Assalomu alaykum! Sokany rasmiy do‘koniga xush kelibsiz. Mahsulotlarni ko‘rish va buyurtma berish uchun do‘konni oching.");
        }
      } else if (m.document) {
        if (isAdmin) {
          await sendMessage(chatId, `Fayl qabul qilindi: ${m.document.file_name || "fayl"}\nHozircha faylni saqlash va qayta ishlash funksiyasi ulanmoqda.`);
        } else {
          await sendMessage(chatId, "Fayl yuborish faqat administrator uchun.");
        }
      } else if (isAdmin) {
        await sendMessage(chatId, "Admin: PDF katalog yoki Excel narxlar faylini yuboring.");
      } else {
        await sendMessage(chatId, "Rahmat! Sokany do‘konidagi mahsulotlarni ko‘rish uchun do‘konni oching.");
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: false });
  }
};
