# KASKU SYNC — PLAN FORMAL
Lokasi: D:\projekan\kasku

## Stack Final (Locked)
- Core: Next.js 15 (App Router) + Tailwind CSS v4
- UI Kit: shadcn/ui + Lucide Icons + Inter Font — Style 1 Minimalist Fintech (rounded-2xl, bg-white, shadow-sm, clean)
- Animasi & Chart: Framer Motion + Recharts
- DB + Realtime: Supabase (Postgres + Realtime) — gratis
- WA: @whiskeysockets/baileys (unofficial, jalan lokal)
- Hosting: Vercel (free tier) untuk Web; wa-bot jalan di laptop (npm run bot:dev)

## Arsitektur
WA Pribadi -> wa-bot (Baileys, auth_info/) -> Parser (keluar/masuk, k/rb/jt, #kategori) -> Supabase (transactions) -> Supabase Realtime -> Web UI (Vercel/localhost) auto update tanpa refresh
Bot auto-reply: ✅ Dicatat: Keluar Rp20.000 (Makan) — Sisa saldo: Rp...

## Struktur Folder
D:\projekan\kasku\
├── app/                # Next.js App Router
├── components/ui/      # shadcn
├── lib/supabase/       # supabase client
├── wa-bot/             # Baileys listener + parser + auth_info
├── supabase/schema.sql # SQL schema
└── PLAN.md (ini)

## Schema DB (Supabase)
- users(id uuid, phone text, name text)
- categories(id uuid, name text, type text)
- transactions(id uuid, user_id uuid, type text CHECK IN/OUT, amount int, category text, description text, source text CHECK wa/web, created_at timestamptz)
- wa_logs(id uuid, from_phone text, raw_message text, parsed_status text, created_at timestamptz)

## Parser WA
- keluar 35k makan siang -> OUT 35000, cat:makan
- masuk 500rb gaji -> IN 500000, cat:gaji
- keluar 1.2jt #transport -> OUT 1200000, cat:transport
- saldo / laporan hari ini|minggu ini -> reply rekap

## Fase Eksekusi
1. Init Next.js + Tailwind + shadcn + Supabase client di D:\projekan\kasku
2. Build UI Style 1: Dashboard saldo, List transaksi, Form Add, Chart Recharts
3. Setup wa-bot: Baileys QR login + persist session
4. Parser + Insert Supabase + Bot Reply + Realtime sync
5. Deploy Vercel

## Catatan Penting
- Baileys tidak bisa di Vercel (butuh persist). Web di Vercel, bot di lokal/Railway.
- Supabase free tier cukup untuk pribadi (500MB, Realtime included).
