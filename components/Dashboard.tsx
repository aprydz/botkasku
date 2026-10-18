"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatRp, formatShort } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Plus,
  Trash2,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Utensils,
  Car,
  Briefcase,
  ShoppingBag,
  Zap,
  Film,
  HelpCircle,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";

type Tx = {
  id: string;
  type: "IN" | "OUT";
  amount: number;
  category: string;
  description: string;
  source: string;
  created_at: string;
};

// Pemetaan icon berdasarkan kategori
function getCategoryIcon(cat: string) {
  const c = cat.toLowerCase();
  if (c.includes("makan") || c.includes("minum") || c.includes("kopi") || c.includes("food")) {
    return <Utensils className="h-4 w-4 text-amber-400" />;
  }
  if (c.includes("transport") || c.includes("bensin") || c.includes("ojek") || c.includes("gojek") || c.includes("grab")) {
    return <Car className="h-4 w-4 text-sky-400" />;
  }
  if (c.includes("gaji") || c.includes("salary") || c.includes("income") || c.includes("projek")) {
    return <Briefcase className="h-4 w-4 text-emerald-400" />;
  }
  if (c.includes("belanja") || c.includes("shop") || c.includes("beli")) {
    return <ShoppingBag className="h-4 w-4 text-purple-400" />;
  }
  if (c.includes("tagihan") || c.includes("listrik") || c.includes("wifi") || c.includes("pulsa") || c.includes("token")) {
    return <Zap className="h-4 w-4 text-yellow-400" />;
  }
  if (c.includes("hiburan") || c.includes("film") || c.includes("game") || c.includes("netflix")) {
    return <Film className="h-4 w-4 text-pink-400" />;
  }
  return <Sparkles className="h-4 w-4 text-zinc-400" />;
}

