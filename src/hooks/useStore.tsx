// ============================================================
// useStore — Global shared state (localStorage-persisted)
// Menghubungkan seluruh halaman tanpa backend.
// Setiap aksi (stock masuk, kasir, dll) otomatis memperbarui
// stok, riwayat, log, dan statistik dashboard.
// ============================================================

import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import {
  Barang, Supplier, Customer, StockMasuk, StockKeluar,
  Penjualan, DetailPenjualan, LogAktivitas, User
} from '../types';

// ──────────────────────────────────────────────
// State shape
// ──────────────────────────────────────────────
export interface AppState {
  barang: Barang[];
  supplier: Supplier[];
  customer: Customer[];
  stockMasuk: StockMasuk[];
  stockKeluar: StockKeluar[];
  penjualan: Penjualan[];
  detailPenjualan: DetailPenjualan[];
  log: LogAktivitas[];
  users: User[];
  _seq: number; // barcode sequence counter
}

// ──────────────────────────────────────────────
// Seed data (first run only)
// ──────────────────────────────────────────────
const SEED: AppState = {
  _seq: 5,
  users: [
    { id: 'U001', username: 'admin',  nama: 'Administrator', role: 'admin',  aktif: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'U002', username: 'gudang', nama: 'Staff Gudang',  role: 'gudang', aktif: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'U003', username: 'kasir',  nama: 'Staff Kasir',   role: 'kasir',  aktif: true, created_at: '2026-01-01T00:00:00Z' },
  ],
  supplier: [
    { id_supplier: 'SUP001', nama_supplier: 'PT Indofood Sukses Makmur', alamat: 'Jl. Sudirman No. 1, Jakarta', telepon: '021-12345678', email: 'info@indofood.com', kontak_person: 'Budi Santoso', keterangan: '', created_at: '2026-01-01T00:00:00Z' },
    { id_supplier: 'SUP002', nama_supplier: 'PT Sosro', alamat: 'Jl. Raya Bekasi Km 28, Bekasi', telepon: '021-87654321', email: 'sales@sosro.com', kontak_person: 'Dewi Rahayu', keterangan: '', created_at: '2026-01-02T00:00:00Z' },
    { id_supplier: 'SUP003', nama_supplier: 'PT Ultra Jaya', alamat: 'Jl. Raya Cimareme, Bandung', telepon: '022-12345678', email: 'info@ultrajaya.co.id', kontak_person: 'Andi Wijaya', keterangan: '', created_at: '2026-01-03T00:00:00Z' },
  ],
  customer: [
    { id_customer: 'CST001', nama_customer: 'Pelanggan Umum', alamat: '-', telepon: '-', email: '-', created_at: '2026-01-01T00:00:00Z' },
    { id_customer: 'CST002', nama_customer: 'Toko Maju Bersama', alamat: 'Jl. Pasar Lama No. 5, Sidoarjo', telepon: '031-12345678', email: 'toko.maju@email.com', created_at: '2026-01-02T00:00:00Z' },
  ],
  barang: [
    { id_barang: 'BRG001', barcode: 'MKN-INM-00001', nama_barang: 'Indomie Goreng Spesial', kategori: 'Makanan', merk: 'Indofood', satuan: 'pcs', harga_beli: 2500, harga_jual: 3500, stok: 120, stok_minimum: 20, lokasi_rak: 'A1', supplier: 'PT Indofood Sukses Makmur', keterangan: 'Mie goreng terlaris', created_at: '2026-06-01T00:00:00Z' },
    { id_barang: 'BRG002', barcode: 'MNM-TEH-00002', nama_barang: 'Teh Botol Sosro 350ml', kategori: 'Minuman', merk: 'Sosro', satuan: 'botol', harga_beli: 3000, harga_jual: 4500, stok: 85, stok_minimum: 15, lokasi_rak: 'B2', supplier: 'PT Sosro', keterangan: '', created_at: '2026-06-02T00:00:00Z' },
    { id_barang: 'BRG003', barcode: 'MNM-KOP-00003', nama_barang: 'Kopi Kapal Api 165g', kategori: 'Minuman', merk: 'Kapal Api', satuan: 'bungkus', harga_beli: 10000, harga_jual: 14500, stok: 3, stok_minimum: 10, lokasi_rak: 'B3', supplier: 'PT Kopi Kapal Api', keterangan: '', created_at: '2026-06-03T00:00:00Z' },
    { id_barang: 'BRG004', barcode: 'MNM-SUS-00004', nama_barang: 'Susu Ultra Milk Cokelat', kategori: 'Minuman', merk: 'Ultra', satuan: 'kotak', harga_beli: 5000, harga_jual: 6800, stok: 0, stok_minimum: 20, lokasi_rak: 'B4', supplier: 'PT Ultra Jaya', keterangan: '', created_at: '2026-06-04T00:00:00Z' },
    { id_barang: 'BRG005', barcode: 'MKN-ROT-00005', nama_barang: 'Roti Tawar Sari Roti', kategori: 'Makanan', merk: 'Sari Roti', satuan: 'bungkus', harga_beli: 12000, harga_jual: 16000, stok: 30, stok_minimum: 10, lokasi_rak: 'A2', supplier: 'PT Nippon Indosari', keterangan: '', created_at: '2026-06-05T00:00:00Z' },
  ],
  stockMasuk: [
    { nomor_transaksi: 'SM-20260601-1001', tanggal: '2026-06-01', id_barang: 'BRG001', barcode: 'MKN-INM-00001', nama_barang: 'Indomie Goreng Spesial', supplier: 'PT Indofood Sukses Makmur', qty_masuk: 50, harga_beli: 2500, total: 125000, petugas: 'Administrator', catatan: 'Restock rutin', created_at: '2026-06-01T10:00:00Z' },
    { nomor_transaksi: 'SM-20260605-1002', tanggal: '2026-06-05', id_barang: 'BRG002', barcode: 'MNM-TEH-00002', nama_barang: 'Teh Botol Sosro 350ml', supplier: 'PT Sosro', qty_masuk: 24, harga_beli: 3000, total: 72000, petugas: 'Staff Gudang', catatan: '', created_at: '2026-06-05T09:00:00Z' },
    { nomor_transaksi: 'SM-20260610-1003', tanggal: '2026-06-10', id_barang: 'BRG003', barcode: 'MNM-KOP-00003', nama_barang: 'Kopi Kapal Api 165g', supplier: 'PT Kopi Kapal Api', qty_masuk: 30, harga_beli: 10000, total: 300000, petugas: 'Administrator', catatan: '', created_at: '2026-06-10T14:00:00Z' },
  ],
  stockKeluar: [
    { nomor_transaksi: 'SK-20260610-1001', tanggal: '2026-06-10', id_barang: 'BRG001', barcode: 'MKN-INM-00001', nama_barang: 'Indomie Goreng Spesial', qty_keluar: 10, harga_jual: 3500, total: 35000, customer: 'Umum', petugas: 'Administrator', catatan: '', created_at: '2026-06-10T11:00:00Z' },
  ],
  penjualan: [
    { nomor_transaksi: 'TRX-20260615-1001', tanggal: '2026-06-15', customer: 'Pelanggan Umum', petugas: 'Staff Kasir', subtotal: 15800, diskon: 0, pajak: 0, total: 15800, bayar: 20000, kembalian: 4200, metode_bayar: 'tunai', status: 'selesai', created_at: '2026-06-15T09:00:00Z' },
    { nomor_transaksi: 'TRX-20260618-1002', tanggal: '2026-06-18', customer: 'Toko Maju Bersama', petugas: 'Staff Kasir', subtotal: 45000, diskon: 5, pajak: 0, total: 42750, bayar: 50000, kembalian: 7250, metode_bayar: 'transfer', status: 'selesai', created_at: '2026-06-18T14:00:00Z' },
  ],
  detailPenjualan: [
    { id_detail: 'DET001', nomor_transaksi: 'TRX-20260615-1001', id_barang: 'BRG001', barcode: 'MKN-INM-00001', nama_barang: 'Indomie Goreng Spesial', qty: 3, harga_jual: 3500, diskon: 0, subtotal: 10500 },
    { id_detail: 'DET002', nomor_transaksi: 'TRX-20260615-1001', id_barang: 'BRG002', barcode: 'MNM-TEH-00002', nama_barang: 'Teh Botol Sosro 350ml', qty: 1, harga_jual: 4500, diskon: 0, subtotal: 4500 },
    { id_detail: 'DET003', nomor_transaksi: 'TRX-20260618-1002', id_barang: 'BRG005', barcode: 'MKN-ROT-00005', nama_barang: 'Roti Tawar Sari Roti', qty: 2, harga_jual: 16000, diskon: 5, subtotal: 30400 },
    { id_detail: 'DET004', nomor_transaksi: 'TRX-20260618-1002', id_barang: 'BRG002', barcode: 'MNM-TEH-00002', nama_barang: 'Teh Botol Sosro 350ml', qty: 2, harga_jual: 4500, diskon: 5, subtotal: 8550 },
  ],
  log: [
    { id: 'LOG001', timestamp: '2026-06-20T08:00:00Z', user: 'Administrator', aktivitas: 'Login', detail: 'Login berhasil dari 192.168.1.1' },
    { id: 'LOG002', timestamp: '2026-06-20T08:05:00Z', user: 'Administrator', aktivitas: 'Tambah Barang', detail: 'Menambahkan barang: Indomie Goreng Spesial (BRG001)' },
    { id: 'LOG003', timestamp: '2026-06-20T08:30:00Z', user: 'Staff Gudang', aktivitas: 'Login', detail: 'Login berhasil dari 192.168.1.2' },
    { id: 'LOG004', timestamp: '2026-06-20T08:35:00Z', user: 'Staff Gudang', aktivitas: 'Stock Masuk', detail: 'SM-20260601-1001 | Indomie Goreng x50' },
    { id: 'LOG005', timestamp: '2026-06-20T09:00:00Z', user: 'Staff Kasir', aktivitas: 'Login', detail: 'Login berhasil dari 192.168.1.3' },
    { id: 'LOG006', timestamp: '2026-06-20T09:15:00Z', user: 'Staff Kasir', aktivitas: 'Penjualan', detail: 'TRX-20260615-1001 | Total: Rp 15.800' },
    { id: 'LOG007', timestamp: '2026-06-20T10:00:00Z', user: 'Administrator', aktivitas: 'Edit Barang', detail: 'Update harga jual BRG002: Rp 4.000 → Rp 4.500' },
    { id: 'LOG008', timestamp: '2026-06-20T11:00:00Z', user: 'Staff Gudang', aktivitas: 'Stock Keluar', detail: 'SK-20260610-1001 | Teh Botol x5' },
  ],
};

