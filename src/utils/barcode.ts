// ============================================================
// Barcode Utility - Auto-generate barcode dari nama barang
// Format: XXX-XXX-00001 (3 huruf kategori - 3 huruf nama - 5 digit seq)
// Contoh: KBL-TIS-00001, SLS-BKR-00003
// ============================================================

export function generateBarcode(namaBarang: string, kategori: string, sequence: number): string {
  const sanitize = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 3)
      .padEnd(3, 'X');

  const katCode = sanitize(kategori);
  const namaCode = sanitize(namaBarang);
  const seq = String(sequence).padStart(5, '0');

  return `${katCode}-${namaCode}-${seq}`;
}

export function generateSequence(): number {
  // Gunakan timestamp untuk unique sequence; dalam produksi ambil dari sheet
  return Math.floor(Date.now() / 1000) % 99999 + 1;
}

export function generateTransactionNumber(prefix: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${rand}`;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoString));
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function todayDisplay(): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}
