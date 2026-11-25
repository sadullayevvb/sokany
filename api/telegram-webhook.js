export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const token = process.env.BOT_TOKEN_sokany;
  const adminChatId = process.env.ADMIN_CHAT_ID || '6154625204';
  if (!token) {
    console.error('Missing environment variable: BOT_TOKEN_sokany');
    return res.status(500).send('Missing BOT_TOKEN_sokany');
  }

  const message = req.body?.message;
  if (!message?.chat?.id || !message?.text || message.from?.is_bot) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    // Show persistent bottom Web App keyboard buttons on every /start.
    if (/^\/start(?:@[A-Za-z0-9_]+)?(?:\s|$)/.test(message.text) || message.text === '/start') {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: 'SOKANY do‘koniga xush kelibsiz! Katalogni ochish uchun pastdagi tugmani bosing.',
          reply_markup: {
            keyboard: [[
              { text: '🛍 Zakaz qilish', web_app: { url: 'https://sokany-ten.vercel.app' } },
              { text: '📦 Katalogni ko‘rish', web_app: { url: 'https://sokany-ten.vercel.app' } }
            ]],
            resize_keyboard: true,
            is_persistent: true
          }
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        console.error('Telegram start keyboard error:', response.status, JSON.stringify(result));
        return res.status(502).json({ ok: false, error: 'Mini App tugmalarini yuborib bo‘lmadi' });
      }
      return res.status(200).json({ ok: true, startButtonsSent: true });
    }

    // Admin can reply directly to a forwarded customer notification.
    if (String(message.chat.id) === String(adminChatId)) {
      const repliedText = message.reply_to_message?.text || '';
      const match = repliedText.match(/Telegram ID:\s*(\d+)/);
      if (!match) return res.status(200).json({ ok: true, ignored: true });
      const customerChatId = match[1];
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: customerChatId, text: message.text })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        console.error('Telegram customer reply error:', response.status, JSON.stringify(result));
        return res.status(502).json({ ok: false, error: 'Telegram customer reply failed' });
      }
      return res.status(200).json({ ok: true, replied: true });
    }

    const user = message.from || {};
    const who = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Noma’lum';
    const username = user.username ? `@${user.username}` : 'username yo‘q';
    const text = `📩 Yangi mijoz xabari\nIsm: ${who}\nUsername: ${username}\nTelegram ID: ${user.id || message.chat.id}\n\n${message.text}`;

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: adminChatId, text })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      console.error('Telegram sendMessage error:', response.status, JSON.stringify(result));
      return res.status(502).json({ ok: false, error: 'Telegram sendMessage failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook exception:', error?.message || error);
    return res.status(502).json({ ok: false, error: 'Telegram request failed' });
  }
}
