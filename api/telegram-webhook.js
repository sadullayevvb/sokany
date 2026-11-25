export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const token = process.env.BOT_TOKEN_sokany;
  const adminChatId = process.env.ADMIN_CHAT_ID || '6154625204';
  if (!token) return res.status(500).send('Missing BOT_TOKEN_sokany');

  const message = req.body?.message;
  if (!message?.chat?.id || !message?.text || message.from?.is_bot) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  // Do not forward messages sent by the admin back to the admin.
  if (String(message.chat.id) === String(adminChatId)) {
    return res.status(200).json({ ok: true, ignored: true });
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
  if (!response.ok) return res.status(502).json({ ok: false, error: 'Telegram sendMessage failed' });
  return res.status(200).json({ ok: true });
}
