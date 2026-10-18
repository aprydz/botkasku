import { parseAmount } from "../lib/format";

export type ParsedTx = 
  | { type: "IN" | "OUT"; amount: number; category: string; description: string; rawAmount: string }
  | { cmd: "SALDO" | "LAPORAN"; range?: "hari" | "minggu" | "bulan" }
  | null;

export function parseWaMessage(text: string): ParsedTx {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Cek perintah Saldo
  if (/^saldo\b/.test(lower)) return { cmd: "SALDO" };

  // 2. Cek perintah Laporan
  const lap = lower.match(/^laporan\s*(hari ini|minggu ini|bulan ini|hari|minggu|bulan)?/);
  if (lap) {
    const r = (lap[1] || "hari").replace(" ini", "") as "hari" | "minggu" | "bulan";
    return { cmd: "LAPORAN", range: r === "hari" ? "hari" : r === "minggu" ? "minggu" : "bulan" };
  }

  // 3. Tentukan Arah Transaksi (IN / OUT)
  // Bisa di awal: "keluar makan 20k", "keluar 20k makan", "out 50k kopi"
  // Atau di akhir: "makan 20k keluar", "gaji 5jt masuk"
  let dir: "IN" | "OUT" | null = null;
  let remaining = raw;

  if (/^(keluar|out)\b/i.test(remaining)) {
    dir = "OUT";
    remaining = remaining.replace(/^(keluar|out)\s*/i, "");
  } else if (/^(masuk|in)\b/i.test(remaining)) {
    dir = "IN";
    remaining = remaining.replace(/^(masuk|in)\s*/i, "");
  } else if (/\b(keluar|out)$/i.test(remaining)) {
    dir = "OUT";
    remaining = remaining.replace(/\s*\b(keluar|out)$/i, "");
  } else if (/\b(masuk|in)$/i.test(remaining)) {
    dir = "IN";
    remaining = remaining.replace(/\s*\b(masuk|in)$/i, "");
  } else {
    return null;
  }

  // 4. Cari nominal uang di sisa teks
  // Format nominal yang didukung: 20k, 500rb, 1.2jt, 25000, dll.
  let amountStr = "";
  let desc = "";

  // Pola A: Nominal di awal, deskripsi di belakang (contoh: "20k makan siang", "500rb gaji")
  const matchFront = remaining.match(/^([0-9]+(?:[.,][0-9]+)?\s*(?:k|rb|ribu|jt|juta)?)(?:\s+(.*))?$/i);
  // Pola B: Deskripsi di awal, nominal di belakang (contoh: "makan siang 20k", "gaji 500rb")
  const matchBack = remaining.match(/^(.*?)\s+([0-9]+(?:[.,][0-9]+)?\s*(?:k|rb|ribu|jt|juta)?)$/i);

  if (matchFront && parseAmount(matchFront[1])) {
    amountStr = matchFront[1];
    desc = matchFront[2] || "";
  } else if (matchBack && parseAmount(matchBack[2])) {
    amountStr = matchBack[2];
    desc = matchBack[1] || "";
  } else {
    // Jika hanya nominal saja tanpa deskripsi (contoh: "keluar 20k")
    const matchOnly = remaining.match(/^([0-9]+(?:[.,][0-9]+)?\s*(?:k|rb|ribu|jt|juta)?)$/i);
    if (matchOnly && parseAmount(matchOnly[1])) {
      amountStr = matchOnly[1];
      desc = dir === "OUT" ? "pengeluaran" : "pemasukan";
    } else {
      return null;
    }
  }

  const amount = parseAmount(amountStr);
  if (!amount) return null;

  // 5. Ekstraksi kategori & deskripsi
  let tail = desc.trim();
  let category = dir === "OUT" ? "pengeluaran" : "pemasukan";
  
  // Dukungan hashtag (contoh: #transport bensin)
  const tag = tail.match(/#([a-z0-9_\-]+)/i);
  if (tag) {
    category = tag[1].toLowerCase();
    tail = tail.replace(tag[0], " ").trim();
  } else if (tail) {
    const w = tail.split(/\s+/)[0];
    if (w && w.length <= 20) category = w.toLowerCase();
  }
  const description = tail || category;

  return { type: dir, amount, category, description, rawAmount: amountStr };
}
