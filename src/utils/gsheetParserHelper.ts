/**
 * Google Sheets & Excel Data Parser Helper
 * Provides robust date normalization, number cleaning, fuzzy header matching,
 * anti-cache Google Sheet fetching, and background live sync engine for SIAKAD.
 */

import * as XLSX from 'xlsx';
import { Teacher } from '@/types';

// Map Indonesian month names to 2-digit month string
const ID_MONTHS: Record<string, string> = {
  januari: '01', jan: '01',
  februari: '02', feb: '02', pebruari: '02',
  maret: '03', mar: '03',
  april: '04', apr: '04',
  mei: '05', may: '05',
  juni: '06', jun: '06',
  juli: '07', jul: '07',
  agustus: '08', ags: '08', agu: '08', aug: '08',
  september: '09', sep: '09',
  oktober: '10', okt: '10', oct: '10',
  november: '11', nov: '11',
  desember: '12', des: '12', dec: '12'
};

/**
 * Robust date normalizer. Converts JS Dates, Excel serial numbers,
 * DD/MM/YYYY, DD-MM-YYYY, Indonesian text dates, and ISO dates to standard YYYY-MM-DD.
 */
export function normalizeDateToYMD(val: any): string {
  if (val === undefined || val === null) return '';

  // 1. If it's already a JS Date instance
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. If it's a number (Excel date serial number e.g. 31062 or 44561)
  if (typeof val === 'number') {
    if (val > 1000 && val < 100000) {
      // Excel epoch begins 1899-12-30 (due to Lotus 1-2-3 leap year bug)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dateObj = new Date(excelEpoch.getTime() + val * 86400000);
      if (!isNaN(dateObj.getTime())) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return '';
  }

  let str = String(val).trim();
  if (!str || str === '-' || str === '--' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return '';
  }

  // Remove leading/trailing quotes often used in Excel/Sheets to force text format
  if (str.startsWith("'") || str.startsWith('"')) {
    str = str.substring(1).trim();
  }
  if (str.endsWith("'") || str.endsWith('"')) {
    str = str.substring(0, str.length - 1).trim();
  }

  // If string is an integer/float serial number like "31062" or "44561.0"
  if (/^\d{4,5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 1000 && num < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dateObj = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(dateObj.getTime())) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  // 3. Match standard YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 4. Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 5. Match Indonesian / English written dates: e.g. "15 Januari 1985", "15-Jan-1985", "15 Jan 1985"
  const textDateMatch = str.match(/^(\d{1,2})\s*[\s\-\/\.]\s*([a-zA-Z]+)\s*[\s\-\/\.]\s*(\d{4})/);
  if (textDateMatch) {
    const d = textDateMatch[1].padStart(2, '0');
    const monthName = textDateMatch[2].toLowerCase();
    const y = textDateMatch[3];
    const m = ID_MONTHS[monthName];
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  // 6. Match "Januari 15, 1985"
  const textDateMatch2 = str.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (textDateMatch2) {
    const monthName = textDateMatch2[1].toLowerCase();
    const d = textDateMatch2[2].padStart(2, '0');
    const y = textDateMatch2[3];
    const m = ID_MONTHS[monthName];
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  // 7. Try standard Javascript Date.parse fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 1930 && y <= 2050) {
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return str;
}

/**
 * Precision-safe expansion of scientific notation string (e.g. 1.98501152010011E+17 -> 198501152010011000 or full digits)
 * without using JavaScript IEEE-754 float arithmetic which truncates beyond 15-16 digits.
 */
export function expandScientificNotation(str: string): string {
  if (!str) return '';
  const clean = str.trim();
  const match = clean.match(/^([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/i);
  if (!match) return clean;

  const mantissa = match[1];
  const exponent = parseInt(match[2], 10);
  
  if (isNaN(exponent) || exponent === 0) return mantissa;
  
  const sign = mantissa.startsWith('-') ? '-' : (mantissa.startsWith('+') ? '' : '');
  const unsignedMantissa = mantissa.replace(/^[+-]/, '');
  const [intPart, decPart = ''] = unsignedMantissa.split('.');

  if (exponent > 0) {
    if (exponent >= decPart.length) {
      return sign + intPart + decPart + '0'.repeat(exponent - decPart.length);
    } else {
      return sign + intPart + decPart.slice(0, exponent) + '.' + decPart.slice(exponent);
    }
  } else {
    const absExp = Math.abs(exponent);
    if (absExp >= intPart.length) {
      return sign + '0.' + '0'.repeat(absExp - intPart.length) + intPart + decPart;
    } else {
      return sign + intPart.slice(0, intPart.length - absExp) + '.' + intPart.slice(intPart.length - absExp) + decPart;
    }
  }
}

/**
 * Cleans NIP numbers, converting scientific notation, removing trailing decimals,
 * preserving all 18 digits with zero precision loss.
 */
export function cleanNipField(val: any): string {
  if (val === undefined || val === null) return '-';
  let str = String(val).trim();
  if (str.startsWith("'") || str.startsWith('"')) str = str.substring(1).trim();
  if (str.endsWith("'") || str.endsWith('"')) str = str.substring(0, str.length - 1).trim();

  const lower = str.toLowerCase();
  if (!str || str === '-' || str === '--' || lower === 'null' || lower === 'none' || lower === 'belum ada' || lower === 'tidak ada' || lower === '0') {
    return '-';
  }

  // Convert scientific notation safely with string expansion (no JS Float truncation):
  if (/^[+-]?[0-9]+(\.[0-9]+)?[eE][\+\-]?[0-9]+$/i.test(str)) {
    str = expandScientificNotation(str);
  }

  // Strip trailing decimals e.g. 198501152010011003.0
  if (/^\d+\.0+$/.test(str)) {
    str = str.split('.')[0];
  }

  // Remove spaces or hyphens if it contains digits
  const digitsOnly = str.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 8 && digitsOnly.length <= 25) {
    return digitsOnly;
  }

  return str;
}

/**
 * Cleans numeric identifiers (NIK, NUPTK, NPK, NRG, Peg ID).
 */
export function cleanNumberField(val: any): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (str.startsWith("'") || str.startsWith('"')) str = str.substring(1).trim();
  if (str.endsWith("'") || str.endsWith('"')) str = str.substring(0, str.length - 1).trim();

  const lower = str.toLowerCase();
  if (!str || str === '-' || str === '--' || lower === 'null' || lower === 'none' || lower === '0') {
    return '';
  }

  // Convert scientific notation safely
  if (/^[+-]?[0-9]+(\.[0-9]+)?[eE][\+\-]?[0-9]+$/i.test(str)) {
    str = expandScientificNotation(str);
  }

  if (/^\d+\.0+$/.test(str)) {
    str = str.split('.')[0];
  }

  const digitsOnly = str.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 8 && digitsOnly.length <= 25 && (str.includes('-') || str.includes(' '))) {
    return digitsOnly;
  }

  return str;
}

/**
 * Cleans and converts image URLs, especially Google Drive sharing/view links,
 * Dropbox, Imgur, Cloudinary, etc., into directly viewable image URLs.
 */
export function cleanImageUrl(val: any): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (str.startsWith("'") || str.startsWith('"')) str = str.substring(1).trim();
  if (str.endsWith("'") || str.endsWith('"')) str = str.substring(0, str.length - 1).trim();

  const lower = str.toLowerCase();
  if (!str || str === '-' || str === '--' || lower === 'null' || lower === 'none' || lower === 'belum ada' || lower === 'tidak ada' || lower === '0') {
    return '';
  }

  // Handle Google Drive file view / share links:
  // e.g. https://drive.google.com/file/d/1A2b3c4D5e.../view?usp=sharing
  const driveFileMatch = str.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w1000`;
  }

  // e.g. https://drive.google.com/open?id=1A2b3c4D5e... or https://drive.google.com/uc?id=1A2b3c4D5e...
  const driveIdMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (str.includes('drive.google.com') && driveIdMatch && driveIdMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
  }

  // Handle Dropbox links (dl=0 -> raw=1)
  if (str.includes('dropbox.com')) {
    return str.replace(/[?&]dl=0/g, '?raw=1');
  }

  return str;
}

/**
 * Fuzzy extractor to match header keys regardless of casing, spaces, punctuation or extra suffixes
 */
export function getValFuzzy(row: any, keyCandidates: string[]): string {
  const raw = getRawCellFuzzy(row, keyCandidates);
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
}

/**
 * Raw cell getter preserving Date or Number objects before string conversion.
 * 3-pass lookup: Exact direct property -> Normalized exact -> Normalized contains/startsWith.
 */
export function getRawCellFuzzy(row: any, keyCandidates: string[]): any {
  if (!row || typeof row !== 'object') return null;

  const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Pass 1: Direct exact match
  for (const candidate of keyCandidates) {
    if (row[candidate] !== undefined && row[candidate] !== null) {
      const v = row[candidate];
      if (typeof v === 'string' ? v.trim() !== '' : true) {
        return v;
      }
    }
  }

  // Pass 2: Normalized exact match (ignoring spaces, symbols, case)
  const normalizedCandidateMap = new Map<string, string>();
  for (const candidate of keyCandidates) {
    normalizedCandidateMap.set(normalizeKey(candidate), candidate);
  }

  for (const rowKey of Object.keys(row)) {
    const rowNorm = normalizeKey(rowKey);
    if (normalizedCandidateMap.has(rowNorm)) {
      const v = row[rowKey];
      if (v !== undefined && v !== null) {
        if (typeof v === 'string' ? v.trim() !== '' : true) {
          return v;
        }
      }
    }
  }

  // Pass 3: Normalized starts-with or contains
  for (const candidate of keyCandidates) {
    const targetNorm = normalizeKey(candidate);
    if (targetNorm.length < 3) continue; // Skip too-short keys like 'jk' to prevent false positive
    for (const rowKey of Object.keys(row)) {
      const rowNorm = normalizeKey(rowKey);
      if (rowNorm.startsWith(targetNorm) || rowNorm.includes(targetNorm)) {
        const v = row[rowKey];
        if (v !== undefined && v !== null) {
          if (typeof v === 'string' ? v.trim() !== '' : true) {
            return v;
          }
        }
      }
    }
  }

  return null;
}

export interface ParsedTeacherRow {
  id: string;
  nama: string;
  gelar: string;
  nik: string;
  nip: string;
  npk: string;
  nuptk: string;
  nrg: string;
  peg_id: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat_rumah: string;
  jk: 'L' | 'P';
  gender: 'Laki-laki' | 'Perempuan';
  jabatan: string;
  mapel_diampu: string;
  telepon: string;
  email: string;
  status: string;
  status_kepegawaian: string;
  pendidikan_terakhir: string;
  pendidikan: string;
  status_sertifikasi: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses';
  sertifikasi: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses';
  no_sertifikat_pendidik: string;
  nomor_sertifikasi: string;
  tmt_pendidik: string;
  tmt_madrasah: string;
  kelas_diampu: string;
  mengajar_kelas: string;
  status_keaktifan: 'Aktif' | 'Cuti' | 'Non-Aktif';
  raw: any;
  statusType: 'new' | 'update' | 'identical';
  matchedWith?: Teacher;
  diffFields: string[];
}

/**
 * Normalizes teacher name by removing titles and honorifics for robust comparison.
 */
function cleanTeacherNameForMatching(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/(dr\.|drs\.|dra\.|prof\.|kh\.|k\.h\.|h\.|hj\.|ustadz|ustadzah|ir\.|apt\.)/gi, '')
    .replace(/(,\s*(s\.pd\.i|s\.pd|m\.pd\.i|m\.pd|s\.ag|m\.ag|s\.si|m\.si|s\.kom|m\.kom|s\.e|m\.m|s\.sos|m\.sos|ph\.d|lc\.|gr\.|m\.a|b\.a))/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses a single spreadsheet row into a fully normalized Teacher record
 */
export function parseTeacherRow(row: any, idx: number, currentTeachers: Teacher[]): ParsedTeacherRow | null {
  const nama = getValFuzzy(row, [
    'Nama Lengkap', 'Nama', 'nama', 'Nama Guru', 'Nama GTK', 'Full Name',
    'Nama Guru / GTK', 'Nama Tenaga Pendidik', 'Nama PTK', 'PTK', 'Guru', 'Nama_Lengkap'
  ]);

  const nik = cleanNumberField(getRawCellFuzzy(row, [
    'NIK', 'nik', 'No. KTP', 'Nomor Induk Kependudukan', 'Nomor KTP', 'No KTP', 'NIK (16 Digit)', 'NIK KTP', 'NIK 16 Digit'
  ]));

  const nip = cleanNipField(getRawCellFuzzy(row, [
    'NIP', 'nip', 'Nomor Induk Pegawai', 'NIP (Nomor Induk Pegawai)', 'NIP/NIPPPK', 'NIP / PPPK', 'N.I.P',
    'NIP Pegawai', 'No. NIP', 'No NIP', 'NIP Guru', 'NIP / NPK', 'NIP/NPK', 'NIP / NI PPPK', 'NIP GTK', 'NIP (18 Digit)'
  ]));

  const npk = cleanNumberField(getRawCellFuzzy(row, [
    'NPK Kemenag', 'NPK', 'npk', 'Nomor Pendidik Kemenag', 'No NPK', 'No. NPK', 'NPK SIMPATIKA', 'NPK Madrasah'
  ]));

  const nuptk = cleanNumberField(getRawCellFuzzy(row, [
    'NUPTK', 'nuptk', 'Nomor Unik Pendidik', 'No NUPTK', 'No. NUPTK', 'N.U.P.T.K', 'Nomor NUPTK'
  ]));

  const peg_id = cleanNumberField(getRawCellFuzzy(row, [
    'Peg ID Simpatika', 'Peg ID', 'PEG ID', 'peg_id', 'PegID', 'ID Simpatika', 'Peg_ID', 'Simpatika ID'
  ]));

  const nrg = cleanNumberField(getRawCellFuzzy(row, [
    'NRG', 'nrg', 'Nomor Registrasi Guru', 'NRG Kemenag', 'No NRG', 'No. NRG', 'Nomor NRG'
  ]));

  // If there's no name and no key IDs, skip blank row
  if (!nama && !nik && (!nip || nip === '-') && !npk && !nuptk) {
    return null;
  }

  const gelar = getValFuzzy(row, [
    'Gelar', 'Gelar Akademik', 'gelar', 'Gelar Depan / Belakang', 'Gelar Belakang', 'Gelar Depan', 'Gelar_Akademik'
  ]);

  const tempat_lahir = getValFuzzy(row, [
    'Tempat Lahir', 'tempat_lahir', 'Kota Lahir', 'Tempat', 'Tempat Lahir Guru', 'Tempat_Lahir'
  ]);

  // Tanggal Lahir normalization
  const rawTanggalLahir = getRawCellFuzzy(row, [
    'Tanggal Lahir (YYYY-MM-DD)', 'Tanggal Lahir', 'tanggal_lahir', 'Tgl Lahir', 'Tgl. Lahir',
    'TglLahir', 'Lahir', 'Tanggal Lahir (DD/MM/YYYY)', 'Tanggal Lahir Guru', 'Tgl_Lahir', 'Tanggal_Lahir', 'DOB'
  ]);
  const tanggal_lahir = normalizeDateToYMD(rawTanggalLahir);

  // TMT Pendidik & Madrasah normalization
  const rawTmtPendidik = getRawCellFuzzy(row, [
    'TMT Pendidik', 'TMT Pendidik (YYYY-MM-DD)', 'tmt_pendidik', 'TMT Guru', 'TMT Awal Pendidik',
    'TMT Awal', 'TMT Pertama', 'TMT Pengangkatan', 'TMT Guru / Pendidik', 'TMT', 'Tanggal Mulai Tugas Pendidik', 'TMT_Pendidik'
  ]);
  const tmt_pendidik = normalizeDateToYMD(rawTmtPendidik);

  const rawTmtMadrasah = getRawCellFuzzy(row, [
    'TMT Madrasah', 'TMT Madrasah (YYYY-MM-DD)', 'tmt_madrasah', 'TMT Satminkal', 'TMT Satminkal (YYYY-MM-DD)',
    'TMT Sekolah', 'TMT Tugas di Madrasah', 'TMT Tugas Satminkal', 'TMT di Madrasah Ini', 'TMT Induk', 'TMT Lembaga', 'TMT_Madrasah'
  ]);
  const tmt_madrasah = normalizeDateToYMD(rawTmtMadrasah);

  const alamat_rumah = getValFuzzy(row, [
    'Alamat Rumah', 'Alamat', 'alamat_rumah', 'Alamat Domisili', 'Alamat Lengkap', 'Alamat Tinggal', 'Domisili', 'Alamat_Rumah'
  ]);

  const jabatan = getValFuzzy(row, [
    'Jabatan', 'jabatan', 'Tugas', 'Tugas Tambahan', 'Jabatan Guru', 'Posisi'
  ]) || 'Guru Kelas';

  // Status Kepegawaian
  const statusRaw = getValFuzzy(row, [
    'Status Kepegawaian', 'status', 'Status', 'Status Kepegawaian (PNS/PPPK/GTY/Honorer)', 'Kepegawaian', 'Status Pegawai'
  ]) || 'GTY / Guru Tetap Yayasan';

  const jkRaw = getValFuzzy(row, ['Jenis Kelamin', 'jk', 'L/P', 'Gender', 'Kelamin', 'Sex']);
  const isPerempuan = jkRaw && (
    jkRaw.toLowerCase().startsWith('p') ||
    jkRaw.toLowerCase().includes('perempuan') ||
    jkRaw.toLowerCase() === 'wanita' ||
    jkRaw.toLowerCase() === 'f' ||
    jkRaw.toLowerCase() === 'female'
  );
  const gender: 'Laki-laki' | 'Perempuan' = isPerempuan ? 'Perempuan' : 'Laki-laki';
  const jk: 'L' | 'P' = isPerempuan ? 'P' : 'L';

  const telepon = cleanNumberField(getRawCellFuzzy(row, [
    'No WhatsApp', 'No. HP / WhatsApp', 'telepon', 'No HP', 'No. HP', 'WA', 'WhatsApp', 'HP', 'Nomor HP', 'Telepon', 'No WA'
  ]));

  const email = getValFuzzy(row, ['Email', 'email', 'Surel', 'Alamat Email', 'E-mail']);

  const pendidikan_terakhir = getValFuzzy(row, [
    'Pendidikan Terakhir', 'pendidikan_terakhir', 'Pendidikan', 'Jenjang Pendidikan', 'Ijazah Terakhir', 'Kualifikasi'
  ]) || 'S1 Pendidikan Agama Islam';

  let status_sertifikasi: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses' = 'Belum Sertifikasi';
  const rawSerti = getValFuzzy(row, ['Status Sertifikasi', 'status_sertifikasi', 'Sertifikasi', 'Status Sertifikat']).toLowerCase();
  if (rawSerti.includes('sudah') || rawSerti.includes('lulus') || rawSerti.includes('ya') || rawSerti.includes('terverifikasi')) {
    status_sertifikasi = 'Sudah Sertifikasi';
  } else if (rawSerti.includes('proses') || rawSerti.includes('ppg') || rawSerti.includes('antrean')) {
    status_sertifikasi = 'Dalam Proses';
  }

  const no_sertifikat_pendidik = cleanNumberField(getRawCellFuzzy(row, [
    'No Sertifikat Pendidik', 'Nomor Sertifikat Pendidik', 'no_sertifikat_pendidik', 'nomor_sertifikasi',
    'No Sertifikat', 'No. Sertifikat', 'No. Sertifikat Pendidik'
  ]));

  const mapel_diampu = getValFuzzy(row, [
    'Mapel Diampu', 'Mata Pelajaran', 'mapel_diampu', 'Mapel', 'Mata Pelajaran Diampu', 'Bidang Studi'
  ]) || '-';

  const mengajar_kelas = getValFuzzy(row, [
    'Mengajar Kelas', 'Mengajar Kelas / Rombel', 'kelas_diampu', 'mengajar_kelas', 'Kelas Diampu', 'Rombel', 'Kelas'
  ]);

  let status_keaktifan: 'Aktif' | 'Cuti' | 'Non-Aktif' = 'Aktif';
  const rawAktif = getValFuzzy(row, ['Status Keaktifan', 'status_keaktifan', 'Keaktifan']).toLowerCase();
  if (rawAktif.includes('cuti')) status_keaktifan = 'Cuti';
  else if (rawAktif.includes('non') || rawAktif.includes('keluar') || rawAktif.includes('pensiun') || rawAktif.includes('pindah')) {
    status_keaktifan = 'Non-Aktif';
  }

  const foto_url = cleanImageUrl(getRawCellFuzzy(row, [
    'Link Foto Profil (URL / Drive)', 'Link Foto Profil', 'Foto Profil', 'Foto Guru', 'Foto GTK',
    'foto_url', 'Foto', 'URL Foto', 'Link Foto', 'Photo', 'Link Photo', 'Foto Dokumen', 'Pas Foto'
  ]));

  // Multi-tier Match with existing teachers in database
  const cleanIncomingName = cleanTeacherNameForMatching(nama);

  const matchedWith = currentTeachers.find(c => {
    // 1. Match by NIK (if valid 16 digits)
    if (nik && nik.length === 16 && c.nik && c.nik === nik) return true;
    
    // 2. Match by NUPTK (if valid >= 10 digits)
    if (nuptk && nuptk.length >= 10 && c.nuptk && c.nuptk === nuptk) return true;

    // 3. Match by NPK (if valid >= 6 digits)
    if (npk && npk.length >= 6 && c.npk && c.npk === npk) return true;

    // 4. Match by Peg ID
    if (peg_id && peg_id.length >= 6 && c.peg_id && c.peg_id === peg_id) return true;

    // 5. Match by exact NIP (if non-empty and matching)
    if (nip && nip !== '-' && c.nip && c.nip !== '-' && c.nip === nip) return true;

    // 6. Match by Cleaned Name (stripping title/gelar)
    if (cleanIncomingName && c.nama) {
      const cleanDbName = cleanTeacherNameForMatching(c.nama);
      if (cleanDbName && (cleanDbName === cleanIncomingName || cleanDbName.includes(cleanIncomingName) || cleanIncomingName.includes(cleanDbName))) {
        return true;
      }
    }

    // 7. Fallback exact string match
    return (c.nama || '').trim().toLowerCase() === (nama || '').trim().toLowerCase();
  });

  const diffFields: string[] = [];
  let statusType: 'new' | 'update' | 'identical' = 'new';

  if (matchedWith) {
    if ((matchedWith.nama || '').trim() !== (nama || '').trim()) diffFields.push('Nama Lengkap');
    if ((matchedWith.nik || '') !== (nik || '')) diffFields.push('NIK');
    if ((matchedWith.nip || '-') !== (nip || '-')) diffFields.push('NIP');
    if ((matchedWith.npk || '') !== (npk || '')) diffFields.push('NPK');
    if ((matchedWith.nuptk || '') !== (nuptk || '')) diffFields.push('NUPTK');
    if ((matchedWith.peg_id || '') !== (peg_id || '')) diffFields.push('Peg ID');
    if ((matchedWith.tempat_lahir || '') !== (tempat_lahir || '')) diffFields.push('Tempat Lahir');
    
    // Normalize dates for accurate comparison
    const existingTglLahir = normalizeDateToYMD(matchedWith.tanggal_lahir);
    if (existingTglLahir !== tanggal_lahir && (existingTglLahir || tanggal_lahir)) diffFields.push('Tanggal Lahir');

    const existingTmtPendidik = normalizeDateToYMD(matchedWith.tmt_pendidik);
    if (existingTmtPendidik !== tmt_pendidik && (existingTmtPendidik || tmt_pendidik)) diffFields.push('TMT Pendidik');

    const existingTmtMadrasah = normalizeDateToYMD(matchedWith.tmt_madrasah);
    if (existingTmtMadrasah !== tmt_madrasah && (existingTmtMadrasah || tmt_madrasah)) diffFields.push('TMT Madrasah');

    if ((matchedWith.alamat_rumah || '') !== (alamat_rumah || '')) diffFields.push('Alamat');
    if ((matchedWith.jabatan || '') !== (jabatan || '')) diffFields.push('Jabatan');
    if ((matchedWith.status_kepegawaian || matchedWith.status || '') !== (statusRaw || '')) diffFields.push('Status Kepegawaian');
    if ((matchedWith.gender || 'Laki-laki') !== gender) diffFields.push('Jenis Kelamin');
    if ((matchedWith.telepon || '') !== (telepon || '')) diffFields.push('WhatsApp');
    if ((matchedWith.email || '') !== (email || '')) diffFields.push('Email');
    if ((matchedWith.sertifikasi || matchedWith.status_sertifikasi || '') !== status_sertifikasi) diffFields.push('Sertifikasi');
    if ((matchedWith.no_sertifikat_pendidik || matchedWith.nomor_sertifikasi || '') !== (no_sertifikat_pendidik || '')) diffFields.push('No Sertifikat');
    if ((matchedWith.mapel_diampu || '') !== (mapel_diampu || '')) diffFields.push('Mapel Diampu');
    if ((matchedWith.mengajar_kelas || matchedWith.kelas_diampu || '') !== (mengajar_kelas || '')) diffFields.push('Kelas Diampu');
    if ((matchedWith.status_keaktifan || 'Aktif') !== status_keaktifan) diffFields.push('Status Keaktifan');
    if (foto_url && (matchedWith.foto_url || '') !== foto_url) diffFields.push('Foto Profil');

    statusType = diffFields.length === 0 ? 'identical' : 'update';
  }

  const finalFoto = foto_url || (matchedWith ? matchedWith.foto_url || matchedWith.foto || '' : '') || '';

  return {
    id: matchedWith ? matchedWith.id : `gtk_gsync_${Date.now()}_${idx}`,
    nama: nama || `Guru #${idx + 1}`,
    gelar,
    nik,
    nip: nip || '-',
    npk,
    nuptk,
    nrg,
    peg_id,
    tempat_lahir,
    tanggal_lahir,
    alamat_rumah,
    jk,
    gender,
    jabatan,
    mapel_diampu,
    telepon,
    email,
    status: statusRaw,
    status_kepegawaian: statusRaw,
    pendidikan_terakhir,
    pendidikan: pendidikan_terakhir,
    status_sertifikasi,
    sertifikasi: status_sertifikasi,
    no_sertifikat_pendidik,
    nomor_sertifikasi: no_sertifikat_pendidik,
    tmt_pendidik,
    tmt_madrasah,
    kelas_diampu: mengajar_kelas,
    mengajar_kelas,
    status_keaktifan,
    foto_url: finalFoto,
    foto: finalFoto,
    raw: row,
    statusType,
    matchedWith,
    diffFields
  };
}

/**
 * Parses Google Sheet URL, extracting spreadsheet ID, gid, and building anti-cached export URLs.
 */
export function extractGoogleSheetInfo(inputUrl: string, sheetTab: string = '') {
  const clean = inputUrl.trim();
  let sheetId = '';
  let gid = '';

  const idMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    sheetId = idMatch[1];
  }

  const gidMatch = clean.match(/[?&#]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  return { sheetId, gid, sheetTab: sheetTab.trim() };
}

/**
 * Convert Google Sheet share link to export CSV URL with anti-cache timestamp.
 */
export function buildGoogleSheetCsvUrl(inputUrl: string, sheetTab: string = ''): string {
  const clean = inputUrl.trim();
  if (!clean) return '';

  const { sheetId, gid, sheetTab: tab } = extractGoogleSheetInfo(clean, sheetTab);
  const cacheBuster = `_ts=${Date.now()}`;

  if (clean.includes('/pub?output=csv') || clean.includes('/export?format=csv')) {
    const separator = clean.includes('?') ? '&' : '?';
    return `${clean}${separator}${cacheBuster}`;
  }

  if (sheetId) {
    if (gid) {
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&${cacheBuster}`;
    }
    const tabParam = tab ? `&sheet=${encodeURIComponent(tab)}` : '';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${tabParam}&tq=&${cacheBuster}`;
  }

  return clean;
}

/**
 * Parses Google GViz DataTable object (from JSON or JSONP) into an array of row objects
 */
export function parseGvizTable(table: any): any[] {
  if (!table || !table.cols || !table.rows) return [];
  
  const cols = table.cols;
  const headers: string[] = cols.map((col: any, idx: number) => {
    const label = (col?.label || col?.id || '').trim();
    return label || `__COL_${idx + 1}`;
  });

  const rawRows: any[] = [];
  for (const r of table.rows) {
    if (!r || !r.c) continue;
    const rowObj: Record<string, any> = {};
    let hasData = false;
    headers.forEach((h, colIdx) => {
      const cell = r.c[colIdx];
      let val = '';
      if (cell !== null && cell !== undefined) {
        // 'f' is the formatted string as displayed in the Google Sheet (e.g. "198501152010011003")
        if (cell.f !== undefined && cell.f !== null) {
          val = String(cell.f).trim();
        } else if (cell.v !== undefined && cell.v !== null) {
          if (cell.v instanceof Date) {
            val = cell.v.toISOString().split('T')[0];
          } else if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
            const match = cell.v.match(/Date\((\d+),(\d+),(\d+)/);
            if (match) {
              const y = match[1];
              const m = String(Number(match[2]) + 1).padStart(2, '0');
              const d = String(match[3]).padStart(2, '0');
              val = `${y}-${m}-${d}`;
            } else {
              val = String(cell.v).trim();
            }
          } else if (typeof cell.v === 'number') {
            const numStr = String(cell.v);
            if (/^[+-]?[0-9]+(\.[0-9]+)?[eE][\+\-]?[0-9]+$/i.test(numStr)) {
              val = expandScientificNotation(numStr);
            } else {
              val = numStr;
            }
          } else {
            val = String(cell.v).trim();
          }
        }
      }
      rowObj[h] = val;
      if (val !== '') hasData = true;
    });

    if (hasData) {
      rawRows.push(rowObj);
    }
  }

  return rawRows;
}

/**
 * Fallback to JSONP which bypasses browser CORS restrictions entirely
 */
export function fetchGoogleSheetJsonp(sheetId: string, gid?: string, tabName?: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('JSONP hanya dapat dijalankan di lingkungan browser.'));
      return;
    }

    const callbackName = `gsheet_cb_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement('script');
    
    let isHandled = false;
    const timeout = setTimeout(() => {
      if (!isHandled) {
        cleanup();
        reject(new Error('Koneksi Google Sheets timeout (15 detik). Pastikan link dapat diakses publik.'));
      }
    }, 15000);

    const cleanup = () => {
      isHandled = true;
      clearTimeout(timeout);
      try {
        if (script.parentNode) script.parentNode.removeChild(script);
      } catch {}
      try {
        delete (window as any)[callbackName];
      } catch {}
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      try {
        if (!data || !data.table) {
          reject(new Error('Format data Google Sheets tidak valid.'));
          return;
        }
        const rows = parseGvizTable(data.table);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Gagal memuat Google Sheet via JSONP. Pastikan link disetel publik ("Siapa saja yang memiliki link" -> "Pelihat (Viewer)").'));
    };

    const cacheBuster = `_ts=${Date.now()}`;
    let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}&tq=&${cacheBuster}`;
    if (gid) {
      url += `&gid=${gid}`;
    } else if (tabName) {
      url += `&sheet=${encodeURIComponent(tabName)}`;
    }

    script.src = url;
    document.head.appendChild(script);
  });
}

