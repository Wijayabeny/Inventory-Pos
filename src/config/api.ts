// ============================================================
// API Configuration - Google Apps Script Endpoint
// ============================================================
// Ganti GAS_URL dengan URL Web App Google Apps Script Anda setelah deploy
// Cara: Extensions > Apps Script > Deploy > New Deployment > Web App
// ============================================================

export const GAS_URL = import.meta.env.VITE_GAS_URL || 
  'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

export const API_TIMEOUT = 30000; // 30 detik

export const ENDPOINTS = {
  // Master Barang
  BARANG: 'barang',
  // Stock
  STOCK_MASUK: 'stock_masuk',
  STOCK_KELUAR: 'stock_keluar',
  // POS
  PENJUALAN: 'penjualan',
  DETAIL_PENJUALAN: 'detail_penjualan',
  // Master Data
  SUPPLIER: 'supplier',
  CUSTOMER: 'customer',
  // Users
  USERS: 'users',
  AUTH: 'auth',
  // Log
  LOG_AKTIVITAS: 'log_aktivitas',
  // Dashboard
  DASHBOARD: 'dashboard',
} as const;
