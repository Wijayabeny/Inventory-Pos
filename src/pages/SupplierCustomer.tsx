// ============================================================
// Supplier & Customer Pages
// ============================================================

import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Save, Truck, UserCircle } from 'lucide-react';
import { Supplier, Customer } from '../types';
import { generateTransactionNumber, formatDate } from '../utils/barcode';
import Modal from '../components/UI/Modal';
import { useToast } from '../hooks/useToast';
import { useStore } from '../hooks/useStore';

// ============================================================
// SUPPLIER PAGE
// ============================================================

const EMPTY_SUPPLIER = { nama_supplier: '', alamat: '', telepon: '', email: '', kontak_person: '', keterangan: '' };

export function SupplierPage() {
  const { showToast } = useToast();
  const { state, dispatch } = useStore();
  const suppliers = state.supplier;
  const setSuppliers = (_: Supplier[]) => {}; // replaced by dispatch
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return !q || s.nama_supplier.toLowerCase().includes(q) || s.telepon.includes(q);
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_SUPPLIER); setShowForm(true); };
  const openEdit = (s: Supplier) => { setEditItem(s); setForm({ nama_supplier: s.nama_supplier, alamat: s.alamat, telepon: s.telepon, email: s.email, kontak_person: s.kontak_person, keterangan: s.keterangan }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nama_supplier.trim()) { showToast('Nama supplier wajib diisi', 'error'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    if (editItem) {
      dispatch({ type: 'UPDATE_SUPPLIER', id: editItem.id_supplier, payload: form });
      showToast('Supplier diperbarui', 'success');
    } else {
      dispatch({ type: 'ADD_SUPPLIER', payload: { id_supplier: `SUP${String(suppliers.length + 1).padStart(3,'0')}`, ...form, created_at: new Date().toISOString() } });
      showToast('Supplier ditambahkan', 'success');
    }
    setSaving(false); setShowForm(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_SUPPLIER', id });
    showToast('Supplier dihapus', 'success');
    setDeleteId(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Master Supplier</h2>
          <p className="text-xs text-slate-400">{suppliers.length} supplier terdaftar</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          <Plus className="h-4 w-4" />Tambah Supplier
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari supplier..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Supplier', 'Telepon', 'Email', 'Kontak Person', 'Terdaftar', 'Aksi'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center">
                <Truck className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada supplier</p>
              </td></tr>
            ) : filtered.map(s => (
              <tr key={s.id_supplier} className="hover:bg-slate-50/50">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-800">{s.nama_supplier}</p>
                  <p className="text-[11px] text-slate-400 truncate max-w-48">{s.alamat}</p>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-slate-600 font-mono">{s.telepon}</td>
                <td className="px-5 py-3.5 text-[12px] text-slate-600">{s.email}</td>
                <td className="px-5 py-3.5 text-[12px] text-slate-600">{s.kontak_person}</td>
                <td className="px-5 py-3.5 text-[12px] text-slate-400">{formatDate(s.created_at)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleteId(s.id_supplier)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Supplier' : 'Tambah Supplier'} size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm text-slate-600">Batal</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-70">
            {saving ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}Simpan
          </button>
        </>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'nama_supplier', label: 'Nama Supplier *', placeholder: 'PT Contoh Supplier', full: true },
            { key: 'alamat', label: 'Alamat', placeholder: 'Jl. ...', full: true },
            { key: 'telepon', label: 'Telepon', placeholder: '021-...' },
            { key: 'email', label: 'Email', placeholder: 'info@supplier.com' },
            { key: 'kontak_person', label: 'Kontak Person', placeholder: 'Nama PIC' },
            { key: 'keterangan', label: 'Keterangan', placeholder: 'Keterangan opsional' },
          ].map(f => (
            <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
              <input type="text" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Supplier" size="sm"
        footer={<>
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl border text-sm text-slate-600">Batal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">Hapus</button>
        </>}
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="h-5 w-5 text-red-600" /></div>
          <p className="text-sm text-slate-700">Hapus supplier <strong>{suppliers.find(s => s.id_supplier === deleteId)?.nama_supplier}</strong>?</p>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// CUSTOMER PAGE
// ============================================================

const EMPTY_CUSTOMER = { nama_customer: '', alamat: '', telepon: '', email: '' };

export function CustomerPage() {
  const { showToast } = useToast();
  const { state, dispatch } = useStore();
  const customers = state.customer;
  const setCustomers = (_: Customer[]) => {}; // replaced by dispatch
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !q || c.nama_customer.toLowerCase().includes(q) || c.telepon.includes(q);
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_CUSTOMER); setShowForm(true); };
  const openEdit = (c: Customer) => { setEditItem(c); setForm({ nama_customer: c.nama_customer, alamat: c.alamat, telepon: c.telepon, email: c.email }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nama_customer.trim()) { showToast('Nama customer wajib diisi', 'error'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    if (editItem) {
      dispatch({ type: 'UPDATE_CUSTOMER', id: editItem.id_customer, payload: form });
      showToast('Customer diperbarui', 'success');
    } else {
      dispatch({ type: 'ADD_CUSTOMER', payload: { id_customer: `CST${String(customers.length + 1).padStart(3,'0')}`, ...form, created_at: new Date().toISOString() } });
      showToast('Customer ditambahkan', 'success');
    }
    setSaving(false); setShowForm(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Master Customer</h2>
          <p className="text-xs text-slate-400">{customers.length} customer terdaftar</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          <Plus className="h-4 w-4" />Tambah Customer
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari customer..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Customer', 'Telepon', 'Email', 'Terdaftar', 'Aksi'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center">
                <UserCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada customer</p>
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id_customer} className="hover:bg-slate-50/50">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-800">{c.nama_customer}</p>
                  <p className="text-[11px] text-slate-400">{c.alamat}</p>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-slate-600 font-mono">{c.telepon}</td>
                <td className="px-5 py-3.5 text-[12px] text-slate-600">{c.email}</td>
                <td className="px-5 py-3.5 text-[12px] text-slate-400">{formatDate(c.created_at)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleteId(c.id_customer)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Customer' : 'Tambah Customer'} size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm text-slate-600">Batal</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-70">
            {saving ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}Simpan
          </button>
        </>}
      >
        <div className="space-y-4">
          {[
            { key: 'nama_customer', label: 'Nama Customer *', placeholder: 'Nama lengkap / toko' },
            { key: 'alamat', label: 'Alamat', placeholder: 'Jl. ...' },
            { key: 'telepon', label: 'Telepon', placeholder: '0812-...' },
            { key: 'email', label: 'Email', placeholder: 'email@contoh.com' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
              <input type="text" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Customer" size="sm"
        footer={<>
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl border text-sm text-slate-600">Batal</button>
          <button onClick={() => deleteId && (dispatch({ type: 'DELETE_CUSTOMER', id: deleteId! }), showToast('Customer dihapus', 'success'), setDeleteId(null))} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">Hapus</button>
        </>}
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="h-5 w-5 text-red-600" /></div>
          <p className="text-sm text-slate-700">Hapus customer <strong>{customers.find(c => c.id_customer === deleteId)?.nama_customer}</strong>?</p>
        </div>
      </Modal>
    </div>
  );
}
