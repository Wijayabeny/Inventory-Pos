// ============================================================
// Login Page
// ============================================================

import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth, DEMO_USERS } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Demo mode: cek dari DEMO_USERS
    // Produksi: ganti dengan API call ke GAS
    await new Promise(r => setTimeout(r, 600));
    const demoUser = DEMO_USERS.find(u => u.username === username);
    if (demoUser && password === 'password') {
      login(demoUser);
      showToast(`Selamat datang, ${demoUser.nama}!`, 'success');
    } else {
      showToast('Username atau password salah. Demo: admin/password', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Signature barcode band — the product's own material, used once, deliberately */}
      <div
        className="absolute inset-x-0 top-0 h-10 text-slate-800 bg-barcode-pattern"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">Inventory POS</h1>
          <p className="text-sm text-indigo-300 mt-1.5">Barcode &amp; Google Sheets System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 p-7">
          <h2 className="font-display text-base font-bold text-slate-900 mb-5">Masuk ke Akun</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="text-xs font-semibold text-slate-600 block mb-1.5">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-slate-600 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-[11px] text-slate-500 font-medium mb-1.5">Demo Accounts (password: <code className="font-mono text-slate-700">password</code>)</p>
            <div className="space-y-1">
              {DEMO_USERS.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setUsername(u.username); setPassword('password'); }}
                  className="w-full text-left text-[11px] text-slate-600 hover:text-indigo-700 transition-colors"
                >
                  <code className="font-mono">{u.username}</code> — {u.nama} ({u.role})
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5 font-mono">
          Inventory POS Barcode System v1.0.0
        </p>
      </div>
    </div>
  );
}
