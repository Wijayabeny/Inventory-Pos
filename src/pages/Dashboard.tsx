import { useMemo } from 'react';
import {
  Package, AlertTriangle, XCircle, ShoppingCart,
  TrendingUp, ArrowUpRight, RefreshCw, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useStore } from '../hooks/useStore';
import { formatRupiah } from '../utils/barcode';

const CHART_ACCENT  = 'oklch(0.45 0.115 200)';
const CHART_WARNING = 'oklch(0.62 0.155 75)';
const CHART_GRID    = 'oklch(0.96 0.007 255)';
const CHART_BORDER  = 'oklch(0.905 0.009 255)';

function LedgerCell({ label, value, sub, tone = 'ink' }: { label: string; value: string | number; sub?: string; tone?: 'ink' | 'accent' | 'warning' | 'danger' }) {
  const color = { ink: 'text-slate-900', accent: 'text-indigo-700', warning: 'text-amber-700', danger: 'text-red-700' }[tone];
  return (
    <div className="px-5 py-4 flex-1 min-w-[140px]">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function LedgerPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex flex-wrap divide-y divide-slate-100 sm:divide-y-0 sm:divide-x">
        {children}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state } = useStore();
  const { barang, penjualan, stockMasuk, stockKeluar } = state;

  // ── Statistik computed dari data nyata ─────
  const hampirHabis = useMemo(() => barang.filter(b => b.stok > 0 && b.stok <= b.stok_minimum), [barang]);
  const habis       = useMemo(() => barang.filter(b => b.stok === 0), [barang]);
  const nilaiInventory = useMemo(() => barang.reduce((s, b) => s + b.harga_beli * b.stok, 0), [barang]);
  const totalStok   = useMemo(() => barang.reduce((s, b) => s + b.stok, 0), [barang]);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const penjualanHariIni   = useMemo(() => penjualan.filter(p => p.tanggal === today && p.status === 'selesai').reduce((s, p) => s + p.total, 0), [penjualan, today]);
  const penjualanBulanIni  = useMemo(() => penjualan.filter(p => p.tanggal.startsWith(thisMonth) && p.status === 'selesai').reduce((s, p) => s + p.total, 0), [penjualan, thisMonth]);
  const trxHariIni         = useMemo(() => penjualan.filter(p => p.tanggal === today && p.status === 'selesai').length, [penjualan, today]);
  const profitBulanIni     = useMemo(() => penjualan.filter(p => p.tanggal.startsWith(thisMonth) && p.status === 'selesai').reduce((s, p) => s + (p.total - p.diskon), 0) * 0.25, [penjualan, thisMonth]);

  // Chart: pergerakan stok 7 hari terakhir
  const chartStok = useMemo(() => {
    const days: { name: string; masuk: number; keluar: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      days.push({
        name: dayName,
        masuk:  stockMasuk.filter(s => s.tanggal === key).reduce((a, s) => a + s.qty_masuk, 0),
        keluar: stockKeluar.filter(s => s.tanggal === key).reduce((a, s) => a + s.qty_keluar, 0),
      });
    }
    return days;
  }, [stockMasuk, stockKeluar]);

  // Chart: tren penjualan 5 titik terakhir per minggu
  const chartPenjualan = useMemo(() => {
    const sorted = [...penjualan].filter(p => p.status === 'selesai').sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    if (sorted.length === 0) return [{ name: 'Hari ini', penjualan: 0 }];
    // bucket by date
    const byDate: Record<string, number> = {};
    sorted.forEach(p => { byDate[p.tanggal] = (byDate[p.tanggal] || 0) + p.total; });
    return Object.entries(byDate).slice(-7).map(([k, v]) => ({
      name: new Date(k).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      penjualan: v,
    }));
  }, [penjualan]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Ringkasan aktivitas &amp; statistik inventory</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
          <RefreshCw className="h-3.5 w-3.5" />
          Data live
        </div>
      </div>

      {/* Hero penjualan */}
      <div className="bg-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">Penjualan Hari Ini</p>
          <p className="font-mono text-3xl sm:text-4xl font-bold text-white mt-1.5 tracking-tight">{formatRupiah(penjualanHariIni)}</p>
          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <ShoppingCart className="h-3.5 w-3.5" /> {trxHariIni} transaksi tercatat
          </p>
        </div>
        <div className="flex gap-6 sm:gap-8">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Bulan ini</p>
            <p className="font-mono text-base font-bold text-white mt-1">{formatRupiah(penjualanBulanIni)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
              Estimasi Profit <ArrowUpRight className="h-3 w-3 text-emerald-400" />
            </p>
            <p className="font-mono text-base font-bold text-emerald-400 mt-1">{formatRupiah(profitBulanIni)}</p>
          </div>
        </div>
      </div>

      {/* Ledger panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LedgerPanel title="Ringkasan Inventory" icon={<Package className="h-3.5 w-3.5" />}>
          <LedgerCell label="Total Barang" value={barang.length} sub={`${barang.length} jenis`} />
          <LedgerCell label="Total Stok" value={totalStok.toLocaleString('id-ID')} sub="unit tersedia" />
          <LedgerCell label="Nilai Inventory" value={formatRupiah(nilaiInventory)} sub="harga beli" />
        </LedgerPanel>
        <LedgerPanel title="Status Stok" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
          <LedgerCell label="Hampir Habis" value={hampirHabis.length} sub="perlu restock" tone={hampirHabis.length > 0 ? 'warning' : 'ink'} />
          <LedgerCell label="Stok Habis" value={habis.length} sub="tidak tersedia" tone={habis.length > 0 ? 'danger' : 'ink'} />
        </LedgerPanel>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Pergerakan Stok 7 Hari Terakhir</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartStok} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.465 0.019 255)' }} axisLine={{ stroke: CHART_BORDER }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'oklch(0.465 0.019 255)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_BORDER}` }} formatter={(val, name) => [val, name === 'masuk' ? 'Stock Masuk' : 'Stock Keluar']} />
              <Bar dataKey="masuk" fill={CHART_ACCENT} radius={[4, 4, 0, 0]} />
              <Bar dataKey="keluar" fill={CHART_WARNING} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-3 h-3 rounded-sm bg-indigo-600" />Stock Masuk</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-3 h-3 rounded-sm bg-amber-600" />Stock Keluar</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Tren Penjualan</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartPenjualan}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.465 0.019 255)' }} axisLine={{ stroke: CHART_BORDER }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'oklch(0.465 0.019 255)' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_BORDER}` }} formatter={(v) => [formatRupiah(Number(v)), 'Penjualan']} />
              <Line type="monotone" dataKey="penjualan" stroke={CHART_ACCENT} strokeWidth={2.5} dot={{ r: 4, fill: CHART_ACCENT }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800">Barang Hampir Habis</h3>
            <span className="ml-auto text-[11px] whitespace-nowrap bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{hampirHabis.length} item</span>
          </div>
          <div className="divide-y divide-slate-50">
            {hampirHabis.length === 0
              ? <p className="p-5 text-xs text-slate-400 text-center">Semua stok aman ✓</p>
              : hampirHabis.slice(0, 5).map(b => (
                <div key={b.id_barang} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.nama_barang}</p>
                    <p className="text-[11px] text-slate-500">{b.kategori} • {b.lokasi_rak}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-600 font-mono">{b.stok}</span>
                    <p className="text-[11px] text-slate-400">min. {b.stok_minimum}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-800">Stok Habis</h3>
            <span className="ml-auto text-[11px] whitespace-nowrap bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{habis.length} item</span>
          </div>
          <div className="divide-y divide-slate-50">
            {habis.length === 0
              ? <p className="p-5 text-xs text-slate-400 text-center">Tidak ada stok habis ✓</p>
              : habis.slice(0, 5).map(b => (
                <div key={b.id_barang} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.nama_barang}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{b.barcode}</p>
                  </div>
                  <span className="text-[11px] whitespace-nowrap bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Habis</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Semua Barang */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">Semua Barang</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {['Barang', 'Barcode', 'Stok', 'Harga Jual', 'Status'].map(h => (
                  <th key={h} className={`px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${h === 'Stok' || h === 'Harga Jual' ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {barang.map(b => (
                <tr key={b.id_barang} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{b.nama_barang}</p>
                    <p className="text-[11px] text-slate-500">{b.kategori} • {b.merk}</p>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-slate-600">{b.barcode}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-800">{b.stok}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-700">{formatRupiah(b.harga_jual)}</td>
                  <td className="px-5 py-3 text-center">
                    {b.stok === 0
                      ? <span className="text-[11px] whitespace-nowrap bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Habis</span>
                      : b.stok <= b.stok_minimum
                        ? <span className="text-[11px] whitespace-nowrap bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Hampir Habis</span>
                        : <span className="text-[11px] whitespace-nowrap bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Aman</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400 font-mono">
        Data diambil langsung dari store lokal • semua perubahan terhubung real-time
      </p>
    </div>
  );
}