/**
 * Pure string CSV/TSV parser that treats ALL cells strictly as strings (no floating-point rounding for 18-digit NIP).
 */
export function parseRawCsvToStringMatrix(csvText: string): string[][] {
  if (!csvText) return [];
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  // Auto-detect delimiter
  let delimiter = ',';
  const sampleLines = csvText.split(/\r?\n/).slice(0, 5).join('\n');
  const commaCount = (sampleLines.match(/,/g) || []).length;
  const semiCount = (sampleLines.match(/;/g) || []).length;
  const tabCount = (sampleLines.match(/\t/g) || []).length;
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses raw CSV text into structured rows with intelligent header row detection.
 * Strictly preserves string values for 18-digit NIP, NIK, NUPTK, and dates.
 */
export function parseCsvWithHeaderDetection(csvText: string): any[] {
  // Use pure string matrix parser to guarantee NO numbers are converted to IEEE-754 floats
  const rawMatrix: string[][] = parseRawCsvToStringMatrix(csvText);
  if (!rawMatrix || rawMatrix.length === 0) return [];

  const headerKeywords = [
    'nama', 'nip', 'nik', 'nuptk', 'npk', 'jabatan', 'gender', 'jenis kelamin',
    'tempat lahir', 'tanggal lahir', 'telepon', 'whatsapp', 'alamat', 'status',
    'pendidikan', 'mapel', 'tmt', 'gtk', 'ptk', 'nisn', 'rombel'
  ];

  let headerRowIndex = 0;
  let maxMatchScore = 0;

  for (let r = 0; r < Math.min(rawMatrix.length, 20); r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    for (const cell of row) {
      const strCell = String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (strCell) {
        for (const kw of headerKeywords) {
          const normKw = kw.replace(/[^a-z0-9]/g, '');
          if (strCell === normKw || strCell.includes(normKw)) {
            score += 1;
            break;
          }
        }
      }
    }

    if (score > maxMatchScore) {
      maxMatchScore = score;
      headerRowIndex = r;
    }
  }

  if (maxMatchScore >= 2 && headerRowIndex < rawMatrix.length) {
    const rawHeaders = rawMatrix[headerRowIndex].map((h, i) => {
      const cleanH = String(h || '').trim();
      return cleanH || `__COLUMN_${i + 1}`;
    });

    const parsedObjects: any[] = [];
    for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row)) continue;

      const obj: Record<string, any> = {};
      let hasData = false;

      rawHeaders.forEach((header, colIdx) => {
        const val = row[colIdx] !== undefined ? row[colIdx] : '';
        obj[header] = val;
        if (String(val).trim() !== '') hasData = true;
      });

      if (hasData) {
        parsedObjects.push(obj);
      }
    }

    return parsedObjects;
  }

  // Fallback: Use row 0 as header
  if (rawMatrix.length > 1) {
    const headers = rawMatrix[0].map((h, idx) => h || `__COLUMN_${idx + 1}`);
    return rawMatrix.slice(1).map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] !== undefined ? row[idx] : '';
      });
      return obj;
    });
  }

  return [];
}

