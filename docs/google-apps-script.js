// ============================================================
// INVENTORY POS BARCODE - Google Apps Script Backend
// ============================================================
// CARA DEPLOY:
// 1. Buka Google Sheets Anda
// 2. Extensions > Apps Script
// 3. Paste seluruh kode ini
// 4. Deploy > New Deployment > Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy URL-nya dan simpan di .env sebagai VITE_GAS_URL
// ============================================================

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Ganti dengan ID Google Sheet Anda

// ============================================================
// SHEET NAMES
// ============================================================
const SHEETS = {
  BARANG: 'MasterBarang',
  STOCK_MASUK: 'StockMasuk',
  STOCK_KELUAR: 'StockKeluar',
  PENJUALAN: 'Penjualan',
  DETAIL_PENJUALAN: 'DetailPenjualan',
  SUPPLIER: 'Supplier',
  CUSTOMER: 'Customer',
  USERS: 'Users',
  LOG: 'LogAktivitas',
  DASHBOARD: 'DashboardData',
};

// ============================================================
// HEADERS PER SHEET
// ============================================================
const HEADERS = {
  MasterBarang: ['id_barang','barcode','nama_barang','kategori','merk','satuan','harga_beli','harga_jual','stok','stok_minimum','lokasi_rak','supplier','keterangan','created_at'],
  StockMasuk: ['nomor_transaksi','tanggal','id_barang','barcode','nama_barang','supplier','qty_masuk','harga_beli','total','petugas','catatan','created_at'],
  StockKeluar: ['nomor_transaksi','tanggal','id_barang','barcode','nama_barang','qty_keluar','harga_jual','total','customer','petugas','catatan','created_at'],
  Penjualan: ['nomor_transaksi','tanggal','customer','petugas','subtotal','diskon','pajak','total','bayar','kembalian','metode_bayar','status','created_at'],
  DetailPenjualan: ['id_detail','nomor_transaksi','id_barang','barcode','nama_barang','qty','harga_jual','diskon','subtotal'],
  Supplier: ['id_supplier','nama_supplier','alamat','telepon','email','kontak_person','keterangan','created_at'],
  Customer: ['id_customer','nama_customer','alamat','telepon','email','created_at'],
  Users: ['id','username','nama','role','email','password_hash','aktif','created_at'],
  LogAktivitas: ['id','timestamp','user','aktivitas','detail'],
};

// ============================================================
// ENTRY POINT - GET (Read operations)
// ============================================================
function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  const sheet = params.sheet;

  try {
    let result;

    if (action === 'read') {
      result = readData(sheet, params);
    } else if (action === 'readOne') {
      result = readOne(sheet, params);
    } else if (action === 'dashboard') {
      result = getDashboardStats();
    } else if (action === 'topBarang') {
      result = getTopBarang();
    } else if (action === 'login') {
      result = { success: false, error: 'Use POST for login' };
    } else {
      result = { success: false, error: 'Unknown action: ' + action };
    }

    return buildResponse(result);
  } catch (err) {
    return buildResponse({ success: false, error: err.message });
  }
}

// ============================================================
// ENTRY POINT - POST (Create/Update/Delete operations)
// ============================================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const method = body.method;
    const sheet = body.sheet;
    const data = body.data ? JSON.parse(body.data) : null;

    let result;

    if (method === 'POST') {
      if (body.action === 'login') {
        result = loginUser(data);
      } else if (body.action === 'createPenjualan') {
        result = createPenjualan(data.header, data.details);
      } else {
        result = createRow(sheet, data);
      }
    } else if (method === 'PUT') {
      result = updateRow(sheet, body, data);
    } else if (method === 'DELETE') {
      result = deleteRow(sheet, body);
    } else {
      result = { success: false, error: 'Unknown method: ' + method };
    }

    return buildResponse(result);
  } catch (err) {
    return buildResponse({ success: false, error: err.message });
  }
}

// ============================================================
// READ - Get all rows from a sheet with optional filtering
// ============================================================
function readData(sheetName, params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { success: false, error: 'Sheet not found: ' + sheetName };

  const data = ws.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [], total: 0 };

  const headers = data[0];
  let rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  // Search filter
  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }

  // Kategori filter
  if (params.kategori) {
    rows = rows.filter(r => r.kategori === params.kategori);
  }

  // Date range filter
  if (params.tanggal_dari) {
    rows = rows.filter(r => String(r.tanggal) >= params.tanggal_dari);
  }
  if (params.tanggal_sampai) {
    rows = rows.filter(r => String(r.tanggal) <= params.tanggal_sampai);
  }

  const total = rows.length;

  // Pagination
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 50;
  const start = (page - 1) * limit;
  rows = rows.slice(start, start + limit);

  return { success: true, data: rows, total };
}

