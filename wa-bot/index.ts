import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import path from "path";
import { parseWaMessage } from "./parser";
import { getSupabase } from "./supabase";
import { formatRp } from "../lib/format";

const AUTH_DIR = path.join(process.cwd(), "wa-bot", "auth_info");
const logger = pino({ level: "silent" });

async function getSaldo(supabase: any) {
  const { data } = await supabase.from("transactions").select("type,amount");
  if (!data) return 0;
  return data.reduce((acc: number, r: any) => acc + (r.type === "IN" ? r.amount : -r.amount), 0);
}
async function handleLaporan(supabase: any, range: string = "hari") {
  let since = new Date();
  if (range === "hari") {
    since.setHours(0, 0, 0, 0);
  } else if (range === "minggu") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    since = d;
  } else {
    since = new Date(since.getFullYear(), since.getMonth(), 1, 0, 0, 0, 0);
  }
  const { data } = await supabase.from("transactions").select("*").gte("created_at", since.toISOString()).order("created_at",{ascending:false});
  const rows = data || [];
  const out = rows.filter((r:any)=>r.type==="OUT").reduce((a:number,b:any)=>a+b.amount,0);
  const inc = rows.filter((r:any)=>r.type==="IN").reduce((a:number,b:any)=>a+b.amount,0);
  if (!rows.length) return `Belum ada transaksi ${range} ini.`;
  const list = rows.slice(0,8).map((r:any)=>`${r.type==="OUT"?"-":"+"} ${formatRp(r.amount)} ${r.category} (${r.description})`).join("\n");
  return `Laporan ${range} ini\nMasuk: ${formatRp(inc)}\nKeluar: ${formatRp(out)}\nSaldo periode: ${formatRp(inc-out)}\n\n${list}`;
}
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state as any, logger });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u) => {
    const { connection, lastDisconnect, qr } = u as any;
    if (qr) { console.log("Scan QR di WhatsApp > Linked Devices:"); qrcode.generate(qr, { small: true }); }
    if (connection === "close") {
      const code = (lastDisconnect?.error as any)?.output?.statusCode;
      console.log("Connection closed, code:", code, lastDisconnect?.error?.message);
      if (code === DisconnectReason.loggedOut) {
        console.log("Logged out, hapus wa-bot/auth_info dan scan ulang.");
      } else if (code === DisconnectReason.connectionReplaced) {
        console.log("⚠️ Konflik sesi (code 440): Ada bot atau sesi lain yang berjalan dengan nomor/auth yang sama. Bot dihentikan agar tidak bentrok.");
      } else {
        console.log("Mencoba menghubungkan kembali dalam 3 detik...");
        setTimeout(() => start(), 3000);
      }
    } else if (connection === "open") {
      console.log("KASKU WA connected - coba: keluar 20k makan | masuk 500rb gaji | saldo | laporan hari ini");
    }
  });
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const supabase = getSupabase();
    for (const m of messages) {
      // allow fromMe for self-chat (pribadi) - hapus filter fromMe
      const jid = m.key.remoteJid!;
      if (jid.endsWith("@g.us")) continue;
      const text = (m.message as any)?.conversation || (m.message as any)?.extendedTextMessage?.text || "";
      if (!text) continue;

      // Cegah bot merespons pesannya sendiri (menghentikan infinite loop)
      const BOT_RESPONSES = ["Format tidak dikenali", "Dicatat:", "Saldo:", "Laporan ", "Gagal simpan:"];
      if (BOT_RESPONSES.some((prefix) => text.trim().startsWith(prefix))) {
        continue;
      }

      const from = jid.replace(/@.*/,"");
      console.log(`[WA] ${from}: ${text}`);
      const parsed: any = parseWaMessage(text);
      await supabase.from("wa_logs").insert({ from_phone: from, raw_message: text, parsed_status: parsed ? JSON.stringify(parsed) : "unparsed" });
      if (!parsed) { await sock.sendMessage(jid, { text: "Format tidak dikenali.\nContoh:\n* keluar 35k makan siang\n* masuk 500rb gaji\n* keluar 1.2jt #transport\n* saldo\n* laporan hari ini" }); continue; }
      if (parsed.cmd === "SALDO") { const saldo=await getSaldo(supabase); await sock.sendMessage(jid,{text:`Saldo: ${formatRp(saldo)}`}); continue; }
      if (parsed.cmd === "LAPORAN") { const txt=await handleLaporan(supabase, parsed.range); await sock.sendMessage(jid,{text:txt}); continue; }
      const { error } = await supabase.from("transactions").insert({ type: parsed.type, amount: parsed.amount, category: parsed.category, description: parsed.description, source:"wa", from_phone: from, raw_message: text });
      if (error){ console.error(error); await sock.sendMessage(jid,{text:"Gagal simpan: "+error.message}); continue; }
      const saldo=await getSaldo(supabase);
      const sign=parsed.type==="OUT"?"Keluar":"Masuk";
      await sock.sendMessage(jid,{text:`Dicatat: ${sign} ${formatRp(parsed.amount)} (${parsed.category})\n${parsed.description}\nSisa saldo: ${formatRp(saldo)}`});
    }
  });
}
start().catch(console.error);