// ──────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────
type Action =
  | { type: 'RESET_TO_SEED' }
  | { type: 'RESET_TO_EMPTY' }
  // Barang
  | { type: 'ADD_BARANG'; payload: Barang }
  | { type: 'UPDATE_BARANG'; id: string; payload: Partial<Barang> }
  | { type: 'DELETE_BARANG'; id: string }
  | { type: 'UPDATE_STOK'; id_barang: string; delta: number }
  // Stock Masuk
  | { type: 'ADD_STOCK_MASUK'; payload: StockMasuk }
  | { type: 'DELETE_STOCK_MASUK'; nomor: string }
  // Stock Keluar
  | { type: 'ADD_STOCK_KELUAR'; payload: StockKeluar }
  // Penjualan
  | { type: 'ADD_PENJUALAN'; header: Penjualan; details: DetailPenjualan[] }
  // Supplier
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'UPDATE_SUPPLIER'; id: string; payload: Partial<Supplier> }
  | { type: 'DELETE_SUPPLIER'; id: string }
  // Customer
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; id: string; payload: Partial<Customer> }
  | { type: 'DELETE_CUSTOMER'; id: string }
  // Users
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; id: string; payload: Partial<User> }
  | { type: 'DELETE_USER'; id: string }
  // Log
  | { type: 'ADD_LOG'; payload: Omit<LogAktivitas, 'id' | 'timestamp'> }
  // Sequence
  | { type: 'INC_SEQ' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'RESET_TO_SEED':
      return SEED;

    case 'RESET_TO_EMPTY':
      return {
        ...SEED,
        barang: [],
        stockMasuk: [],
        stockKeluar: [],
        penjualan: [],
        detailPenjualan: [],
        log: [],
        _seq: 0,
      };

    // ── Barang ─────────────────────────────────
    case 'ADD_BARANG':
      return { ...state, barang: [action.payload, ...state.barang], _seq: state._seq + 1 };

    case 'UPDATE_BARANG':
      return { ...state, barang: state.barang.map(b => b.id_barang === action.id ? { ...b, ...action.payload } : b) };

    case 'DELETE_BARANG':
      return { ...state, barang: state.barang.filter(b => b.id_barang !== action.id) };

    case 'UPDATE_STOK':
      return {
        ...state,
        barang: state.barang.map(b =>
          b.id_barang === action.id_barang
            ? { ...b, stok: Math.max(0, b.stok + action.delta) }
            : b
        ),
      };

    // ── Stock Masuk ─────────────────────────────
    case 'ADD_STOCK_MASUK':
      return {
        ...state,
        stockMasuk: [action.payload, ...state.stockMasuk],
        barang: state.barang.map(b =>
          b.id_barang === action.payload.id_barang
            ? { ...b, stok: b.stok + action.payload.qty_masuk }
            : b
        ),
      };

    case 'DELETE_STOCK_MASUK': {
      const trx = state.stockMasuk.find(s => s.nomor_transaksi === action.nomor);
      return {
        ...state,
        stockMasuk: state.stockMasuk.filter(s => s.nomor_transaksi !== action.nomor),
        barang: trx
          ? state.barang.map(b => b.id_barang === trx.id_barang ? { ...b, stok: Math.max(0, b.stok - trx.qty_masuk) } : b)
          : state.barang,
      };
    }

    // ── Stock Keluar ────────────────────────────
    case 'ADD_STOCK_KELUAR':
      return {
        ...state,
        stockKeluar: [action.payload, ...state.stockKeluar],
        barang: state.barang.map(b =>
          b.id_barang === action.payload.id_barang
            ? { ...b, stok: Math.max(0, b.stok - action.payload.qty_keluar) }
            : b
        ),
      };

    // ── Penjualan ───────────────────────────────
    case 'ADD_PENJUALAN': {
      const updatedBarang = action.details.reduce((arr, d) =>
        arr.map(b => b.id_barang === d.id_barang ? { ...b, stok: Math.max(0, b.stok - d.qty) } : b),
        state.barang
      );
      return {
        ...state,
        penjualan: [action.header, ...state.penjualan],
        detailPenjualan: [...action.details, ...state.detailPenjualan],
        barang: updatedBarang,
      };
    }

    // ── Supplier ────────────────────────────────
    case 'ADD_SUPPLIER':
      return { ...state, supplier: [action.payload, ...state.supplier] };
    case 'UPDATE_SUPPLIER':
      return { ...state, supplier: state.supplier.map(s => s.id_supplier === action.id ? { ...s, ...action.payload } : s) };
    case 'DELETE_SUPPLIER':
      return { ...state, supplier: state.supplier.filter(s => s.id_supplier !== action.id) };

    // ── Customer ────────────────────────────────
    case 'ADD_CUSTOMER':
      return { ...state, customer: [action.payload, ...state.customer] };
    case 'UPDATE_CUSTOMER':
      return { ...state, customer: state.customer.map(c => c.id_customer === action.id ? { ...c, ...action.payload } : c) };
    case 'DELETE_CUSTOMER':
      return { ...state, customer: state.customer.filter(c => c.id_customer !== action.id) };

    // ── Users ───────────────────────────────────
    case 'ADD_USER':
      return { ...state, users: [action.payload, ...state.users] };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.id ? { ...u, ...action.payload } : u) };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.id) };

    // ── Log ─────────────────────────────────────
    case 'ADD_LOG':
      return {
        ...state,
        log: [{
          id: `LOG${Date.now()}`,
          timestamp: new Date().toISOString(),
          ...action.payload,
        }, ...state.log],
      };

    case 'INC_SEQ':
      return { ...state, _seq: state._seq + 1 };

    default:
      return state;
  }
}