// ============================================================
// READ ONE - Find by specific key
// ============================================================
function readOne(sheetName, params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { success: false, error: 'Sheet not found' };

  const data = ws.getDataRange().getValues();
  if (data.length <= 1) return { success: false, error: 'Not found' };

  const headers = data[0];

  // Find by barcode or id_barang
  const searchKey = params.barcode ? 'barcode' : params.id_barang ? 'id_barang' : null;
  const searchVal = params.barcode || params.id_barang;

  if (!searchKey) return { success: false, error: 'Search key required' };

  const keyIdx = headers.indexOf(searchKey);
  if (keyIdx === -1) return { success: false, error: 'Key not found in headers' };

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyIdx]) === String(searchVal)) {
      const obj = {};
      headers.forEach((h, j) => { obj[h] = data[i][j]; });
      return { success: true, data: obj };
    }
  }

  return { success: false, error: 'Record not found' };
}

// ============================================================
// CREATE - Add a new row
// ============================================================
function createRow(sheetName, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let ws = ss.getSheetByName(sheetName);

  // Auto-create sheet with headers if doesn't exist
  if (!ws) {
    ws = ss.insertSheet(sheetName);
    const hdrs = HEADERS[sheetName];
    if (hdrs) ws.appendRow(hdrs);
  }

  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];

  // If sheet is empty, add headers
  if (headers[0] === '') {
    const hdrs = HEADERS[sheetName];
    if (hdrs) ws.appendRow(hdrs);
  }

  const freshHeaders = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const row = freshHeaders.map(h => data[h] !== undefined ? data[h] : '');

  ws.appendRow(row);

  // If this is MasterBarang, update stok counter
  // If this is StockMasuk, update barang stok
  if (sheetName === SHEETS.STOCK_MASUK) {
    updateBarangStok(data.id_barang, data.qty_masuk, 'add');
  } else if (sheetName === SHEETS.STOCK_KELUAR) {
    updateBarangStok(data.id_barang, data.qty_keluar, 'subtract');
  }

  // Log aktivitas
  logActivity(data.petugas || 'System', 'Tambah ' + sheetName, JSON.stringify({ id: data.id_barang || data.nomor_transaksi }));

  return { success: true, message: 'Data berhasil ditambahkan' };
}

// ============================================================
// UPDATE - Update existing row
// ============================================================
function updateRow(sheetName, params, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { success: false, error: 'Sheet not found' };

  const allData = ws.getDataRange().getValues();
  const headers = allData[0];

  // Determine primary key
  const pkMap = {
    MasterBarang: 'id_barang',
    StockMasuk: 'nomor_transaksi',
    StockKeluar: 'nomor_transaksi',
    Penjualan: 'nomor_transaksi',
    Supplier: 'id_supplier',
    Customer: 'id_customer',
    Users: 'id',
  };

  const pk = pkMap[sheetName];
  const pkVal = params[pk];
  const pkIdx = headers.indexOf(pk);

  if (pkIdx === -1) return { success: false, error: 'Primary key not found' };

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][pkIdx]) === String(pkVal)) {
      // Update each column with new data
      headers.forEach((h, j) => {
        if (data[h] !== undefined) {
          ws.getRange(i + 1, j + 1).setValue(data[h]);
        }
      });
      logActivity('System', 'Update ' + sheetName, pkVal);
      return { success: true, message: 'Data berhasil diperbarui' };
    }
  }

  return { success: false, error: 'Record not found: ' + pkVal };
}

// ============================================================
// DELETE - Remove a row
// ============================================================
function deleteRow(sheetName, params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { success: false, error: 'Sheet not found' };

  const allData = ws.getDataRange().getValues();
  const headers = allData[0];

  const pkMap = {
    MasterBarang: 'id_barang',
    StockMasuk: 'nomor_transaksi',
    StockKeluar: 'nomor_transaksi',
    Supplier: 'id_supplier',
    Customer: 'id_customer',
    Users: 'id',
  };

  const pk = pkMap[sheetName];
  const pkVal = params[pk];
  const pkIdx = headers.indexOf(pk);

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][pkIdx]) === String(pkVal)) {
      ws.deleteRow(i + 1);
      logActivity('System', 'Hapus ' + sheetName, pkVal);
      return { success: true, message: 'Data berhasil dihapus' };
    }
  }

  return { success: false, error: 'Record not found' };
}

