// ============================================================
// Google Sheets API Service
// Semua request ke Google Apps Script Web App
// ============================================================

import { GAS_URL, API_TIMEOUT } from '../config/api';
import { ApiResponse } from '../types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestParams {
  action: string;
  sheet: string;
  [key: string]: unknown;
}

// Core fetch function
async function gasRequest<T>(
  method: HttpMethod,
  params: RequestParams
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    let url = GAS_URL;
    let options: RequestInit = { signal: controller.signal };

    if (method === 'GET') {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) query.set(k, String(v));
      });
      url = `${GAS_URL}?${query.toString()}`;
      options = { ...options, method: 'GET' };
    } else {
      options = {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ method, ...params }),
      };
    }

    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ApiResponse<T> = await res.json();
    return data;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { success: false, error: 'Request timeout. Periksa koneksi internet.' };
    }
    return { success: false, error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// BARANG
// ============================================================
export const barangService = {
  getAll: (params?: { search?: string; kategori?: string; page?: number; limit?: number }) =>
    gasRequest('GET', { action: 'read', sheet: 'MasterBarang', ...params }),

  getByBarcode: (barcode: string) =>
    gasRequest('GET', { action: 'readOne', sheet: 'MasterBarang', barcode }),

  getById: (id_barang: string) =>
    gasRequest('GET', { action: 'readOne', sheet: 'MasterBarang', id_barang }),

  create: (data: Record<string, unknown>) =>
    gasRequest('POST', { action: 'create', sheet: 'MasterBarang', data: JSON.stringify(data) }),

  update: (id_barang: string, data: Record<string, unknown>) =>
    gasRequest('PUT', { action: 'update', sheet: 'MasterBarang', id_barang, data: JSON.stringify(data) }),

  delete: (id_barang: string) =>
    gasRequest('DELETE', { action: 'delete', sheet: 'MasterBarang', id_barang }),
};

// ============================================================
// STOCK MASUK
// ============================================================
export const stockMasukService = {
  getAll: (params?: { search?: string; tanggal_dari?: string; tanggal_sampai?: string; page?: number; limit?: number }) =>
    gasRequest('GET', { action: 'read', sheet: 'StockMasuk', ...params }),

  create: (data: Record<string, unknown>) =>
    gasRequest('POST', { action: 'create', sheet: 'StockMasuk', data: JSON.stringify(data) }),

  delete: (nomor_transaksi: string) =>
    gasRequest('DELETE', { action: 'delete', sheet: 'StockMasuk', nomor_transaksi }),
};

// ============================================================
// STOCK KELUAR
// ============================================================
export const stockKeluarService = {
  getAll: (params?: { search?: string; tanggal_dari?: string; tanggal_sampai?: string; page?: number; limit?: number }) =>
    gasRequest('GET', { action: 'read', sheet: 'StockKeluar', ...params }),

  create: (data: Record<string, unknown>) =>
    gasRequest('POST', { action: 'create', sheet: 'StockKeluar', data: JSON.stringify(data) }),
};

// ============================================================
// PENJUALAN / POS
// ============================================================
export const penjualanService = {
  getAll: (params?: { tanggal_dari?: string; tanggal_sampai?: string; page?: number; limit?: number }) =>
    gasRequest('GET', { action: 'read', sheet: 'Penjualan', ...params }),

  create: (header: Record<string, unknown>, details: unknown[]) =>
    gasRequest('POST', {
      action: 'createPenjualan',
      sheet: 'Penjualan',
      data: JSON.stringify({ header, details }),
    }),
};

// ============================================================
// SUPPLIER
// ============================================================
export const supplierService = {
  getAll: () => gasRequest('GET', { action: 'read', sheet: 'Supplier' }),

  create: (data: Record<string, unknown>) =>
    gasRequest('POST', { action: 'create', sheet: 'Supplier', data: JSON.stringify(data) }),

  update: (id_supplier: string, data: Record<string, unknown>) =>
    gasRequest('PUT', { action: 'update', sheet: 'Supplier', id_supplier, data: JSON.stringify(data) }),

  delete: (id_supplier: string) =>
    gasRequest('DELETE', { action: 'delete', sheet: 'Supplier', id_supplier }),
};

// ============================================================
// CUSTOMER
// ============================================================
export const customerService = {
  getAll: () => gasRequest('GET', { action: 'read', sheet: 'Customer' }),

  create: (data: Record<string, unknown>) =>
    gasRequest('POST', { action: 'create', sheet: 'Customer', data: JSON.stringify(data) }),

  update: (id_customer: string, data: Record<string, unknown>) =>
    gasRequest('PUT', { action: 'update', sheet: 'Customer', id_customer, data: JSON.stringify(data) }),

  delete: (id_customer: string) =>
    gasRequest('DELETE', { action: 'delete', sheet: 'Customer', id_customer }),
};

// ============================================================
// USERS
// ============================================================
export const userService = {
  getAll: () => gasRequest('GET', { action: 'read', sheet: 'Users' }),

  login: (username: string, password: string) =>
    gasRequest('POST', { action: 'login', sheet: 'Users', data: JSON.stringify({ username, password }) }),

  create: (data: Record<string, unknown>) =>
    gasRequest('POST', { action: 'create', sheet: 'Users', data: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    gasRequest('PUT', { action: 'update', sheet: 'Users', id, data: JSON.stringify(data) }),

  delete: (id: string) =>
    gasRequest('DELETE', { action: 'delete', sheet: 'Users', id }),
};

// ============================================================
// LOG AKTIVITAS
// ============================================================
export const logService = {
  getAll: (params?: { page?: number; limit?: number }) =>
    gasRequest('GET', { action: 'read', sheet: 'LogAktivitas', ...params }),

  create: (data: Record<string, unknown>) =>
    gasRequest('POST', { action: 'create', sheet: 'LogAktivitas', data: JSON.stringify(data) }),
};

// ============================================================
// DASHBOARD
// ============================================================
export const dashboardService = {
  getStats: () => gasRequest('GET', { action: 'dashboard', sheet: 'DashboardData' }),
  getTopBarang: () => gasRequest('GET', { action: 'topBarang', sheet: 'DashboardData' }),
};
