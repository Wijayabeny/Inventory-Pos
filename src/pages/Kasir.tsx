// ============================================================
// Kasir / POS Page - dengan Camera Barcode Scanner
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Scan, Plus, Minus, Trash2, ShoppingCart, Receipt,
  CreditCard, Banknote, Search, X, Printer, CheckCircle, Camera
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { Barang, ItemKeranjang, Penjualan, DetailPenjualan } from '../types';
import { generateTransactionNumber, formatRupiah, today } from '../utils/barcode';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../hooks/useStore';
import Modal from '../components/UI/Modal';
import BarcodeScanner from '../components/UI/BarcodeScanner';

const PAJAK_PERSEN = 0;

export default function Kasir() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { state, addPenjualan } = useStore();
  const barang = state.barang;
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [search, setSearch] = useState('');
  const [diskonTotal, setDiskonTotal] = useState(0);
  const [pajakPersen, setPajakPersen] = useState(PAJAK_PERSEN);
  const [customer, setCustomer] = useState('');
  const [metode, setMetode] = useState<'tunai' | 'transfer' | 'kartu'>('tunai');
  const [bayar, setBayar] = useState(0);
  // String states agar field angka bisa dihapus/diubah bebas
  const [strDiskon, setStrDiskon] = useState('0');
  const [strPajak, setStrPajak] = useState(String(PAJAK_PERSEN));
  const [strBayar, setStrBayar] = useState('');
  const [showBayar, setShowBayar] = useState(false);
  const [showStruk, setShowStruk] = useState(false);
  const [lastTrx, setLastTrx] = useState<{ nomor: string; tanggal: string } | null>(null);

  // Camera scanner
  const [showScanner, setShowScanner] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const struKRef = useRef<HTMLDivElement>(null);

  // Hitung total
  const subtotal = keranjang.reduce((s, i) => s + i.subtotal, 0);
  const diskonNominal = subtotal * (diskonTotal / 100);
  const setelahDiskon = subtotal - diskonNominal;
  const pajakNominal = setelahDiskon * (pajakPersen / 100);
  const total = setelahDiskon + pajakNominal;
  const kembalian = bayar - total;

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const addToCart = (b: Barang, qty = 1) => {
    if (b.stok === 0) { showToast(`${b.nama_barang} stok habis!`, 'error'); return; }
    setKeranjang(prev => {
      const exists = prev.find(i => i.id_barang === b.id_barang);
      if (exists) {
        const newQty = exists.qty + qty;
        if (newQty > b.stok) { showToast('Qty melebihi stok!', 'warning'); return prev; }
        return prev.map(i => i.id_barang === b.id_barang
          ? { ...i, qty: newQty, subtotal: newQty * i.harga_jual * (1 - i.diskon / 100) }
          : i
        );
      }
      return [...prev, {
        id_barang: b.id_barang, barcode: b.barcode,
        nama_barang: b.nama_barang, harga_jual: b.harga_jual,
        qty, diskon: 0, subtotal: b.harga_jual * qty,
      }];
    });
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const handleScan = () => {
    const q = barcodeInput.trim();
    if (!q) return;
    const found = barang.find(b => b.barcode === q || b.id_barang === q);
    if (found) {
      addToCart(found);
      showToast(`+1 ${found.nama_barang}`, 'success');
    } else {
      showToast('Barcode tidak ditemukan', 'error');
      setBarcodeInput('');
    }
  };

  // Handle hasil scan dari kamera
  const handleCameraScanned = useCallback((scanned: string) => {
    setShowScanner(false);
    const found = barang.find(b => b.barcode === scanned || b.id_barang === scanned);
    if (found) {
      addToCart(found);
      showToast(`+1 ${found.nama_barang} (via kamera)`, 'success');
    } else {
      showToast(`Barcode "${scanned}" tidak ditemukan`, 'error');
      setBarcodeInput(scanned);
    }
    // Re-focus input setelah scanner tutup
    setTimeout(() => barcodeInputRef.current?.focus(), 300);
  }, [barang]); // eslint-disable-line

  const updateQty = (id: string, delta: number) => {
    setKeranjang(prev => prev.map(i => {
      if (i.id_barang !== id) return i;
      const newQty = i.qty + delta;
      if (newQty <= 0) return i;
      const b = barang.find(b => b.id_barang === id);
      if (b && newQty > b.stok) { showToast('Qty melebihi stok!', 'warning'); return i; }
      return { ...i, qty: newQty, subtotal: newQty * i.harga_jual * (1 - i.diskon / 100) };
    }));
  };

  const updateItemDiskon = (id: string, diskon: number) => {
    setKeranjang(prev => prev.map(i =>
      i.id_barang === id
        ? { ...i, diskon, subtotal: i.qty * i.harga_jual * (1 - diskon / 100) }
        : i
    ));
  };

  const removeItem = (id: string) => setKeranjang(prev => prev.filter(i => i.id_barang !== id));
  const clearCart = () => { setKeranjang([]); setDiskonTotal(0); setCustomer(''); setBayar(0); setStrDiskon('0'); setStrBayar(''); };

  const handleBayar = () => {
    if (keranjang.length === 0) { showToast('Keranjang kosong', 'error'); return; }
    if (metode === 'tunai' && bayar < total) { showToast('Nominal bayar kurang', 'error'); return; }
    const finalBayar = bayar || total;
    setBayar(finalBayar);
    setStrBayar(String(finalBayar));
    setShowBayar(true);
  };

  const handleSelesai = () => {
    const nomor = generateTransactionNumber('TRX');

    // ── Simpan ke store bersama (stok berkurang otomatis) ──
    const header: Penjualan = {
      nomor_transaksi: nomor,
      tanggal: new Date().toISOString().slice(0, 10),
      customer: customer || state.customer[0]?.nama_customer || 'Pelanggan Umum',
      petugas: user?.nama || 'Unknown',
      subtotal,
      diskon: diskonTotal,
      pajak: pajakPersen,
      total,
      bayar: bayar || total,
      kembalian: metode === 'tunai' ? (bayar || total) - total : 0,
      metode_bayar: metode,
      status: 'selesai',
      created_at: new Date().toISOString(),
    };
    const details: DetailPenjualan[] = keranjang.map((item, idx) => ({
      id_detail: `DET${Date.now()}${idx}`,
      nomor_transaksi: nomor,
      id_barang: item.id_barang,
      barcode: item.barcode,
      nama_barang: item.nama_barang,
      qty: item.qty,
      harga_jual: item.harga_jual,
      diskon: item.diskon,
      subtotal: item.subtotal,
    }));
    addPenjualan(header, details, user?.nama || 'Unknown');

    setLastTrx({ nomor, tanggal: new Date().toLocaleString('id-ID') });
    setShowBayar(false);
    setShowStruk(true);
    showToast(`Transaksi ${nomor} berhasil!`, 'success');
  };

  const handlePrintStruk = () => {
    if (!struKRef.current) return;
    const content = struKRef.current.innerHTML;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Struk</title>
      <style>body{font-family:monospace;font-size:12px;margin:0;padding:10px;max-width:300px}
      hr{border-top:1px dashed #000}table{width:100%}td{vertical-align:top}
      .right{text-align:right}.bold{font-weight:bold}.center{text-align:center}
      @media print{button{display:none}}</style></head><body>
      <button onclick="window.print()">Print</button>${content}</body></html>`);
    w.document.close();
  };

  const handleCloseStruk = () => {
    setShowStruk(false);
    clearCart();
    barcodeInputRef.current?.focus();
  };

  const filteredBarang = barang.filter(b =>
    !search || b.nama_barang.toLowerCase().includes(search.toLowerCase()) || b.barcode.includes(search)
  );

  return (
    <div className="p-4 sm:p-6">
      {/* Camera Scanner Overlay */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleCameraScanned}
          onClose={() => {
            setShowScanner(false);
            setTimeout(() => barcodeInputRef.current?.focus(), 300);
          }}
          title="Scan Barcode Produk"
          hint="Arahkan kamera ke barcode produk untuk menambahkan ke keranjang belanja"
        />
      )}

      <div className="flex flex-col lg:flex-row gap-5 h-full">

        {/* LEFT: Produk & Scan */}
        <div className="flex-1 space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Kasir / POS</h2>

          {/* Scan Input */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scan Barcode</label>
            <div className="flex gap-2">
              {/* Camera scan button */}
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 transition shrink-0"
                title="Buka kamera untuk scan barcode"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Kamera</span>
              </button>
              <div className="relative flex-1">
                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  placeholder="Scan barcode atau ketik lalu Enter..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-indigo-200 text-sm focus:outline-none focus:border-indigo-400 font-mono bg-indigo-50"
                  autoFocus
                />
              </div>
              <button onClick={handleScan} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                Tambah
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <Camera className="h-3 w-3" />
              Gunakan tombol <strong>Kamera</strong> untuk scan via kamera HP/laptop, atau tembak barcode langsung ke kolom input
            </p>
          </div>

          {/* Product List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari produk..."
                className="flex-1 text-sm outline-none text-slate-700 placeholder-slate-400"
              />
              {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-slate-400" /></button>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {filteredBarang.map(b => (
                <button
                  key={b.id_barang}
                  onClick={() => addToCart(b)}
                  disabled={b.stok === 0}
                  className={`text-left p-2.5 rounded-xl border transition text-xs ${
                    b.stok === 0
                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
                  }`}
                >
                  <p className="font-semibold text-slate-800 truncate">{b.nama_barang}</p>
                  <p className="text-indigo-600 font-mono font-bold mt-0.5">{formatRupiah(b.harga_jual)}</p>
                  <p className={`mt-0.5 ${b.stok === 0 ? 'text-red-500' : 'text-slate-400'}`}>Stok: {b.stok}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Keranjang & Pembayaran */}
        <div className="w-full lg:w-96 space-y-4">
          {/* Cart Header */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">Keranjang ({keranjang.length})</span>
              </div>
              {keranjang.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Kosongkan
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {keranjang.length === 0 ? (
                <div className="py-8 text-center">
                  <ShoppingCart className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Keranjang kosong</p>
                  <p className="text-[11px] text-slate-300 mt-1">Scan barcode atau klik produk</p>
                </div>
              ) : keranjang.map(item => (
                <div key={item.id_barang} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.nama_barang}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{formatRupiah(item.harga_jual)}</p>
                    </div>
                    <button onClick={() => removeItem(item.id_barang)} className="text-slate-300 hover:text-red-500 transition shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.id_barang, -1)} className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-mono font-bold w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id_barang, 1)} className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Disc%</span>
                        <input
                          type="number"
                          value={item.diskon}
                          onChange={e => updateItemDiskon(item.id_barang, Number(e.target.value))}
                          min={0} max={100}
                          className="w-12 px-1.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-mono text-center"
                        />
                      </div>
                      <span className="text-xs font-bold font-mono text-indigo-600">{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="p-4 border-t border-slate-100 space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 font-medium">Customer</label>
                <select value={customer} onChange={e => setCustomer(e.target.value)}
                  className="w-full mt-0.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  <option value="">— Pilih Customer —</option>
                  {state.customer.map(c => <option key={c.id_customer} value={c.nama_customer}>{c.nama_customer}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Subtotal</span>
                <span className="text-xs font-mono font-semibold text-slate-700">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">Diskon (%)</span>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  value={strDiskon}
                  onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setStrDiskon(v); setDiskonTotal(v === '' ? 0 : Math.min(100, parseInt(v, 10))); }}
                  placeholder="0"
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono text-right"
                />
              </div>
              {diskonNominal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Diskon</span>
                  <span className="text-xs font-mono text-red-500">-{formatRupiah(diskonNominal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">Pajak (%)</span>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  value={strPajak}
                  onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setStrPajak(v); setPajakPersen(v === '' ? 0 : Math.min(100, parseInt(v, 10))); }}
                  placeholder="0"
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono text-right"
                />
              </div>
              {pajakNominal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Pajak</span>
                  <span className="text-xs font-mono text-slate-700">{formatRupiah(pajakNominal)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">TOTAL</span>
                <span className="text-lg font-bold font-mono text-indigo-600">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="px-4 pb-3">
              <div className="flex gap-2">
                {(['tunai', 'transfer', 'kartu'] as const).map(m => (
                  <button key={m} onClick={() => setMetode(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${metode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {m === 'tunai' ? '💵 Tunai' : m === 'transfer' ? '🏦 Transfer' : '💳 Kartu'}
                  </button>
                ))}
              </div>
              {metode === 'tunai' && (
                <div className="mt-2">
                  <label className="text-[10px] text-slate-400">Nominal Bayar</label>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    value={strBayar}
                    onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setStrBayar(v); setBayar(v === '' ? 0 : parseInt(v, 10)); }}
                    placeholder={String(total)}
                    className="w-full mt-0.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {bayar >= total && total > 0 && (
                    <p className="text-xs text-emerald-600 font-mono mt-1 text-right">
                      Kembalian: {formatRupiah(kembalian)}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={handleBayar}
                disabled={keranjang.length === 0}
                className="w-full mt-3 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Receipt className="h-4 w-4" />
                Bayar {keranjang.length > 0 ? formatRupiah(total) : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Bayar */}
      <Modal isOpen={showBayar} onClose={() => setShowBayar(false)} title="Konfirmasi Pembayaran" size="sm"
        footer={
          <>
            <button onClick={() => setShowBayar(false)} className="px-4 py-2 rounded-xl border text-sm text-slate-600">Batal</button>
            <button onClick={handleSelesai} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              <CheckCircle className="h-4 w-4" />Selesaikan
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-mono font-bold text-indigo-600">{formatRupiah(total)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Metode</span><span className="capitalize font-medium">{metode}</span></div>
            {metode === 'tunai' && (
              <>
                <div className="flex justify-between"><span className="text-slate-500">Bayar</span><span className="font-mono">{formatRupiah(bayar)}</span></div>
                <div className="flex justify-between text-emerald-600"><span className="font-semibold">Kembalian</span><span className="font-mono font-bold">{formatRupiah(Math.max(0, kembalian))}</span></div>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 text-center">Stok akan otomatis berkurang setelah transaksi selesai.</p>
        </div>
      </Modal>

      {/* Modal Struk */}
      <Modal isOpen={showStruk} onClose={handleCloseStruk} title="Struk Pembayaran" size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <button onClick={handlePrintStruk} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm text-slate-700 hover:bg-slate-50">
              <Printer className="h-3.5 w-3.5" />Print
            </button>
            <button onClick={handleCloseStruk} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Transaksi Baru
            </button>
          </div>
        }
      >
        <div ref={struKRef} className="font-mono text-xs">
          <div className="text-center mb-3">
            <p className="font-bold text-sm">INVENTORY POS</p>
            <p className="text-slate-500">Barcode System</p>
            <hr className="border-dashed my-2" />
            <p>{lastTrx?.tanggal}</p>
            <p>No: {lastTrx?.nomor}</p>
            <p>Kasir: {user?.nama}</p>
            {customer && <p>Customer: {customer}</p>}
            <hr className="border-dashed my-2" />
          </div>
          <table className="w-full">
            <tbody>
              {keranjang.map(item => (
                <tr key={item.id_barang}>
                  <td className="py-0.5">
                    <p>{item.nama_barang}</p>
                    <p className="text-slate-400">{item.qty} x {formatRupiah(item.harga_jual)}</p>
                  </td>
                  <td className="text-right py-0.5">{formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="border-dashed my-2" />
          <div className="space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
            {diskonNominal > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{formatRupiah(diskonNominal)}</span></div>}
            {pajakNominal > 0 && <div className="flex justify-between"><span>Pajak</span><span>{formatRupiah(pajakNominal)}</span></div>}
            <div className="flex justify-between font-bold"><span>TOTAL</span><span>{formatRupiah(total)}</span></div>
            {metode === 'tunai' && (
              <>
                <div className="flex justify-between"><span>Bayar</span><span>{formatRupiah(bayar)}</span></div>
                <div className="flex justify-between"><span>Kembalian</span><span>{formatRupiah(Math.max(0, kembalian))}</span></div>
              </>
            )}
          </div>
          <hr className="border-dashed my-2" />
          <p className="text-center text-slate-400">Terima kasih atas kunjungan Anda!</p>
        </div>
      </Modal>
    </div>
  );
}