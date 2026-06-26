// ============================================================
// Log Aktivitas Page
// ============================================================

import { Activity, Search } from 'lucide-react';
import { formatDateTime } from '../utils/barcode';
import Pagination from '../components/UI/Pagination';
import { useState } from 'react';
import { useStore } from '../hooks/useStore';

const AKSI_COLORS: Record<string, string> = {
  'Login': 'bg-blue-100 text-blue-700',
  'Logout': 'bg-slate-100 text-slate-600',
  'Tambah Barang': 'bg-emerald-100 text-emerald-700',
  'Edit Barang': 'bg-amber-100 text-amber-700',
  'Hapus Barang': 'bg-red-100 text-red-700',
  'Stock Masuk': 'bg-violet-100 text-violet-700',
  'Stock Keluar': 'bg-orange-100 text-orange-700',
  'Penjualan': 'bg-indigo-100 text-indigo-700',
};

const ITEMS_PER_PAGE = 15;

export default function LogAktivitas() {
  const { state } = useStore();
  const logs = state.log;

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return !q || l.user.toLowerCase().includes(q) || l.aktivitas.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Log Aktivitas</h2>
        <p className="text-xs text-slate-400">Rekam jejak seluruh aktivitas pengguna sistem</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari aktivitas, user..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Timestamp', 'User', 'Aktivitas', 'Detail'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center">
                  <Activity className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Tidak ada log aktivitas</p>
                </td></tr>
              ) : paginated.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-[12px] text-slate-500 whitespace-nowrap font-mono">{formatDateTime(l.timestamp)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {l.user[0]}
                      </div>
                      <span className="text-[12px] font-medium text-slate-700">{l.user}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] whitespace-nowrap px-2 py-0.5 rounded-full font-medium ${AKSI_COLORS[l.aktivitas] || 'bg-slate-100 text-slate-600'}`}>
                      {l.aktivitas}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-slate-600">{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 border-t border-slate-100">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} />
        </div>
      </div>
    </div>
  );
}
