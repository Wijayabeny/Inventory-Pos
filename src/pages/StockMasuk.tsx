// ============================================================
// Stock Masuk Page
// ============================================================

import { useState } from 'react';
import { Plus, Search, ArrowDownToLine, Save, X, Scan } from 'lucide-react';
import { StockMasuk as StockMasukType, Barang } from '../types';
import { generateTransactionNumber, formatRupiah, formatDate, today } from '../utils/barcode';
import Modal from '../components/UI/Modal';
import Pagination from '../components/UI/Pagination';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../hooks/useStore';

// Demo barang data
const DEMO_BARANG: Barang[] = [
  { id_barang: 'BRG001', barcode: 'MKN-INM-00001', nama_barang: 'Indomie Goreng Spesial', kategori: 'Makanan', merk: 'Indofood', satuan: 'pcs', harga_beli: 2500, harga_jual: 3500, stok: 120, stok_minimum: 20, lokasi_rak: 'A1', supplier: 'PT Indofood', keterangan: '', created_at: '2026-06-01T00:00:00Z' },
  { id_barang: 'BRG002', barcode: 'MNM-TEH-00002', nama_barang: 'Teh Botol Sosro 350ml', kategori: 'Minuman', merk: 'Sosro', satuan: 'botol', harga_beli: 3000, harga_jual: 4500, stok: 85, stok_minimum: 15, lokasi_rak: 'B2', supplier: 'PT Sosro', keterangan: '', created_at: '2026-06-02T00:00:00Z' },
  { id_barang: 'BRG003', barcode: 'MNM-KOP-00003', nama_barang: 'Kopi Kapal Api 165g', kategori: 'Minuman', merk: 'Kapal Api', satuan: 'bungkus', harga_beli: 10000, harga_jual: 14500, stok: 3, stok_minimum: 10, lokasi_rak: 'B3', supplier: 'PT Kopi Kapal Api', keterangan: '', created_at: '2026-06-03T00:00:00Z' },
];

const DEMO_RIWAYAT: StockMasukType[] = [
  { nomor_transaksi: 'SM-20260601-1001', tanggal: '2026-06-01', id_barang: 'BRG001', barcode: 'MKN-INM-00001', nama_barang: 'Indomie Goreng Spesial', supplier: 'PT Indofood', qty_masuk: 50, harga_beli: 2500, total: 125000, petugas: 'Admin', catatan: 'Restock rutin', created_at: '2026-06-01T10:00:00Z' },
  { nomor_transaksi: 'SM-20260605-1002', tanggal: '2026-06-05', id_barang: 'BRG002', barcode: 'MNM-TEH-00002', nama_barang: 'Teh Botol Sosro 350ml', supplier: 'PT Sosro', qty_masuk: 24, harga_beli: 3000, total: 72000, petugas: 'Gudang', catatan: '', created_at: '2026-06-05T09:00:00Z' },
];

const ITEMS_PER_PAGE = 10;

