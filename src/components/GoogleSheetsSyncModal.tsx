import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Download,
  Search,
  Sparkles,
  HelpCircle,
  Database,
  Layers,
  ArrowDownUp,
  ListFilter,
  Code2,
  CheckSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { showSuccess, showError, showInfo } from '@/utils/toast';
import { Teacher } from '@/types';
import {
  downloadExcelWithDropdowns,
  generateAppsScriptDropdownCode,
  GTK_DROPDOWN_OPTIONS
} from '@/utils/excelTemplateHelper';

export interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'teachers' | 'students';
  currentData: Teacher[] | any[];
  onSyncComplete: (syncedData: any[], mode: 'upsert' | 'replace' | 'insert_only') => void;
  madrasahName?: string;
}

interface ParsedPreviewRow {
  id?: string;
  nama: string;
  gelar?: string;
  nik?: string;
  nip?: string;
  npk?: string;
  nuptk?: string;
  nrg?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat_rumah?: string;
  jk?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  jabatan?: string;
  mapel_diampu?: string;
  telepon?: string;
  email?: string;
  status?: string;
  status_kepegawaian?: string;
  pendidikan_terakhir?: string;
  pendidikan?: string;
  status_sertifikasi?: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses';
  sertifikasi?: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses';
  nomor_sertifikasi?: string;
  no_sertifikat_pendidik?: string;
  tmt_pendidik?: string;
  tmt_madrasah?: string;
  kelas_diampu?: string;
  mengajar_kelas?: string;
  status_keaktifan?: 'Aktif' | 'Cuti' | 'Non-Aktif' | 'Tugas Belajar' | 'Pindah Tugas';
  raw: any;
  statusType: 'new' | 'update' | 'identical';
  matchedWith?: any;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  targetType,
  currentData,
  onSyncComplete,
  madrasahName = 'Madrasah'
}) => {
  const storageKey = `siakad_gsheet_url_${targetType}`;
  const sheetNameKey = `siakad_gsheet_sheetname_${targetType}`;

  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Data_GTK');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'dropdowns' | 'guide' | 'apps_script'>('sync');
  const [syncMode, setSyncMode] = useState<'upsert' | 'replace' | 'insert_only'>('upsert');
  
  const [previewRows, setPreviewRows] = useState<ParsedPreviewRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'update' | 'identical'>('all');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Load saved sheet URL from local storage
  useEffect(() => {
    if (isOpen) {
      const savedUrl = localStorage.getItem(storageKey) || '';
      const savedSheet = localStorage.getItem(sheetNameKey) || (targetType === 'teachers' ? 'Data_GTK' : 'Data_Siswa');
      const savedTime = localStorage.getItem(`siakad_gsheet_last_sync_${targetType}`);
      setSheetUrl(savedUrl);
      setSheetName(savedSheet);
      setLastSyncTime(savedTime);
    }
  }, [isOpen, targetType, storageKey, sheetNameKey]);

  // Helper to extract clean spreadsheet ID or CSV export URL
  const buildFetchUrl = (inputUrl: string, sheetTab: string): string => {
    let clean = inputUrl.trim();
    if (!clean) return '';

    // If it's already a direct CSV export / publish link
    if (clean.includes('/pub?output=csv') || clean.includes('/export?format=csv')) {
      return clean;
    }

    // Match standard Google Sheet URL: https://docs.google.com/spreadsheets/d/{ID}/...
    const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      const tabParam = sheetTab.trim() ? `&sheet=${encodeURIComponent(sheetTab.trim())}` : '';
      // Use Google Visualization API CSV export which supports public/shared links cleanly
      return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${tabParam}`;
    }

    return clean;
  };

  // Helper clean number / 16-digit values
  const cleanNumberField = (val: any): string => {
    if (val === undefined || val === null) return '';
    let str = String(val).trim();
    if (str.startsWith("'")) str = str.substring(1).trim();
    
    if (/^[0-9]+(\.[0-9]+)?[eE][\+\-]?[0-9]+$/.test(str)) {
      try {
        str = BigInt(Math.round(Number(str))).toString();
      } catch {
        str = Number(str).toLocaleString('fullwide', { useGrouping: false });
      }
    }
    if (/^\d+\.0+$/.test(str)) {
      str = str.split('.')[0];
    }
    const digitsOnly = str.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 25 && (str.includes('-') || str.includes(' '))) {
      str = digitsOnly;
    }
    return str;
  };

  // Fetch & Parse data from Google Sheets Online
  const handleFetchFromGoogleSheets = async () => {
    if (!sheetUrl.trim()) {
      showError('Harap masukkan URL Google Spreadsheet terlebih dahulu!');
      return;
    }

    setIsLoading(true);
    try {
      const targetFetchUrl = buildFetchUrl(sheetUrl, sheetName);
      
      // Save for future convenience
      localStorage.setItem(storageKey, sheetUrl.trim());
      localStorage.setItem(sheetNameKey, sheetName.trim());

      // Fetch with timeout and fallback via cors proxy if needed
      let response: Response;
      try {
        response = await fetch(targetFetchUrl, { method: 'GET', cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP Status ${response.status}`);
      } catch (err) {
        // Fallback using direct CSV proxy or alternate URL
        const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetIdMatch && sheetIdMatch[1]) {
          const directCsv = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv${sheetName ? `&gid=0` : ''}`;
          response = await fetch(directCsv, { method: 'GET', cache: 'no-store' });
        } else {
          throw err;
        }
      }

      const csvText = await response.text();
      
      // If response returned an HTML login page, user hasn't shared sheet publicly
      if (csvText.includes('<!DOCTYPE html>') && (csvText.includes('accounts.google.com') || csvText.includes('ServiceLogin'))) {
        throw new Error('Spreadsheet terkunci (Private). Pastikan akses Google Spreadsheet diatur ke "Siapa saja yang memiliki link" (Viewer / Pelihat).');
      }

      // Parse CSV using SheetJS (xlsx)
      const workbook = XLSX.read(csvText, { type: 'string', cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows || rows.length === 0) {
        showError('Data di Google Spreadsheet kosong atau baris judul tidak terdeteksi!');
        setIsLoading(false);
        return;
      }

      // Value picker helper matching various possible column headers
      const getVal = (row: any, keys: string[]): string => {
        for (const k of keys) {
          const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const rowKey of Object.keys(row)) {
            const cleanRowKey = rowKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanRowKey === lowerK && row[rowKey] !== undefined && row[rowKey] !== null) {
              return String(row[rowKey]).trim();
            }
          }
        }
        return '';
      };

      // Map rows & compare with current database
      const parsedList: ParsedPreviewRow[] = rows.map((row, idx) => {
        const nama = getVal(row, ['Nama Lengkap', 'Nama', 'nama', 'Nama Guru', 'Nama GTK', 'Full Name']);
        if (!nama && !getVal(row, ['NIK', 'NIP', 'NPK'])) return null as any;

        const gelar = getVal(row, ['Gelar', 'Gelar Akademik', 'gelar', 'Gelar Depan / Belakang', 'Gelar Belakang', 'Gelar Depan']);
        const nik = cleanNumberField(getVal(row, ['NIK', 'nik', 'No. KTP', 'Nomor Induk Kependudukan', 'Nomor KTP']));
        const nip = getVal(row, ['NIP', 'nip', 'Nomor Induk Pegawai']) || '-';
        const nuptk = cleanNumberField(getVal(row, ['NUPTK', 'nuptk', 'Nomor Unik Pendidik']));
        const npk = cleanNumberField(getVal(row, ['NPK Kemenag', 'NPK', 'npk', 'Nomor Pendidik Kemenag']));
        const peg_id = cleanNumberField(getVal(row, ['Peg ID Simpatika', 'Peg ID', 'PEG ID', 'peg_id', 'PegID', 'ID Simpatika']));
        const nrg = cleanNumberField(getVal(row, ['NRG', 'nrg', 'Nomor Registrasi Guru', 'NRG Kemenag']));
        const tempat_lahir = getVal(row, ['Tempat Lahir', 'tempat_lahir', 'Kota Lahir', 'Tempat']);
        const tanggal_lahir = getVal(row, ['Tanggal Lahir (YYYY-MM-DD)', 'Tanggal Lahir', 'tanggal_lahir', 'Tgl Lahir', 'TglLahir', 'Lahir']);
        const alamat_rumah = getVal(row, ['Alamat Rumah', 'Alamat', 'alamat_rumah', 'Alamat Domisili', 'Alamat Lengkap', 'Alamat Tinggal', 'Domisili']);
        const jabatan = getVal(row, ['Jabatan', 'jabatan', 'Tugas', 'Tugas Tambahan']) || 'Guru Kelas';
        const statusRaw = getVal(row, ['Status Kepegawaian', 'status', 'Status', 'Status Kepegawaian (PNS/PPPK/GTY/Honorer)']) || 'GTY / Guru Tetap Yayasan';
        const jkRaw = getVal(row, ['Jenis Kelamin', 'jk', 'L/P', 'Gender', 'Kelamin']);
        const isPerempuan = jkRaw && (jkRaw.toLowerCase().startsWith('p') || jkRaw.toLowerCase().includes('perempuan') || jkRaw.toLowerCase() === 'wanita');
        const gender: 'Laki-laki' | 'Perempuan' = isPerempuan ? 'Perempuan' : 'Laki-laki';
        const jk = isPerempuan ? 'P' : 'L';
        const telepon = getVal(row, ['No WhatsApp', 'No. HP / WhatsApp', 'telepon', 'No HP', 'No. HP', 'WA', 'HP', 'Nomor HP']);
        const email = getVal(row, ['Email', 'email', 'Surel', 'Alamat Email']);
        const pendidikan_terakhir = getVal(row, ['Pendidikan Terakhir', 'pendidikan_terakhir', 'Pendidikan', 'Jenjang Pendidikan']) || 'S1';
        
        let status_sertifikasi: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses' = 'Belum Sertifikasi';
        const rawSerti = getVal(row, ['Status Sertifikasi', 'status_sertifikasi', 'Sertifikasi']).toLowerCase();
        if (rawSerti.includes('sudah') || rawSerti.includes('lulus') || rawSerti.includes('ya') || rawSerti.includes('terverifikasi')) {
          status_sertifikasi = 'Sudah Sertifikasi';
        } else if (rawSerti.includes('proses') || rawSerti.includes('ppg') || rawSerti.includes('antrean')) {
          status_sertifikasi = 'Dalam Proses';
        }

        const nomor_sertifikasi = cleanNumberField(getVal(row, ['No Sertifikat Pendidik', 'Nomor Sertifikat Pendidik', 'nomor_sertifikasi', 'No Sertifikat', 'No. Sertifikat', 'No. Sertifikat Pendidik']));
        const mapel_diampu = getVal(row, ['Mapel Diampu', 'Mata Pelajaran', 'mapel_diampu', 'Mapel']) || '-';
        const kelas_diampu = getVal(row, ['Mengajar Kelas', 'Mengajar Kelas / Rombel', 'kelas_diampu', 'Kelas Diampu', 'Rombel']);
        
        let status_keaktifan: 'Aktif' | 'Cuti' | 'Non-Aktif' = 'Aktif';
        const rawAktif = getVal(row, ['Status Keaktifan', 'status_keaktifan', 'Keaktifan']).toLowerCase();
        if (rawAktif.includes('cuti')) status_keaktifan = 'Cuti';
        else if (rawAktif.includes('non') || rawAktif.includes('keluar') || rawAktif.includes('pensiun')) status_keaktifan = 'Non-Aktif';

        const tmt_pendidik = getVal(row, ['TMT Pendidik', 'tmt_pendidik', 'TMT Guru', 'TMT Awal Pendidik', 'TMT Awal', 'TMT', 'Tanggal Mulai Tugas', 'Tanggal Mulai Tugas Pendidik']);
        const tmt_madrasah = getVal(row, ['TMT Madrasah', 'tmt_madrasah', 'TMT Satminkal', 'TMT Sekolah', 'TMT Tugas di Madrasah', 'TMT Tugas Satminkal', 'TMT di Madrasah Ini']);

        // Check if item matches existing data in current database
        const existing = (currentData as Teacher[]).find(c => {
          if (nik && c.nik && c.nik === nik) return true;
          if (nip && nip !== '-' && c.nip && c.nip === nip) return true;
          if (npk && c.npk && c.npk === npk) return true;
          if (nuptk && c.nuptk && c.nuptk === nuptk) return true;
          if (peg_id && c.peg_id && c.peg_id === peg_id) return true;
          return (c.nama || '').trim().toLowerCase() === nama.trim().toLowerCase();
        });

        let statusType: 'new' | 'update' | 'identical' = 'new';
        if (existing) {
          // Compare fields to determine if updated or identical
          const isIdentical = 
            (existing.nama || '').trim() === nama.trim() &&
            (existing.nik || '') === nik &&
            (existing.nip || '-') === nip &&
            (existing.npk || '') === npk &&
            (existing.nrg || '') === nrg &&
            (existing.nuptk || '') === nuptk &&
            (existing.peg_id || '') === peg_id &&
            (existing.tempat_lahir || '') === tempat_lahir &&
            (existing.tanggal_lahir || '') === tanggal_lahir &&
            (existing.alamat_rumah || '') === alamat_rumah &&
            (existing.jabatan || '') === jabatan &&
            (existing.status_kepegawaian === statusRaw || existing.status === statusRaw) &&
            (existing.tmt_pendidik || '') === tmt_pendidik &&
            (existing.tmt_madrasah || '') === tmt_madrasah &&
            (existing.mapel_diampu || '') === mapel_diampu;

          statusType = isIdentical ? 'identical' : 'update';
        }

        return {
          id: existing ? existing.id : `gtk_gsync_${Date.now()}_${idx}`,
          nama: nama || `Guru #${idx + 1}`,
          gelar,
          nik,
          nip,
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
          nomor_sertifikasi,
          no_sertifikat_pendidik: nomor_sertifikasi,
          tmt_pendidik,
          tmt_madrasah,
          kelas_diampu,
          mengajar_kelas: kelas_diampu,
          status_keaktifan,
          raw: row,
          statusType,
          matchedWith: existing
        };
      }).filter(Boolean);

      setPreviewRows(parsedList);
      showSuccess(`Berhasil mengambil ${parsedList.length} data baris dari Google Spreadsheet!`);
    } catch (err: any) {
      console.error('Google Sheets Sync Error:', err);
      showError(`Gagal membaca Google Spreadsheet: ${err.message || 'Periksa izin sharing atau koneksi internet Anda.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply Sync to Database
  const handleApplySync = () => {
    if (previewRows.length === 0) {
      showError('Tidak ada data yang dapat disinkronkan!');
      return;
    }

    const nowStr = new Date().toLocaleString('id-ID');
    localStorage.setItem(`siakad_gsheet_last_sync_${targetType}`, nowStr);
    setLastSyncTime(nowStr);

    let finalDataToSave: any[] = [];

    if (syncMode === 'replace') {
      // Total replace with sheet data
      finalDataToSave = previewRows.map(r => ({
        id: r.id,
        nama: r.nama,
        gelar: r.gelar || r.raw['Gelar'] || r.raw['Gelar Akademik'] || r.matchedWith?.gelar || '',
        gender: r.gender || (r.jk === 'P' ? 'Perempuan' : 'Laki-laki'),
        jenis_kelamin: r.jk,
        nik: r.nik || '',
        nip: r.nip || '-',
        npk: r.npk || '',
        nuptk: r.nuptk || '',
        nrg: r.nrg || '',
        peg_id: r.peg_id || '',
        tempat_lahir: r.tempat_lahir || '',
        tanggal_lahir: r.tanggal_lahir || '',
        alamat_rumah: r.alamat_rumah || r.matchedWith?.alamat_rumah || '',
        tmt_pendidik: r.tmt_pendidik || '',
        tmt_madrasah: r.tmt_madrasah || '',
        pendidikan: r.pendidikan || r.pendidikan_terakhir || 'S1',
        pendidikan_terakhir: r.pendidikan_terakhir || r.pendidikan || 'S1',
        sertifikasi: r.sertifikasi || r.status_sertifikasi || 'Belum Sertifikasi',
        status_sertifikasi: r.status_sertifikasi || r.sertifikasi || 'Belum Sertifikasi',
        no_sertifikat_pendidik: r.no_sertifikat_pendidik || r.nomor_sertifikasi || '',
        nomor_sertifikasi: r.nomor_sertifikasi || r.no_sertifikat_pendidik || '',
        status_kepegawaian: r.status_kepegawaian || r.status || 'GTY / Guru Tetap Yayasan',
        status: r.status || r.status_kepegawaian || 'GTY / Guru Tetap Yayasan',
        jabatan: r.jabatan || 'Guru Kelas',
        mapel_diampu: r.mapel_diampu || '-',
        mengajar_kelas: r.mengajar_kelas || r.kelas_diampu || '',
        kelas_diampu: r.kelas_diampu || r.mengajar_kelas || '',
        telepon: r.telepon || '',
        email: r.email || '',
        status_keaktifan: r.status_keaktifan || 'Aktif',
        foto_url: r.matchedWith?.foto_url || r.matchedWith?.foto || '',
        foto: r.matchedWith?.foto_url || r.matchedWith?.foto || '',
        created_at: r.matchedWith?.created_at || new Date().toISOString()
      }));
    } else if (syncMode === 'insert_only') {
      // Keep existing and only append truly new items
      const newItems = previewRows.filter(r => r.statusType === 'new').map(r => ({
        id: r.id,
        nama: r.nama,
        gelar: r.gelar || r.raw['Gelar'] || r.raw['Gelar Akademik'] || '',
        gender: r.gender || (r.jk === 'P' ? 'Perempuan' : 'Laki-laki'),
        jenis_kelamin: r.jk,
        nik: r.nik || '',
        nip: r.nip || '-',
        npk: r.npk || '',
        nuptk: r.nuptk || '',
        nrg: r.nrg || '',
        peg_id: r.peg_id || '',
        tempat_lahir: r.tempat_lahir || '',
        tanggal_lahir: r.tanggal_lahir || '',
        alamat_rumah: r.alamat_rumah || '',
        tmt_pendidik: r.tmt_pendidik || '',
        tmt_madrasah: r.tmt_madrasah || '',
        pendidikan: r.pendidikan || r.pendidikan_terakhir || 'S1',
        pendidikan_terakhir: r.pendidikan_terakhir || r.pendidikan || 'S1',
        sertifikasi: r.sertifikasi || r.status_sertifikasi || 'Belum Sertifikasi',
        status_sertifikasi: r.status_sertifikasi || r.sertifikasi || 'Belum Sertifikasi',
        no_sertifikat_pendidik: r.no_sertifikat_pendidik || r.nomor_sertifikasi || '',
        nomor_sertifikasi: r.nomor_sertifikasi || r.no_sertifikat_pendidik || '',
        status_kepegawaian: r.status_kepegawaian || r.status || 'GTY / Guru Tetap Yayasan',
        status: r.status || r.status_kepegawaian || 'GTY / Guru Tetap Yayasan',
        jabatan: r.jabatan || 'Guru Kelas',
        mapel_diampu: r.mapel_diampu || '-',
        mengajar_kelas: r.mengajar_kelas || r.kelas_diampu || '',
        kelas_diampu: r.kelas_diampu || r.mengajar_kelas || '',
        telepon: r.telepon || '',
        email: r.email || '',
        status_keaktifan: r.status_keaktifan || 'Aktif',
        foto_url: '',
        foto: '',
        created_at: new Date().toISOString()
      }));
      finalDataToSave = [...currentData, ...newItems];
    } else {
      // UPSERT (Default & Recommended): update matching, append new, keep untouched
      const currentListMap = new Map<string, any>();
      (currentData as any[]).forEach(item => {
        currentListMap.set(item.id, { ...item });
      });

      previewRows.forEach(r => {
        if (r.matchedWith && currentListMap.has(r.matchedWith.id)) {
          // Update existing item
          const existingItem = currentListMap.get(r.matchedWith.id);
          currentListMap.set(r.matchedWith.id, {
            ...existingItem,
            nama: r.nama || existingItem.nama,
            gelar: r.gelar || r.raw['Gelar'] || r.raw['Gelar Akademik'] || existingItem.gelar || '',
            nik: r.nik || existingItem.nik,
            nip: r.nip || existingItem.nip,
            npk: r.npk || existingItem.npk,
            nuptk: r.nuptk || existingItem.nuptk,
            nrg: r.nrg || existingItem.nrg,
            peg_id: r.peg_id || existingItem.peg_id,
            tempat_lahir: r.tempat_lahir || existingItem.tempat_lahir,
            tanggal_lahir: r.tanggal_lahir || existingItem.tanggal_lahir,
            alamat_rumah: r.alamat_rumah || existingItem.alamat_rumah || '',
            gender: r.gender || (r.jk === 'P' ? 'Perempuan' : 'Laki-laki') || existingItem.gender,
            jenis_kelamin: r.jk || existingItem.jenis_kelamin,
            jabatan: r.jabatan || existingItem.jabatan,
            status_kepegawaian: r.status_kepegawaian || r.status || existingItem.status_kepegawaian,
            status: r.status || r.status_kepegawaian || existingItem.status,
            mapel_diampu: r.mapel_diampu || existingItem.mapel_diampu,
            mengajar_kelas: r.mengajar_kelas || r.kelas_diampu || existingItem.mengajar_kelas,
            kelas_diampu: r.kelas_diampu || r.mengajar_kelas || existingItem.kelas_diampu,
            telepon: r.telepon || existingItem.telepon,
            email: r.email || existingItem.email,
            status_keaktifan: r.status_keaktifan || existingItem.status_keaktifan || 'Aktif',
            pendidikan: r.pendidikan || r.pendidikan_terakhir || existingItem.pendidikan,
            pendidikan_terakhir: r.pendidikan_terakhir || r.pendidikan || existingItem.pendidikan_terakhir,
            sertifikasi: r.sertifikasi || r.status_sertifikasi || existingItem.sertifikasi,
            status_sertifikasi: r.status_sertifikasi || r.sertifikasi || existingItem.status_sertifikasi,
            no_sertifikat_pendidik: r.no_sertifikat_pendidik || r.nomor_sertifikasi || existingItem.no_sertifikat_pendidik,
            nomor_sertifikasi: r.nomor_sertifikasi || r.no_sertifikat_pendidik || existingItem.nomor_sertifikasi,
            tmt_pendidik: r.tmt_pendidik || existingItem.tmt_pendidik,
            tmt_madrasah: r.tmt_madrasah || existingItem.tmt_madrasah,
            foto_url: existingItem.foto_url || existingItem.foto || '',
            foto: existingItem.foto_url || existingItem.foto || '',
          });
        } else {
          // New Item
          currentListMap.set(r.id!, {
            id: r.id,
            nama: r.nama,
            gelar: r.gelar || r.raw['Gelar'] || r.raw['Gelar Akademik'] || '',
            gender: r.gender || (r.jk === 'P' ? 'Perempuan' : 'Laki-laki'),
            jenis_kelamin: r.jk,
            nik: r.nik || '',
            nip: r.nip || '-',
            npk: r.npk || '',
            nuptk: r.nuptk || '',
            nrg: r.nrg || '',
            peg_id: r.peg_id || '',
            tempat_lahir: r.tempat_lahir || '',
            tanggal_lahir: r.tanggal_lahir || '',
            alamat_rumah: r.alamat_rumah || '',
            tmt_pendidik: r.tmt_pendidik || '',
            tmt_madrasah: r.tmt_madrasah || '',
            pendidikan: r.pendidikan || r.pendidikan_terakhir || 'S1',
            pendidikan_terakhir: r.pendidikan_terakhir || r.pendidikan || 'S1',
            sertifikasi: r.sertifikasi || r.status_sertifikasi || 'Belum Sertifikasi',
            status_sertifikasi: r.status_sertifikasi || r.sertifikasi || 'Belum Sertifikasi',
            no_sertifikat_pendidik: r.no_sertifikat_pendidik || r.nomor_sertifikasi || '',
            nomor_sertifikasi: r.nomor_sertifikasi || r.no_sertifikat_pendidik || '',
            status_kepegawaian: r.status_kepegawaian || r.status || 'GTY / Guru Tetap Yayasan',
            status: r.status || r.status_kepegawaian || 'GTY / Guru Tetap Yayasan',
            jabatan: r.jabatan || 'Guru Kelas',
            mapel_diampu: r.mapel_diampu || '-',
            mengajar_kelas: r.mengajar_kelas || r.kelas_diampu || '',
            kelas_diampu: r.kelas_diampu || r.mengajar_kelas || '',
            telepon: r.telepon || '',
            email: r.email || '',
            status_keaktifan: r.status_keaktifan || 'Aktif',
            foto_url: '',
            foto: '',
            created_at: new Date().toISOString()
          });
        }
      });

      finalDataToSave = Array.from(currentListMap.values());
    }

    onSyncComplete(finalDataToSave, syncMode);
    showSuccess(`✅ Sinkronisasi Google Sheets Berhasil! Total ${finalDataToSave.length} data tersimpan di sistem.`);
    onClose();
  };

  // Generate & Download Google Sheet Ready Template with Native Dropdowns
  const handleDownloadSheetTemplate = async (useExistingData: boolean = false) => {
    try {
      const teachersToExport = useExistingData && currentData && currentData.length > 0 ? currentData : undefined;
      const fileName = useExistingData && currentData && currentData.length > 0
        ? `Data_GTK_Aktif_${madrasahName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Template_Google_Sheets_GTK_${madrasahName.replace(/\s+/g, '_')}.xlsx`;

      await downloadExcelWithDropdowns(
        fileName,
        sheetName || 'Data_GTK',
        teachersToExport
      );
      
      if (useExistingData && currentData && currentData.length > 0) {
        showSuccess(`Berhasil mengunduh template terisi ${currentData.length} data GTK saat ini dengan Dropdown aktif!`);
      } else {
        showSuccess('Template spreadsheet resmi (contoh + validasi Dropdown) berhasil diunduh!');
      }
    } catch (err: any) {
      console.error('Download error:', err);
      showError('Gagal mengunduh template spreadsheet');
    }
  };

  // Filtered rows for table view
  const filteredRows = previewRows.filter(row => {
    if (filterStatus !== 'all' && row.statusType !== filterStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.nama.toLowerCase().includes(q) ||
      (row.nik && row.nik.includes(q)) ||
      (row.nip && row.nip.toLowerCase().includes(q)) ||
      (row.npk && row.npk.includes(q)) ||
      (row.nrg && row.nrg.includes(q)) ||
      (row.jabatan && row.jabatan.toLowerCase().includes(q))
    );
  });

  const stats = {
    total: previewRows.length,
    new: previewRows.filter(r => r.statusType === 'new').length,
    update: previewRows.filter(r => r.statusType === 'update').length,
    identical: previewRows.filter(r => r.statusType === 'identical').length,
  };

  // Google Apps Script sample code with Dropdown Auto-setup
  const appsScriptCode = generateAppsScriptDropdownCode(sheetName || 'Data_GTK');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-900 text-slate-100 border-slate-700 shadow-2xl rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  Pusat Sinkronisasi Google Spreadsheet
                  <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5">
                    Live Online Sync
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Hubungkan dan perbarui data {targetType === 'teachers' ? 'Guru & GTK' : 'Siswa'} secara real-time langsung dari Google Sheets dengan pilihan Dropdown otomatis.
                </DialogDescription>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {currentData && currentData.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownloadSheetTemplate(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl gap-1.5 h-8 shadow-sm"
                  title="Unduh spreadsheet yang sudah terisi data GTK saat ini lengkap dengan Dropdown"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Data GTK Saat Ini ({currentData.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadSheetTemplate(false)}
                className="bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border-emerald-500/30 text-xs font-semibold rounded-xl gap-1.5 h-8"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Template Kosong
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/80 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'sync'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Live Sync Data
            </button>
            <button
              onClick={() => setActiveTab('dropdowns')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'dropdowns'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Pilihan Dropdown & Skrip
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> Panduan Cara Pakai
            </button>
            <button
              onClick={() => setActiveTab('apps_script')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'apps_script'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Webhook / Apps Script
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeTab === 'sync' && (
            <div className="space-y-5">
              {/* URL Input Box Card */}
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Masukkan Link / URL Google Spreadsheet
                  </label>
                  {lastSyncTime && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      Terakhir sinkron: <strong className="text-emerald-300">{lastSyncTime}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3">
                  <Input
                    placeholder="Contoh: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl"
                  />
                  <Input
                    placeholder="Nama Tab (cth: Data_GTK)"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    title="Nama Sheet / Tab di Google Spreadsheet Anda"
                    className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl"
                  />
                  <Button
                    onClick={handleFetchFromGoogleSheets}
                    disabled={isLoading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-10 px-5 rounded-xl gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Membaca Data...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" /> Tarik Data GSheet
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Pastikan izin berbagi Google Spreadsheet diatur ke: <strong>"Siapa saja yang memiliki link"</strong> dengan peran <strong>"Pelihat (Viewer)"</strong>.
                  </span>
                </div>
              </div>

              {/* Preview & Compare Section */}
              {previewRows.length > 0 && (
                <div className="space-y-4">
                  {/* Summary & Sync Options */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl text-center">
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Total Di Spreadsheet</div>
                      <div className="text-xl font-black text-white mt-0.5">{stats.total}</div>
                    </div>
                    <div className="bg-emerald-950/40 border border-emerald-700/50 p-3 rounded-2xl text-center">
                      <div className="text-[11px] text-emerald-400 font-semibold uppercase flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" /> Data Baru
                      </div>
                      <div className="text-xl font-black text-emerald-300 mt-0.5">+{stats.new}</div>
                    </div>
                    <div className="bg-blue-950/40 border border-blue-700/50 p-3 rounded-2xl text-center">
                      <div className="text-[11px] text-blue-400 font-semibold uppercase flex items-center justify-center gap-1">
                        <ArrowDownUp className="w-3 h-3" /> Diperbarui
                      </div>
                      <div className="text-xl font-black text-blue-300 mt-0.5">{stats.update}</div>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl text-center">
                      <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Sudah Sama
                      </div>
                      <div className="text-xl font-black text-slate-300 mt-0.5">{stats.identical}</div>
                    </div>
                  </div>

                  {/* Sync Mode Selection */}
                  <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Pilih Metode Penerapan Sinkronisasi:</span>
                      <span className="text-[11px] text-slate-400">Tentukan cara data diterapkan ke database aplikasi SIAKAD</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSyncMode('upsert')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          syncMode === 'upsert'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        ⚡ Gabung & Update (Rekomendasi)
                      </button>
                      <button
                        onClick={() => setSyncMode('replace')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          syncMode === 'replace'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        ⚠️ Timpa Total (Replace All)
                      </button>
                      <button
                        onClick={() => setSyncMode('insert_only')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          syncMode === 'insert_only'
                            ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        ➕ Tambah Data Baru Saja
                      </button>
                    </div>
                  </div>

                  {/* Filter Toolbar & Search */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Cari guru, NIP, NPK, NIK..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white pl-8 h-8 text-xs rounded-xl"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                      <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          filterStatus === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Semua ({previewRows.length})
                      </button>
                      <button
                        onClick={() => setFilterStatus('new')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          filterStatus === 'new' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-slate-800'
                        }`}
                      >
                        Data Baru ({stats.new})
                      </button>
                      <button
                        onClick={() => setFilterStatus('update')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          filterStatus === 'update' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:bg-slate-800'
                        }`}
                      >
                        Diperbarui ({stats.update})
                      </button>
                      <button
                        onClick={() => setFilterStatus('identical')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          filterStatus === 'identical' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Sama ({stats.identical})
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-950 shadow-inner max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-800/90 text-slate-300 font-bold sticky top-0 border-b border-slate-700 text-[11px]">
                        <tr>
                          <th className="p-2.5 text-center w-10">No</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Nama GTK & Jabatan</th>
                          <th className="p-2.5">NIP</th>
                          <th className="p-2.5">NPK</th>
                          <th className="p-2.5">NRG</th>
                          <th className="p-2.5">TTL</th>
                          <th className="p-2.5">TMT Pendidik / Madrasah</th>
                          <th className="p-2.5">Status Pegawai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {filteredRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-2.5 text-center text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                            <td className="p-2.5">
                              {row.statusType === 'new' && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                                  Baru
                                </Badge>
                              )}
                              {row.statusType === 'update' && (
                                <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold">
                                  Diperbarui
                                </Badge>
                              )}
                              {row.statusType === 'identical' && (
                                <Badge className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px]">
                                  Sama
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="font-bold text-white">{row.nama}</div>
                              <div className="text-[10px] text-slate-400">{row.jabatan} • {row.mapel_diampu}</div>
                            </td>
                            <td className="p-2.5 font-mono text-[11px]">{row.nip || '-'}</td>
                            <td className="p-2.5 font-mono text-[11px] font-semibold text-emerald-400">{row.npk || '-'}</td>
                            <td className="p-2.5 font-mono text-[11px] text-amber-300">{row.nrg || '-'}</td>
                            <td className="p-2.5 text-[10px] text-slate-300">
                              {row.tempat_lahir || '-'}{row.tanggal_lahir ? `, ${row.tanggal_lahir}` : ''}
                            </td>
                            <td className="p-2.5 text-[10px] text-slate-300">
                              <div className="font-semibold text-slate-200">Awal: {row.tmt_pendidik || '-'}</div>
                              {row.tmt_madrasah && <div className="text-[9px] text-emerald-400">Madrasah: {row.tmt_madrasah}</div>}
                            </td>
                            <td className="p-2.5 text-[10px]">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dropdowns' && (
            <div className="space-y-4 text-xs text-slate-300">
              {/* Header Info */}
              <div className="bg-gradient-to-r from-emerald-950/70 via-slate-800 to-slate-800 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                      Validasi Dropdown Pilihan Form GTK
                    </h4>
                    <p className="text-slate-400 text-xs mt-1">
                      Daftar pilihan dropdown di bawah ini 100% identik dan selaras dengan formulir <strong>"Tambah Guru / GTK Baru"</strong> di aplikasi.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentData && currentData.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleDownloadSheetTemplate(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-8 text-xs rounded-xl gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh Data GTK ({currentData.length})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadSheetTemplate(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40 h-8 text-xs rounded-xl gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Template Kosong
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(appsScriptCode);
                        setIsCopiedScript(true);
                        setTimeout(() => setIsCopiedScript(false), 2000);
                        showSuccess('Skrip Auto-Setup Google Sheets disalin!');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40 h-8 text-xs rounded-xl gap-1.5"
                    >
                      {isCopiedScript ? <Check className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
                      {isCopiedScript ? 'Skrip Tersalin' : 'Salin Skrip Auto-Setup'}
                    </Button>
                  </div>
                </div>

                {/* Google Sheets 1-Click Dropdown Instructions */}
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 text-[11px] space-y-1.5">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Cara Mengaktifkan Dropdown di Google Spreadsheet Secara Otomatis:
                  </div>
                  <p className="text-slate-300">
                    File Excel yang Anda unduh sudah memiliki validasi data bawaan. Untuk Google Sheets online baru:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                    <li>Buka Google Spreadsheet &rarr; klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                    <li>Hapus kode bawaan, lalu paste kode dari tombol <strong>"Salin Skrip Auto-Setup"</strong> di atas.</li>
                    <li>Pilih fungsi <strong><code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded">setupSiakadDropdowns</code></strong> lalu klik tombol <strong>Jalankan (Run)</strong>.</li>
                    <li>Semua kolom (Jabatan, Status, JK, Sertifikasi, Kelas, Keaktifan) akan otomatis berubah menjadi Dropdown dengan warna rapi!</li>
                  </ol>
                </div>
              </div>

              {/* Grid of Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Jabatan */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Kolom K</Badge>
                      Jabatan
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{GTK_DROPDOWN_OPTIONS.jabatan.length} opsi</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                    {GTK_DROPDOWN_OPTIONS.jabatan.map(opt => (
                      <span key={opt} className="bg-slate-900 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-lg text-[10px]">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 2. Status Kepegawaian */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Kolom L</Badge>
                      Status Kepegawaian
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{GTK_DROPDOWN_OPTIONS.status_kepegawaian.length} opsi</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {GTK_DROPDOWN_OPTIONS.status_kepegawaian.map(opt => (
                      <span key={opt} className="bg-slate-900 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-lg text-[10px]">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Jenis Kelamin */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Kolom M</Badge>
                      Jenis Kelamin
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{GTK_DROPDOWN_OPTIONS.jenis_kelamin.length} opsi</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {GTK_DROPDOWN_OPTIONS.jenis_kelamin.map(opt => (
                      <span key={opt} className="bg-slate-900 text-emerald-300 font-semibold border border-slate-700 px-2.5 py-1 rounded-lg text-[11px]">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 4. Pendidikan Terakhir */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Kolom P</Badge>
                      Pendidikan Terakhir
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{GTK_DROPDOWN_OPTIONS.pendidikan.length} opsi</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {GTK_DROPDOWN_OPTIONS.pendidikan.map(opt => (
                      <span key={opt} className="bg-slate-900 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-lg text-[10px]">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 5. Status Sertifikasi */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Kolom Q</Badge>
                      Status Sertifikasi
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{GTK_DROPDOWN_OPTIONS.status_sertifikasi.length} opsi</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {GTK_DROPDOWN_OPTIONS.status_sertifikasi.map(opt => (
                      <span key={opt} className="bg-slate-900 text-amber-300 font-semibold border border-slate-700 px-2 py-0.5 rounded-lg text-[10px]">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 6. Mengajar Kelas */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Kolom T</Badge>
                      Mengajar Kelas
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{GTK_DROPDOWN_OPTIONS.kelas_diampu.length} opsi</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {GTK_DROPDOWN_OPTIONS.kelas_diampu.map(opt => (
                      <span key={opt} className="bg-slate-900 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-lg text-[10px]">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 7. Status Keaktifan */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Kolom U</Badge>
                      Status Keaktifan
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{GTK_DROPDOWN_OPTIONS.status_keaktifan.length} opsi</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {GTK_DROPDOWN_OPTIONS.status_keaktifan.map(opt => (
                      <span key={opt} className="bg-slate-900 text-sky-300 font-semibold border border-slate-700 px-2.5 py-1 rounded-lg text-[11px]">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Langkah-Langkah Menghubungkan Google Spreadsheet:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 pl-1">
                  <li>
                    <strong>Unduh Template Google Sheets:</strong> Klik tombol <span className="text-emerald-400 font-semibold">"Unduh Template GSheet"</span> di pojok kanan atas modal ini untuk mendapatkan format kolom resmi.
                  </li>
                  <li>
                    <strong>Upload ke Google Drive:</strong> Buka Google Drive Anda, upload file template tersebut lalu buka sebagai <strong>Google Sheets</strong>.
                  </li>
                  <li>
                    <strong>Atur Izin Akses (Penting):</strong> Di Google Spreadsheet Anda, klik tombol <strong>Bagikan (Share)</strong> di pojok kanan atas &rarr; Pada bagian "Akses umum", ubah dari <em>Dibatasi (Restricted)</em> menjadi <strong>"Siapa saja yang memiliki link" (Anyone with the link)</strong> dengan peran <strong>Pelihat (Viewer)</strong>.
                  </li>
                  <li>
                    <strong>Salin Link Spreadsheet:</strong> Salin URL browser spreadsheet tersebut (misalnya: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono">https://docs.google.com/spreadsheets/d/1BxiM.../edit</code>).
                  </li>
                  <li>
                    <strong>Sinkronkan:</strong> Tempelkan link tersebut ke input URL di tab <strong>"Live Sync Data"</strong>, lalu klik <strong>"Tarik Data GSheet"</strong>.
                  </li>
                  <li>
                    <strong>Terapkan Perubahan:</strong> Periksa pratinjau perbandingan data baru vs lama, lalu klik tombol <strong>"Terapkan Sinkronisasi ke Database"</strong>.
                  </li>
                </ol>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 space-y-2">
                <h5 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Keunggulan Online Sync:
                </h5>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Tidak perlu berulang kali mengunduh dan mengunggah file Excel secara manual.</li>
                  <li>Cukup ubah data di Google Spreadsheet Anda (bahkan bisa diedit bersama tim/staf lain secara kolaboratif).</li>
                  <li>Kapan pun Anda butuh update, cukup klik tombol <strong>Sync Google Sheet</strong> di SIAKAD.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'apps_script' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Google Apps Script Webhook (Untuk Otomasi Tambahan)
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(appsScriptCode);
                      setIsCopiedScript(true);
                      setTimeout(() => setIsCopiedScript(false), 2000);
                      showSuccess('Kode Apps Script berhasil disalin!');
                    }}
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 h-7 text-[11px] rounded-lg gap-1"
                  >
                    {isCopiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopiedScript ? 'Tersalin' : 'Salin Kode'}
                  </Button>
                </div>
                <p className="text-slate-400">
                  Anda juga dapat memasang skrip ini di menu <strong>Ekstensi &gt; Apps Script</strong> di Google Sheets untuk membuat endpoint JSON API pribadi:
                </p>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-48">
                  {appsScriptCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Sinkronisasi: <strong>{targetType === 'teachers' ? 'Data Guru & GTK' : 'Data Siswa'}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 text-xs rounded-xl"
            >
              Tutup
            </Button>
            {previewRows.length > 0 && activeTab === 'sync' && (
              <Button
                size="sm"
                onClick={handleApplySync}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl px-5 gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Terapkan Sinkronisasi ke Database ({previewRows.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSheetsSyncModal;
