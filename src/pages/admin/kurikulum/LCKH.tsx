"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, Trash2, Printer, Loader2, Calendar, ClipboardList, 
  Upload, X, ImageIcon, ArrowLeft, Save, Search, FileText, Tag,
  Pencil, Download, Filter, User, Building2, Layers, CheckCircle2,
  CalendarRange, Sparkles, RefreshCw, FileSpreadsheet, ExternalLink,
  Camera, Check, Info, ShieldCheck, MapPin
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { Badge } from '@/components/ui/badge';
import { formatImageUrl, uploadImageToStorage } from '@/utils/imageCompression';
import { loadPersistedClasses, RombelClass } from '@/utils/rombelPersistence';
import { 
  getHolidayInfo, 
  getAcademicCalendarEvents, 
  CalendarEventItem 
} from '@/utils/academicHolidays';
import CalendarHolidayPicker from '@/components/CalendarHolidayPicker';
import * as XLSX from 'xlsx';

export interface LCKHItem {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nama_guru: string;
  nip: string;
  jenis_kegiatan: string;
  tempat_kegiatan: string;
  volume: string;
  kegiatan: string;
  hasil_capaian: string;
  keterangan: string;
  foto_url?: string;
  created_at: string;
}

export interface TeacherProfile {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  kelas?: string;
  tanda_tangan_url?: string | null;
}

const JENIS_KEGIATAN_OPTIONS = [
  'Intrakurikuler (KBM)',
  'Kokurikuler (P5RA)',
  'Ekstrakurikuler',
  'Bimbingan & Konseling Siswa',
  'Pengembangan Diri / Pelatihan / PKB',
  'Administrasi / Perencanaan Pembelajaran',
  'Rapat Dinas / Evaluasi',
  'Tugas Tambahan (Wali Kelas/Piket)',
  'Lainnya'
];

const TEMPAT_KEGIATAN_PRESETS = [
  'Ruang Kelas',
  'Laboratorium Komputer',
  'Mushola / Masjid Madrasah',
  'Ruang Guru / Kantor',
  'Aula Madrasah',
  'Perpustakaan',
  'Halaman / Lapangan Madrasah',
  'Luar Madrasah / Kunjungan'
];

