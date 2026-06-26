# Inventory POS Barcode System

Sistem manajemen inventory lengkap berbasis **React + Vite** dengan backend **Google Apps Script** dan database **Google Sheets**.

---

## 📦 Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Barcode | JsBarcode + html5-qrcode |
| Export | jsPDF + XLSX |
| Backend | Google Apps Script |
| Database | Google Sheets |

---

## 🚀 Fitur

- ✅ **Master Barang** — CRUD + generate barcode otomatis (CODE128)
- ✅ **Stock Masuk** — Input penerimaan barang dari supplier
- ✅ **Stock Keluar** — Pengeluaran barang via scan barcode + validasi stok
- ✅ **Kasir / POS** — Scan barcode, keranjang, diskon, pajak, struk
- ✅ **Dashboard** — Statistik real-time + chart pergerakan stok
- ✅ **Riwayat Transaksi** — Histori masuk/keluar/penjualan + export CSV
- ✅ **Laporan** — Print & export PDF/CSV semua jenis laporan
- ✅ **User Management** — Role: Admin, Gudang, Kasir
- ✅ **Log Aktivitas** — Rekam jejak seluruh aksi user
- ✅ **Master Supplier & Customer**

---

## ⚙️ Instalasi

### 1. Clone / Extract Project

```bash
unzip inventory-pos-barcode-google-sheet.zip
cd inventory-pos-barcode
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka: [http://localhost:3000](http://localhost:3000)

### 5. Build Production

```bash
npm run build
```

---

## 🗄️ Setup Google Sheets

### Langkah 1 — Buat Google Sheets Baru

1. Buka [sheets.google.com](https://sheets.google.com)
2. Buat spreadsheet baru
3. Copy **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### Langkah 2 — Setup Google Apps Script

1. Di Google Sheets, klik **Extensions > Apps Script**
2. Hapus kode default yang ada
3. Paste seluruh isi file `docs/google-apps-script.js`
4. Ganti baris berikut dengan ID spreadsheet Anda:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
5. Klik **Save** (Ctrl+S)

### Langkah 3 — Inisialisasi Sheet

1. Refresh halaman Apps Script
2. Di toolbar, pilih fungsi `initializeSheets`
3. Klik **Run**
4. Izinkan akses Google jika diminta
5. Semua sheet akan dibuat otomatis dengan header yang benar

### Langkah 4 — Deploy sebagai Web App

1. Klik **Deploy > New Deployment**
2. Klik ikon ⚙️ lalu pilih **Web App**
3. Isi konfigurasi:
   - **Description**: Inventory POS API v1
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Klik **Deploy**
5. Copy **Web App URL** yang muncul
6. Paste URL tersebut ke file `.env`:
   ```env
   VITE_GAS_URL=https://script.google.com/macros/s/XXXXX/exec
   ```

---

## 📋 Struktur Google Sheets

| Sheet | Deskripsi |
|---|---|
| `MasterBarang` | Data master semua barang |
| `StockMasuk` | Riwayat penerimaan barang |
| `StockKeluar` | Riwayat pengeluaran barang |
| `Penjualan` | Header transaksi penjualan |
| `DetailPenjualan` | Detail item per transaksi |
| `Supplier` | Data master supplier |
| `Customer` | Data master customer |
| `Users` | Akun pengguna sistem |
| `LogAktivitas` | Log semua aktivitas |
| `DashboardData` | Cache data dashboard |

---

## 🔐 Akun Demo

| Username | Password | Role | Akses |
|---|---|---|---|
| `admin` | `password` | Administrator | Full access |
| `gudang` | `password` | Staff Gudang | Barang, Stock Masuk/Keluar |
| `kasir` | `password` | Staff Kasir | Kasir/POS |

---

## 🏷️ Format Barcode

Barcode digenerate otomatis saat barang dibuat:

```
KAT-NAM-XXXXX
```

Contoh:
```
MKN-INM-00001   ← Makanan / Indomie / seq 1
MNM-TEH-00002   ← Minuman / Teh / seq 2
ELK-HPO-00003   ← Elektronik / Hp / seq 3
```

- **3 karakter pertama** — kode kategori
- **3 karakter tengah** — 3 huruf pertama nama barang
- **5 digit akhir** — nomor urut

---

## 📁 Struktur Folder

```
inventory-pos-barcode/
├── src/
│   ├── config/
│   │   └── api.ts              ← GAS endpoint config
│   ├── services/
│   │   └── googleSheets.ts     ← API service layer
│   ├── hooks/
│   │   ├── useAuth.tsx         ← Auth context
│   │   └── useToast.tsx        ← Toast notification
│   ├── utils/
│   │   └── barcode.ts          ← Barcode & format utils
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   └── UI/
│   │       ├── Modal.tsx
│   │       ├── ToastContainer.tsx
│   │       ├── Pagination.tsx
│   │       └── LoadingSpinner.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── MasterBarang.tsx
│   │   ├── StockMasuk.tsx
│   │   ├── StockKeluar.tsx
│   │   ├── Kasir.tsx
│   │   ├── RiwayatTransaksi.tsx
│   │   ├── Laporan.tsx
│   │   ├── UserManagement.tsx
│   │   ├── LogAktivitas.tsx
│   │   └── SupplierCustomer.tsx
│   ├── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── docs/
│   ├── google-apps-script.js   ← Backend GAS (paste ke Apps Script)
│   └── README.md
├── public/
├── .env.example
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🔌 API Endpoints (GAS)