// ──────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────
interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience action helpers
  addStockMasuk: (payload: StockMasuk, userName: string) => void;
  deleteStockMasuk: (nomor: string, userName: string) => void;
  addStockKeluar: (payload: StockKeluar, userName: string) => void;
  addPenjualan: (header: Penjualan, details: DetailPenjualan[], userName: string) => void;
  addBarang: (payload: Barang, userName: string) => void;
  updateBarang: (id: string, payload: Partial<Barang>, userName: string) => void;
  deleteBarang: (id: string, nama: string, userName: string) => void;
  nextSeq: () => number;
  resetData: () => void;
  resetEmpty: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

const STORAGE_KEY = 'inv_store_v1';

function loadFromStorage(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* ignore */ }
  return SEED;
}

function saveToStorage(state: AppState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadFromStorage);

  useEffect(() => { saveToStorage(state); }, [state]);

  const addStockMasuk = useCallback((payload: StockMasuk, userName: string) => {
    dispatch({ type: 'ADD_STOCK_MASUK', payload });
    dispatch({ type: 'ADD_LOG', payload: { user: userName, aktivitas: 'Stock Masuk', detail: `${payload.nomor_transaksi} | ${payload.nama_barang} x${payload.qty_masuk}` } });
  }, []);

  const deleteStockMasuk = useCallback((nomor: string, userName: string) => {
    dispatch({ type: 'DELETE_STOCK_MASUK', nomor });
    dispatch({ type: 'ADD_LOG', payload: { user: userName, aktivitas: 'Hapus Stock Masuk', detail: `Hapus transaksi: ${nomor}` } });
  }, []);

  const addStockKeluar = useCallback((payload: StockKeluar, userName: string) => {
    dispatch({ type: 'ADD_STOCK_KELUAR', payload });
    dispatch({ type: 'ADD_LOG', payload: { user: userName, aktivitas: 'Stock Keluar', detail: `${payload.nomor_transaksi} | ${payload.nama_barang} x${payload.qty_keluar}` } });
  }, []);

  const addPenjualan = useCallback((header: Penjualan, details: DetailPenjualan[], userName: string) => {
    dispatch({ type: 'ADD_PENJUALAN', header, details });
    dispatch({ type: 'ADD_LOG', payload: { user: userName, aktivitas: 'Penjualan', detail: `${header.nomor_transaksi} | Total: Rp ${header.total.toLocaleString('id-ID')}` } });
  }, []);

  const addBarang = useCallback((payload: Barang, userName: string) => {
    dispatch({ type: 'ADD_BARANG', payload });
    dispatch({ type: 'ADD_LOG', payload: { user: userName, aktivitas: 'Tambah Barang', detail: `${payload.nama_barang} (${payload.id_barang})` } });
  }, []);

  const updateBarang = useCallback((id: string, payload: Partial<Barang>, userName: string) => {
    dispatch({ type: 'UPDATE_BARANG', id, payload });
    dispatch({ type: 'ADD_LOG', payload: { user: userName, aktivitas: 'Edit Barang', detail: `Update barang ID: ${id}` } });
  }, []);

  const deleteBarang = useCallback((id: string, nama: string, userName: string) => {
    dispatch({ type: 'DELETE_BARANG', id });
    dispatch({ type: 'ADD_LOG', payload: { user: userName, aktivitas: 'Hapus Barang', detail: `Hapus: ${nama} (${id})` } });
  }, []);

  const nextSeq = useCallback(() => {
    dispatch({ type: 'INC_SEQ' });
    return state._seq + 1;
  }, [state._seq]);

  const resetData = useCallback(() => {
    dispatch({ type: 'RESET_TO_SEED' });
  }, []);

  const resetEmpty = useCallback(() => {
    dispatch({ type: 'RESET_TO_EMPTY' });
  }, []);

  return (
    <StoreContext.Provider value={{
      state, dispatch,
      addStockMasuk, deleteStockMasuk, addStockKeluar, addPenjualan,
      addBarang, updateBarang, deleteBarang, nextSeq, resetData, resetEmpty,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
