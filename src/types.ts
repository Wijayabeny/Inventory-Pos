// ============================================================
// TYPES - Inventory POS Barcode System
// ============================================================

export type UserRole = 'admin' | 'gudang' | 'kasir';

export interface User {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  email?: string;
  aktif: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface Barang {
  id_barang: string;
  barcode: string;
  nama_barang: string;
  kategori: string;
  merk: string;
  satuan: string;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  stok_minimum: number;
  lokasi_rak: string;
  supplier: string;
  keterangan: string;
  created_at: string;
}

export interface Supplier {
  id_supplier: string;
  nama_supplier: string;
  alamat: string;
  telepon: string;
  email: string;
  kontak_person: string;
  keterangan: string;
  created_at: string;
}

export interface Customer {
  id_customer: string;
  nama_customer: string;
  alamat: string;
  telepon: string;
  email: string;
  created_at: string;
}

export interface StockMasuk {
  nomor_transaksi: string;
  tanggal: string;
  id_barang: string;
  barcode: string;
  nama_barang: string;
  supplier: string;
  qty_masuk: number;
  harga_beli: number;
  total: number;
  petugas: string;
  catatan: string;
  created_at: string;
}

export interface StockKeluar {
  nomor_transaksi: string;
  tanggal: string;
  id_barang: string;
  barcode: string;
  nama_barang: string;
  qty_keluar: number;
  harga_jual: number;
  total: number;
  customer: string;
  petugas: string;
  catatan: string;
  created_at: string;
}

export interface ItemKeranjang {
  id_barang: string;
  barcode: string;
  nama_barang: string;
  harga_jual: number;
  qty: number;
  diskon: number;
  subtotal: number;
}

export interface Penjualan {
  nomor_transaksi: string;
  tanggal: string;
  customer: string;
  petugas: string;
  subtotal: number;
  diskon: number;
  pajak: number;
  total: number;
  bayar: number;
  kembalian: number;
  metode_bayar: string;
  status: 'selesai' | 'batal';
  created_at: string;
}

export interface DetailPenjualan {
  id_detail: string;
  nomor_transaksi: string;
  id_barang: string;
  barcode: string;
  nama_barang: string;
  qty: number;
  harga_jual: number;
  diskon: number;
  subtotal: number;
}

export interface LogAktivitas {
  id: string;
  timestamp: string;
  user: string;
  aktivitas: string;
  detail: string;
}

export interface DashboardStats {
  total_barang: number;
  total_jenis: number;
  total_stok: number;
  nilai_inventory: number;
  barang_hampir_habis: number;
  barang_habis: number;
  penjualan_hari_ini: number;
  penjualan_bulan_ini: number;
  profit_hari_ini: number;
  profit_bulan_ini: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
}

export type ActivePage =
  | 'dashboard'
  | 'master-barang'
  | 'stock-masuk'
  | 'stock-keluar'
  | 'kasir'
  | 'riwayat'
  | 'laporan'
  | 'users'
  | 'log-aktivitas'
  | 'supplier'
  | 'customer';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Legacy types
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
  createdAt: string;
}

export type CodeType = 'barcode' | 'qrcode';

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  type: 'tambah' | 'kurang' | 'pindai' | 'edit' | 'hapus' | 'manual';
  quantityChange: number;
  notes: string;
  timestamp: string;
}
