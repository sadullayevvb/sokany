const API = "https://api.telegram.org";
const ADMIN_ID = 6154625204;
const { put, list } = require("@vercel/blob");
const XLSX = require("xlsx");
const { createCanvas, DOMMatrix, ImageData, Path2D } = require("@napi-rs/canvas");
global.DOMMatrix ||= DOMMatrix;
global.ImageData ||= ImageData;
global.Path2D ||= Path2D;

async function telegram(method, payload) {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not configured");
  const r = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!r.ok || !data.ok) throw new Error(data.description || "Telegram API error");
  return data.result;
}
async function sendMessage(chatId, text, extra = {}) {
  return telegram("sendMessage", { chat_id: chatId, text, ...extra });
}
async function getStoredState() {
  const found = await list({ prefix: "sokany/state.json", limit: 1 });
  if (!found.blobs?.length) return { prices: [], pages: [], updatedAt: null };
  const r = await fetch(found.blobs[0].url);
  return r.ok ? r.json() : { prices: [], pages: [], updatedAt: null };
}
async function saveState(state) {
  await put("sokany/state.json", JSON.stringify(state), {
    access: "public", addRandomSuffix: false, allowOverwrite: true,
    contentType: "application/json"
  });
}
function norm(v) { return String(v ?? "").trim().toLowerCase().replace(/[^a-zа-яё0-9]/gi, ""); }
function findColumn(headers, terms) {
  return headers.findIndex(h => terms.some(t => norm(h).includes(norm(t))));
}
async function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
    if (!data.length) continue;
    const headers = Object.keys(data[0]);
    const skuKey = headers.find(h => /артикул|article|sku|код|модель/i.test(h));
    const priceKey = headers.find(h => /цена|price|сумма|стоимость/i.test(h));
    const nameKey = headers.find(h => /название|наименование|товар|name|модель/i.test(h) && h !== skuKey);
    if (!skuKey || !priceKey) continue;
    for (const row of data) {
      const sku = String(row[skuKey] ?? "").trim();
      const price = row[priceKey];
      if (!sku || price === "" || price == null) continue;
      rows.push({ sku, key: norm(sku), price: String(price), name: nameKey ? String(row[nameKey] || "").trim() : "" });
    }
  }
  if (!rows.length) throw new Error("Excel ichidan Артикул va Цена ustunlari topilmadi. Ustun nomlarini tekshiring.");
  return rows;
}
async function parsePdf(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim();
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    const image = await canvas.encode("png");
    const blob = await put(`sokany/catalog-page-${i}.png`, image, {
      access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "image/png"
    });
    pages.push({ page: i, text, image: blob.url });
  }
  return pages;
}
function buildProducts(state) {
  const products = [];
  for (const price of state.prices || []) {
    const match = (state.pages || []).find(p => norm(p.text).includes(price.key));
    if (!match) continue;
    const skuPos = norm(match.text).indexOf(price.key);
    const name = price.name || match.text.slice(Math.max(0, skuPos - 100), skuPos).trim().slice(-90) || `SOKANY ${price.sku}`;
    products.push({ id: price.key, sku: price.sku, article: price.sku, name, price: price.price, image: match.image, page: match.page });
  }
  return products;
}
async function processAdminFile(m, chatId) {
  const file = m.document;
  const filename = file.file_name || "file";
  const ext = filename.toLowerCase().split(".").pop();
  if (!["pdf", "xlsx", "xls"].includes(ext)) {
    return sendMessage(chatId, "Faqat PDF katalog yoki Excel (.xlsx/.xls) narxlar faylini yuboring.");
  }
  await sendMessage(chatId, `Qabul qilindi: ${filename}. Fayl o‘qilmoqda...`);
  const meta = await telegram("getFile", { file_id: file.file_id });
  const url = `${API}/file${process.env.BOT_TOKEN}/${meta.file_path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Telegram faylini yuklab bo‘lmadi");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (ext === "pdf") {
    const pages = await parsePdf(buffer);
    const state = await getStoredState();
    state.pages = pages;
    state.updatedAt = new Date().toISOString();
    await saveState(state);
    const products = buildProducts(state);
    await saveState({ ...state, products });
    await sendMessage(chatId, `PDF katalog o‘qildi: ${pages.length} sahifa. Narx Excel fayli ham yuklangach, artikul bo‘yicha mos mahsulotlar Mini App’da chiqadi.`);
  } else {
    const prices = await parseExcel(buffer);
    const state = await getStoredState();
    state.prices = prices;
    state.updatedAt = new Date().toISOString();
    const products = buildProducts(state);
    await saveState({ ...state, products });
    await sendMessage(chatId, `Excel o‘qildi: ${prices.length} ta narx topildi. PDF katalog ham yuklangan bo‘lsa, ${products.length} ta mos mahsulot Mini App’ga chiqarildi.`);
  }
}
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("Sokany webhook is online");
  try {
    const m = req.body?.message;
    if (m?.chat?.id) {
      const chatId = m.chat.id;
      const isAdmin = Number(m.from?.id) === ADMIN_ID;
      if (m.text === "/start") {
        if (isAdmin) await sendMessage(chatId, "Assalomu alaykum, admin! PDF katalog va Excel narxlar faylini yuboring.");
        else await sendMessage(chatId, "Assalomu alaykum! Sokany rasmiy do‘koniga xush kelibsiz. Mahsulotlarni ko‘rish va buyurtma berish uchun do‘konni oching.");
      } else if (m.document) {
        if (isAdmin) await processAdminFile(m, chatId);
        else await sendMessage(chatId, "Fayl yuborish faqat administrator uchun.");
      } else if (isAdmin) await sendMessage(chatId, "Admin: PDF katalog yoki Excel narxlar faylini yuboring.");
      else await sendMessage(chatId, "Rahmat! Sokany do‘konidagi mahsulotlarni ko‘rish uchun do‘konni oching.");
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    if (req.body?.message?.chat?.id) {
      try { await sendMessage(req.body.message.chat.id, `Xatolik: ${e.message}. Fayl formatini va jadval ustunlarini tekshiring.`); } catch {}
    }
    return res.status(200).json({ ok: false });
  }
};