// ============================================================
// SPECIAL: Create Penjualan (header + details + update stok)
// ============================================================
function createPenjualan(header, details) {
  try {
    // Save header to Penjualan sheet
    createRow(SHEETS.PENJUALAN, header);

    // Save each detail and update stok
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let detailWs = ss.getSheetByName(SHEETS.DETAIL_PENJUALAN);
    if (!detailWs) {
      detailWs = ss.insertSheet(SHEETS.DETAIL_PENJUALAN);
      detailWs.appendRow(HEADERS.DetailPenjualan);
    }

    details.forEach((d, idx) => {
      const row = HEADERS.DetailPenjualan.map(h => d[h] !== undefined ? d[h] : '');
      detailWs.appendRow(row);
      // Kurangi stok barang
      updateBarangStok(d.id_barang, d.qty, 'subtract');
    });

    logActivity(header.petugas, 'Penjualan', header.nomor_transaksi + ' | Total: ' + header.total);

    return { success: true, message: 'Penjualan berhasil disimpan' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// UPDATE STOK BARANG (called after stock in/out/sale)
// ============================================================
function updateBarangStok(id_barang, qty, operation) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(SHEETS.BARANG);
  if (!ws) return;

  const data = ws.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('id_barang');
  const stokIdx = headers.indexOf('stok');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(id_barang)) {
      const currentStok = parseInt(data[i][stokIdx]) || 0;
      const newStok = operation === 'add'
        ? currentStok + parseInt(qty)
        : Math.max(0, currentStok - parseInt(qty));
      ws.getRange(i + 1, stokIdx + 1).setValue(newStok);
      return;
    }
  }
}

// ============================================================
// LOGIN USER
// ============================================================
function loginUser(credentials) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(SHEETS.USERS);
  if (!ws) return { success: false, error: 'Users sheet not found' };

  const data = ws.getDataRange().getValues();
  const headers = data[0];

  const usernameIdx = headers.indexOf('username');
  const passwordIdx = headers.indexOf('password_hash');
  const aktifIdx = headers.indexOf('aktif');

  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameIdx] === credentials.username) {
      if (!data[i][aktifIdx]) return { success: false, error: 'Akun tidak aktif' };
      // Simple password check (in production, use hashed passwords)
      if (data[i][passwordIdx] === credentials.password) {
        const user = {};
        headers.forEach((h, j) => { if (h !== 'password_hash') user[h] = data[i][j]; });
        logActivity(credentials.username, 'Login', 'Login berhasil');
        return { success: true, data: user };
      } else {
        return { success: false, error: 'Password salah' };
      }
    }
  }

  return { success: false, error: 'Username tidak ditemukan' };
}

// ============================================================
// DASHBOARD STATS
// ============================================================
function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Barang stats
  const barangWs = ss.getSheetByName(SHEETS.BARANG);
  let totalBarang = 0, totalStok = 0, nilaiInventory = 0, hampirHabis = 0, barangHabis = 0;

  if (barangWs && barangWs.getLastRow() > 1) {
    const barangData = barangWs.getDataRange().getValues();
    const headers = barangData[0];
    const stokIdx = headers.indexOf('stok');
    const stokMinIdx = headers.indexOf('stok_minimum');
    const hargaBeliIdx = headers.indexOf('harga_beli');

    for (let i = 1; i < barangData.length; i++) {
      const stok = parseInt(barangData[i][stokIdx]) || 0;
      const stokMin = parseInt(barangData[i][stokMinIdx]) || 0;
      const hargaBeli = parseInt(barangData[i][hargaBeliIdx]) || 0;

      totalBarang++;
      totalStok += stok;
      nilaiInventory += stok * hargaBeli;
      if (stok === 0) barangHabis++;
      else if (stok <= stokMin) hampirHabis++;
    }
  }

  // Penjualan hari ini
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  const penjualanWs = ss.getSheetByName(SHEETS.PENJUALAN);
  let penjualanHariIni = 0, penjualanBulanIni = 0, profitHariIni = 0, profitBulanIni = 0;

  if (penjualanWs && penjualanWs.getLastRow() > 1) {
    const penjData = penjualanWs.getDataRange().getValues();
    const pHeaders = penjData[0];
    const tglIdx = pHeaders.indexOf('tanggal');
    const totalIdx = pHeaders.indexOf('total');

    for (let i = 1; i < penjData.length; i++) {
      const tgl = String(penjData[i][tglIdx]).substring(0, 10);
      const total = parseFloat(penjData[i][totalIdx]) || 0;
      if (tgl === today) penjualanHariIni += total;
      if (tgl.startsWith(thisMonth)) penjualanBulanIni += total;
    }
  }

  return {
    success: true,
    data: {
      total_barang: totalBarang,
      total_jenis: totalBarang,
      total_stok: totalStok,
      nilai_inventory: nilaiInventory,
      barang_hampir_habis: hampirHabis,
      barang_habis: barangHabis,
      penjualan_hari_ini: penjualanHariIni,
      penjualan_bulan_ini: penjualanBulanIni,
      profit_hari_ini: profitHariIni,
      profit_bulan_ini: profitBulanIni,
    }
  };
}

