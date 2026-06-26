// ============================================================
// Sidebar Component
// ============================================================

import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
  ShoppingCart, History, FileText, Users, Activity,
  Truck, UserCircle, X, LogOut, Trash2, RotateCcw
} from 'lucide-react';
import { ActivePage, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { useState } from 'react';

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['admin', 'gudang', 'kasir'] },
  { id: 'master-barang', label: 'Master Barang', icon: <Package className="h-4 w-4" />, roles: ['admin', 'gudang'] },
  { id: 'stock-masuk', label: 'Stock Masuk', icon: <ArrowDownToLine className="h-4 w-4" />, roles: ['admin', 'gudang'] },
  { id: 'stock-keluar', label: 'Stock Keluar', icon: <ArrowUpFromLine className="h-4 w-4" />, roles: ['admin', 'gudang'] },
  { id: 'kasir', label: 'Kasir / POS', icon: <ShoppingCart className="h-4 w-4" />, roles: ['admin', 'kasir'] },
  { id: 'riwayat', label: 'Riwayat Transaksi', icon: <History className="h-4 w-4" />, roles: ['admin', 'gudang', 'kasir'] },
  { id: 'laporan', label: 'Laporan', icon: <FileText className="h-4 w-4" />, roles: ['admin'] },
  { id: 'supplier', label: 'Supplier', icon: <Truck className="h-4 w-4" />, roles: ['admin', 'gudang'] },
  { id: 'customer', label: 'Customer', icon: <UserCircle className="h-4 w-4" />, roles: ['admin', 'kasir'] },
  { id: 'users', label: 'Manajemen User', icon: <Users className="h-4 w-4" />, roles: ['admin'] },
  { id: 'log-aktivitas', label: 'Log Aktivitas', icon: <Activity className="h-4 w-4" />, roles: ['admin'] },
];

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }: SidebarProps) {
  const { user, logout, hasAccess } = useAuth();
  const { resetData, resetEmpty } = useStore();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState<'seed' | 'empty' | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const visibleItems = NAV_ITEMS.filter(item => hasAccess(item.roles));

  const handleNav = (page: ActivePage) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-[var(--z-modal)] h-full w-64 bg-slate-900 text-white flex flex-col
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Wordmark */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-baseline gap-2">
              <h1 className="font-display text-base font-bold text-white leading-none tracking-tight">Inventory POS</h1>
              <span className="text-[10px] font-mono text-indigo-300/90 leading-none">v1.0</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 -mt-1 -mr-1 rounded-lg hover:bg-slate-800 text-slate-400"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Barcode &amp; Google Sheets System</p>
          {/* Signature barcode rule */}
          <div className="h-3 mt-3 text-slate-700 bg-barcode-pattern" aria-hidden="true" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {visibleItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0 font-display">
              {user?.nama?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.nama}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>

          {/* Reset Data — admin only */}
          {user?.role === 'admin' && (
            <div className="mb-2 space-y-1">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest px-1 mb-1">Reset Data</p>
              <button
                onClick={() => { setResetType('empty'); setConfirmText(''); setShowResetModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Semua Data
              </button>
              <button
                onClick={() => { setResetType('seed'); setConfirmText(''); setShowResetModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400 hover:bg-amber-900/30 hover:text-amber-300 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ke Data Awal
              </button>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Modal Konfirmasi Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${resetType === 'empty' ? 'bg-red-100' : 'bg-amber-100'}`}>
              {resetType === 'empty'
                ? <Trash2 className="h-6 w-6 text-red-600" />
                : <RotateCcw className="h-6 w-6 text-amber-600" />}
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1">
              {resetType === 'empty' ? 'Hapus Semua Data?' : 'Reset ke Data Awal?'}
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              {resetType === 'empty'
                ? 'Seluruh data barang, transaksi, stock, dan log akan dihapus permanen. Data user & supplier dipertahankan.'
                : 'Semua data akan dikembalikan ke kondisi awal (data contoh). Tindakan ini tidak dapat dibatalkan.'}
            </p>
            <p className="text-xs text-slate-600 text-center mb-2">
              Ketik <span className="font-bold text-red-600">RESET</span> untuk konfirmasi
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Ketik RESET"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition font-medium"
              >
                Batal
              </button>
              <button
                disabled={confirmText !== 'RESET'}
                onClick={() => {
                  if (confirmText !== 'RESET') return;
                  if (resetType === 'empty') resetEmpty();
                  else resetData();
                  setShowResetModal(false);
                  setConfirmText('');
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition ${
                  confirmText === 'RESET'
                    ? resetType === 'empty' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {resetType === 'empty' ? 'Hapus Semua' : 'Reset Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
