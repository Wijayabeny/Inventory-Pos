// ============================================================
// Header Component
// ============================================================

import { Menu, Bell, Wifi, WifiOff } from 'lucide-react';
import { ActivePage } from '../../types';
import { todayDisplay } from '../../utils/barcode';
import { useState, useEffect } from 'react';

const PAGE_LABELS: Record<ActivePage, string> = {
  'dashboard': 'Dashboard',
  'master-barang': 'Master Barang',
  'stock-masuk': 'Stock Masuk',
  'stock-keluar': 'Stock Keluar',
  'kasir': 'Kasir / POS',
  'riwayat': 'Riwayat Transaksi',
  'laporan': 'Laporan',
  'users': 'Manajemen User',
  'log-aktivitas': 'Log Aktivitas',
  'supplier': 'Supplier',
  'customer': 'Customer',
};

interface HeaderProps {
  activePage: ActivePage;
  onMenuClick: () => void;
}

export default function Header({ activePage, onMenuClick }: HeaderProps) {
  const [online, setOnline] = useState(navigator.onLine);
  const [gasConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  return (
    <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-[var(--z-sticky)]">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-display text-sm font-bold text-slate-900 tracking-tight">{PAGE_LABELS[activePage]}</h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">{todayDisplay()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium ${
          online ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {online
            ? <><Wifi className="h-3 w-3" />Online</>
            : <><WifiOff className="h-3 w-3" />Offline</>
          }
        </div>
        {gasConnected === false && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700">
            GAS Belum Dikonfigurasi
          </div>
        )}
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors relative" aria-label="Notifikasi">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