Semua request ke satu URL Web App GAS. Method dibedakan via parameter.

### GET — Read Data

```
GET {GAS_URL}?action=read&sheet=MasterBarang&page=1&limit=20
GET {GAS_URL}?action=read&sheet=MasterBarang&search=indomie
GET {GAS_URL}?action=readOne&sheet=MasterBarang&barcode=MKN-INM-00001
GET {GAS_URL}?action=dashboard&sheet=DashboardData
```

### POST — Create Data

```javascript
fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify({
    method: 'POST',
    action: 'create',
    sheet: 'MasterBarang',
    data: JSON.stringify({ id_barang: 'BRG001', nama_barang: '...', ... })
  })
})
```

### PUT — Update Data

```javascript
fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify({
    method: 'PUT',
    action: 'update',
    sheet: 'MasterBarang',
    id_barang: 'BRG001',
    data: JSON.stringify({ harga_jual: 5000 })
  })
})
```

### DELETE — Delete Data

```javascript
fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify({
    method: 'DELETE',
    action: 'delete',
    sheet: 'MasterBarang',
    id_barang: 'BRG001'
  })
})
```

---

## 🛠️ Menghubungkan ke GAS (Production)

Setelah GAS dikonfigurasi, aktifkan API call di setiap page dengan mengganti bagian demo data.

Contoh di `MasterBarang.tsx`:

```typescript
// Ganti state demo:
const [barang, setBarang] = useState<Barang[]>(DEMO_BARANG);

// Dengan API call:
useEffect(() => {
  barangService.getAll().then(res => {
    if (res.success && res.data) setBarang(res.data as Barang[]);
  });
}, []);
```

Dan saat simpan:

```typescript
// Ganti local state update:
setBarang(prev => [...prev, newItem]);

// Dengan:
await barangService.create(newItem);
```

---

## ❓ FAQ

**Q: Apakah bisa offline?**
A: Tampilan bisa dibuka offline, tetapi operasi CRUD memerlukan koneksi internet ke Google Sheets.

**Q: Apakah data aman di Google Sheets?**
A: GAS Web App dapat dikonfigurasi agar hanya bisa diakses dari domain tertentu. Tambahkan validasi token di GAS untuk keamanan ekstra.

**Q: Kenapa muncul "GAS Belum Dikonfigurasi"?**
A: Anda belum mengisi `VITE_GAS_URL` di file `.env`. Ikuti langkah setup di atas.

**Q: Bagaimana cara menambah kolom baru?**
A: Tambahkan kolom di Google Sheets, update array `HEADERS` di GAS, dan update interface TypeScript di `src/types.ts`.