const VOLUME_PRESETS = [
  '2 JP',
  '4 JP',
  '6 JP',
  '1 Pertemuan',
  '1 Modul / RPP',
  '1 Dokumen',
  '1 Laporan',
  '1 Kegiatan'
];

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const LCKH = () => {
  const { settings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId, getScopedKey } = useMadrasah();

  const [data, setData] = useState<LCKHItem[]>(() => {
    try {
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;
      const cached = localStorage.getItem(scopedLocalKey) || localStorage.getItem('siakad_lckh_guru_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      void e;
    }
    return [];
  });

  const [teachersList, setTeachersList] = useState<TeacherProfile[]>(() => {
    try {
      const cached = localStorage.getItem(`siakad_data_guru_${activeMadrasahId}`) || localStorage.getItem('siakad_data_guru');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any) => ({
            id: t.id || t.nama || String(Math.random()),
            nama: t.nama || t.name || '',
            nip: t.nip || t.nuptk || '-',
            jabatan: t.jabatan || t.role || 'Guru Mata Pelajaran',
            kelas: t.rombel || t.kelas || '',
            tanda_tangan_url: t.tanda_tangan_url || null
          }));
        }
      }
    } catch (e) {
      void e;
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;
      const cached = localStorage.getItem(scopedLocalKey) || localStorage.getItem('siakad_lckh_guru_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch (e) {
      void e;
    }
    return true;
  });

  const isFetchingRef = React.useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Preview Views
  const [previewItem, setPreviewItem] = useState<LCKHItem | null>(null);
  const [showMonthlyPreview, setShowMonthlyPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Options for Monthly Print
  const [includePhotosInMonthly, setIncludePhotosInMonthly] = useState(true);
  const [includeHolidayRows, setIncludeHolidayRows] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [tableDensity, setTableDensity] = useState<'super-compact' | 'compact' | 'standard'>('super-compact');
  const [customTanggalCetak, setCustomTanggalCetak] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Monthly Filter States
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');

  const printConfig = settings.print_settings || {
    margin_top: 2, margin_bottom: 2, margin_left: 2, margin_right: 2,
    paper_size: 'A4', font_size: 10, show_kop: true, show_signature: true
  };

  const defaultTeacherName = activeMadrasah?.nama_pimpinan || 'Guru Madrasah';
  const defaultNip = activeMadrasah?.nip_pimpinan || '-';

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nama_guru: '',
    nip: '',
    jenis_kegiatan: 'Intrakurikuler (KBM)',
    tempat_kegiatan: 'Ruang Kelas',
    volume: '2 JP',
    kegiatan: '',
    hasil_capaian: '',
    keterangan: 'Terlaksana dengan baik',
    foto_url: ''
  });

  // ==========================================
  // 1. FETCH DATA LCKH (Silent background sync)
  // ==========================================
  const fetchLCKH = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isInitial && data.length === 0) {
      setLoading(true);
    }
    try {
      const storageKey = getScopedKey('lckh_guru_list');
      const fallbackKey = 'lckh_guru_list';
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;

      const { data: res, error } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', [storageKey, fallbackKey, 'lckh_list'])
        .order('id', { ascending: false });

      if (error) {
        console.warn('LCKH fetch warning:', error);
      }

      let loadedItems: LCKHItem[] = [];

      if (res && res.length > 0) {
        const found = res.find(r => r.id === storageKey) || res[0];
        if (found?.value && Array.isArray(found.value)) {
          loadedItems = found.value;
        }
      }

      // If empty from DB, check local storage
      if (loadedItems.length === 0) {
        const cached = localStorage.getItem(scopedLocalKey) || localStorage.getItem('siakad_lckh_guru_list');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) loadedItems = parsed;
          } catch (e) {
            void e;
          }
        }
      }

      // Normalize items with default values for new fields
      const normalized = loadedItems.map(item => ({
        ...item,
        nama_guru: item.nama_guru || defaultTeacherName,
        nip: item.nip || defaultNip,
        jenis_kegiatan: item.jenis_kegiatan || 'Intrakurikuler (KBM)',
        tempat_kegiatan: item.tempat_kegiatan || 'Ruang Kelas',
        volume: item.volume || '1 Kegiatan',
        keterangan: item.keterangan || 'Terlaksana',
      }));

      setData(normalized);
      try {
        localStorage.setItem(scopedLocalKey, JSON.stringify(normalized));
      } catch (e) {
        void e;
      }
    } catch (error) {
      console.error('Error fetching LCKH:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [activeMadrasahId, getScopedKey, defaultTeacherName, defaultNip, data.length]);

  // ==========================================
  // 2. FETCH & SYNC TEACHERS + ROMBEL + SIGNATURES
  // ==========================================
  const fetchTeachersAndRombel = useCallback(async () => {
    try {
      const storageKeyGuru = getScopedKey('data_guru');
      const storageKeyPenandatangan = getScopedKey('penandatangan');
      
      // Load from Supabase
      const { data: res } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', [
          storageKeyGuru, 'data_guru', 'siakad_data_guru',
          storageKeyPenandatangan, 'penandatangan'
        ]);

      let rawTeachers: any[] = [];
      let rawPenandatangan: any = null;

      if (res && res.length > 0) {
        const rowGuru = res.find(r => r.id === storageKeyGuru) || res.find(r => r.id === 'data_guru') || res.find(r => r.id === 'siakad_data_guru');
        if (rowGuru?.value && Array.isArray(rowGuru.value)) {
          rawTeachers = rowGuru.value;
        }

        const rowTtd = res.find(r => r.id === storageKeyPenandatangan) || res.find(r => r.id === 'penandatangan');
        if (rowTtd?.value) {
          rawPenandatangan = rowTtd.value;
        }
      }

      // Fallback cache check for teachers
      if (rawTeachers.length === 0) {
        const cached = localStorage.getItem(`siakad_data_guru_${activeMadrasahId}`) || localStorage.getItem('siakad_data_guru');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) rawTeachers = parsed;
          } catch (e) {
            void e;
          }
        }
      }

      // Load classes/rombel
      let rawClasses: RombelClass[] = [];
      try {
        rawClasses = await loadPersistedClasses(activeMadrasahId);
      } catch (e) {
        console.warn('Error loading rombel classes:', e);
      }

      // Build Map of Wali Kelas -> Kelas Name
      const waliKelasMap = new Map<string, string>();
      rawClasses.forEach(cls => {
        if (cls.wali_kelas && cls.wali_kelas.trim() !== '') {
          const wName = cls.wali_kelas.trim().toLowerCase();
          waliKelasMap.set(wName, cls.nama_kelas);
        }
      });

      // Build Map of Signatures from Penandatangan
      const signatureMap = new Map<string, string>();
      if (rawPenandatangan?.guru_kelas && Array.isArray(rawPenandatangan.guru_kelas)) {
        rawPenandatangan.guru_kelas.forEach((gk: any) => {
          if (gk.nama && gk.tanda_tangan_url) {
            signatureMap.set(gk.nama.trim().toLowerCase(), gk.tanda_tangan_url);
          }
          if (gk.nip && gk.tanda_tangan_url) {
            signatureMap.set(gk.nip.trim(), gk.tanda_tangan_url);
          }
        });
      }

      // Consolidate into authoritative TeacherProfile list
      const teacherProfiles: TeacherProfile[] = [];
      const seenNames = new Set<string>();

      // 1. Process from rawTeachers
      rawTeachers.forEach((t: any) => {
        if (!t || !t.nama) return;
        const normName = t.nama.trim();
        const lowerName = normName.toLowerCase();
        if (seenNames.has(lowerName)) return;
        seenNames.add(lowerName);

        // Check if assigned as Wali Kelas in Rombel
        let assignedClass = t.rombel || t.kelas || '';
        if (!assignedClass && waliKelasMap.has(lowerName)) {
          assignedClass = waliKelasMap.get(lowerName) || '';
        }

        let jabatan = t.jabatan || 'Guru';
        if (assignedClass && !jabatan.toLowerCase().includes('wali') && !jabatan.toLowerCase().includes('kelas')) {
          jabatan = `Wali Kelas ${assignedClass.replace(/kelas/i, '').trim()}`;
        }

        const ttd = t.tanda_tangan_url || signatureMap.get(lowerName) || (t.nip ? signatureMap.get(t.nip.trim()) : null) || null;

        teacherProfiles.push({
          id: t.id || normName,
          nama: normName,
          nip: t.nip || t.nuptk || '-',
          jabatan: jabatan,
          kelas: assignedClass,
          tanda_tangan_url: ttd
        });
      });

      // 2. Add any Wali Kelas from Rombel that might not be in Teachers list yet
      rawClasses.forEach(cls => {
        if (cls.wali_kelas && cls.wali_kelas.trim() !== '') {
          const normName = cls.wali_kelas.trim();
          const lowerName = normName.toLowerCase();
          if (!seenNames.has(lowerName)) {
            seenNames.add(lowerName);
            const ttd = signatureMap.get(lowerName) || null;
            teacherProfiles.push({
              id: `rombel_wali_${cls.id}`,
              nama: normName,
              nip: '-',
              jabatan: `Wali ${cls.nama_kelas}`,
              kelas: cls.nama_kelas,
              tanda_tangan_url: ttd
            });
          }
        }
      });

      // 3. Add Kepala Madrasah if not present
      const headName = rawPenandatangan?.kepala_nama || activeMadrasah?.nama_pimpinan || settings.general?.headmaster_name;
      if (headName && !seenNames.has(headName.toLowerCase())) {
        seenNames.add(headName.toLowerCase());
        teacherProfiles.unshift({
          id: 'headmaster_profile',
          nama: headName,
          nip: rawPenandatangan?.kepala_nip || activeMadrasah?.nip_pimpinan || '-',
          jabatan: rawPenandatangan?.kepala_jabatan || 'Kepala Madrasah',
          kelas: '',
          tanda_tangan_url: rawPenandatangan?.kepala_tanda_tangan_url || null
        });
      }

      setTeachersList(teacherProfiles);
    } catch (e) {
      console.warn('Error fetching teachers and rombel list:', e);
    }
  }, [activeMadrasahId, getScopedKey, activeMadrasah?.nama_pimpinan, activeMadrasah?.nip_pimpinan, settings.general?.headmaster_name]);

  useEffect(() => {
    fetchLCKH(true);
    fetchTeachersAndRombel();
    getAcademicCalendarEvents().then(events => {
      if (events && events.length > 0) setCalendarEvents(events);
    });
  }, [activeMadrasahId]);

  // Helper to find full teacher profile by name or NIP
  const resolveTeacherProfile = useCallback((nama?: string, nip?: string): TeacherProfile => {
    if (!nama && !nip) {
      return {
        id: 'default',
        nama: defaultTeacherName,
        nip: defaultNip,
        jabatan: 'Guru yang Bersangkutan',
        tanda_tangan_url: null
      };
    }

    const normNama = (nama || '').trim().toLowerCase();
    const normNip = (nip || '').trim();

    const matched = teachersList.find(t => {
      if (normNama && t.nama.toLowerCase() === normNama) return true;
      if (normNip && normNip !== '-' && t.nip === normNip) return true;
      if (normNama && t.nama.toLowerCase().includes(normNama)) return true;
      return false;
    });

    if (matched) return matched;

    return {
      id: 'custom',
      nama: nama || defaultTeacherName,
      nip: nip || '-',
      jabatan: 'Guru yang Bersangkutan',
      tanda_tangan_url: null
    };
  }, [teachersList, defaultTeacherName, defaultNip]);

  const handleTeacherSelect = (teacherNama: string) => {
    const selected = teachersList.find(t => t.nama === teacherNama);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        nama_guru: selected.nama,
        nip: selected.nip !== '-' ? selected.nip : prev.nip,
        tempat_kegiatan: selected.kelas ? `Ruang ${selected.kelas}` : prev.tempat_kegiatan
      }));
    } else {
      setFormData(prev => ({ ...prev, nama_guru: teacherNama }));
    }
  };

  // Image Upload handler with compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('File harus berupa gambar JPG/PNG/WEBP!');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadImageToStorage(file, 'lckh_photos');
      if (imageUrl) {
        setFormData(prev => ({ ...prev, foto_url: imageUrl }));
        showSuccess('Foto dokumentasi kegiatan berhasil dimuat!');
      } else {
        showError('Gagal memproses foto dokumentasi');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Gagal memproses foto dokumentasi');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Save LCKH Item (Add or Edit)
  const handleSave = async () => {
    if (!formData.nama_guru.trim()) {
      showError('Nama Guru wajib diisi!');
      return;
    }
    if (!formData.kegiatan.trim()) {
      showError('Uraian kegiatan wajib diisi!');
      return;
    }
    if (!formData.hasil_capaian.trim()) {
      showError('Hasil / capaian kegiatan wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const storageKey = getScopedKey('lckh_guru_list');
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;

      let updatedList: LCKHItem[] = [];

      if (editingId) {
        updatedList = data.map(item => 
          item.id === editingId ? { ...item, ...formData } : item
        );
      } else {
        const newItem: LCKHItem = {
          id: `lckh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...formData,
          created_at: new Date().toISOString()
        };
        updatedList = [newItem, ...data];
      }

      // 1. Save to Supabase
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: storageKey,
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Supabase save notice:', error);
      }

      // 2. Also save to fallback key
      await supabase
        .from('site_settings')
        .upsert({
          id: 'lckh_guru_list',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      // 3. Save to localStorage
      try {
        localStorage.setItem(scopedLocalKey, JSON.stringify(updatedList));
        localStorage.setItem('siakad_lckh_guru_list', JSON.stringify(updatedList));
      } catch (e) {
        void e;
      }

      setData(updatedList);
      setDialogOpen(false);
      setEditingId(null);
      resetForm();
      showSuccess(editingId ? 'Laporan LCKH berhasil diperbarui!' : 'Laporan LCKH berhasil ditambahkan!');
    } catch (error) {
      console.error('Error saving LCKH:', error);
      showError('Gagal menyimpan laporan LCKH');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      nama_guru: teachersList.length > 0 ? teachersList[0].nama : '',
      nip: teachersList.length > 0 ? teachersList[0].nip : '',
      jenis_kegiatan: 'Intrakurikuler (KBM)',
      tempat_kegiatan: 'Ruang Kelas',
      volume: '2 JP',
      kegiatan: '',
      hasil_capaian: '',
      keterangan: 'Terlaksana dengan baik',
      foto_url: ''
    });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: LCKHItem) => {
    setEditingId(item.id);
    setFormData({
      tanggal: item.tanggal,
      nama_guru: item.nama_guru,
      nip: item.nip,
      jenis_kegiatan: item.jenis_kegiatan || 'Intrakurikuler (KBM)',
      tempat_kegiatan: item.tempat_kegiatan || 'Ruang Kelas',
      volume: item.volume || '2 JP',
      kegiatan: item.kegiatan,
      hasil_capaian: item.hasil_capaian,
      keterangan: item.keterangan || 'Terlaksana dengan baik',
      foto_url: item.foto_url || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus catatan LCKH ini?')) return;

    try {
      const storageKey = getScopedKey('lckh_guru_list');
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;
      const updatedList = data.filter(item => item.id !== id);

      await supabase.from('site_settings').upsert({
        id: storageKey,
        value: updatedList,
        updated_at: new Date().toISOString()
      });

      await supabase.from('site_settings').upsert({
        id: 'lckh_guru_list',
        value: updatedList,
        updated_at: new Date().toISOString()
      });

      try {
        localStorage.setItem(scopedLocalKey, JSON.stringify(updatedList));
        localStorage.setItem('siakad_lckh_guru_list', JSON.stringify(updatedList));
      } catch (e) {
        void e;
      }

      setData(updatedList);
      showSuccess('Data LCKH berhasil dihapus!');
    } catch (error) {
      console.error('Error deleting LCKH:', error);
      showError('Gagal menghapus data LCKH');
    }
  };

  // ==========================================
  // 3. FILTERING & STATISTICS
  // ==========================================
  const distinctTeachers = useMemo(() => {
    const setNames = new Set<string>();
    data.forEach(item => {
      if (item.nama_guru) setNames.add(item.nama_guru);
    });
    teachersList.forEach(t => {
      if (t.nama) setNames.add(t.nama);
    });
    return Array.from(setNames).sort();
  }, [data, teachersList]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    years.add(currentYear - 1);
    data.forEach(item => {
      const y = new Date(item.tanggal).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [data, currentYear]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const itemDate = new Date(item.tanggal);
      const itemMonth = itemDate.getMonth() + 1;
      const itemYear = itemDate.getFullYear();

      // Month filter
      if (selectedMonth !== 'all' && itemMonth !== parseInt(selectedMonth)) {
        return false;
      }

      // Year filter
      if (selectedYear !== 'all' && itemYear !== parseInt(selectedYear)) {
        return false;
      }

      // Teacher filter
      if (selectedTeacherFilter !== 'all' && item.nama_guru !== selectedTeacherFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.nama_guru?.toLowerCase().includes(q);
        const matchNip = item.nip?.toLowerCase().includes(q);
        const matchKegiatan = item.kegiatan?.toLowerCase().includes(q);
        const matchHasil = item.hasil_capaian?.toLowerCase().includes(q);
        const matchTempat = item.tempat_kegiatan?.toLowerCase().includes(q);
        const matchJenis = item.jenis_kegiatan?.toLowerCase().includes(q);
        return matchName || matchNip || matchKegiatan || matchHasil || matchTempat || matchJenis;
      }

      return true;
    });
  }, [data, selectedMonth, selectedYear, selectedTeacherFilter, searchQuery]);

  // Teacher Info for Selected Monthly Report (computed from filteredData / filter)
  const reportTeacherInfo = useMemo(() => {
    if (selectedTeacherFilter !== 'all') {
      const prof = resolveTeacherProfile(selectedTeacherFilter);
      return prof;
    }
    if (filteredData.length > 0) {
      const firstGuru = filteredData[0].nama_guru;
      const allSame = filteredData.every(i => i.nama_guru === firstGuru);
      if (allSame) {
        return resolveTeacherProfile(firstGuru, filteredData[0].nip);
      }
    }
    return {
      id: 'all',
      nama: 'Semua Guru / Pendidik Madrasah',
      nip: '-',
      jabatan: 'Dewan Guru & Tenaga Kependidikan',
      tanda_tangan_url: null
    };
  }, [selectedTeacherFilter, filteredData, resolveTeacherProfile]);

  // Monthly Report Data (Chronologically ascending with optional automatic Holiday/Sunday rows)
  const monthlyReportData = useMemo(() => {
    const rawSorted = [...filteredData].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    // If specific month and year are selected, and includeHolidayRows is true:
    if (includeHolidayRows && selectedMonth !== 'all' && selectedYear !== 'all') {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      if (!isNaN(year) && !isNaN(month)) {
        const totalDays = new Date(year, month, 0).getDate();
        const existingDates = new Set(rawSorted.map(i => i.tanggal));
        const injectedHolidays: LCKHItem[] = [];

        for (let d = 1; d <= totalDays; d++) {
          const dayStr = String(d).padStart(2, '0');
          const monthStr = String(month).padStart(2, '0');
          const fullDate = `${year}-${monthStr}-${dayStr}`;

          if (!existingDates.has(fullDate)) {
            const holidayInfo = getHolidayInfo(fullDate, calendarEvents);
            // Injeksi semua hari libur (Hari Minggu, Libur Nasional, Libur Kalender Pendidikan) jika belum ada jurnal mandiri
            if (holidayInfo.isRedDate) {
              const defaultName = distinctTeachers.length > 0 ? distinctTeachers[0] : defaultTeacherName;
              const kegiatanName = holidayInfo.holidayName || (holidayInfo.holidayType === 'sunday' ? 'Hari Libur Mingguan (Minggu)' : 'Hari Libur');
              injectedHolidays.push({
                id: `holiday_${fullDate}`,
                tanggal: fullDate,
                nama_guru: reportTeacherInfo.nama !== 'Semua Guru / Pendidik Madrasah' ? reportTeacherInfo.nama : defaultName,
                nip: reportTeacherInfo.nip !== '-' ? reportTeacherInfo.nip : defaultNip,
                jenis_kegiatan: 'Hari Libur Resmi',
                tempat_kegiatan: '-',
                volume: '-',
                kegiatan: kegiatanName,
                hasil_capaian: holidayInfo.description || 'Libur resmi sesuai kalender pendidikan & ketetapan nasional',
                keterangan: 'Libur',
                created_at: fullDate,
              });
            }
          }
        }

        return [...rawSorted, ...injectedHolidays].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
      }
    }

    return rawSorted;
  }, [filteredData, includeHolidayRows, selectedMonth, selectedYear, calendarEvents, reportTeacherInfo, distinctTeachers, defaultTeacherName, defaultNip]);

  // Count red dates in current selected month
  const monthlyHolidayCount = useMemo(() => {
    if (selectedMonth === 'all' || selectedYear === 'all') return 0;
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    if (isNaN(year) || isNaN(month)) return 0;
    const totalDays = new Date(year, month, 0).getDate();
    let count = 0;
    for (let d = 1; d <= totalDays; d++) {
      const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (getHolidayInfo(fullDate, calendarEvents).isRedDate) count++;
    }
    return count;
  }, [selectedMonth, selectedYear, calendarEvents]);

  // Monthly Report Photo Gallery
  const monthlyPhotos = useMemo(() => {
    return monthlyReportData.filter(item => item.foto_url && item.foto_url.trim() !== '');
  }, [monthlyReportData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // ==========================================
  // 4. ROBUST PRINT ENGINE (DIRECT & NEW TAB)
  // ==========================================
  const handleDirectPrint = async () => {
    try {
      const printContainer = document.getElementById('print-area-lckh-bulanan') || document.getElementById('print-area-lckh');
      if (printContainer) {
        const imgs = Array.from(printContainer.querySelectorAll('img'));
        await Promise.all(imgs.map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 800);
          });
        }));
      }
      setTimeout(() => {
        window.focus();
        window.print();
      }, 100);
    } catch (e) {
      console.warn('Direct print failed, attempting popup print:', e);
      handlePrintNewWindow();
    }
  };

  const handlePrintNewWindow = (elementIdOverride?: string, customTitle?: string) => {
    const targetId = elementIdOverride || (previewItem ? 'print-area-lckh' : 'print-area-lckh-bulanan');
    const elem = document.getElementById(targetId);
    if (!elem) {
      showError('Elemen cetak tidak ditemukan!');
      return;
    }

    const docTitle = customTitle || (previewItem 
      ? `LCKH_${previewItem.nama_guru}_${previewItem.tanggal}`
      : `LCKH_Bulanan_${selectedMonth}_${selectedYear}`
    );

    const printWin = window.open('', '_blank', 'width=950,height=800');
    if (!printWin) {
      showError('Popup jendela cetak diblokir oleh browser. Harap izinkan popup atau gunakan tombol Cetak Langsung.');
      return;
    }

    const isMonthly = targetId === 'print-area-lckh-bulanan';
    const effectiveOrientation = isMonthly ? printOrientation : 'portrait';
    const paperSize = printConfig.paper_size === 'F4' ? '215mm 330mm' : '210mm 297mm';

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${docTitle}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page {
            size: ${paperSize} ${effectiveOrientation};
            margin: 0 !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border-color: #000000 !important;
          }
          .no-print {
            display: block;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 0 !important;
            }
          }
          .page-break-after {
            page-break-after: always;
            break-after: page;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        </style>
      </head>
      <body class="bg-gray-100 p-4">
        <!-- Floating Printable Control Header (Screen Only) -->
        <div class="no-print max-w-4xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-md flex justify-between items-center border border-gray-200">
          <div>
            <h1 class="text-sm font-bold text-gray-800">${docTitle}</h1>
            <p class="text-xs text-gray-500">Pratinjau Dokumen Siap Cetak (A4 / F4)</p>
          </div>
          <div class="flex gap-2">
            <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg border">
              Tutup
            </button>
            <button onclick="window.print()" class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow flex items-center gap-1.5">
              🖨️ Cetak / Simpan PDF
            </button>
          </div>
        </div>

        <div class="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none print:m-0 print:p-0">
          ${elem.innerHTML}
        </div>

        <script>
          // Automatically focus and prompt print after assets load
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.focus();
            }, 300);
          });
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // ==========================================
  // 5. EXPORT TO EXCEL
  // ==========================================
  const handleExportExcel = () => {
    if (monthlyReportData.length === 0) {
      showError('Tidak ada data LCKH pada periode ini untuk diekspor!');
      return;
    }

    const monthLabel = selectedMonth !== 'all' ? BULAN_NAMES[parseInt(selectedMonth) - 1] : 'SemuaBulan';
    const yearLabel = selectedYear !== 'all' ? selectedYear : currentYear;
    const teacherLabel = selectedTeacherFilter !== 'all' ? selectedTeacherFilter.replace(/\s+/g, '_') : 'SemuaGuru';

    const worksheetData = [
      ['LAPORAN CAPAIAN KINERJA BULANAN GURU (LCKH BULANAN)'],
      [`Satuan Kerja: ${activeMadrasah?.nama_madrasah || settings.general?.school_name || 'Madrasah'}`],
      [`Periode: ${monthLabel} ${yearLabel}`],
      [`Nama Guru: ${reportTeacherInfo.nama} (NIP: ${reportTeacherInfo.nip})`],
      [`Jabatan / Tugas: ${reportTeacherInfo.jabatan}`],
      [],
      [
        'No',
        'Tanggal',
        'Nama Guru',
        'NIP / NPK',
        'Jenis Kegiatan',
        'Tempat Kegiatan',
        'Volume / Beban',
        'Uraian / Deskripsi Kegiatan',
        'Hasil / Capaian Kinerja',
        'Keterangan'
      ],
      ...monthlyReportData.map((item, index) => {
        const holidayInfo = getHolidayInfo(item.tanggal, calendarEvents);
        const desc = holidayInfo.isRedDate && !item.kegiatan.toLowerCase().includes('libur')
          ? `${item.kegiatan} (Bertepatan Libur: ${holidayInfo.holidayName})`
          : item.kegiatan;
        const ket = holidayInfo.isRedDate
          ? `${item.keterangan || 'Libur'} (Tgl Merah: ${holidayInfo.holidayName})`
          : (item.keterangan || 'Terlaksana');

        return [
          index + 1,
          item.tanggal,
          item.nama_guru,
          item.nip,
          item.jenis_kegiatan,
          item.tempat_kegiatan,
          item.volume,
          desc,
          item.hasil_capaian,
          ket
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LCKH Bulanan');
    XLSX.writeFile(wb, `LCKH_${teacherLabel}_${monthLabel}_${yearLabel}.xlsx`);
    showSuccess('File Excel LCKH berhasil diunduh!');
  };

  // Resolve active teacher signature for Single Item Preview
  const previewTeacherProfile = useMemo(() => {
    if (!previewItem) return null;
    return resolveTeacherProfile(previewItem.nama_guru, previewItem.nip);
  }, [previewItem, resolveTeacherProfile]);

  // ==========================================
  // VIEW: SINGLE ITEM PRINT PREVIEW (HARIAN)
  // ==========================================
  if (previewItem && previewTeacherProfile) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b px-3 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between print:hidden shadow-sm gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPreviewItem(null)} 
              className="h-8 px-2.5 sm:px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-slate-300 rounded-lg shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali
            </Button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2 py-0.5 text-[11px] truncate hidden sm:inline-flex">
              LCKH Harian: {previewItem.nama_guru}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button 
              size="sm"
              onClick={() => handlePrintNewWindow('print-area-lckh', `LCKH_${previewItem.nama_guru}_${previewItem.tanggal}`)} 
              variant="outline" 
              className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs h-8 px-2.5 sm:px-3 rounded-lg hidden sm:flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Tab Baru
            </Button>
            <Button 
              size="sm"
              onClick={handleDirectPrint} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-3 sm:px-4 shadow-sm text-xs rounded-lg flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Lembar Harian
            </Button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto print:p-0 print:overflow-visible">
          <div id="print-area-lckh" className="mx-auto print:w-full">
            <div 
              className="bg-white mx-auto shadow-xl print:shadow-none print:m-0 print:p-0 print:w-full flex flex-col font-sans"
              style={{ 
                width: '210mm', 
                minHeight: printConfig.paper_size === 'F4' ? '330mm' : '297mm',
                padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {printConfig.show_kop && <KopSurat />}
              
              <div className="text-center mb-5 mt-2">
                <h2 className="text-lg font-bold underline uppercase tracking-wide">LAPORAN CAPAIAN KINERJA HARIAN (LCKH)</h2>
                <p className="text-xs sm:text-sm mt-1 text-slate-800">Hari / Tanggal: <span className="font-semibold">{formatDate(previewItem.tanggal)}</span></p>
              </div>

              {/* Identitas Guru & Format LCKH */}
              <div className="mb-5">
                <table className="w-full border-collapse border border-black text-xs">
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 w-1/4 bg-gray-50 font-bold">Nama Guru</td>
                      <td className="border border-black p-2 font-semibold">{previewTeacherProfile.nama}</td>
                      <td className="border border-black p-2 w-1/4 bg-gray-50 font-bold">NIP / NPK</td>
                      <td className="border border-black p-2">{previewTeacherProfile.nip}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 bg-gray-50 font-bold">Jenis Kegiatan</td>
                      <td className="border border-black p-2">{previewItem.jenis_kegiatan}</td>
                      <td className="border border-black p-2 bg-gray-50 font-bold">Tempat Kegiatan</td>
                      <td className="border border-black p-2">{previewItem.tempat_kegiatan || 'Ruang Kelas'}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 bg-gray-50 font-bold">Volume / Beban</td>
                      <td className="border border-black p-2 font-medium">{previewItem.volume || '1 Kegiatan'}</td>
                      <td className="border border-black p-2 bg-gray-50 font-bold">Jabatan / Kelas</td>
                      <td className="border border-black p-2">{previewTeacherProfile.jabatan}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Rincian Kegiatan */}
              <div className="mb-5 flex-1">
                <table className="w-full border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-center">
                      <th className="border border-black p-2.5 w-10">No</th>
                      <th className="border border-black p-2.5 w-1/2">Uraian / Deskripsi Kegiatan</th>
                      <th className="border border-black p-2.5">Hasil / Capaian Kinerja</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-3 text-center align-top font-bold">1</td>
                      <td className="border border-black p-3 align-top whitespace-pre-wrap leading-relaxed" style={{ fontSize: `${printConfig.font_size}pt` }}>
                        {previewItem.kegiatan}
                      </td>
                      <td className="border border-black p-3 align-top whitespace-pre-wrap leading-relaxed" style={{ fontSize: `${printConfig.font_size}pt` }}>
                        {previewItem.hasil_capaian}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Status Keterangan */}
                <div className="mt-3 text-xs flex items-center justify-between p-2 bg-gray-50 border border-black rounded-sm">
                  <span className="font-bold">Status Pelaksanaan Kegiatan:</span>
                  <span className="font-semibold text-emerald-800">{previewItem.keterangan || 'Terlaksana dengan baik'}</span>
                </div>

                {/* Dokumentasi Foto Lampiran */}
                <div className="mt-5 page-break-inside-avoid">
                  <p className="font-bold text-xs mb-2">Lampiran Dokumentasi Foto Kegiatan:</p>
                  {previewItem.foto_url ? (
                    <div className="border border-black p-3 inline-block rounded bg-white max-w-md">
                      <img 
                        src={previewItem.foto_url} 
                        alt="Dokumentasi LCKH" 
                        className="max-w-full max-h-[280px] object-contain rounded border border-gray-200" 
                      />
                      <div className="mt-2 text-[10px] text-gray-600">
                        <span className="font-semibold">Foto:</span> {previewItem.jenis_kegiatan} ({formatShortDate(previewItem.tanggal)})
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs italic">
                      Dokumentasi foto tidak dilampirkan
                    </div>
                  )}
                </div>
              </div>

              {/* Tanda Tangan Resmi Sesuai Data Guru & Rombel */}
              {printConfig.show_signature && (
                <div className="mt-6 page-break-inside-avoid">
                  <PenandatanganDokumen 
                    tanggalCetak={previewItem.tanggal}
                    customGuru={{
                      nama: previewTeacherProfile.nama,
                      nip: previewTeacherProfile.nip,
                      jabatan: previewTeacherProfile.jabatan,
                      kelas: previewTeacherProfile.kelas,
                      tanda_tangan_url: previewTeacherProfile.tanda_tangan_url
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              size: ${printConfig.paper_size === 'F4' ? '215mm 330mm' : 'A4'} portrait; 
              margin: 0 !important; 
            }
            html, body { 
              height: auto !important; 
              background: white !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden, nav, header, aside { display: none !important; }
            #print-area-lckh { 
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important; 
              margin: 0 !important; 
              padding: 0 !important; 
            }
            #print-area-lckh > div { 
              box-shadow: none !important; 
              border: none !important; 
              width: 100% !important; 
              min-height: 0 !important;
              padding: ${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm !important;
            }
            .page-break-inside-avoid {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        ` }} />
      </div>
    );
  }

  // ==========================================
  // VIEW: MONTHLY PRINT PREVIEW (CETAK BULANAN)
  // ==========================================
  if (showMonthlyPreview) {
    const monthTitle = selectedMonth !== 'all' ? BULAN_NAMES[parseInt(selectedMonth) - 1].toUpperCase() : 'SEMUA BULAN';
    const yearTitle = selectedYear !== 'all' ? selectedYear : currentYear;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        {/* Streamlined Top Control Bar */}
        <div className="sticky top-0 z-[100] bg-white border-b px-2.5 py-2 sm:px-4 sm:py-2.5 print:hidden shadow-sm space-y-1.5">
          {/* Row 1: Nav & Main Action */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMonthlyPreview(false)} 
                className="h-8 px-2 sm:px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-slate-300 rounded-lg shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali
              </Button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                <span className="text-[11px] text-slate-500 hidden sm:inline">Periode:</span>
                <span className="text-emerald-700 text-xs">{monthTitle} {yearTitle}</span>
              </div>
              {selectedTeacherFilter !== 'all' && (
                <Badge variant="outline" className="border-slate-300 text-slate-700 text-[11px] font-semibold truncate hidden md:inline-flex max-w-[180px]">
                  {reportTeacherInfo.nama}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button 
                onClick={handleExportExcel} 
                variant="outline" 
                size="sm"
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs rounded-lg h-8 px-2.5 sm:px-3"
                title="Unduh format spreadsheet Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:mr-1 text-emerald-600" />
                <span className="hidden sm:inline">Excel</span>
              </Button>

              <Button 
                onClick={() => handlePrintNewWindow('print-area-lckh-bulanan', `LCKH_Bulanan_${reportTeacherInfo.nama.replace(/\s+/g, '_')}_${monthTitle}_${yearTitle}`)} 
                variant="outline" 
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-lg h-8 px-2.5 sm:px-3 hidden sm:flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Tab Baru
              </Button>

              <Button 
                onClick={handleDirectPrint} 
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-3 sm:px-4 shadow-sm text-xs rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> 
                <span>Cetak Laporan</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Secondary Quick Toggles (Inline & Compact) */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto no-scrollbar pb-0.5 pt-0.5">
            {/* Orientasi Cetak */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                  printOrientation === 'landscape'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Landscape (Hemat halaman)"
              >
                Landscape
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                  printOrientation === 'portrait'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Portrait"
              >
                Portrait
              </button>
            </div>

            {/* Kerapatan Tabel */}
            <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px] shrink-0">
              <span className="text-slate-500 font-semibold hidden sm:inline">Kerapatan:</span>
              <select
                value={tableDensity}
                onChange={(e) => setTableDensity(e.target.value as any)}
                className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer py-0.5"
              >
                <option value="super-compact">Super Hemat (7.5pt)</option>
                <option value="compact">Ringkas (8.5pt)</option>
                <option value="standard">Standar (9.5pt)</option>
              </select>
            </div>

            {/* Toggle Lampiran Foto */}
            <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] shrink-0">
              <label htmlFor="photo-toggle-admin" className="font-bold text-slate-700 cursor-pointer">
                Foto ({monthlyPhotos.length})
              </label>
              <Switch 
                id="photo-toggle-admin" 
                checked={includePhotosInMonthly} 
                onCheckedChange={setIncludePhotosInMonthly} 
                className="scale-75 origin-right"
              />
            </div>

            {/* Toggle Hari Libur / Tanggal Merah */}
            <div className="inline-flex items-center gap-1.5 bg-red-50/80 px-2.5 py-0.5 rounded-lg border border-red-200 text-[11px] shrink-0">
              <label htmlFor="holiday-toggle-admin" className="font-bold text-red-800 cursor-pointer flex items-center gap-1">
                <span>🔴</span> Libur ({monthlyHolidayCount})
              </label>
              <Switch 
                id="holiday-toggle-admin" 
                checked={includeHolidayRows} 
                onCheckedChange={setIncludeHolidayRows} 
                className="scale-75 origin-right data-[state=checked]:bg-red-600"
              />
            </div>
          </div>
        </div>

        {/* Printable Paper Container */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible print:m-0">
          <div id="print-area-lckh-bulanan" className="mx-auto print:w-full print:m-0 print:p-0">
            <div 
              className="bg-white mx-auto shadow-xl print:shadow-none print:m-0 print:p-0 print:w-full flex flex-col text-black font-sans"
              style={{ 
                width: printOrientation === 'landscape' 
                  ? (printConfig.paper_size === 'F4' ? '330mm' : '297mm')
                  : '210mm', 
                minHeight: printOrientation === 'landscape'
                  ? (printConfig.paper_size === 'F4' ? '215mm' : '210mm')
                  : (printConfig.paper_size === 'F4' ? '330mm' : '297mm'),
                padding: `${printConfig.margin_top || 1.2}cm ${printConfig.margin_right || 1.2}cm ${printConfig.margin_bottom || 1.2}cm ${printConfig.margin_left || 1.2}cm`,
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {printConfig.show_kop && <KopSurat />}
              
              <div className="text-center mb-4 mt-2">
                <h2 className="text-base sm:text-lg font-bold underline uppercase tracking-wider">
                  LAPORAN CAPAIAN KINERJA BULANAN GURU (LCKH BULANAN)
                </h2>
                <p className="text-xs sm:text-sm font-semibold uppercase mt-1 text-slate-800">
                  BULAN: {monthTitle} TAHUN {yearTitle}
                </p>
              </div>

              {/* Data Header Guru & Madrasah */}
              <div className="mb-3 text-xs">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 p-2.5 border border-black bg-slate-50/50 rounded-sm">
                  <div className="flex">
                    <span className="w-32 font-bold">Nama Guru</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="font-semibold flex-1">{reportTeacherInfo.nama}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">Satuan Kerja</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="flex-1">{activeMadrasah?.nama_madrasah || settings.general?.school_name || 'Madrasah Ibtidaiyah'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">NIP / NPK</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="flex-1">{reportTeacherInfo.nip}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">Bulan / Periode</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="font-semibold flex-1">{monthTitle} {yearTitle}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">Jabatan / Tugas</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="flex-1">{reportTeacherInfo.jabatan}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">Total Kegiatan</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="font-bold text-emerald-800 flex-1">{monthlyReportData.length} Baris Agenda / Hari</span>
                  </div>
                </div>
              </div>

              {/* Tabel Rekapitulasi LCKH Bulanan */}
              <div className="mb-4 print:mb-2 print:block">
                {monthlyReportData.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-gray-300 rounded text-gray-500 text-xs italic">
                    Belum ada data Laporan Kinerja Harian pada bulan {monthTitle} {yearTitle} untuk guru yang dipilih.
                  </div>
                ) : (
                  <table 
                    className={`w-full border-collapse border border-black table-fixed ${
                      tableDensity === 'super-compact' 
                        ? 'text-[7.5pt]' 
                        : tableDensity === 'compact' 
                        ? 'text-[8pt]' 
                        : 'text-[8.5pt]'
                    }`}
                  >
                    <thead className="print:table-header-group">
                      <tr className="bg-gray-100 text-center font-bold">
                        <th style={{ width: '4%' }} className="border border-black p-1 text-center">No</th>
                        <th style={{ width: '14%' }} className="border border-black p-1 text-center">Hari / Tanggal</th>
                        <th style={{ width: '34%' }} className="border border-black p-1 text-center">Uraian Kegiatan</th>
                        <th style={{ width: '13%' }} className="border border-black p-1 text-center">Jenis Kegiatan</th>
                        <th style={{ width: '8%' }} className="border border-black p-1 text-center">Tempat</th>
                        <th style={{ width: '5%' }} className="border border-black p-1 text-center">Vol</th>
                        <th style={{ width: '16%' }} className="border border-black p-1 text-center">Hasil / Capaian</th>
                        <th style={{ width: '6%' }} className="border border-black p-1 text-center">Ket.</th>
                      </tr>
                    </thead>
                    <tbody className="print:table-row-group">
                      {monthlyReportData.map((item, index) => {
                        const dateFormatted = formatDate(item.tanggal);
                        const cellPadding = tableDensity === 'super-compact' ? 'py-0.5 px-1' : tableDensity === 'compact' ? 'py-1 px-1.5' : 'py-1 px-2';
                        const holidayInfo = getHolidayInfo(item.tanggal, calendarEvents);

                        return (
                          <tr 
                            key={item.id} 
                            className={`align-top page-break-inside-avoid ${
                              holidayInfo.isRedDate 
                                ? 'bg-red-50/70 print:bg-red-50/40 text-red-950 font-medium' 
                                : ''
                            }`}
                          >
                            <td className={`border border-black ${cellPadding} text-center font-semibold ${holidayInfo.isRedDate ? 'text-red-700 bg-red-100/40' : ''}`}>
                              {index + 1}
                            </td>
                            <td className={`border border-black ${cellPadding} text-center ${holidayInfo.isRedDate ? 'bg-red-100/50' : ''}`}>
                              <div className={`font-bold text-[7.5pt] leading-tight ${holidayInfo.isRedDate ? 'text-red-700' : 'text-slate-900'}`}>
                                {dateFormatted}
                              </div>
                            </td>
                            <td className={`border border-black ${cellPadding} whitespace-pre-line leading-tight text-justify`}>
                              <span className={holidayInfo.isRedDate && item.id.startsWith('holiday_') ? 'text-red-900 font-bold' : ''}>
                                {item.kegiatan}
                              </span>
                            </td>
                            <td className={`border border-black ${cellPadding} text-center leading-tight`}>
                              {holidayInfo.isRedDate && item.id.startsWith('holiday_') ? (
                                <span className="text-red-700 font-bold text-[7.5pt]">Libur Resmi</span>
                              ) : (
                                item.jenis_kegiatan
                              )}
                            </td>
                            <td className={`border border-black ${cellPadding} text-center leading-tight`}>
                              {item.tempat_kegiatan || 'Kelas'}
                            </td>
                            <td className={`border border-black ${cellPadding} text-center font-medium`}>
                              {item.volume || '1'}
                            </td>
                            <td className={`border border-black ${cellPadding} whitespace-pre-line leading-tight text-justify`}>
                              <span className={holidayInfo.isRedDate && item.id.startsWith('holiday_') ? 'text-red-700 italic' : ''}>
                                {item.hasil_capaian}
                              </span>
                            </td>
                            <td className={`border border-black ${cellPadding} text-center font-semibold`}>
                              {holidayInfo.isRedDate ? (
                                <div className="text-red-700 font-bold text-[7.5pt]">
                                  {item.keterangan || 'Libur'}
                                </div>
                              ) : (
                                item.keterangan || 'Terlaksana'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Tanda Tangan Khusus LCKH Bulanan */}
              {printConfig.show_signature && (
                <div className="mt-6 pt-2 page-break-inside-avoid">
                  <PenandatanganDokumen 
                    tanggalCetak={customTanggalCetak}
                    customGuru={{
                      nama: reportTeacherInfo.nama !== 'Semua Guru / Pendidik Madrasah' ? reportTeacherInfo.nama : undefined,
                      nip: reportTeacherInfo.nip !== '-' ? reportTeacherInfo.nip : undefined,
                      jabatan: reportTeacherInfo.jabatan,
                      kelas: reportTeacherInfo.kelas,
                      tanda_tangan_url: reportTeacherInfo.tanda_tangan_url
                    }}
                  />
                </div>
              )}

              {/* ========================================== */}
              {/* LAMPIRAN DOKUMENTASI FOTO KEGIATAN BULANAN */}
              {/* ========================================== */}
              {includePhotosInMonthly && monthlyPhotos.length > 0 && (
                <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 page-break-before">
                  <div className="text-center mb-4">
                    <h3 className="text-base font-bold underline uppercase tracking-wide">
                      LAMPIRAN DOKUMENTASI FOTO KEGIATAN BULANAN
                    </h3>
                    <p className="text-xs font-semibold text-slate-700 uppercase mt-1">
                      BULAN {monthTitle} TAHUN {yearTitle} — {reportTeacherInfo.nama}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 photo-grid-print">
                    {monthlyPhotos.map((photoItem, pIdx) => {
                      const imgUrl = formatImageUrl(photoItem.foto_url);
                      return (
                        <div 
                          key={photoItem.id || pIdx} 
                          className="border border-black rounded p-2 bg-white page-break-inside-avoid flex flex-col justify-between text-xs photo-card-print"
                        >
                          <div className="w-full h-36 bg-slate-50 border border-gray-200 rounded overflow-hidden mb-1.5 flex items-center justify-center">
                            {imgUrl ? (
                              <img 
                                src={imgUrl} 
                                alt={`Dokumentasi ${photoItem.kegiatan}`} 
                                className="w-full h-full object-contain"
                                loading="eager"
                                decoding="sync"
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="text-[9px] text-gray-400 italic text-center p-2">
                                Foto tidak tersedia
                              </div>
                            )}
                          </div>
                          <div className="text-[8pt] space-y-0.5 text-slate-800">
                            <div className="flex justify-between items-center border-b pb-0.5 font-bold">
                              <span>{formatShortDate(photoItem.tanggal)}</span>
                              <span className="text-[7pt] text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 truncate max-w-[110px]">
                                {photoItem.jenis_kegiatan}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900 leading-snug line-clamp-2">
                              {photoItem.kegiatan}
                            </p>
                            <p className="text-[7.5pt] text-slate-500 italic line-clamp-1">
                              Capaian: {photoItem.hasil_capaian}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              size: ${printConfig.paper_size === 'F4' ? '215mm 330mm' : 'A4'} ${printOrientation}; 
              margin: 8mm 10mm 10mm 10mm !important; 
            }
            html, body { 
              height: auto !important; 
              min-height: 0 !important;
              background: #ffffff !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden, nav, header, aside, .sticky, [class*="print:hidden"] { 
              display: none !important; 
            }

            /* Decouple print area from flex and scroll containers */
            body > div, #root, main, .min-h-screen, .flex-1, .overflow-y-auto {
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
              min-height: 0 !important;
              display: block !important;
              position: static !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            #print-area-lckh-bulanan { 
              position: static !important;
              width: 100% !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              display: block !important;
              overflow: visible !important;
            }
            #print-area-lckh-bulanan > div { 
              box-shadow: none !important; 
              border: none !important; 
              width: 100% !important; 
              max-width: 100% !important;
              min-height: 0 !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
              margin-bottom: 3mm !important;
            }
            thead {
              display: table-header-group !important;
            }
            thead tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            tbody {
              display: table-row-group !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            td, th {
              word-break: break-word !important;
              padding: 2.5px 3.5px !important;
              font-size: 7.5pt !important;
              line-height: 1.25 !important;
            }

            /* Photos in Print */
            .photo-grid-print {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 8px !important;
              justify-content: flex-start !important;
            }
            .photo-card-print {
              width: 31% !important;
              min-width: 180px !important;
              margin-bottom: 8px !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              display: flex !important;
              flex-direction: column !important;
              background-color: #ffffff !important;
              border: 1px solid #000000 !important;
              border-radius: 4px !important;
              padding: 6px !important;
              box-sizing: border-box !important;
            }
            .photo-card-print img {
              display: block !important;
              width: 100% !important;
              height: 130px !important;
              object-fit: contain !important;
              background-color: #f8fafc !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .page-break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .page-break-before {
              page-break-before: always !important;
              break-before: page !important;
            }
            .page-break-after {
              page-break-after: always !important;
              break-after: page !important;
            }
          }
        ` }} />
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN LCKH DASHBOARD & DATA TABLE
  // ==========================================
  return (
    <AdminLayout title="LCKH Guru (Laporan Capaian Kinerja Harian)">
      {/* Top Banner & Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Total Laporan Kinerja</p>
              <h3 className="text-3xl font-extrabold mt-1">{data.length}</h3>
              <p className="text-[11px] text-emerald-100/80 mt-1">Tersimpan dalam database</p>
            </div>
            <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-sm bg-white rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Filter Periode</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                {selectedMonth !== 'all' ? BULAN_NAMES[parseInt(selectedMonth) - 1] : 'Semua'} {selectedYear}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">{filteredData.length} laporan sesuai filter</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-sm bg-white rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pendidik Terdata</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                {teachersList.length > 0 ? teachersList.length : distinctTeachers.length} Guru
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Tersinkronisasi Data Guru & Rombel</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
              <User className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-sm bg-slate-900 text-white rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cetak Bulanan</p>
            <p className="text-xs text-slate-300 mt-1">Rekap otomatis per bulan, guru & foto</p>
          </div>
          <Button 
            onClick={() => setShowMonthlyPreview(true)}
            className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md text-xs"
          >
            <Printer className="w-4 h-4 mr-2" /> Buka Cetak Bulanan
          </Button>
        </Card>
      </div>

      {/* Action Bar: Search, Filters & Buttons */}
      <Card className="border-0 shadow-sm rounded-2xl p-4 mb-6 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Cari kegiatan, guru, NIP..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-9 rounded-xl h-10 text-xs border-slate-200" 
              />
            </div>

            {/* Filter Bulan */}
            <div className="w-36">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="rounded-xl h-10 text-xs border-slate-200">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {BULAN_NAMES.map((m, idx) => (
                    <SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Tahun */}
            <div className="w-28">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="rounded-xl h-10 text-xs border-slate-200">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Guru */}
            <div className="w-52">
              <Select value={selectedTeacherFilter} onValueChange={setSelectedTeacherFilter}>
                <SelectTrigger className="rounded-xl h-10 text-xs border-slate-200">
                  <SelectValue placeholder="Semua Guru" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Guru</SelectItem>
                  {teachersList.map(t => (
                    <SelectItem key={t.id} value={t.nama}>
                      {t.nama} {t.kelas ? `(${t.kelas})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || selectedMonth !== 'all' || selectedYear !== String(currentYear) || selectedTeacherFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMonth(String(currentMonth));
                  setSelectedYear(String(currentYear));
                  setSelectedTeacherFilter('all');
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Reset Filter
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleExportExcel}
              variant="outline"
              className="rounded-xl h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> Excel
            </Button>
            <Button 
              onClick={() => setShowMonthlyPreview(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-bold text-xs shadow-sm"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Cetak Bulanan
            </Button>
            <Button 
              onClick={handleOpenAdd} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-bold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Input LCKH
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] font-bold text-slate-700">Tanggal</TableHead>
                <TableHead className="w-[190px] font-bold text-slate-700">Nama Guru & NIP</TableHead>
                <TableHead className="w-[160px] font-bold text-slate-700">Jenis & Tempat</TableHead>
                <TableHead className="w-[80px] text-center font-bold text-slate-700">Vol</TableHead>
                <TableHead className="font-bold text-slate-700">Uraian & Capaian Kinerja</TableHead>
                <TableHead className="w-[110px] text-center font-bold text-slate-700">Keterangan</TableHead>
                <TableHead className="w-[70px] text-center font-bold text-slate-700">Foto</TableHead>
                <TableHead className="w-[140px] text-center font-bold text-slate-700">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-36 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                    <p className="text-xs text-slate-400 mt-2">Memuat catatan kinerja...</p>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-36 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <ClipboardList className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada catatan LCKH yang sesuai filter</p>
                      <p className="text-xs text-slate-400 mt-1">Klik tombol "Input LCKH" untuk menambahkan laporan kegiatan kinerja harian guru.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const holidayInfo = getHolidayInfo(item.tanggal, calendarEvents);
                  return (
                    <TableRow 
                      key={item.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        holidayInfo.isRedDate ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <TableCell className={`font-medium align-top py-3.5 ${holidayInfo.isRedDate ? 'bg-red-50/60' : ''}`}>
                        <div className={`text-xs font-bold ${holidayInfo.isRedDate ? 'text-red-700' : 'text-slate-900'}`}>
                          {formatShortDate(item.tanggal)}
                        </div>
                        <div className={`text-[10px] ${holidayInfo.isRedDate ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'short' })}
                        </div>
                      </TableCell>

                      <TableCell className="align-top py-3.5">
                        <p className="font-bold text-slate-900 text-xs">{item.nama_guru || '-'}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP: {item.nip || '-'}</p>
                      </TableCell>

                      <TableCell className="align-top py-3.5">
                        <Badge variant="outline" className="text-[9px] bg-emerald-50/80 text-emerald-800 border-emerald-200">
                          {item.jenis_kegiatan}
                        </Badge>
                        <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.tempat_kegiatan || 'Kelas'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center align-top py-3.5">
                        <Badge variant="secondary" className="text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.volume || '1'}
                        </Badge>
                      </TableCell>

                      <TableCell className="align-top py-3.5">
                        <p className="font-semibold text-slate-900 text-xs line-clamp-2">{item.kegiatan}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          <span className="text-emerald-700 font-medium">Hasil:</span> {item.hasil_capaian}
                        </p>
                      </TableCell>

                      <TableCell className="text-center align-top py-3.5">
                        {holidayInfo.isRedDate ? (
                          <div className="text-red-700 font-bold text-[10px] bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                            {item.keterangan || 'Libur'}
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                            {item.keterangan || 'Terlaksana'}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-center align-top py-3.5">
                        {item.foto_url ? (
                          <div 
                            onClick={() => setPreviewItem(item)}
                            className="w-9 h-9 rounded-lg overflow-hidden mx-auto border cursor-pointer hover:opacity-80 transition-opacity border-emerald-300 relative group"
                            title="Klik untuk lihat dan cetak"
                          >
                            <img src={item.foto_url} alt="Dokumentasi" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center align-top py-3.5">
                        <div className="flex justify-center items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setPreviewItem(item)} 
                            className="h-8 px-2 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs"
                            title="Cetak Laporan Harian"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenEdit(item)} 
                            className="h-8 px-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs"
                            title="Edit Laporan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(item.id)} 
                            className="h-8 px-2 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                            title="Hapus Laporan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog Form Input & Edit LCKH */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              {editingId ? 'Edit Laporan Capaian Kinerja Harian' : 'Input Laporan Capaian Kinerja Harian (LCKH)'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Row 1: Guru Selector & NIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Nama Guru / Pendidik</span>
                  <span className="text-[10px] text-emerald-600 font-normal">Sinkron Data Guru & Rombel</span>
                </label>
                {teachersList.length > 0 ? (
                  <div className="space-y-1.5">
                    <Select 
                      value={formData.nama_guru} 
                      onValueChange={handleTeacherSelect}
                    >
                      <SelectTrigger className="rounded-xl h-11 text-xs">
                        <SelectValue placeholder="Pilih Guru dari Data..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {teachersList.map(t => (
                          <SelectItem key={t.id} value={t.nama}>
                            <div className="flex flex-col text-left py-0.5">
                              <span className="font-semibold">{t.nama}</span>
                              <span className="text-[10px] text-slate-500">
                                {t.jabatan} {t.nip && t.nip !== '-' ? `• NIP: ${t.nip}` : ''}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Atau ketik nama guru manual..."
                      value={formData.nama_guru}
                      onChange={(e) => setFormData({ ...formData, nama_guru: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                ) : (
                  <Input 
                    placeholder="Nama Lengkap Guru beserta Gelar..."
                    value={formData.nama_guru}
                    onChange={(e) => setFormData({ ...formData, nama_guru: e.target.value })}
                    className="rounded-xl h-11 text-xs"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">NIP / NPK / NUPTK</label>
                <Input 
                  placeholder="Masukkan NIP / NPK (atau - jika belum ada)"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className="rounded-xl h-11 text-xs font-mono"
                />
              </div>
            </div>

            {/* Row 2: Tanggal & Jenis Kegiatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CalendarHolidayPicker
                label="Tanggal Pelaksanaan"
                required
                value={formData.tanggal}
                onChange={(date) => setFormData({ ...formData, tanggal: date })}
                customEvents={calendarEvents}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Jenis Kegiatan</label>
                <Select 
                  value={formData.jenis_kegiatan} 
                  onValueChange={(v) => setFormData({ ...formData, jenis_kegiatan: v })}
                >
                  <SelectTrigger className="rounded-xl h-11 text-xs">
                    <SelectValue placeholder="Pilih Jenis Kegiatan" />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_KEGIATAN_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Tempat Kegiatan & Volume */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tempat Kegiatan / Lokasi</label>
                <Input 
                  placeholder="e.g. Ruang Kelas 1A, Lab Komputer, Mushola"
                  value={formData.tempat_kegiatan}
                  onChange={(e) => setFormData({ ...formData, tempat_kegiatan: e.target.value })}
                  className="rounded-xl h-11 text-xs"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {TEMPAT_KEGIATAN_PRESETS.slice(0, 5).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setFormData({ ...formData, tempat_kegiatan: p })}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Volume / Satuan Beban</label>
                <Input 
                  placeholder="e.g. 2 JP, 4 JP, 1 Dokumen RPP, 1 Pertemuan"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  className="rounded-xl h-11 text-xs"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {VOLUME_PRESETS.slice(0, 5).map(v => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setFormData({ ...formData, volume: v })}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 4: Uraian Kegiatan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Uraian / Deskripsi Kegiatan</label>
              <Textarea 
                placeholder="Tuliskan rincian kegiatan pembelajaran atau tugas yang dilaksanakan..." 
                value={formData.kegiatan} 
                onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })} 
                className="rounded-xl min-h-[90px] text-xs leading-relaxed" 
              />
            </div>

            {/* Row 5: Hasil / Capaian */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Hasil / Capaian Kinerja</label>
              <Textarea 
                placeholder="Tuliskan hasil/capaian dari kegiatan tersebut (misal: Peserta didik memahami materi surah Al-Fatihah, RPP tersusun, dsb)..." 
                value={formData.hasil_capaian} 
                onChange={(e) => setFormData({ ...formData, hasil_capaian: e.target.value })} 
                className="rounded-xl min-h-[75px] text-xs leading-relaxed" 
              />
            </div>

            {/* Row 6: Keterangan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Keterangan / Catatan Tambahan</label>
              <Input 
                placeholder="e.g. Terlaksana dengan baik, Selesai 100%, dll."
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                className="rounded-xl h-11 text-xs"
              />
            </div>

            {/* Row 7: Lampiran Foto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Lampiran Foto Dokumentasi Kegiatan (Opsional)</span>
                <span className="text-[10px] text-slate-400">Akan diikutsertakan pada cetak harian & bulanan</span>
              </label>
              {formData.foto_url ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-300 group aspect-video max-w-xs bg-slate-100">
                  <img src={formData.foto_url} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, foto_url: '' })} 
                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-700 transition-colors"
                    title="Hapus foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-all">
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <p className="text-xs font-semibold text-gray-600 mt-1">Klik untuk unggah foto dokumentasi</p>
                    <p className="text-[10px] text-gray-400">Kompresi gambar otomatis</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)} 
                className="flex-1 rounded-xl h-11 text-xs font-semibold"
              >
                Batal
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || uploading} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold text-xs shadow-md"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {editingId ? 'Perbarui Laporan' : 'Simpan Laporan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default LCKH;
