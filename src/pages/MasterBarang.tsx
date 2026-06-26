// ============================================================
// Master Barang Page - CRUD + Barcode Generate + Camera Scan + Cetak Label
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, Printer, Download,
  RefreshCw, Package, Barcode, X, Save, AlertTriangle,
  Camera, CheckSquare, Square, Tag
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { Barang } from '../types';
import { useStore } from '../hooks/useStore';
import { generateBarcode, generateTransactionNumber, formatRupiah } from '../utils/barcode';
import Modal from '../components/UI/Modal';
import BarcodeScanner from '../components/UI/BarcodeScanner';
import Pagination from '../components/UI/Pagination';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

const KATEGORI_LIST = ['Makanan', 'Minuman', 'Elektronik', 'Pakaian', 'Alat Tulis', 'Kesehatan', 'Kebersihan', 'Lainnya'];
const SATUAN_LIST = ['pcs', 'buah', 'bungkus', 'botol', 'kotak', 'lusin', 'kg', 'gram', 'liter', 'ml', 'meter', 'lembar'];

const EMPTY_BARANG: Omit<Barang, 'id_barang' | 'barcode' | 'created_at'> = {
  nama_barang: '', kategori: 'Makanan', merk: '', satuan: 'pcs',
  harga_beli: 0, harga_jual: 0, stok: 0, stok_minimum: 5,
  lokasi_rak: '', supplier: '', keterangan: '',
};

const ITEMS_PER_PAGE = 10;

// Label size options for print
const LABEL_SIZES = [
  { id: 'small',  label: 'Kecil (4×2.5 cm)',   w: 151, h: 94  },
  { id: 'medium', label: 'Sedang (6×4 cm)',     w: 227, h: 151 },
  { id: 'large',  label: 'Besar (10×6 cm)',     w: 378, h: 227 },
];

// ─── Helper: render satu label barcode ke HTML string ──────────
function renderLabelHTML(item: Barang, copies: number, labelSize: typeof LABEL_SIZES[0]): string {
  // Generate SVG barcode via JsBarcode on a temp SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, item.barcode, {
      format: 'CODE128', width: 1.5, height: 40,
      displayValue: true, fontSize: 9, margin: 4,
      background: '#ffffff', lineColor: '#000000',
    });
  } catch { /* ignore */ }
  const svgStr = svg.outerHTML;

  const single = `
    <div class="label" style="width:${labelSize.w}px;height:${labelSize.h}px;">
      <div class="label-name">${item.nama_barang}</div>
      <div class="label-sub">${item.merk ? item.merk + ' · ' : ''}${item.kategori}</div>
      <div class="label-barcode">${svgStr}</div>
      <div class="label-price">${formatRupiah(item.harga_jual)}</div>
    </div>`;
  return Array(copies).fill(single).join('');
}