/**
 * Fetch and parse Google Sheet data online with intelligent multi-tier header row detection
 * and aggressive anti-caching to guarantee latest cell modifications (including NIP) are captured.
 * Supports simple CORS GET and JSONP fallback to prevent "Failed to fetch" browser errors.
 */
export async function fetchGoogleSheetRows(url: string, tabName: string = ''): Promise<any[]> {
  const { sheetId, gid, sheetTab } = extractGoogleSheetInfo(url, tabName);
  const cacheBuster = `_ts=${Date.now()}`;

  const candidateUrls: string[] = [];

  if (url.includes('/pub?output=csv') || url.includes('/export?format=csv')) {
    const sep = url.includes('?') ? '&' : '?';
    candidateUrls.push(`${url}${sep}${cacheBuster}`);
  }

  if (sheetId) {
    if (gid) {
      candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&tq=&${cacheBuster}`);
      candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&${cacheBuster}`);
    }
    if (sheetTab) {
      candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetTab)}&tq=&${cacheBuster}`);
    }
    candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&tq=&${cacheBuster}`);
    candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&${cacheBuster}`);
  } else {
    candidateUrls.push(url);
  }

  let csvText = '';
  let fetchError: any = null;

  // 1. Try standard CORS fetch (strictly NO custom headers to avoid triggering preflight CORS errors)
  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes('accounts.google.com') && !text.includes('ServiceLogin')) {
          csvText = text;
          break;
        }
      }
    } catch (e) {
      fetchError = e;
    }
  }

  // 2. If CSV was successfully fetched, parse it
  if (csvText) {
    try {
      const rows = parseCsvWithHeaderDetection(csvText);
      if (rows && rows.length > 0) {
        return rows;
      }
    } catch (parseErr) {
      console.warn('CSV parsing failed, trying JSONP fallback:', parseErr);
    }
  }

  // 3. Fallback: If direct fetch failed (e.g. CORS block or Failed to fetch), use JSONP
  if (sheetId) {
    try {
      const jsonpRows = await fetchGoogleSheetJsonp(sheetId, gid, sheetTab);
      if (jsonpRows && jsonpRows.length > 0) {
        return jsonpRows;
      }
    } catch (jsonpErr) {
      console.warn('JSONP fallback failed:', jsonpErr);
      if (!fetchError) fetchError = jsonpErr;
    }
  }

  if (fetchError) {
    throw new Error(`Gagal menarik data: ${fetchError.message || 'Koneksi gagal'}. Pastikan setelan berbagi link Google Sheet diatur ke "Siapa saja yang memiliki link" -> "Pelihat (Viewer)".`);
  }

  throw new Error('Spreadsheet kosong atau terkunci (Private). Pastikan link Google Sheet disetel "Siapa saja yang memiliki link" -> "Pelihat (Viewer)".');
}

/**
 * Executes a full background sync against Google Sheets and merges with current Teacher database.
 */
export async function executeAutoSyncTeachers(
  url: string,
  tabName: string,
  currentTeachers: Teacher[]
): Promise<{ success: boolean; data?: Teacher[]; updatedCount: number; newCount: number; message: string }> {
  try {
    if (!url) return { success: false, updatedCount: 0, newCount: 0, message: 'URL Google Sheet belum diatur' };

    const rawRows = await fetchGoogleSheetRows(url, tabName);
    if (!rawRows || rawRows.length === 0) {
      return { success: false, updatedCount: 0, newCount: 0, message: 'Data Spreadsheet kosong' };
    }

    const parsedList: ParsedTeacherRow[] = rawRows
      .map((r, i) => parseTeacherRow(r, i, currentTeachers))
      .filter((r): r is ParsedTeacherRow => r !== null);

    if (parsedList.length === 0) {
      return { success: false, updatedCount: 0, newCount: 0, message: 'Tidak ada baris data GTK yang valid' };
    }

    let updatedCount = 0;
    let newCount = 0;

    const teacherMap = new Map<string, Teacher>();
    currentTeachers.forEach(t => teacherMap.set(t.id, { ...t }));

    parsedList.forEach(r => {
      if (r.matchedWith && teacherMap.has(r.matchedWith.id)) {
        if (r.statusType === 'update') {
          updatedCount++;
        }
        const existing = teacherMap.get(r.matchedWith.id)!;
        teacherMap.set(r.matchedWith.id, {
          ...existing,
          nama: r.nama || existing.nama,
          gelar: r.gelar || existing.gelar || '',
          nik: r.nik || existing.nik,
          nip: r.nip !== undefined && r.nip !== '' ? r.nip : (existing.nip || '-'),
          npk: r.npk || existing.npk,
          nuptk: r.nuptk || existing.nuptk,
          nrg: r.nrg || existing.nrg,
          peg_id: r.peg_id || existing.peg_id,
          tempat_lahir: r.tempat_lahir || existing.tempat_lahir,
          tanggal_lahir: r.tanggal_lahir || existing.tanggal_lahir,
          alamat_rumah: r.alamat_rumah || existing.alamat_rumah || '',
          gender: r.gender || existing.gender,
          jenis_kelamin: r.jk || existing.jenis_kelamin,
          jabatan: r.jabatan || existing.jabatan,
          status_kepegawaian: r.status_kepegawaian || existing.status_kepegawaian,
          status: r.status || existing.status,
          mapel_diampu: r.mapel_diampu || existing.mapel_diampu,
          mengajar_kelas: r.mengajar_kelas || existing.mengajar_kelas,
          kelas_diampu: r.kelas_diampu || existing.kelas_diampu,
          telepon: r.telepon || existing.telepon,
          email: r.email || existing.email,
          status_keaktifan: r.status_keaktifan || existing.status_keaktifan || 'Aktif',
          pendidikan: r.pendidikan || existing.pendidikan,
          pendidikan_terakhir: r.pendidikan_terakhir || existing.pendidikan_terakhir,
          sertifikasi: r.sertifikasi || existing.sertifikasi,
          status_sertifikasi: r.status_sertifikasi || existing.status_sertifikasi,
          no_sertifikat_pendidik: r.no_sertifikat_pendidik || existing.no_sertifikat_pendidik,
          nomor_sertifikasi: r.nomor_sertifikasi || existing.nomor_sertifikasi,
          tmt_pendidik: r.tmt_pendidik || existing.tmt_pendidik,
          tmt_madrasah: r.tmt_madrasah || existing.tmt_madrasah,
          foto_url: existing.foto_url || existing.foto || '',
          foto: existing.foto_url || existing.foto || '',
        });
      } else {
        newCount++;
        teacherMap.set(r.id, {
          id: r.id,
          nama: r.nama,
          gelar: r.gelar,
          gender: r.gender,
          jenis_kelamin: r.jk,
          nik: r.nik,
          nip: r.nip || '-',
          npk: r.npk,
          nuptk: r.nuptk,
          nrg: r.nrg,
          peg_id: r.peg_id,
          tempat_lahir: r.tempat_lahir,
          tanggal_lahir: r.tanggal_lahir,
          alamat_rumah: r.alamat_rumah,
          tmt_pendidik: r.tmt_pendidik,
          tmt_madrasah: r.tmt_madrasah,
          pendidikan: r.pendidikan,
          pendidikan_terakhir: r.pendidikan_terakhir,
          sertifikasi: r.sertifikasi,
          status_sertifikasi: r.status_sertifikasi,
          no_sertifikat_pendidik: r.no_sertifikat_pendidik,
          nomor_sertifikasi: r.nomor_sertifikasi,
          status_kepegawaian: r.status_kepegawaian,
          status: r.status,
          jabatan: r.jabatan,
          mapel_diampu: r.mapel_diampu,
          mengajar_kelas: r.mengajar_kelas,
          kelas_diampu: r.kelas_diampu,
          telepon: r.telepon,
          email: r.email,
          status_keaktifan: r.status_keaktifan,
          foto_url: '',
          foto: '',
          created_at: new Date().toISOString()
        });
      }
    });

    const finalData = Array.from(teacherMap.values());
    return {
      success: true,
      data: finalData,
      updatedCount,
      newCount,
      message: `Sinkronisasi selesai: ${updatedCount} diperbarui, ${newCount} baru.`
    };
  } catch (err: any) {
    return {
      success: false,
      updatedCount: 0,
      newCount: 0,
      message: err.message || 'Gagal sinkronisasi Google Sheet'
    };
  }
}