export default function StockMasuk() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { state, addStockMasuk } = useStore();
  const riwayat = state.stockMasuk;
  const barang = state.barang;
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [form, setForm] = useState({
    tanggal: today(),
    supplier: '',
    qty_masuk: 1,
    harga_beli: 0,
    catatan: '',
  });
  const [strQty, setStrQty] = useState('1');
  const [strHargaBeli, setStrHargaBeli] = useState('0');

  const filtered = riwayat.filter(r => {
    const q = search.toLowerCase();
    return !q || r.nama_barang.toLowerCase().includes(q) || r.barcode.toLowerCase().includes(q) || r.nomor_transaksi.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleScanBarcode = () => {
    const found = barang.find(b => b.barcode === barcodeInput.trim() || b.id_barang === barcodeInput.trim());
    if (found) {
      setSelectedBarang(found);
      setForm(p => ({ ...p, supplier: found.supplier, harga_beli: found.harga_beli }));
      showToast(`Barang ditemukan: ${found.nama_barang}`, 'success');
    } else {
      showToast('Barcode tidak ditemukan di database', 'error');
    }
  };

  const handleSave = async () => {
    if (!selectedBarang) { showToast('Pilih barang terlebih dahulu', 'error'); return; }
    if (form.qty_masuk <= 0) { showToast('Qty masuk harus lebih dari 0', 'error'); return; }

    setSaving(true);
    await new Promise(r => setTimeout(r, 500));

    const newEntry: StockMasukType = {
      nomor_transaksi: generateTransactionNumber('SM'),
      tanggal: form.tanggal,
      id_barang: selectedBarang.id_barang,
      barcode: selectedBarang.barcode,
      nama_barang: selectedBarang.nama_barang,
      supplier: form.supplier,
      qty_masuk: form.qty_masuk,
      harga_beli: form.harga_beli,
      total: form.qty_masuk * form.harga_beli,
      petugas: user?.nama || 'Unknown',
      catatan: form.catatan,
      created_at: new Date().toISOString(),
    };

    addStockMasuk(newEntry, user?.nama || 'Unknown');
    showToast(`Stock masuk berhasil. Stok +${form.qty_masuk} ${selectedBarang.satuan}`, 'success');

    // Reset
    setShowForm(false);
    setSelectedBarang(null);
    setBarcodeInput('');
    setForm({ tanggal: today(), supplier: '', qty_masuk: 1, harga_beli: 0, catatan: '' });
    setStrQty('1'); setStrHargaBeli('0');
    setSaving(false);
  };

  const totalNilai = riwayat.reduce((s, r) => s + r.total, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Stock Masuk</h2>
          <p className="text-xs text-slate-400">{riwayat.length} transaksi • Total nilai: {formatRupiah(totalNilai)}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" />
          Input Stock Masuk
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
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
                <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Harga Beli</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <ArrowDownToLine className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Belum ada data stock masuk</p>
                  </td>
                </tr>
              ) : paginated.map(r => (
                <tr key={r.nomor_transaksi} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <code className="text-[12px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{r.nomor_transaksi}</code>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-[12px]">{formatDate(r.tanggal)}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800">{r.nama_barang}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{r.barcode}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-[12px]">{r.supplier}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600">+{r.qty_masuk}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-[12px] text-slate-600">{formatRupiah(r.harga_beli)}</td>
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
        onClose={() => setShowForm(false)}
        title="Input Stock Masuk"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">Batal</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-70">
              {saving ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Scan Barcode */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Scan / Input Barcode Barang</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScanBarcode()}
                  placeholder="Scan barcode atau ketik ID barang..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 font-mono"
                />
              </div>
              <button onClick={handleScanBarcode} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition">
                Cari
              </button>
            </div>
            {/* Or select dropdown */}
            <div className="mt-2">
              <select
                onChange={e => {
                  const found = barang.find(b => b.id_barang === e.target.value);
                  if (found) {
                    setSelectedBarang(found);
                    setBarcodeInput(found.barcode);
                    setForm(p => ({ ...p, supplier: found.supplier, harga_beli: found.harga_beli }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white text-slate-600"
              >
                <option value="">— Atau pilih dari daftar barang —</option>
                {barang.map(b => <option key={b.id_barang} value={b.id_barang}>{b.nama_barang} ({b.barcode})</option>)}
              </select>
            </div>
          </div>

          {/* Selected Item Info */}
          {selectedBarang && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start justify-between">
              <div>
                <p className="font-semibold text-emerald-800 text-sm">{selectedBarang.nama_barang}</p>
                <p className="text-[12px] text-emerald-600">{selectedBarang.barcode} • Stok saat ini: <strong>{selectedBarang.stok} {selectedBarang.satuan}</strong></p>
              </div>
              <button onClick={() => { setSelectedBarang(null); setBarcodeInput(''); }} className="text-emerald-400 hover:text-emerald-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Supplier</label>
              <select
                value={form.supplier}
                onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">— Pilih Supplier —</option>
                {state.supplier.map(s => <option key={s.id_supplier} value={s.nama_supplier}>{s.nama_supplier}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Qty Masuk</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={strQty}
                onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setStrQty(v); setForm(p => ({ ...p, qty_masuk: v === '' ? 0 : parseInt(v, 10) })); }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Harga Beli (Rp)</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={strHargaBeli}
                onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setStrHargaBeli(v); setForm(p => ({ ...p, harga_beli: v === '' ? 0 : parseInt(v, 10) })); }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan</label>
              <input
                type="text"
                value={form.catatan}
                onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
                placeholder="Catatan opsional"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Total */}
          {selectedBarang && (
            <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Total Nilai</span>
              <span className="text-lg font-bold font-mono text-emerald-600">{formatRupiah(form.qty_masuk * form.harga_beli)}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
