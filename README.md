# Kasku — Web + WA Sync 

Lokasi: `D:\projekan\kasku` — Style 1 Minimalist Fintech, Next.js + Tailwind + Supabase Realtime.

## Alur
`WA pribadi -> wa-bot (Baileys) -> Parser -> Supabase transactions -> Realtime -> Web (Vercel/localhost) auto update`

Parser WA: `keluar 35k makan siang`, `masuk 500rb gaji`, `keluar 1.2jt #transport`, `saldo`, `laporan hari ini|minggu ini|bulan ini`. Bot auto-reply `Dicatat: Keluar Rp35.000 (makan) — Sisa saldo: Rp...`.

## Setup 1x
1. Buat Supabase project (gratis) -> jalankan SQL `supabase/schema.sql` di SQL Editor -> copy URL + ANON_KEY.
2. `copy .env.local.example .env.local` isi `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` (service_role optional).
3. Install: `npm install` (butuh internet — ping registry ok, jika timeout coba lagi atau ganti npm mirror)

## Jalan lokal
- Web: `npm run dev` -> http://localhost:3000
- Bot WA: `npm run bot:dev` -> scan QR sekali (WhatsApp > Linked Devices). Session di `wa-bot/auth_info/`. Kirim `keluar 20k makan` ke nomor bot (nomor WA yang login) dari nomor lain? Untuk pribadi, kirim dari nomor sendiri ke diri sendiri tetap ke-capture; disarankan bot pakai nomor yang sama (fromMe di-skip, jadi pakai nomor kedua atau test dari nomor lain).

## Deploy Vercel
- Push ke GitHub, import di Vercel, set Env Vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Baileys tidak bisa di Vercel — bot tetap jalan di laptop (`npm run bot:dev`) atau deploy worker di Railway/Render.

## Troubleshooting
- Transaksi tidak masuk -> cek RLS policy di schema sudah run
- Bot tidak konek -> hapus `wa-bot/auth_info` dan scan ulang

## Struktur
```
app/page.tsx + components/Dashboard.tsx  # UI realtime
lib/format.ts                             # parseAmount k/rb/jt
lib/supabase/client.ts
wa-bot/parser.ts + wa-bot/index.ts
supabase/schema.sql
```
