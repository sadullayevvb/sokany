export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const token = process.env.BOT_TOKEN_sokany;
  const adminChatId = process.env.ADMIN_CHAT_ID || '6154625204';
  if (!token) return res.status(500).json({ ok: false, error: 'Bot token sozlanmagan' });

  const { name, phone, pickupDate, pickupTime, items, total } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof phone !== 'string' || !phone.trim() || !pickupDate || !pickupTime || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ ok: false, error: 'Ism, telefon, sana, vaqt va mahsulotlar kerak' });
  }
  if (items.length > 100 || items.some(x => !x || typeof x.name !== 'string' || !Number.isInteger(x.quantity) || x.quantity < 1)) {
    return res.status(400).json({ ok: false, error: 'Buyurtma tarkibi noto‘g‘ri' });
  }

  const lines = items.map(x => `• ${x.name} (${x.article || '-'}) × ${x.quantity} — ${(Number(x.price) || 0) * x.quantity}`).join('\n');
  const message = `🛒 YANGI BUYURTMA\nIsm: ${name.trim()}\nTelefon: ${phone.trim()}\nOlib ketish sanasi: ${pickupDate}\nOlib ketish vaqti: ${pickupTime}\n\n${lines}\n\nJami: ${Number(total) || 0} so‘m`;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: adminChatId, text: message })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      console.error('Order Telegram send error:', response.status, JSON.stringify(result));
      return res.status(502).json({ ok: false, error: 'Adminga yuborishda xatolik' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Order endpoint error:', error?.message || error);
    return res.status(502).json({ ok: false, error: 'Telegram bilan aloqa xatosi' });
  }
}