export default function Dashboard() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT" | "WA">("ALL");
  const [chartRange, setChartRange] = useState<7 | 30>(7);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWaGuide, setShowWaGuide] = useState(false);

  const [form, setForm] = useState({
    type: "OUT" as "IN" | "OUT",
    amount: "",
    category: "",
    description: "",
  });

  const supabase = useMemo(() => {
    try {
      return supabaseBrowser();
    } catch {
      return null;
    }
  }, []);

  const [globalTotals, setGlobalTotals] = useState({ saldo: 0, masuk: 0, keluar: 0, totalCount: 0 });

  const load = useCallback(async () => {
    if (!supabase) {
      setErr("Isi NEXT_PUBLIC_SUPABASE_URL & ANON_KEY di .env.local lalu restart dev");
      setLoading(false);
      return;
    }

    try {
      const [listRes, summaryRes] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("transactions").select("type,amount")
      ]);

      if (listRes.error) {
        setErr(listRes.error.message);
      } else {
        setTxs((listRes.data as Tx[]) || []);
        setErr(null);
      }

      if (summaryRes.data) {
        const rows = summaryRes.data;
        const masuk = rows.filter((r) => r.type === "IN").reduce((acc, r) => acc + r.amount, 0);
        const keluar = rows.filter((r) => r.type === "OUT").reduce((acc, r) => acc + r.amount, 0);
        setGlobalTotals({
          masuk,
          keluar,
          saldo: masuk - keluar,
          totalCount: rows.length,
        });
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
    if (!supabase) return;

    const ch = supabase
      .channel("tx-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, load]);

  // Ringkasan Keuangan Akurat
  const saldo = globalTotals.saldo;
  const totalMasuk = globalTotals.masuk;
  const totalKeluar = globalTotals.keluar;

  // Data Grafik Tren Pengeluaran & Pemasukan
  const chartData = useMemo(() => {
    const days = chartRange;
    const result: { date: string; fullDate: string; masuk: number; keluar: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const fullDateStr = d.toISOString().split("T")[0];

      result.push({
        date: dayStr,
        fullDate: fullDateStr,
        masuk: 0,
        keluar: 0,
      });
    }

    txs.forEach((tx) => {
      const txDate = tx.created_at.split("T")[0];
      const found = result.find((r) => r.fullDate === txDate);
      if (found) {
        if (tx.type === "IN") found.masuk += tx.amount;
        if (tx.type === "OUT") found.keluar += tx.amount;
      }
    });

    return result;
  }, [txs, chartRange]);

  // Kategori Pengeluaran Terbesar
  const topCategories = useMemo(() => {
    const outTxs = txs.filter((t) => t.type === "OUT");
    const map: Record<string, number> = {};
    outTxs.forEach((t) => {
      const cat = (t.category || "lainnya").toLowerCase();
      map[cat] = (map[cat] || 0) + t.amount;
    });

    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [txs]);

  // Filter daftar transaksi
  const filteredTxs = useMemo(() => {
    return txs.filter((t) => {
      const matchesSearch =
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === "IN") return t.type === "IN";
      if (filterType === "OUT") return t.type === "OUT";
      if (filterType === "WA") return t.source === "wa";
      return true;
    });
  }, [txs, search, filterType]);

  // Tambah transaksi manual
  async function add() {
    if (!supabase) return;
    const amount = parseInt(String(form.amount).replace(/\D/g, ""), 10);
    if (!amount) return;

    const { error } = await supabase.from("transactions").insert({
      type: form.type,
      amount,
      category: form.category.trim() || "lainnya",
      description: form.description.trim() || form.category.trim() || "lainnya",
      source: "web",
    });

    if (error) {
      setErr(error.message);
    } else {
      setForm({ type: "OUT", amount: "", category: "", description: "" });
      setShowAddForm(false);
      load();
    }
  }

  // Hapus transaksi
  async function del(id: string) {
    if (!supabase) return;
    await supabase.from("transactions").delete().eq("id", id);
    load();
  }

  // Preset nominal cepat
  const quickPresets = [20000, 50000, 100000, 250000, 500000];
  const quickCategories = ["Makan", "Transport", "Belanja", "Gaji", "Tagihan", "Hiburan"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header Bar */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 font-bold shadow-md shadow-emerald-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Kasku<span className="text-emerald-400">.</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Fintech dashboard modern tersinkronisasi otomatis dengan bot WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status WA Live Sync */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <MessageCircle className="h-3.5 w-3.5" />
            <span>WA Sync {supabase ? "Live Connected" : "Offline"}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWaGuide(!showWaGuide)}
            className="text-xs gap-1.5"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Format WA
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-semibold"
          >
            <Plus className="h-4 w-4" />
            Transaksi Baru
          </Button>
        </div>
      </header>

      {/* Accordion Panduan Format WhatsApp */}
      {showWaGuide && (
        <div className="transition-all duration-300">
          <Card className="border-emerald-500/30 bg-emerald-950/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Contoh Format Pesan WhatsApp:
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Cukup kirim pesan chat ke bot WhatsApp Anda, data akan langsung tersimpan & update di dashboard ini secara realtime.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWaGuide(false)}
                className="text-zinc-400 hover:text-zinc-100 text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3 text-xs font-mono">
              <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800 text-zinc-300">
                <span className="text-rose-400">keluar 25k makan</span>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Catat pengeluaran makan</p>
              </div>
              <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800 text-zinc-300">
                <span className="text-rose-400">keluar bensin 50rb</span>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Urutan fleksibel (nama dulu)</p>
              </div>
              <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800 text-zinc-300">
                <span className="text-emerald-400">masuk 5jt gaji</span>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Catat pemasukan bulanan</p>
              </div>
              <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800 text-zinc-300">
                <span className="text-rose-400">keluar 150k #transport</span>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Dukungan tag #kategori</p>
              </div>
              <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800 text-zinc-300">
                <span className="text-sky-400">saldo</span>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Cek total saldo saat ini</p>
              </div>
              <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800 text-zinc-300">
                <span className="text-amber-400">laporan hari ini</span>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Atau laporan minggu/bulan ini</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Pesan Error Jika Ada */}
      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-300 flex items-center justify-between">
          <span>{err}</span>
          <Button variant="ghost" size="sm" onClick={() => load()} className="text-xs text-rose-300 hover:text-white">
            <RefreshCw className="h-3 w-3 mr-1" /> Coba Lagi
          </Button>
        </div>
      )}

      {/* Hero Cards: Ringkasan Saldo & Cashflow */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card Saldo Utama */}
        <Card className="relative overflow-hidden border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Total Saldo Bersih</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wallet className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-white">{formatRp(saldo)}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-zinc-400">{globalTotals.totalCount || txs.length} total transaksi tercatat</span>
            </div>
          </CardContent>
        </Card>

        {/* Card Pemasukan */}
        <Card className="relative overflow-hidden border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Total Pemasukan</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ArrowDownLeft className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-400">{formatRp(totalMasuk)}</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400/80">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{formatShort(totalMasuk)} total masuk</span>
            </div>
          </CardContent>
        </Card>

        {/* Card Pengeluaran */}
        <Card className="relative overflow-hidden border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Total Pengeluaran</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-rose-400">{formatRp(totalKeluar)}</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-400/80">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>{formatShort(totalKeluar)} total keluar</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Tambah Transaksi Cepat (Collapsible) */}
      {showAddForm && (
        <div className="transition-all duration-300">
          <Card className="border-emerald-500/30 bg-zinc-900/90 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-400" /> Tambah Transaksi Manual
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardDescription>
                Selain via web, Anda juga dapat mengirim chat langsung di WhatsApp tanpa membuka browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle Pemasukan / Pengeluaran */}
              <div className="flex gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "OUT" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    form.type === "OUT"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  💸 Pengeluaran (Keluar)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "IN" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    form.type === "IN"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  💰 Pemasukan (Masuk)
                </button>
              </div>

              {/* Input Fields */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[11px] text-zinc-400 font-medium mb-1 block">Nominal (Rp)</label>
                  <Input
                    placeholder="Contoh: 35000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-medium mb-1 block">Kategori</label>
                  <Input
                    placeholder="makan, transport, gaji..."
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-medium mb-1 block">Keterangan</label>
                  <Input
                    placeholder="Makan siang padang..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Chip Kategori Cepat */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 mr-1">Kategori cepat:</span>
                {quickCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c.toLowerCase(), description: form.description || c })}
                    className="px-2 py-0.5 text-xs rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Preset Nominal Cepat */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-zinc-500 mr-1">Nominal cepat:</span>
                {quickPresets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm({ ...form, amount: String(val) })}
                    className="px-2 py-0.5 text-xs rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  >
                    +{formatShort(val)}
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={add} className="w-full sm:w-auto px-6">
                  Simpan Transaksi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bagian Grafik Tren & Analitik */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Grafik Recharts Utama */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Grafik Tren Pemasukan & Pengeluaran
                </CardTitle>
                <CardDescription>Visualisasi arus kas masuk vs keluar harian</CardDescription>
              </div>

              {/* Range Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setChartRange(7)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartRange === 7 ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setChartRange(30)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartRange === 30 ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  30 Hari
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#27272a" }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatShort(val)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md p-3 shadow-xl text-xs space-y-1.5">
                            <p className="font-semibold text-zinc-300">{label}</p>
                            <div className="flex items-center gap-2 text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              <span>Masuk: {formatRp(Number(payload[0]?.value || 0))}</span>
                            </div>
                            <div className="flex items-center gap-2 text-rose-400">
                              <span className="h-2 w-2 rounded-full bg-rose-400" />
                              <span>Keluar: {formatRp(Number(payload[1]?.value || 0))}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="masuk"
                    name="Pemasukan"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMasuk)"
                  />
                  <Area
                    type="monotone"
                    dataKey="keluar"
                    name="Pengeluaran"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorKeluar)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Indikator Legend Grafik */}
            <div className="flex items-center justify-center gap-6 pt-3 text-xs text-zinc-400 border-t border-zinc-800/60 mt-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Pemasukan (Masuk)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Pengeluaran (Keluar)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Kategori Pengeluaran Teratas */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-amber-400" />
              Kategori Terbanyak
            </CardTitle>
            <CardDescription>Distribusi pos pengeluaran terbesar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {topCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 text-center text-xs text-zinc-500">
                <Wallet className="h-8 w-8 text-zinc-700 mb-2" />
                Belum ada pengeluaran yang tercatat.
              </div>
            ) : (
              topCategories.map((cat, idx) => {
                const percent = totalKeluar > 0 ? Math.round((cat.total / totalKeluar) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium text-zinc-200 flex items-center gap-2">
                        {getCategoryIcon(cat.name)}
                        {cat.name}
                      </span>
                      <span className="text-zinc-400">
                        {formatRp(cat.total)} ({percent}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 mt-4 text-[11px] text-zinc-400">
              💡 <strong>Tips Kategorisasi Otomatis:</strong> Cukup sertakan nama kategori di WhatsApp, contoh: <code className="text-emerald-400">keluar 50rb bensin</code> atau dengan tag <code className="text-emerald-400">#bensin</code>.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bagian Riwayat Transaksi Realtime */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-emerald-400" /> Riwayat Transaksi
              </CardTitle>
              <CardDescription>Sinkronisasi instan via Supabase Realtime</CardDescription>
            </div>

            {/* Pencarian & Filter Tabs */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              {/* Search Bar */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Cari transaksi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs w-full sm:w-44"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
                {(["ALL", "OUT", "IN", "WA"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterType(mode)}
                    className={`px-2.5 py-1 rounded-md transition-all text-xs ${
                      filterType === mode
                        ? "bg-zinc-800 text-white font-medium"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {mode === "ALL" ? "Semua" : mode === "OUT" ? "Keluar" : mode === "IN" ? "Masuk" : "WhatsApp"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Memuat data transaksi...</div>
          ) : filteredTxs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
              <Wallet className="h-10 w-10 text-zinc-700 mb-2" />
              <p className="text-sm font-medium text-zinc-300">Tidak ada transaksi ditemukan</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Coba kirim chat ke WhatsApp seperti <code className="text-emerald-400">keluar 20k makan</code> atau tambah secara manual di atas.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredTxs.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3.5 gap-3 hover:bg-zinc-800/20 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar Icon Kategori */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        t.type === "IN"
                          ? "border-emerald-500/20 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-800/40"
                      }`}
                    >
                      {getCategoryIcon(t.category)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-100 truncate">
                          {t.description || t.category}
                        </span>
                        <Badge className="text-[10px] px-2 py-0 border-zinc-800 bg-zinc-800/70 text-zinc-300 capitalize">
                          {t.category}
                        </Badge>
                        {t.source === "wa" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-400">
                            <MessageCircle className="h-2.5 w-2.5" /> WA
                          </span>
                        ) : (
                          <span className="rounded-full border border-zinc-800 bg-zinc-800/40 px-1.5 py-0.2 text-[10px] font-medium text-zinc-400">
                            Web
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {new Date(t.created_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm sm:text-base font-bold tabular-nums ${
                        t.type === "IN" ? "text-emerald-400" : "text-zinc-100"
                      }`}
                    >
                      {t.type === "IN" ? "+" : "-"}
                      {formatRp(t.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => del(t.id)}
                      className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Hapus transaksi"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
