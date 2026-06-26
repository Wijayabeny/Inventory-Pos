// ============================================================
// Laporan Page — Live data dari useStore (bukan hardcoded)
// ============================================================

import { useState, useMemo } from 'react';
import { FileText, Download, Printer, TrendingUp, Package, AlertTriangle, ChevronRight } from 'lucide-react';
import { formatRupiah, formatDate, today } from '../utils/barcode';
import { useStore } from '../hooks/useStore';

type LaporanType = 'stok' | 'masuk' | 'keluar' | 'penjualan' | 'profit' | 'hampir-habis';

const LAPORAN_LIST = [
  { id: 'stok' as LaporanType,         label: 'Laporan Stok',         desc: 'Kondisi stok seluruh barang saat ini',           icon: <Package className="h-4 w-4" />,                  tone: 'text-indigo-600 bg-indigo-50' },
  { id: 'masuk' as LaporanType,        label: 'Laporan Stock Masuk',   desc: 'Riwayat penerimaan barang dari supplier',         icon: <TrendingUp className="h-4 w-4" />,               tone: 'text-emerald-600 bg-emerald-50' },
  { id: 'keluar' as LaporanType,       label: 'Laporan Stock Keluar',  desc: 'Riwayat pengeluaran barang dari gudang',          icon: <TrendingUp className="h-4 w-4 rotate-180" />,    tone: 'text-amber-600 bg-amber-50' },
  { id: 'penjualan' as LaporanType,    label: 'Laporan Penjualan',     desc: 'Rekap seluruh transaksi penjualan',               icon: <FileText className="h-4 w-4" />,                 tone: 'text-indigo-600 bg-indigo-50' },
  { id: 'profit' as LaporanType,       label: 'Laporan Profit',        desc: 'Kalkulasi margin keuntungan per periode',         icon: <TrendingUp className="h-4 w-4" />,               tone: 'text-emerald-600 bg-emerald-50' },
  { id: 'hampir-habis' as LaporanType, label: 'Laporan Hampir Habis',  desc: 'Daftar barang yang perlu segera direstock',       icon: <AlertTriangle className="h-4 w-4" />,            tone: 'text-red-600 bg-red-50' },
];

const inRange = (tanggal: string, dari: string, sampai: string) =>
  tanggal >= dari && tanggal <= sampai;

