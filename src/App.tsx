// ============================================================
// App.tsx - Main Application Entry
// Inventory POS Barcode System
// ============================================================

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { ActivePage } from './types';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { StoreProvider } from './hooks/useStore';
import ToastContainer from './components/UI/ToastContainer';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MasterBarang from './pages/MasterBarang';
import StockMasuk from './pages/StockMasuk';
import StockKeluar from './pages/StockKeluar';
import Kasir from './pages/Kasir';
import RiwayatTransaksi from './pages/RiwayatTransaksi';
import Laporan from './pages/Laporan';
import UserManagement from './pages/UserManagement';
import LogAktivitas from './pages/LogAktivitas';
import { SupplierPage, CustomerPage } from './pages/SupplierCustomer';

function AppContent() {
  const { isAuthenticated, hasAccess } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'master-barang':
        return hasAccess(['admin', 'gudang']) ? <MasterBarang /> : <AccessDenied />;
      case 'stock-masuk':
        return hasAccess(['admin', 'gudang']) ? <StockMasuk /> : <AccessDenied />;
      case 'stock-keluar':
        return hasAccess(['admin', 'gudang']) ? <StockKeluar /> : <AccessDenied />;
      case 'kasir':
        return hasAccess(['admin', 'kasir']) ? <Kasir /> : <AccessDenied />;
      case 'riwayat':
        return <RiwayatTransaksi />;
      case 'laporan':
        return hasAccess(['admin']) ? <Laporan /> : <AccessDenied />;
      case 'users':
        return hasAccess(['admin']) ? <UserManagement /> : <AccessDenied />;
      case 'log-aktivitas':
        return hasAccess(['admin']) ? <LogAktivitas /> : <AccessDenied />;
      case 'supplier':
        return hasAccess(['admin', 'gudang']) ? <SupplierPage /> : <AccessDenied />;
      case 'customer':
        return hasAccess(['admin', 'kasir']) ? <CustomerPage /> : <AccessDenied />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          activePage={activePage}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <Lock className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="font-display text-lg font-bold text-slate-900 mb-2">Akses Ditolak</h3>
      <p className="text-sm text-slate-500 max-w-xs">Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi admin jika ini keliru.</p>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
