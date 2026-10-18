export function formatRp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function formatShort(n: number) {
  if (n >= 1_000_000_000) return (n/1e9).toFixed(1).replace(/\.0$/,"") + "M";
  if (n >= 1_000_000) return (n/1e6).toFixed(1).replace(/\.0$/,"") + "jt";
  if (n >= 1000) return (n/1000).toFixed(0) + "k";
  return String(n);
}

export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.toLowerCase().trim();

  // Bersihkan prefix mata uang seperti "rp" atau "rp."
  s = s.replace(/^rp\.?\s*/i, "");

  // Deteksi pola angka dan sufiks satuan
  const m = s.match(/^([0-9.,]+)\s*(k|rb|ribu|jt|juta)?$/);
  if (!m) return null;

  let numPart = m[1];
  const suf = m[2];

  if (suf) {
    // Kasus dengan sufiks satuan (contoh: 1,5jt / 1.5jt / 2,5k / 500rb)
    // Koma (standar Indonesia) maupun titik diubah menjadi titik desimal
    numPart = numPart.replace(/,/g, ".");
    
    // Normalisasi jika ada lebih dari 1 titik akibat salah ketik
    const parts = numPart.split(".");
    if (parts.length > 2) {
      numPart = parts[0] + "." + parts.slice(1).join("");
    }

    let num = parseFloat(numPart);
    if (isNaN(num)) return null;

    if (suf === "k" || suf === "rb" || suf === "ribu") num *= 1000;
    else if (suf === "jt" || suf === "juta") num *= 1000000;

    return Math.round(num);
  } else {
    // Kasus angka murni (contoh: 50.000 / 1.500.000 / 50000 / 25,000)
    // Titik dan koma dihilangkan karena berfungsi sebagai pemisah ribuan
    const cleanNum = numPart.replace(/[.,]/g, "");
    const num = parseInt(cleanNum, 10);
    return isNaN(num) ? null : num;
  }
}