export default function Laporan() {
  const { state } = useStore();
  const [selectedLaporan, setSelectedLaporan] = useState<LaporanType | null>(null);
  const [tanggalDari, setTanggalDari] = useState('2026-01-01');
  const [tanggalSampai, setTanggalSampai] = useState(today());

  // ── Computed data per laporan ──────────────────────────────

  const dataStok = useMemo(() => state.barang.map(b => {
    const status = b.stok === 0 ? 'Habis' : b.stok <= b.stok_minimum ? 'Hampir Habis' : 'Aman';
    return { ...b, nilai: b.stok * b.harga_beli, status };
  }), [state.barang]);

  const dataMasuk = useMemo(() =>
    state.stockMasuk.filter(r => inRange(r.tanggal, tanggalDari, tanggalSampai)),
    [state.stockMasuk, tanggalDari, tanggalSampai]);

  const dataKeluar = useMemo(() =>
    state.stockKeluar.filter(r => inRange(r.tanggal, tanggalDari, tanggalSampai)),
    [state.stockKeluar, tanggalDari, tanggalSampai]);

  const dataPenjualan = useMemo(() =>
    state.penjualan.filter(r => r.status === 'selesai' && inRange(r.tanggal, tanggalDari, tanggalSampai)),
    [state.penjualan, tanggalDari, tanggalSampai]);

  const dataProfit = useMemo(() => {
    const map: Record<string, { nama: string; qty: number; modal: number; pendapatan: number }> = {};
    state.detailPenjualan.forEach(d => {
      const trx = state.penjualan.find(p => p.nomor_transaksi === d.nomor_transaksi);
      if (!trx || trx.status !== 'selesai' || !inRange(trx.tanggal, tanggalDari, tanggalSampai)) return;
      const barang = state.barang.find(b => b.id_barang === d.id_barang);
      if (!map[d.id_barang]) map[d.id_barang] = { nama: d.nama_barang, qty: 0, modal: 0, pendapatan: 0 };
      map[d.id_barang].qty += d.qty;
      map[d.id_barang].modal += (barang?.harga_beli ?? 0) * d.qty;
      map[d.id_barang].pendapatan += d.subtotal;
    });
    return Object.values(map).map(r => ({ ...r, profit: r.pendapatan - r.modal }));
  }, [state.detailPenjualan, state.penjualan, state.barang, tanggalDari, tanggalSampai]);

  const dataHampirHabis = useMemo(() =>
    dataStok.filter(b => b.status !== 'Aman'),
    [dataStok]);

  // ── Export CSV ─────────────────────────────────────────────

  const exportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (selectedLaporan === 'stok') {
      headers = ['ID Barang', 'Barcode', 'Nama Barang', 'Kategori', 'Stok', 'Stok Min', 'Harga Beli', 'Harga Jual', 'Nilai', 'Status'];
      rows = dataStok.map(r => [r.id_barang, r.barcode, r.nama_barang, r.kategori, r.stok, r.stok_minimum, r.harga_beli, r.harga_jual, r.nilai, r.status]);
    } else if (selectedLaporan === 'masuk') {
      headers = ['No. Transaksi', 'Tanggal', 'Nama Barang', 'Supplier', 'Qty', 'Harga Beli', 'Total'];
      rows = dataMasuk.map(r => [r.nomor_transaksi, r.tanggal, r.nama_barang, r.supplier, r.qty_masuk, r.harga_beli, r.total]);
    } else if (selectedLaporan === 'keluar') {
      headers = ['No. Transaksi', 'Tanggal', 'Nama Barang', 'Customer', 'Qty', 'Harga Jual', 'Total'];
      rows = dataKeluar.map(r => [r.nomor_transaksi, r.tanggal, r.nama_barang, r.customer, r.qty_keluar, r.harga_jual, r.total]);
    } else if (selectedLaporan === 'penjualan') {
      headers = ['No. Transaksi', 'Tanggal', 'Customer', 'Petugas', 'Subtotal', 'Diskon', 'Pajak', 'Total', 'Metode Bayar'];
      rows = dataPenjualan.map(r => [r.nomor_transaksi, r.tanggal, r.customer, r.petugas, r.subtotal, r.diskon, r.pajak, r.total, r.metode_bayar]);
    } else if (selectedLaporan === 'profit') {
      headers = ['Nama Barang', 'Qty Terjual', 'Modal', 'Pendapatan', 'Profit'];
      rows = dataProfit.map(r => [r.nama, r.qty, r.modal, r.pendapatan, r.profit]);
    } else if (selectedLaporan === 'hampir-habis') {
      headers = ['ID Barang', 'Barcode', 'Nama Barang', 'Stok', 'Stok Min', 'Status'];
      rows = dataHampirHabis.map(r => [r.id_barang, r.barcode, r.nama_barang, r.stok, r.stok_minimum, r.status]);
    }

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-${selectedLaporan}-${today()}.csv`;
    a.click();
  };

  const printLaporan = () => {
    const el = document.getElementById('laporan-content');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Laporan</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}
        th{background:#f5f5f5;font-weight:bold}
        h1{font-size:16px}h2{font-size:14px;color:#555}
        .right{text-align:right}
        @media print{button{display:none}}
      </style></head><body>
      <button onclick="window.print()">🖨 Print</button>
      ${el.innerHTML}
      </body></html>`);
    w.document.close();
  };

  const showDateFilter = selectedLaporan !== 'stok' && selectedLaporan !== 'hampir-habis';

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Laporan</h2>
        <p className="text-xs text-slate-400">Generate & ekspor laporan inventory dan penjualan</p>
      </div>

      {/* Laporan Selector */}
      {!selectedLaporan ? (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 max-w-2xl">
          {LAPORAN_LIST.map(l => (
            <button
              key={l.id}
              onClick={() => setSelectedLaporan(l.id)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors group"
            >
              <div className={`shrink-0 p-2 rounded-lg ${l.tone}`}>{l.icon}</div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{l.label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{l.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Back + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedLaporan(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                ← Kembali
              </button>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {LAPORAN_LIST.find(l => l.id === selectedLaporan)?.label}
                </h3>
                {showDateFilter && (
                  <p className="text-[11px] text-slate-400">Periode: {formatDate(tanggalDari)} — {formatDate(tanggalSampai)}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={printLaporan} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">
                <Printer className="h-3.5 w-3.5" />Print
              </button>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition">
                <Download className="h-3.5 w-3.5" />Export CSV
              </button>
            </div>
          </div>

          {/* Date Filter — hanya untuk laporan berbasis transaksi */}
          {showDateFilter && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Dari</label>
                <input type="date" value={tanggalDari} onChange={e => setTanggalDari(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Sampai</label>
                <input type="date" value={tanggalSampai} onChange={e => setTanggalSampai(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none" />
              </div>
            </div>
          )}

          {/* Laporan Content */}
          <div id="laporan-content" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Report Header */}
            <div className="px-6 py-5 border-b border-slate-100">
              <h1 className="text-base font-bold text-slate-800">{LAPORAN_LIST.find(l => l.id === selectedLaporan)?.label}</h1>
              {showDateFilter && <p className="text-xs text-slate-400 mt-0.5">Periode: {formatDate(tanggalDari)} s/d {formatDate(tanggalSampai)}</p>}
              <p className="text-xs text-slate-400">Dicetak: {new Date().toLocaleString('id-ID')}</p>
            </div>

            {/* ── STOK / HAMPIR HABIS ── */}
            {(selectedLaporan === 'stok' || selectedLaporan === 'hampir-habis') && (() => {
              const rows = selectedLaporan === 'hampir-habis' ? dataHampirHabis : dataStok;
              return (
                <>
                  <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-slate-800">{rows.length}</p>
                      <p className="text-xs text-slate-400">Total Jenis</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-slate-800">{rows.reduce((s, r) => s + r.stok, 0)}</p>
                      <p className="text-xs text-slate-400">Total Stok</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-amber-600">{rows.filter(r => r.status === 'Hampir Habis').length}</p>
                      <p className="text-xs text-slate-400">Hampir Habis</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-indigo-600">{formatRupiah(rows.reduce((s, r) => s + r.nilai, 0))}</p>
                      <p className="text-xs text-slate-400">Nilai Inventory</p>
                    </div>
                  </div>
                  {rows.length === 0 ? (
                    <div className="px-6 py-12 text-center text-slate-400 text-sm">Tidak ada data barang</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            {['No', 'Barcode', 'Nama Barang', 'Kategori', 'Stok', 'Stok Min', 'Harga Beli', 'Harga Jual', 'Nilai', 'Status'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {rows.map((r, idx) => (
                            <tr key={r.id_barang} className={`hover:bg-slate-50/50 ${r.status === 'Habis' ? 'bg-red-50/30' : r.status === 'Hampir Habis' ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{r.barcode}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{r.nama_barang}</td>
                              <td className="px-4 py-3 text-[12px] text-slate-600">{r.kategori}</td>
                              <td className={`px-4 py-3 font-mono font-bold ${r.stok === 0 ? 'text-red-600' : r.stok <= r.stok_minimum ? 'text-amber-600' : 'text-slate-800'}`}>{r.stok}</td>
                              <td className="px-4 py-3 text-[12px] text-slate-500">{r.stok_minimum}</td>
                              <td className="px-4 py-3 font-mono text-[12px]">{formatRupiah(r.harga_beli)}</td>
                              <td className="px-4 py-3 font-mono text-[12px] text-indigo-600">{formatRupiah(r.harga_jual)}</td>
                              <td className="px-4 py-3 font-mono font-semibold">{formatRupiah(r.nilai)}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] whitespace-nowrap px-2 py-0.5 rounded-full font-medium ${
                                  r.status === 'Habis' ? 'bg-red-100 text-red-700' :
                                  r.status === 'Hampir Habis' ? 'bg-amber-100 text-amber-700' :
                                  'bg-emerald-100 text-emerald-700'
                                }`}>{r.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-200">
                            <td colSpan={8} className="px-4 py-3 text-sm font-bold text-slate-700 text-right">Total Nilai Inventory</td>
                            <td className="px-4 py-3 font-mono font-bold text-indigo-600">{formatRupiah(rows.reduce((s, r) => s + r.nilai, 0))}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── STOCK MASUK ── */}
            {selectedLaporan === 'masuk' && (
              dataMasuk.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400 text-sm">Tidak ada data stock masuk pada periode ini</div>
              ) : (
                <>
                  <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-slate-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-slate-800">{dataMasuk.length}</p>
                      <p className="text-xs text-slate-400">Total Transaksi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-slate-800">{dataMasuk.reduce((s, r) => s + r.qty_masuk, 0)}</p>
                      <p className="text-xs text-slate-400">Total Qty</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-mono text-emerald-600">{formatRupiah(dataMasuk.reduce((s, r) => s + r.total, 0))}</p>
                      <p className="text-xs text-slate-400">Total Nilai</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          {['No', 'No. Transaksi', 'Tanggal', 'Nama Barang', 'Supplier', 'Qty', 'Harga Beli', 'Total'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dataMasuk.map((r, idx) => (
                          <tr key={r.nomor_transaksi} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-indigo-600">{r.nomor_transaksi}</td>
                            <td className="px-4 py-3 text-[12px] text-slate-600">{formatDate(r.tanggal)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{r.nama_barang}</td>
                            <td className="px-4 py-3 text-[12px] text-slate-600">{r.supplier}</td>
                            <td className="px-4 py-3 font-mono font-bold text-emerald-600">{r.qty_masuk}</td>
                            <td className="px-4 py-3 font-mono text-[12px]">{formatRupiah(r.harga_beli)}</td>
                            <td className="px-4 py-3 font-mono font-semibold">{formatRupiah(r.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={7} className="px-4 py-3 text-sm font-bold text-slate-700 text-right">Total</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatRupiah(dataMasuk.reduce((s, r) => s + r.total, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )
            )}

            {/* ── STOCK KELUAR ── */}
            {selectedLaporan === 'keluar' && (
              dataKeluar.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400 text-sm">Tidak ada data stock keluar pada periode ini</div>
              ) : (
                <>
                  <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-slate-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-slate-800">{dataKeluar.length}</p>
                      <p className="text-xs text-slate-400">Total Transaksi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-slate-800">{dataKeluar.reduce((s, r) => s + r.qty_keluar, 0)}</p>
                      <p className="text-xs text-slate-400">Total Qty</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-mono text-amber-600">{formatRupiah(dataKeluar.reduce((s, r) => s + r.total, 0))}</p>
                      <p className="text-xs text-slate-400">Total Nilai</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          {['No', 'No. Transaksi', 'Tanggal', 'Nama Barang', 'Customer', 'Qty', 'Harga Jual', 'Total'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dataKeluar.map((r, idx) => (
                          <tr key={r.nomor_transaksi} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-indigo-600">{r.nomor_transaksi}</td>
                            <td className="px-4 py-3 text-[12px] text-slate-600">{formatDate(r.tanggal)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{r.nama_barang}</td>
                            <td className="px-4 py-3 text-[12px] text-slate-600">{r.customer}</td>
                            <td className="px-4 py-3 font-mono font-bold text-amber-600">{r.qty_keluar}</td>
                            <td className="px-4 py-3 font-mono text-[12px]">{formatRupiah(r.harga_jual)}</td>
                            <td className="px-4 py-3 font-mono font-semibold">{formatRupiah(r.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={7} className="px-4 py-3 text-sm font-bold text-slate-700 text-right">Total</td>
                          <td className="px-4 py-3 font-mono font-bold text-amber-600">{formatRupiah(dataKeluar.reduce((s, r) => s + r.total, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )
            )}

            {/* ── PENJUALAN ── */}
            {selectedLaporan === 'penjualan' && (
              dataPenjualan.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400 text-sm">Tidak ada data penjualan pada periode ini</div>
              ) : (
                <>
                  <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-slate-800">{dataPenjualan.length}</p>
                      <p className="text-xs text-slate-400">Total Transaksi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-mono text-indigo-600">{formatRupiah(dataPenjualan.reduce((s, r) => s + r.total, 0))}</p>
                      <p className="text-xs text-slate-400">Total Pendapatan</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-mono text-amber-600">{formatRupiah(dataPenjualan.reduce((s, r) => s + r.diskon, 0))}</p>
                      <p className="text-xs text-slate-400">Total Diskon</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-mono text-emerald-600">{formatRupiah(dataPenjualan.reduce((s, r) => s + r.pajak, 0))}</p>
                      <p className="text-xs text-slate-400">Total Pajak</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          {['No', 'No. Transaksi', 'Tanggal', 'Customer', 'Petugas', 'Subtotal', 'Diskon', 'Pajak', 'Total', 'Metode'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dataPenjualan.map((r, idx) => (
                          <tr key={r.nomor_transaksi} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-indigo-600">{r.nomor_transaksi}</td>
                            <td className="px-4 py-3 text-[12px] text-slate-600">{formatDate(r.tanggal)}</td>
                            <td className="px-4 py-3 text-[12px] text-slate-700">{r.customer}</td>
                            <td className="px-4 py-3 text-[12px] text-slate-600">{r.petugas}</td>
                            <td className="px-4 py-3 font-mono text-[12px]">{formatRupiah(r.subtotal)}</td>
                            <td className="px-4 py-3 font-mono text-[12px] text-amber-600">{r.diskon > 0 ? `${r.diskon}%` : '-'}</td>
                            <td className="px-4 py-3 font-mono text-[12px]">{r.pajak > 0 ? `${r.pajak}%` : '-'}</td>
                            <td className="px-4 py-3 font-mono font-bold text-indigo-600">{formatRupiah(r.total)}</td>
                            <td className="px-4 py-3">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{r.metode_bayar}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={8} className="px-4 py-3 text-sm font-bold text-slate-700 text-right">Total Pendapatan</td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">{formatRupiah(dataPenjualan.reduce((s, r) => s + r.total, 0))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )
            )}

            {/* ── PROFIT ── */}
            {selectedLaporan === 'profit' && (
              dataProfit.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400 text-sm">Tidak ada data penjualan pada periode ini</div>
              ) : (
                <>
                  <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-slate-100">
                    <div className="text-center">
                      <p className="text-xl font-bold font-mono text-slate-800">{formatRupiah(dataProfit.reduce((s, r) => s + r.pendapatan, 0))}</p>
                      <p className="text-xs text-slate-400">Total Pendapatan</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-mono text-amber-600">{formatRupiah(dataProfit.reduce((s, r) => s + r.modal, 0))}</p>
                      <p className="text-xs text-slate-400">Total Modal</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-mono text-emerald-600">{formatRupiah(dataProfit.reduce((s, r) => s + r.profit, 0))}</p>
                      <p className="text-xs text-slate-400">Total Profit</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          {['No', 'Nama Barang', 'Qty Terjual', 'Total Modal', 'Total Pendapatan', 'Profit', 'Margin %'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dataProfit.map((r, idx) => {
                          const margin = r.pendapatan > 0 ? ((r.profit / r.pendapatan) * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{r.nama}</td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-700">{r.qty}</td>
                              <td className="px-4 py-3 font-mono text-[12px] text-amber-600">{formatRupiah(r.modal)}</td>
                              <td className="px-4 py-3 font-mono text-[12px] text-indigo-600">{formatRupiah(r.pendapatan)}</td>
                              <td className={`px-4 py-3 font-mono font-bold ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatRupiah(r.profit)}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${parseFloat(margin) >= 20 ? 'bg-emerald-100 text-emerald-700' : parseFloat(margin) >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                  {margin}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={4} className="px-4 py-3 text-sm font-bold text-slate-700 text-right">Total Profit</td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">{formatRupiah(dataProfit.reduce((s, r) => s + r.pendapatan, 0))}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatRupiah(dataProfit.reduce((s, r) => s + r.profit, 0))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )
            )}

          </div>
        </div>
      )}
    </div>
  );
}