// ============================================================
// TOP BARANG (Best sellers)
// ============================================================
function getTopBarang() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(SHEETS.DETAIL_PENJUALAN);
  if (!ws || ws.getLastRow() <= 1) return { success: true, data: [] };

  const data = ws.getDataRange().getValues();
  const headers = data[0];
  const namaIdx = headers.indexOf('nama_barang');
  const qtyIdx = headers.indexOf('qty');

  const counter = {};
  for (let i = 1; i < data.length; i++) {
    const nama = data[i][namaIdx];
    const qty = parseInt(data[i][qtyIdx]) || 0;
    counter[nama] = (counter[nama] || 0) + qty;
  }

  const sorted = Object.entries(counter)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([nama, qty]) => ({ nama, qty }));

  return { success: true, data: sorted };
}

// ============================================================
// LOG ACTIVITY
// ============================================================
function logActivity(user, aktivitas, detail) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let ws = ss.getSheetByName(SHEETS.LOG);
    if (!ws) {
      ws = ss.insertSheet(SHEETS.LOG);
      ws.appendRow(HEADERS.LogAktivitas);
    }
    ws.appendRow([
      'L-' + Date.now(),
      new Date().toISOString(),
      user || 'System',
      aktivitas,
      detail
    ]);
  } catch (e) {
    // Silent fail for logging
  }
}

// ============================================================
// HELPER: Build CORS-friendly JSON response
// ============================================================
function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// SETUP: Initialize all sheets with headers
// ============================================================
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  Object.entries(HEADERS).forEach(([sheetName, headers]) => {
    let ws = ss.getSheetByName(sheetName);
    if (!ws) {
      ws = ss.insertSheet(sheetName);
      Logger.log('Created sheet: ' + sheetName);
    }

    // Set headers if empty
    const firstRow = ws.getRange(1, 1, 1, headers.length).getValues()[0];
    if (firstRow[0] === '' || firstRow[0] === null) {
      ws.getRange(1, 1, 1, headers.length).setValues([headers]);
      // Style headers
      ws.getRange(1, 1, 1, headers.length)
        .setBackground('#4f46e5')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      ws.setFrozenRows(1);
      Logger.log('Headers set for: ' + sheetName);
    }
  });

  // Add demo admin user
  const usersWs = ss.getSheetByName('Users');
  if (usersWs && usersWs.getLastRow() <= 1) {
    usersWs.appendRow(['U001', 'admin', 'Administrator', 'admin', 'admin@sistem.com', 'password', true, new Date().toISOString()]);
    usersWs.appendRow(['U002', 'gudang', 'Staff Gudang', 'gudang', 'gudang@sistem.com', 'password', true, new Date().toISOString()]);
    usersWs.appendRow(['U003', 'kasir', 'Staff Kasir', 'kasir', 'kasir@sistem.com', 'password', true, new Date().toISOString()]);
  }

  Logger.log('Initialization complete!');
  SpreadsheetApp.getUi().alert('✅ Semua sheet berhasil diinisialisasi!');
}

// ============================================================
// MENU: Add custom menu to Google Sheets
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Inventory System')
    .addItem('Inisialisasi Semua Sheet', 'initializeSheets')
    .addItem('Test Koneksi', 'testConnection')
    .addSeparator()
    .addItem('Export Dashboard Data', 'exportDashboard')
    .addToUi();
}

function testConnection() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets().map(s => s.getName());
    SpreadsheetApp.getUi().alert('✅ Koneksi berhasil!\nSheet ditemukan: ' + sheets.join(', '));
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Error: ' + e.message);
  }
}

function exportDashboard() {
  const result = getDashboardStats();
  Logger.log(JSON.stringify(result));
  SpreadsheetApp.getUi().alert('Dashboard stats logged to console:\n' + JSON.stringify(result.data, null, 2));
}
