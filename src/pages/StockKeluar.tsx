// ============================================================
// Stock Keluar Page - Scan barcode wajib
// ============================================================

import { useState } from 'react';
import { Plus, Search, ArrowUpFromLine, Save, X, Scan, AlertTriangle } from 'lucide-react';
import { StockKeluar as StockKeluarType } from '../types';
import { generateTransactionNumber, formatRupiah, formatDate, today } from '../utils/barcode';
import Modal from '../components/UI/Modal';
import Pagination from '../components/UI/Pagination';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../hooks/useStore';

const ITEMS_PER_PAGE = 10;

export default function StockKeluar() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { state, addStockKeluar } = useStore();
  const riwayat = state.stockKeluar;
  const barang = state.barang;
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [stokError, setStokError] = useState('');
  const [form, setForm] = useState({
    tanggal: today(),
    qty_keluar: 1,
    customer: '',
    catatan: '',
  });
  const [strQty, setStrQty] = useState('1');

  const filtered = riwayat.filter(r => {
    const q = search.toLowerCase();
    return !q || r.nama_barang.toLowerCase().includes(q) || r.barcode.toLowerCase().includes(q) || r.nomor_transaksi.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleScanBarcode = () => {
    setStokError('');
    const found = barang.find(b => b.barcode === barcodeInput.trim() || b.id_barang === barcodeInput.trim());
    if (found) {
      if (found.stok === 0) {
        setStokError(`Stok ${found.nama_barang} habis! Tidak dapat melakukan pengeluaran.`);
        return;
      }
      setSelectedBarang(found);
      showToast(`Barang ditemukan: ${found.nama_barang} (Stok: ${found.stok})`, 'success');
    } else {
      showToast('Barcode tidak ditemukan', 'error');
    }
  };

  const handleSave = async () => {
    if (!selectedBarang) { showToast('Pilih barang terlebih dahulu', 'error'); return; }
    if (form.qty_keluar <= 0) { showToast('Qty keluar harus lebih dari 0', 'error'); return; }
    if (form.qty_keluar > selectedBarang.stok) {
      setStokError(`Stok tidak mencukupi! Stok tersedia: ${selectedBarang.stok} ${selectedBarang.satuan}`);
      showToast('Stok tidak mencukupi!', 'error');
      return;
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 500));

    const newEntry: StockKeluarType = {
      nomor_transaksi: generateTransactionNumber('SK'),
      tanggal: form.tanggal,
      id_barang: selectedBarang.id_barang,
      barcode: selectedBarang.barcode,
      nama_barang: selectedBarang.nama_barang,
      qty_keluar: form.qty_keluar,
      harga_jual: selectedBarang.harga_jual,
      total: form.qty_keluar * selectedBarang.harga_jual,
      customer: form.customer || state.customer[0]?.nama_customer || 'Umum',
      petugas: user?.nama || 'Unknown',
      catatan: form.catatan,
      created_at: new Date().toISOString(),
    };

    addStockKeluar(newEntry, user?.nama || 'Unknown');
    showToast(`Stock keluar berhasil. Stok -${form.qty_keluar}`, 'success');

    setShowForm(false);
    setSelectedBarang(null);
    setBarcodeInput('');
    setStokError('');
    setForm({ tanggal: today(), qty_keluar: 1, customer: '', catatan: '' });
    setStrQty('1');
    setSaving(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Stock Keluar</h2>
          <p className="text-xs text-slate-400">{riwayat.length} transaksi keluar</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 transition"
        >
          <Plus className="h-4 w-4" />
          Input Stock Keluar
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari transaksi, barang, atau barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">No. Transaksi</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Barang</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Harga Jual</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <ArrowUpFromLine className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Belum ada data stock keluar</p>
                  </td>
                </tr>
              ) : paginated.map(r => (
                <tr key={r.nomor_transaksi} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <code className="text-[12px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{r.nomor_transaksi}</code>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-[12px]">{formatDate(r.tanggal)}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800">{r.nama_barang}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{r.barcode}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-[12px]">{r.customer}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-amber-600">-{r.qty_keluar}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-[12px] text-slate-600">{formatRupiah(r.harga_jual)}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-800">{formatRupiah(r.total)}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-[12px]">{r.petugas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 border-t border-slate-100">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} />
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setStokError(''); setSelectedBarang(null); setBarcodeInput(''); }}
        title="Input Stock Keluar"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">Batal</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-70">
              {saving ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Scan Barcode *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={e => { setBarcodeInput(e.target.value); setStokError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleScanBarcode()}
                  placeholder="Scan barcode atau ketik ID barang (Enter)..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 font-mono"
                  autoFocus
                />
              </div>
              <button onClick={handleScanBarcode} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition">
                Cari
              </button>
            </div>
            {/* Dropdown select */}
            <select
              className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white text-slate-600"
              onChange={e => {
                const found = barang.find(b => b.id_barang === e.target.value);
                if (found) { setSelectedBarang(found); setBarcodeInput(found.barcode); setStokError(''); }
              }}
            >
              <option value="">— Atau pilih dari daftar —</option>
              {barang.filter(b => b.stok > 0).map(b => <option key={b.id_barang} value={b.id_barang}>{b.nama_barang} (Stok: {b.stok})</option>)}
            </select>
          </div>

          {stokError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{stokError}</p>
            </div>
          )}

          {selectedBarang && !stokError && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start justify-between">
              <div>
                <p className="font-semibold text-amber-800 text-sm">{selectedBarang.nama_barang}</p>
                <p className="text-[12px] text-amber-600">
                  {selectedBarang.barcode} • Stok tersedia: <strong>{selectedBarang.stok} {selectedBarang.satuan}</strong>
                  {selectedBarang.stok <= selectedBarang.stok_minimum && (
                    <span className="ml-2 text-red-600">⚠ Hampir habis</span>
                  )}
                </p>
              </div>
              <button onClick={() => { setSelectedBarang(null); setBarcodeInput(''); }} className="text-amber-400 hover:text-amber-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
              <input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Qty Keluar *</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={strQty}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  setStrQty(v);
                  const qty = v === '' ? 0 : parseInt(v, 10);
                  setForm(p => ({ ...p, qty_keluar: qty }));
                  if (selectedBarang && qty > selectedBarang.stok) {
                    setStokError(`Stok tidak cukup! Tersedia: ${selectedBarang.stok}`);
                  } else {
                    setStokError('');
                  }
                }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer</label>
              <select
                value={form.customer}
                onChange={e => setForm(p => ({ ...p, customer: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white"
              >
                <option value="">— Pilih Customer —</option>
                {state.customer.map(c => <option key={c.id_customer} value={c.nama_customer}>{c.nama_customer}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan</label>
              <input type="text" value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
                placeholder="Catatan opsional"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          {selectedBarang && !stokError && (
            <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Total Nilai Keluar</span>
              <span className="text-lg font-bold font-mono text-amber-600">{formatRupiah(form.qty_keluar * selectedBarang.harga_jual)}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}