export default function MasterBarang() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { state, addBarang, updateBarang, deleteBarang } = useStore();
  const barang = state.barang;
  const [loading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Barang | null>(null);
  const [showBarcode, setShowBarcode] = useState(false);
  const [barcodeItem, setBarcodeItem] = useState<Barang | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Camera scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'search' | 'barcode-field'>('search');

  // Cetak label massal
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printCopies, setPrintCopies] = useState<Record<string, number>>({});
  const [labelSizeId, setLabelSizeId] = useState('medium');

  // Form state
  const [form, setForm] = useState(EMPTY_BARANG);
  const [formBarcode, setFormBarcode] = useState('');
  const [saving, setSaving] = useState(false);

  // String input state untuk field angka agar nilai 0 bisa dihapus
  const [strHargaBeli, setStrHargaBeli] = useState('0');
  const [strHargaJual, setStrHargaJual] = useState('0');
  const [strStok, setStrStok] = useState('0');
  const [strStokMin, setStrStokMin] = useState('5');

  // Helper sync string→form number
  const syncNumField = (raw: string, key: 'harga_beli' | 'harga_jual' | 'stok' | 'stok_minimum') => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    setForm(p => ({ ...p, [key]: cleaned === '' ? 0 : parseInt(cleaned, 10) }));
    return cleaned;
  };

  const barcodeRef = useRef<SVGSVGElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  const filtered = barang.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.nama_barang.toLowerCase().includes(q) || b.barcode.toLowerCase().includes(q) || b.merk.toLowerCase().includes(q);
    const matchKat = !filterKategori || b.kategori === filterKategori;
    return matchSearch && matchKat;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, filterKategori]);

  // Generate barcode SVG for modal
  useEffect(() => {
    if (showBarcode && barcodeItem && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcodeItem.barcode, {
          format: 'CODE128', width: 2, height: 70,
          displayValue: true, fontSize: 14, margin: 10,
          background: '#ffffff', lineColor: '#000000',
        });
      } catch (e) { console.error(e); }
    }
  }, [showBarcode, barcodeItem]);

  // ── Checkbox selection ──────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(b => b.id_barang)));
    }
  };

  const openPrintModal = () => {
    if (selectedIds.size === 0) { showToast('Pilih minimal 1 barang untuk dicetak', 'warning'); return; }
    // Init copies = 1 for each selected
    const init: Record<string, number> = {};
    selectedIds.forEach(id => { init[id] = 1; });
    setPrintCopies(init);
    setShowPrintModal(true);
  };

  // ── Print label massal ──────────────────────────────────────
  const handlePrintLabels = () => {
    const labelSize = LABEL_SIZES.find(l => l.id === labelSizeId) || LABEL_SIZES[1];
    const selectedBarang = barang.filter(b => selectedIds.has(b.id_barang));

    let labelsHTML = '';
    selectedBarang.forEach(b => {
      const copies = printCopies[b.id_barang] ?? 1;
      labelsHTML += renderLabelHTML(b, copies, labelSize);
    });

    const win = window.open('', '_blank');
    if (!win) { showToast('Popup diblokir browser. Izinkan popup untuk mencetak.', 'error'); return; }
    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cetak Label Barcode</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 999;
      background: #19212b; padding: 10px 16px;
      display: flex; align-items: center; gap: 12px;
    }
    .toolbar button {
      padding: 6px 18px; border-radius: 8px; border: none;
      background: #00676e; color: #fff; font-weight: bold;
      font-size: 14px; cursor: pointer;
    }
    .toolbar button:hover { background: #005057; }
    .toolbar span { color: #b9bec6; font-size: 13px; }
    .page { margin-top: 48px; padding: 12px; }
    .labels-wrap {
      display: flex; flex-wrap: wrap; gap: 8px;
    }
    .label {
      border: 1px dashed #dce0e6;
      border-radius: 6px;
      padding: 6px 8px;
      display: flex; flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: #fff;
      page-break-inside: avoid;
    }
    .label-name {
      font-weight: bold; font-size: 10px;
      color: #19212b; line-height: 1.2;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .label-sub {
      font-size: 8px; color: #525a64; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .label-barcode { flex: 1; display: flex; align-items: center; justify-content: center; }
    .label-barcode svg { max-width: 100%; height: auto; }
    .label-price {
      font-size: 10px; font-weight: bold; color: #00676e;
      text-align: right; margin-top: 2px;
    }
    @media print {
      .toolbar { display: none; }
      .page { margin-top: 0; padding: 8px; }
      body { background: white; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">🖨️ Cetak Sekarang</button>
    <span>${selectedBarang.length} jenis produk · ${Object.values(printCopies).reduce((a, b) => a + b, 0)} total label</span>
  </div>
  <div class="page">
    <div class="labels-wrap">
      ${labelsHTML}
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    showToast(`Membuka halaman cetak ${Object.values(printCopies).reduce((a, b) => a + b, 0)} label...`, 'success');
  };

  // ── Download single barcode PNG ─────────────────────────────
  const downloadBarcodePNG = useCallback(() => {
    if (!barcodeRef.current || !barcodeItem) return;
    const svg = barcodeRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    canvas.width = 400; canvas.height = 200;
    img.onload = () => {
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = `barcode-${barcodeItem.barcode}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    showToast('Barcode PNG diunduh', 'success');
  }, [barcodeItem, showToast]);

  // ── Print single barcode ────────────────────────────────────
  const printBarcode = useCallback(() => {
    if (!barcodeRef.current || !barcodeItem) return;
    const svg = barcodeRef.current.outerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Barcode ${barcodeItem.barcode}</title>
      <style>
        body { margin: 20px; font-family: Arial, sans-serif; }
        h3 { font-size: 14px; margin-bottom: 4px; }
        p { font-size: 12px; color: #666; margin: 2px 0; }
        .barcode-wrap { margin-top: 10px; border: 1px dashed #ccc; padding: 12px; display: inline-block; border-radius: 8px; }
        .price { font-weight: bold; color: #00676e; font-size: 14px; margin-top: 4px; }
        @media print { button { display: none; } }
      </style>
      </head><body>
      <button onclick="window.print()" style="padding:6px 14px;background:#00676e;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-bottom:12px;">🖨️ Print</button>
      <div class="barcode-wrap">
        <h3>${barcodeItem.nama_barang}</h3>
        <p>${barcodeItem.kategori}${barcodeItem.merk ? ' · ' + barcodeItem.merk : ''}</p>
        <p class="price">${formatRupiah(barcodeItem.harga_jual)}</p>
        ${svg}
      </div>
      </body></html>`);
    win.document.close();
  }, [barcodeItem]);

  // ── CRUD ────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null); setForm(EMPTY_BARANG); setFormBarcode('');
    setStrHargaBeli('0'); setStrHargaJual('0'); setStrStok('0'); setStrStokMin('5');
    setShowForm(true);
  };
  const openEdit = (item: Barang) => {
    setEditItem(item);
    setForm({ nama_barang: item.nama_barang, kategori: item.kategori, merk: item.merk, satuan: item.satuan, harga_beli: item.harga_beli, harga_jual: item.harga_jual, stok: item.stok, stok_minimum: item.stok_minimum, lokasi_rak: item.lokasi_rak, supplier: item.supplier, keterangan: item.keterangan });
    setStrHargaBeli(String(item.harga_beli)); setStrHargaJual(String(item.harga_jual));
    setStrStok(String(item.stok)); setStrStokMin(String(item.stok_minimum));
    setFormBarcode(item.barcode);
    setShowForm(true);
  };
  const openBarcode = (item: Barang) => { setBarcodeItem(item); setShowBarcode(true); };
  const openScanSearch = () => { setScanMode('search'); setShowScanner(true); };
  const openScanBarcodeField = () => { setScanMode('barcode-field'); setShowScanner(true); };

  const handleScanResult = (scanned: string) => {
    setShowScanner(false);
    if (scanMode === 'search') {
      const found = barang.find(b => b.barcode === scanned || b.id_barang === scanned);
      if (found) { setSearch(scanned); showToast(`Ditemukan: ${found.nama_barang}`, 'success'); }
      else { showToast(`Barcode "${scanned}" tidak ditemukan`, 'warning'); setSearch(scanned); }
    } else {
      setFormBarcode(scanned);
      showToast(`Barcode discan: ${scanned}`, 'success');
    }
  };

  const handleSave = async () => {
    if (!form.nama_barang.trim()) { showToast('Nama barang wajib diisi', 'error'); return; }
    if (form.harga_jual < form.harga_beli) showToast('Harga jual lebih kecil dari harga beli', 'warning');
    setSaving(true);
    try {
      if (editItem) {
        const finalBarcode = formBarcode.trim() || editItem.barcode;
        const updated = { ...editItem, ...form, barcode: finalBarcode };
        updateBarang(editItem.id_barang, updated, user?.nama || 'Unknown');
        showToast('Barang berhasil diperbarui', 'success');
      } else {
        const seq = barang.length + 1;
        const finalBarcode = formBarcode.trim() || generateBarcode(form.nama_barang, form.kategori, seq);
        const newItem: Barang = { id_barang: generateTransactionNumber('BRG').replace('BRG-', 'BRG'), barcode: finalBarcode, ...form, created_at: new Date().toISOString() };
        addBarang(newItem, user?.nama || 'Unknown');
        showToast(`Barang ditambahkan. Barcode: ${finalBarcode}`, 'success');
      }
      setShowForm(false);
    } catch { showToast('Gagal menyimpan data', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const target = barang.find(b => b.id_barang === id);
    deleteBarang(id, target?.nama_barang || id, user?.nama || 'Unknown');
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    showToast('Barang berhasil dihapus', 'success');
    setShowDeleteConfirm(null);
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(b => selectedIds.has(b.id_barang));

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Camera Scanner Overlay */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScanResult}
          onClose={() => setShowScanner(false)}
          title={scanMode === 'search' ? 'Scan Cari Barang' : 'Scan Barcode Produk'}
          hint={scanMode === 'search' ? 'Scan barcode untuk mencari barang di daftar inventory' : 'Scan barcode yang sudah ada di produk untuk digunakan sebagai kode barang'}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Master Barang</h2>
          <p className="text-xs text-slate-500">{barang.length} barang terdaftar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={openPrintModal}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
            >
              <Printer className="h-4 w-4" />
              Cetak Label ({selectedIds.size})
            </button>
          )}
          <button onClick={openScanSearch} className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition">
            <Camera className="h-4 w-4" />
            Scan Cari
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
            <Plus className="h-4 w-4" />
            Tambah Barang
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text" placeholder="Cari nama barang, barcode, atau merk..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
            <option value="">Semua Kategori</option>
            {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={() => { setSearch(''); setFilterKategori(''); }} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition">
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
        {/* Selection info */}
        {selectedIds.size > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-indigo-600 font-medium">
              <Tag className="h-3.5 w-3.5 inline mr-1" />
              {selectedIds.size} barang dipilih untuk cetak label
            </p>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-slate-600 transition">Batalkan pilihan</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? <LoadingSpinner text="Memuat data barang..." /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3.5 text-center w-10">
                      <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition" title="Pilih semua">
                        {allFilteredSelected ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">No</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Barang</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Barcode</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori</th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Harga Beli</th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Harga Jual</th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stok</th>
                    <th className="text-center px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center">
                        <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">Tidak ada data barang</p>
                      </td>
                    </tr>
                  ) : paginated.map((b, idx) => {
                    const stokStatus = b.stok === 0 ? 'habis' : b.stok <= b.stok_minimum ? 'hampir' : 'aman';
                    const isSelected = selectedIds.has(b.id_barang);
                    return (
                      <tr key={b.id_barang} className={`hover:bg-slate-50/50 transition ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                        <td className="px-4 py-3.5 text-center">
                          <button onClick={() => toggleSelect(b.id_barang)} className="text-slate-300 hover:text-indigo-600 transition">
                            {isSelected ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-800">{b.nama_barang}</p>
                          <p className="text-[11px] text-slate-400">{b.merk} • {b.satuan}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="text-[12px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{b.barcode}</code>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-[12px]">{b.kategori}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-[12px] text-slate-600">{formatRupiah(b.harga_beli)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-[12px] font-semibold text-indigo-600">{formatRupiah(b.harga_jual)}</td>
                        <td className={`px-5 py-3.5 text-right font-mono font-bold ${stokStatus === 'habis' ? 'text-red-600' : stokStatus === 'hampir' ? 'text-amber-600' : 'text-slate-800'}`}>
                          {b.stok}
                          {stokStatus === 'hampir' && <AlertTriangle className="h-3 w-3 inline ml-1 text-amber-400" />}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`text-[11px] whitespace-nowrap px-2 py-0.5 rounded-full font-medium ${stokStatus === 'habis' ? 'bg-red-100 text-red-700' : stokStatus === 'hampir' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {stokStatus === 'habis' ? 'Habis' : stokStatus === 'hampir' ? 'Hampir Habis' : 'Aman'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openBarcode(b)} title="Lihat & Cetak Barcode" className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition">
                              <Barcode className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => openEdit(b)} title="Edit" className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setShowDeleteConfirm(b.id_barang)} title="Hapus" className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 border-t border-slate-100">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} />
            </div>
          </>
        )}
      </div>

      {/* ── Cetak Label Massal Modal ────────────────────────────── */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Cetak Label Barcode"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">Batal</button>
            <button
              onClick={handlePrintLabels}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak {Object.values(printCopies).reduce((a, b) => a + b, 0)} Label
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Label size */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Ukuran Label</label>
            <div className="flex gap-2 flex-wrap">
              {LABEL_SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setLabelSizeId(s.id)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-medium transition ${labelSizeId === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Per-item copies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Jumlah Copy per Produk</label>
              <button
                onClick={() => { const upd: Record<string,number> = {}; selectedIds.forEach(id => { upd[id] = 1; }); setPrintCopies(upd); }}
                className="text-[11px] text-slate-400 hover:text-indigo-600 transition"
              >
                Reset semua ke 1
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {barang.filter(b => selectedIds.has(b.id_barang)).map(b => (
                <div key={b.id_barang} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{b.nama_barang}</p>
                    <p className="text-[11px] font-mono text-slate-400">{b.barcode}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPrintCopies(p => ({ ...p, [b.id_barang]: Math.max(1, (p[b.id_barang] ?? 1) - 1) }))}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100 transition text-slate-600"
                    >−</button>
                    <input
                      type="number"
                      value={printCopies[b.id_barang] ?? 1}
                      onChange={e => setPrintCopies(p => ({ ...p, [b.id_barang]: Math.max(1, Math.min(999, Number(e.target.value))) }))}
                      className="w-12 text-center border border-slate-200 rounded-lg text-sm font-mono py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      min={1} max={999}
                    />
                    <button
                      onClick={() => setPrintCopies(p => ({ ...p, [b.id_barang]: Math.min(999, (p[b.id_barang] ?? 1) + 1) }))}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100 transition text-slate-600"
                    >+</button>
                    <span className="text-[11px] text-slate-400 w-12 text-right">
                      {printCopies[b.id_barang] ?? 1} label
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
            <Printer className="h-4 w-4 text-indigo-500 shrink-0" />
            <p className="text-[12px] text-indigo-700">
              Total <strong>{Object.values(printCopies).reduce((a, b) => a + b, 0)} label</strong> dari{' '}
              <strong>{selectedIds.size} jenis produk</strong> akan dicetak dengan ukuran{' '}
              <strong>{LABEL_SIZES.find(l => l.id === labelSizeId)?.label}</strong>
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Form Modal ─────────────────────────────────────────── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Barang' : 'Tambah Barang Baru'} size="xl"
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">Batal</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-70">
              {saving ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Barang *</label>
            <input type="text" value={form.nama_barang} onChange={e => setForm(p => ({ ...p, nama_barang: e.target.value }))} placeholder="Masukkan nama barang" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Barcode <span className="text-slate-400 font-normal">(opsional — kosongkan untuk generate otomatis)</span>
            </label>
            <div className="flex gap-2">
              <input type="text" value={formBarcode} onChange={e => setFormBarcode(e.target.value)} placeholder="Scan atau ketik kode barcode..." className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" />
              <button type="button" onClick={openScanBarcodeField} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 transition shrink-0">
                <Camera className="h-4 w-4" /> Scan
              </button>
              {formBarcode && <button type="button" onClick={() => setFormBarcode('')} className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition shrink-0"><X className="h-4 w-4" /></button>}
            </div>
            {!formBarcode && !editItem && (
              <p className="mt-1.5 text-[11px] text-indigo-500 flex items-center gap-1"><Barcode className="h-3 w-3" /> Barcode akan digenerate otomatis: <strong>KAT-NAM-XXXXX</strong></p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategori *</label>
            <select value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
              {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Merk</label>
            <input type="text" value={form.merk} onChange={e => setForm(p => ({ ...p, merk: e.target.value }))} placeholder="Nama merk" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Satuan *</label>
            <select value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
              {SATUAN_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Supplier</label>
            <select value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white">
              <option value="">— Pilih Supplier —</option>
              {state.supplier.map(s => <option key={s.id_supplier} value={s.nama_supplier}>{s.nama_supplier}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Harga Beli (Rp)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={strHargaBeli} onChange={e => setStrHargaBeli(syncNumField(e.target.value, 'harga_beli'))} placeholder="0" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Harga Jual (Rp)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={strHargaJual} onChange={e => setStrHargaJual(syncNumField(e.target.value, 'harga_jual'))} placeholder="0" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stok Awal</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={strStok} onChange={e => setStrStok(syncNumField(e.target.value, 'stok'))} placeholder="0" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stok Minimum</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={strStokMin} onChange={e => setStrStokMin(syncNumField(e.target.value, 'stok_minimum'))} placeholder="0" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Lokasi Rak</label>
            <input type="text" value={form.lokasi_rak} onChange={e => setForm(p => ({ ...p, lokasi_rak: e.target.value }))} placeholder="cth: A1, B2, C3" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Keterangan</label>
            <textarea value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} placeholder="Keterangan tambahan" rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none" />
          </div>
        </div>
      </Modal>

      {/* ── Single Barcode Modal ────────────────────────────────── */}
      <Modal isOpen={showBarcode} onClose={() => setShowBarcode(false)} title="Barcode Barang" size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <button onClick={printBarcode} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button onClick={downloadBarcodePNG} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition">
              <Download className="h-3.5 w-3.5" /> Download PNG
            </button>
          </div>
        }
      >
        {barcodeItem && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="font-semibold text-slate-800 text-sm mb-0.5">{barcodeItem.nama_barang}</p>
              <p className="text-xs text-slate-400 mb-3">{barcodeItem.kategori} • {barcodeItem.merk}</p>
              <div className="flex justify-center bg-white p-3 rounded-lg border border-slate-100">
                <svg ref={barcodeRef} />
              </div>
              <p className="mt-2 text-xs font-semibold text-indigo-600">{formatRupiah(barcodeItem.harga_jual)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 mb-0.5">ID Barang</p>
                <p className="font-mono font-bold text-slate-700">{barcodeItem.id_barang}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 mb-0.5">Kode Barcode</p>
                <p className="font-mono font-bold text-slate-700 break-all">{barcodeItem.barcode}</p>
              </div>
            </div>
            {/* Quick: tambah ke cetak massal */}
            <button
              onClick={() => {
                setSelectedIds(prev => { const s = new Set(prev); s.add(barcodeItem.id_barang); return s; });
                setShowBarcode(false);
                openPrintModal();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition"
            >
              <Printer className="h-4 w-4" />
              Cetak Label dengan Pilihan Jumlah & Ukuran
            </button>
          </div>
        )}
        <canvas ref={barcodeCanvasRef} className="hidden" />
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────────────────── */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Konfirmasi Hapus" size="sm"
        footer={
          <>
            <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">Ya, Hapus</button>
          </>
        }
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm text-slate-700">
            Yakin ingin menghapus barang <strong>{barang.find(b => b.id_barang === showDeleteConfirm)?.nama_barang}</strong>?
          </p>
          <p className="text-xs text-slate-400 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
      </Modal>
    </div>
  );
}