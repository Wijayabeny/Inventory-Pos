// ============================================================
// Riwayat Transaksi Page
// ============================================================

import { useState } from 'react';
import { History, Search, Download, Filter, X } from 'lucide-react';
import { formatRupiah, formatDateTime, today } from '../utils/barcode';
import Pagination from '../components/UI/Pagination';
import { useStore } from '../hooks/useStore';

type TabType = 'masuk' | 'keluar' | 'penjualan';



const ITEMS_PER_PAGE = 10;

export default function RiwayatTransaksi() {
  const { state } = useStore();
  const stockMasuk  = state.stockMasuk;
  const stockKeluar = state.stockKeluar;
  const penjualan   = state.penjualan;

  const [activeTab, setActiveTab] = useState<TabType>('masuk');
  const [search, setSearch] = useState('');
  const [tanggalDari, setTanggalDari] = useState('');
  const [tanggalSampai, setTanggalSampai] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filterData = (data: typeof stockMasuk) => {
    return data.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q || Object.values(r).some(v => String(v).toLowerCase().includes(q));
      const tgl = r.tanggal.split('T')[0];
      const matchDari = !tanggalDari || tgl >= tanggalDari;
      const matchSampai = !tanggalSampai || tgl <= tanggalSampai;
      return matchSearch && matchDari && matchSampai;
    });
  };

  const resetFilter = () => { setSearch(''); setTanggalDari(''); setTanggalSampai(''); setCurrentPage(1); };

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}-${today()}.csv`;
    a.click();
  };

  const tabs: { id: TabType; label: string; color: string }[] = [
    { id: 'masuk', label: 'Stock Masuk', color: 'text-emerald-600' },
    { id: 'keluar', label: 'Stock Keluar', color: 'text-amber-600' },
    { id: 'penjualan', label: 'Penjualan', color: 'text-indigo-600' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Riwayat Transaksi</h2>
          <p className="text-xs text-slate-400">Semua histori aktivitas stok dan penjualan</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'masuk') exportCSV(stockMasuk as unknown as Record<string, unknown>[], 'stock-masuk');
            else if (activeTab === 'keluar') exportCSV(stockKeluar as unknown as Record<string, unknown>[], 'stock-keluar');
            else exportCSV(penjualan as unknown as Record<string, unknown>[], 'penjualan');
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${activeTab === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={tanggalDari} onChange={e => setTanggalDari(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input type="date" value={tanggalSampai} onChange={e => setTanggalSampai(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
            />
          </div>
          {(search || tanggalDari || tanggalSampai) && (
            <button onClick={resetFilter} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">
              <X className="h-3.5 w-3.5" />Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">

          {/* STOCK MASUK TABLE */}
          {activeTab === 'masuk' && (() => {
            const data = filterData(stockMasuk);
            const paged = data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
            return (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['No. Transaksi', 'Tanggal', 'Barang', 'Supplier', 'Qty', 'Harga Beli', 'Total', 'Petugas'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map(r => (
                      <tr key={r.nomor_transaksi} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3"><code className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{r.nomor_transaksi}</code></td>
                        <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap">{formatDateTime(r.tanggal)}</td>
                        <td className="px-4 py-3"><p className="font-medium text-slate-800">{r.nama_barang}</p><p className="text-[11px] text-slate-400 font-mono">{r.barcode}</p></td>
                        <td className="px-4 py-3 text-[12px] text-slate-600">{r.supplier}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-600">+{r.qty_masuk}</td>
                        <td className="px-4 py-3 font-mono text-[12px]">{formatRupiah(r.harga_beli)}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{formatRupiah(r.total)}</td>
                        <td className="px-4 py-3 text-[12px] text-slate-600">{r.petugas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 border-t border-slate-100">
                  <Pagination currentPage={currentPage} totalPages={Math.ceil(data.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} totalItems={data.length} itemsPerPage={ITEMS_PER_PAGE} />
                </div>
              </>
            );
          })()}

          {/* STOCK KELUAR TABLE */}
          {activeTab === 'keluar' && (() => {
            const data = filterData(stockKeluar as unknown as typeof stockMasuk);
            const paged = data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
            return (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['No. Transaksi', 'Tanggal', 'Barang', 'Customer', 'Qty', 'Harga Jual', 'Total', 'Petugas'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map((r: any) => (
                      <tr key={r.nomor_transaksi} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3"><code className="text-[11px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{r.nomor_transaksi}</code></td>
                        <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap">{formatDateTime(r.tanggal)}</td>
                        <td className="px-4 py-3"><p className="font-medium text-slate-800">{r.nama_barang}</p><p className="text-[11px] text-slate-400 font-mono">{r.barcode}</p></td>
                        <td className="px-4 py-3 text-[12px] text-slate-600">{r.customer}</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-600">-{r.qty_keluar}</td>
                        <td className="px-4 py-3 font-mono text-[12px]">{formatRupiah(r.harga_jual)}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{formatRupiah(r.total)}</td>
                        <td className="px-4 py-3 text-[12px] text-slate-600">{r.petugas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 border-t border-slate-100">
                  <Pagination currentPage={currentPage} totalPages={Math.ceil(data.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} totalItems={data.length} itemsPerPage={ITEMS_PER_PAGE} />
                </div>
              </>
            );
          })()}

          {/* PENJUALAN TABLE */}
          {activeTab === 'penjualan' && (() => {
            const paged = penjualan.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
            return (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['No. Transaksi', 'Tanggal', 'Customer', 'Petugas', 'Total', 'Bayar', 'Kembalian', 'Metode', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map(r => (
                      <tr key={r.nomor_transaksi} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3"><code className="text-[11px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{r.nomor_transaksi}</code></td>
                        <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap">{formatDateTime(r.tanggal)}</td>
                        <td className="px-4 py-3 text-[12px] text-slate-700">{r.customer}</td>
                        <td className="px-4 py-3 text-[12px] text-slate-600">{r.petugas}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{formatRupiah(r.total)}</td>
                        <td className="px-4 py-3 font-mono text-[12px]">{formatRupiah(r.bayar)}</td>
                        <td className="px-4 py-3 font-mono text-[12px]">{formatRupiah(r.kembalian)}</td>
                        <td className="px-4 py-3"><span className="capitalize text-[12px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{r.metode_bayar}</span></td>
                        <td className="px-4 py-3"><span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full capitalize">{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 border-t border-slate-100">
                  <Pagination currentPage={currentPage} totalPages={Math.ceil(penjualan.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} totalItems={penjualan.length} itemsPerPage={ITEMS_PER_PAGE} />
                </div>
              </>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
