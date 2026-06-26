// ============================================================
// User Management Page (Admin only)
// ============================================================

import { useState } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff, Save } from 'lucide-react';
import { User, UserRole } from '../types';
import { formatDateTime } from '../utils/barcode';
import Modal from '../components/UI/Modal';
import { useToast } from '../hooks/useToast';
import { useStore } from '../hooks/useStore';


const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-indigo-100 text-indigo-700',
  gudang: 'bg-emerald-100 text-emerald-700',
  kasir: 'bg-amber-100 text-amber-700',
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  gudang: 'Staff Gudang',
  kasir: 'Staff Kasir',
};

const EMPTY_FORM = {
  username: '', nama: '', email: '', role: 'kasir' as UserRole,
  password: '', aktif: true,
};

export default function UserManagement() {
  const { showToast } = useToast();
  const { state, dispatch } = useStore();
  const users = state.users;
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditUser(null); setForm(EMPTY_FORM); setShowForm(true); };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ username: u.username, nama: u.nama, email: u.email || '', role: u.role, password: '', aktif: u.aktif });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.nama.trim()) {
      showToast('Username dan nama wajib diisi', 'error'); return;
    }
    if (!editUser && !form.password) {
      showToast('Password wajib diisi untuk user baru', 'error'); return;
    }
    const usernameExists = users.some(u => u.username === form.username && u.id !== editUser?.id);
    if (usernameExists) { showToast('Username sudah digunakan', 'error'); return; }

    setSaving(true);
    await new Promise(r => setTimeout(r, 500));

    if (editUser) {
      dispatch({ type: 'UPDATE_USER', id: editUser.id, payload: { ...form } });
      showToast('User berhasil diperbarui', 'success');
    } else {
      const newUser: User = {
        id: `U${String(users.length + 1).padStart(3, '0')}`,
        username: form.username, nama: form.nama,
        email: form.email, role: form.role, aktif: form.aktif,
        created_at: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_USER', payload: newUser });
      showToast('User berhasil ditambahkan', 'success');
    }

    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_USER', id });
    showToast('User berhasil dihapus', 'success');
    setShowDeleteConfirm(null);
  };

  const toggleAktif = (id: string) => {
    dispatch({ type: 'UPDATE_USER', id, payload: { aktif: !users.find(u => u.id === id)?.aktif } });
    const u = users.find(u => u.id === id);
    showToast(`User ${u?.aktif ? 'dinonaktifkan' : 'diaktifkan'}`, 'success');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Manajemen User</h2>
          <p className="text-xs text-slate-400">{users.length} user terdaftar</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          <Plus className="h-4 w-4" />Tambah User
        </button>
      </div>

      {/* Role Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['admin', 'gudang', 'kasir'] as UserRole[]).map(role => (
          <div key={role} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3 ${ROLE_COLORS[role]}`}>
              <Shield className="h-3.5 w-3.5" />{ROLE_LABELS[role]}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {role === 'admin' ? 'Akses penuh ke semua fitur dan manajemen sistem.' :
               role === 'gudang' ? 'Akses ke Master Barang, Stock Masuk, Stock Keluar.' :
               'Akses ke halaman Kasir / POS dan penjualan.'}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              {users.filter(u => u.role === role).length} user aktif
            </p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['User', 'Username', 'Role', 'Status', 'Dibuat', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.nama[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{u.nama}</p>
                        {u.email && <p className="text-[11px] text-slate-400">{u.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <code className="text-[12px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{u.username}</code>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => toggleAktif(u.id)}
                      className={`text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full font-medium transition-colors ${u.aktif ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {u.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-slate-500">{formatDateTime(u.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editUser ? 'Edit User' : 'Tambah User Baru'} size="md"
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">Batal</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-70">
              {saving ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Lengkap *</label>
            <input type="text" value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} placeholder="Nama lengkap user"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username *</label>
            <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="Username untuk login"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@contoh.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password {editUser && '(kosongkan jika tidak diganti)'}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role *</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
            >
              <option value="admin">Administrator (Full Access)</option>
              <option value="gudang">Staff Gudang</option>
              <option value="kasir">Staff Kasir</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="aktif" checked={form.aktif} onChange={e => setForm(p => ({ ...p, aktif: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
            <label htmlFor="aktif" className="text-sm text-slate-700">Akun Aktif</label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Hapus User" size="sm"
        footer={
          <>
            <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-xl border text-sm text-slate-600">Batal</button>
            <button onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Ya, Hapus</button>
          </>
        }
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm text-slate-700">Yakin menghapus user <strong>{users.find(u => u.id === showDeleteConfirm)?.nama}</strong>?</p>
          <p className="text-xs text-slate-400 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
      </Modal>
    </div>
  );
}
