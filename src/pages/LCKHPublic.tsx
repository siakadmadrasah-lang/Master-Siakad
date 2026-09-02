"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, Search, Calendar, User, MapPin, 
  Printer, ArrowLeft, Image as ImageIcon, Eye, CheckCircle2,
  Sparkles, Filter, FileSpreadsheet, Layers, ShieldCheck, ChevronRight,
  ExternalLink, Building2, Download, Clock, Camera, FileText,
  Plus, Pencil, Trash2, Save, Upload, X, LogIn, Check, Lock, Home
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import TeacherAuthModal from '@/components/TeacherAuthModal';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import { formatImageUrl, uploadImageToStorage } from '@/utils/imageCompression';
import { showSuccess, showError } from '@/utils/toast';
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

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const JENIS_KEGIATAN_OPTIONS = [
  'Semua Jenis Kegiatan',
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

export const LCKHPublic: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId, getScopedKey } = useMadrasah();
  const { requirePrintAuth } = usePrintSecurity();
  const { currentTeacher, isAuthenticated, openTeacherModal } = useTeacherAuth();

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

  // Filter States
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [selectedJenisKegiatan, setSelectedJenisKegiatan] = useState<string>('Semua Jenis Kegiatan');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMyOnly, setFilterMyOnly] = useState<boolean>(false);

  // Print Mode State
  const [previewSingleItem, setPreviewSingleItem] = useState<LCKHItem | null>(null);
  const [showMonthlyPreview, setShowMonthlyPreview] = useState(false);
  const [includePhotosInMonthly, setIncludePhotosInMonthly] = useState(true);
  const [includeHolidayRows, setIncludeHolidayRows] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [tableDensity, setTableDensity] = useState<'super-compact' | 'compact' | 'standard'>('super-compact');
  const [customTanggalCetak, setCustomTanggalCetak] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  // CRUD Dialog States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const defaultTeacherName = currentTeacher?.nama || activeMadrasah?.nama_pimpinan || 'Guru Madrasah';
  const defaultNip = currentTeacher?.nip || activeMadrasah?.nip_pimpinan || '-';

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nama_guru: defaultTeacherName,
    nip: defaultNip,
    jenis_kegiatan: 'Intrakurikuler (KBM)',
    tempat_kegiatan: 'Ruang Kelas',
    volume: '2 JP',
    kegiatan: '',
    hasil_capaian: '',
    keterangan: 'Terlaksana dengan baik',
    foto_url: ''
  });

  const printConfig = settings.print_settings || {
    margin_top: 2, margin_bottom: 2, margin_left: 2, margin_right: 2,
    paper_size: 'A4', font_size: 10, show_kop: true, show_signature: true
  };

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Fetch Teachers & LCKH Data
  const fetchData = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isInitial && data.length === 0) {
      setLoading(true);
    }
    try {
      // 1. Fetch Teachers
      const teachersKey = getScopedKey('teachers_list');
      const { data: teacherRes } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', [teachersKey, 'teachers_list'])
        .order('id', { ascending: false });

      let listGuru: TeacherProfile[] = [];
      if (teacherRes && teacherRes.length > 0) {
        const found = teacherRes.find(r => r.id === teachersKey) || teacherRes[0];
        if (found?.value && Array.isArray(found.value)) {
          listGuru = found.value.map((g: any) => ({
            id: g.id || String(Math.random()),
            nama: g.nama || g.name || '',
            nip: g.nip || '-',
            jabatan: g.jabatan || g.role || 'Guru Mata Pelajaran',
            kelas: g.kelas || g.rombel || '',
            tanda_tangan_url: g.tanda_tangan_url || null
          }));
        }
      }
      setTeachersList(listGuru);

      // 2. Fetch LCKH Items
      const storageKey = getScopedKey('lckh_guru_list');
      const fallbackKey = 'lckh_guru_list';
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;

      const { data: res } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', [storageKey, fallbackKey, 'lckh_list'])
        .order('id', { ascending: false });

      let loadedItems: LCKHItem[] = [];
      if (res && res.length > 0) {
        const found = res.find(r => r.id === storageKey) || res[0];
        if (found?.value && Array.isArray(found.value)) {
          loadedItems = found.value;
        }
      }

      // Check local cache if empty
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

      // Normalize items
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
      console.error('Error fetching LCKH public data:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [activeMadrasahId, defaultNip, defaultTeacherName, getScopedKey, data.length]);

  useEffect(() => {
    fetchData(true);
    getAcademicCalendarEvents().then(events => {
      if (events && events.length > 0) setCalendarEvents(events);
    });
  }, [activeMadrasahId]);

  // Distinct Teachers
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

  // Available Years
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

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const itemDate = new Date(item.tanggal);
      const itemMonth = itemDate.getMonth() + 1;
      const itemYear = itemDate.getFullYear();

      if (selectedMonth !== 'all' && itemMonth !== parseInt(selectedMonth)) {
        return false;
      }
      if (selectedYear !== 'all' && itemYear !== parseInt(selectedYear)) {
        return false;
      }
      if (selectedTeacherFilter !== 'all' && item.nama_guru !== selectedTeacherFilter) {
        return false;
      }
      if (selectedJenisKegiatan !== 'Semua Jenis Kegiatan' && item.jenis_kegiatan !== selectedJenisKegiatan) {
        return false;
      }
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
    }).filter(item => {
      if (filterMyOnly && currentTeacher?.nama) {
        const myName = currentTeacher.nama.toLowerCase().trim();
        const itemGuru = (item.nama_guru || '').toLowerCase().trim();
        const myNip = currentTeacher.nip && currentTeacher.nip !== '-' ? currentTeacher.nip.trim() : '';
        const itemNip = (item.nip || '').trim();
        return itemGuru.includes(myName) || (myNip && itemNip === myNip);
      }
      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [data, selectedMonth, selectedYear, selectedTeacherFilter, selectedJenisKegiatan, searchQuery, filterMyOnly, currentTeacher]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    if (!isAuthenticated) {
      openTeacherModal();
      return;
    }
    setEditingId(null);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      nama_guru: currentTeacher?.nama || defaultTeacherName,
      nip: currentTeacher?.nip || defaultNip,
      jenis_kegiatan: 'Intrakurikuler (KBM)',
      tempat_kegiatan: currentTeacher?.kelas ? `Ruang Kelas ${currentTeacher.kelas}` : 'Ruang Kelas',
      volume: '2 JP',
      kegiatan: '',
      hasil_capaian: '',
      keterangan: 'Terlaksana dengan baik',
      foto_url: ''
    });
    setCreateModalOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item: LCKHItem) => {
    if (!isAuthenticated) {
      openTeacherModal();
      return;
    }
    setEditingId(item.id);
    setFormData({
      tanggal: item.tanggal || new Date().toISOString().split('T')[0],
      nama_guru: item.nama_guru || currentTeacher?.nama || defaultTeacherName,
      nip: item.nip || currentTeacher?.nip || defaultNip,
      jenis_kegiatan: item.jenis_kegiatan || 'Intrakurikuler (KBM)',
      tempat_kegiatan: item.tempat_kegiatan || 'Ruang Kelas',
      volume: item.volume || '2 JP',
      kegiatan: item.kegiatan || '',
      hasil_capaian: item.hasil_capaian || '',
      keterangan: item.keterangan || 'Terlaksana dengan baik',
      foto_url: item.foto_url || ''
    });
    setCreateModalOpen(true);
  };

  // Image Upload Handler
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

  // Save LCKH
  const handleSaveLCKH = async () => {
    if (!formData.nama_guru.trim()) {
      showError('Nama Pendidik wajib diisi!');
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
      setCreateModalOpen(false);
      setEditingId(null);
      showSuccess(editingId ? 'Catatan LCKH berhasil diperbarui!' : 'Catatan LCKH baru berhasil disimpan!');

      // Trigger custom events so other tabs/components update immediately
      window.dispatchEvent(new CustomEvent('siakad_lckh_updated', { detail: updatedList }));
    } catch (error) {
      console.error('Error saving LCKH:', error);
      showError('Gagal menyimpan LCKH');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete LCKH
  const handleDeleteLCKH = async (id: string, namaGuru: string) => {
    if (!window.confirm(`Yakin ingin menghapus catatan LCKH untuk ${namaGuru}?`)) {
      return;
    }

    try {
      const storageKey = getScopedKey('lckh_guru_list');
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;
      const updatedList = data.filter(item => item.id !== id);

      await supabase
        .from('site_settings')
        .upsert({
          id: storageKey,
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      await supabase
        .from('site_settings')
        .upsert({
          id: 'lckh_guru_list',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      localStorage.setItem(scopedLocalKey, JSON.stringify(updatedList));
      localStorage.setItem('siakad_lckh_guru_list', JSON.stringify(updatedList));

      setData(updatedList);
      showSuccess('Catatan LCKH berhasil dihapus!');
      window.dispatchEvent(new CustomEvent('siakad_lckh_updated', { detail: updatedList }));
    } catch (e) {
      console.error('Error deleting LCKH:', e);
      showError('Gagal menghapus catatan LCKH');
    }
  };

  // Helper to resolve teacher profile
  const resolveTeacherProfile = useCallback((nama: string, nipFallback?: string): TeacherProfile => {
    if (!nama || nama.trim() === '' || nama === 'Semua Guru / Pendidik Madrasah') {
      if (isAuthenticated && currentTeacher?.nama) {
        return {
          id: currentTeacher.id || 'current-teacher',
          nama: currentTeacher.nama,
          nip: currentTeacher.nip || defaultNip,
          jabatan: currentTeacher.jabatan || (currentTeacher.kelas ? `Guru Kelas ${currentTeacher.kelas}` : 'Guru Mata Pelajaran'),
          kelas: currentTeacher.kelas || '',
          tanda_tangan_url: currentTeacher.tanda_tangan_url || null
        };
      }
    }

    if (currentTeacher && currentTeacher.nama && currentTeacher.nama.toLowerCase().trim() === (nama || '').toLowerCase().trim()) {
      return {
        id: currentTeacher.id || 'current-teacher',
        nama: currentTeacher.nama,
        nip: currentTeacher.nip || nipFallback || defaultNip,
        jabatan: currentTeacher.jabatan || (currentTeacher.kelas ? `Guru Kelas ${currentTeacher.kelas}` : 'Guru Mata Pelajaran'),
        kelas: currentTeacher.kelas || '',
        tanda_tangan_url: currentTeacher.tanda_tangan_url || null
      };
    }

    const found = teachersList.find(t => t.nama.toLowerCase().trim() === (nama || '').toLowerCase().trim());
    if (found) return found;
    return {
      id: 'custom',
      nama: nama,
      nip: nipFallback || defaultNip,
      jabatan: 'Guru Mata Pelajaran',
      tanda_tangan_url: null
    };
  }, [teachersList, currentTeacher, isAuthenticated, defaultNip]);

  // Teacher Info for Selected Monthly Report (computed from filteredData / filter)
  const reportTeacherInfo = useMemo(() => {
    if (selectedTeacherFilter !== 'all') {
      return resolveTeacherProfile(selectedTeacherFilter);
    }
    if (isAuthenticated && currentTeacher?.nama) {
      return resolveTeacherProfile(currentTeacher.nama, currentTeacher.nip);
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
  }, [selectedTeacherFilter, isAuthenticated, currentTeacher, filteredData, resolveTeacherProfile]);

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
              const defaultName = currentTeacher?.nama || (distinctTeachers.length > 0 ? distinctTeachers[0] : defaultTeacherName);
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
  }, [filteredData, includeHolidayRows, selectedMonth, selectedYear, calendarEvents, reportTeacherInfo, distinctTeachers, currentTeacher?.nama, defaultTeacherName, defaultNip]);

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

  // Monthly Photos
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

  // Print Handling with Security Verification
  const handlePrint = (titleDescription: string) => {
    requirePrintAuth(async () => {
      // Ensure all images are completely decoded before invoking native print
      const printContainer = document.getElementById('print-area-lckh-bulanan-pub') || document.getElementById('print-area-lckh-single');
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
    }, titleDescription);
  };

  // Export Excel
  const handleExportExcel = () => {
    if (monthlyReportData.length === 0) {
      showError('Tidak ada data untuk diekspor.');
      return;
    }

    const excelRows = monthlyReportData.map((item, index) => {
      const holidayInfo = getHolidayInfo(item.tanggal, calendarEvents);
      const desc = holidayInfo.isRedDate && !item.kegiatan.toLowerCase().includes('libur')
        ? `${item.kegiatan} (Bertepatan Libur: ${holidayInfo.holidayName})`
        : item.kegiatan;
      const ket = holidayInfo.isRedDate
        ? `${item.keterangan || 'Libur'} (Tgl Merah: ${holidayInfo.holidayName})`
        : (item.keterangan || 'Terlaksana');

      return {
        'No': index + 1,
        'Hari/Tanggal': formatDate(item.tanggal),
        'Nama Guru': item.nama_guru,
        'NIP': item.nip,
        'Jenis Kegiatan': item.jenis_kegiatan,
        'Tempat': item.tempat_kegiatan,
        'Volume/Beban': item.volume,
        'Uraian Kegiatan': desc,
        'Hasil / Capaian': item.hasil_capaian,
        'Keterangan': ket,
        'Dokumentasi Foto': item.foto_url ? 'Ada' : 'Tidak Ada'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LCKH_Bulanan');

    const teacherPrefix = selectedTeacherFilter !== 'all' ? selectedTeacherFilter.replace(/\s+/g, '_') : 'Semua_Guru';
    const monthName = selectedMonth !== 'all' ? BULAN_NAMES[parseInt(selectedMonth) - 1] : 'Semua';
    XLSX.writeFile(workbook, `LCKH_${teacherPrefix}_${monthName}_${selectedYear}.xlsx`);
    showSuccess('File Excel LCKH berhasil diunduh!');
  };

  const monthTitle = selectedMonth !== 'all' ? BULAN_NAMES[parseInt(selectedMonth) - 1].toUpperCase() : 'SEMUA BULAN';
  const yearTitle = selectedYear !== 'all' ? selectedYear : 'SEMUA TAHUN';

  // ==========================================
  // 1. SINGLE ITEM PRINT PREVIEW
  // ==========================================
  if (previewSingleItem) {
    const singleTeacherInfo = resolveTeacherProfile(previewSingleItem.nama_guru, previewSingleItem.nip);

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white text-slate-800">
        {/* Streamlined Top Control Bar */}
        <div className="sticky top-0 z-[100] bg-white border-b px-3 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between print:hidden shadow-sm gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPreviewSingleItem(null)} 
              className="h-8 px-2.5 sm:px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-slate-300 rounded-lg shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali
            </Button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2 py-0.5 text-[11px] truncate hidden sm:inline-flex">
              LCKH Harian: {previewSingleItem.nama_guru}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <PrintSecurityIndicator variant="compact" />
            <Button 
              size="sm"
              onClick={() => handlePrint(`Mencetak LCKH Harian - ${previewSingleItem.nama_guru}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-3 sm:px-4 shadow-sm rounded-lg text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Lembar Harian
            </Button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="flex-1 p-8 overflow-y-auto print:p-0 print:overflow-visible">
          <div id="print-area-lckh-single" className="mx-auto print:w-full">
            <div 
              className="bg-white mx-auto shadow-xl print:shadow-none print:m-0 print:p-0 print:w-full flex flex-col text-black font-sans"
              style={{ 
                width: '210mm', 
                minHeight: printConfig.paper_size === 'F4' ? '330mm' : '297mm',
                padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {printConfig.show_kop && <KopSurat />}

              <div className="text-center mb-6 mt-2">
                <h2 className="text-base sm:text-lg font-bold underline uppercase tracking-wider">
                  LEMBAR CATATAN KEGIATAN HARIAN (LCKH)
                </h2>
                <p className="text-xs sm:text-sm font-semibold uppercase mt-1 text-slate-800">
                  HARI / TANGGAL: {formatDate(previewSingleItem.tanggal).toUpperCase()}
                </p>
              </div>

              {/* Data Guru & Madrasah */}
              <div className="mb-6 text-xs">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 p-3.5 border border-black bg-slate-50/50 rounded-sm">
                  <div className="flex">
                    <span className="w-32 font-bold">Nama Guru</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="font-semibold flex-1">{previewSingleItem.nama_guru}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">Satuan Pendidikan</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="flex-1">{activeMadrasah?.nama_madrasah || settings.general?.school_name || 'Madrasah Ibtidaiyah'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">NIP / NPK</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="flex-1">{previewSingleItem.nip}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">Jabatan / Tugas</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="flex-1">{singleTeacherInfo.jabatan}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">Jenis Kegiatan</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="font-semibold text-emerald-800 flex-1">{previewSingleItem.jenis_kegiatan}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold">Tempat & Beban</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="flex-1">{previewSingleItem.tempat_kegiatan || 'Ruang Kelas'} ({previewSingleItem.volume || '1 Kegiatan'})</span>
                  </div>
                </div>
              </div>

              {/* Detail Uraian & Capaian */}
              <div className="mb-6 border border-black text-xs divide-y divide-black">
                <div className="p-3 bg-gray-50 font-bold uppercase tracking-wider">
                  Rincian Pelaksanaan Tugas & Capaian Kinerja
                </div>
                <div className="p-3">
                  <span className="font-bold text-gray-700 block mb-1">A. Uraian Kegiatan / Materi yang Disampaikan:</span>
                  <p className="whitespace-pre-wrap leading-relaxed text-black font-medium pl-4">
                    {previewSingleItem.kegiatan}
                  </p>
                </div>
                <div className="p-3">
                  <span className="font-bold text-gray-700 block mb-1">B. Hasil / Capaian Pembelajaran / Output Kinerja:</span>
                  <p className="whitespace-pre-wrap leading-relaxed text-black font-medium pl-4">
                    {previewSingleItem.hasil_capaian}
                  </p>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-700">C. Status / Keterangan Keterlaksanaan: </span>
                    <span className="font-bold text-emerald-800">{previewSingleItem.keterangan || 'Terlaksana'}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 italic">
                    Tercatat sistem: {new Date(previewSingleItem.created_at || previewSingleItem.tanggal).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Dokumentasi Foto Kegiatan */}
              {previewSingleItem.foto_url && (
                <div className="mb-6 border border-black rounded p-3 text-xs page-break-inside-avoid">
                  <span className="font-bold text-gray-700 block mb-2 uppercase">Bukti Dokumentasi Kegiatan / Foto Pelaksanaan:</span>
                  <div className="flex justify-center bg-slate-50 p-2 border border-gray-200 rounded">
                    <img 
                      src={formatImageUrl(previewSingleItem.foto_url)} 
                      alt="Dokumentasi Kegiatan" 
                      className="max-h-60 object-contain rounded"
                    />
                  </div>
                </div>
              )}

              {/* Signatures */}
              {printConfig.show_signature && (
                <div className="mt-8 pt-4 page-break-inside-avoid">
                  <PenandatanganDokumen 
                    tanggalCetak={previewSingleItem.tanggal || new Date().toISOString().split('T')[0]}
                    customGuru={{
                      nama: singleTeacherInfo.nama,
                      nip: singleTeacherInfo.nip,
                      jabatan: singleTeacherInfo.jabatan,
                      kelas: singleTeacherInfo.kelas,
                      tanda_tangan_url: singleTeacherInfo.tanda_tangan_url
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
            #print-area-lckh-single { 
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important; 
              margin: 0 !important; 
              padding: 0 !important; 
            }
            #print-area-lckh-single > div { 
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
  // 2. MONTHLY RECAP PRINT PREVIEW
  // ==========================================
  if (showMonthlyPreview) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white text-slate-800">
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
              <PrintSecurityIndicator variant="compact" />
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
                onClick={() => handlePrint(`Mencetak LCKH Bulanan - ${reportTeacherInfo.nama} (${monthTitle} ${yearTitle})`)}
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

            {/* Toggle Tanggal Merah & Libur Kalender */}
            <div className="inline-flex items-center gap-1.5 bg-red-50/80 px-2 py-0.5 rounded-lg border border-red-200 text-[11px] shrink-0">
              <label htmlFor="holiday-toggle-pub" className="font-bold text-red-700 cursor-pointer flex items-center gap-1">
                <span>🔴</span> Libur/Tgl Merah ({monthlyHolidayCount})
              </label>
              <Switch 
                id="holiday-toggle-pub" 
                checked={includeHolidayRows} 
                onCheckedChange={setIncludeHolidayRows} 
                className="scale-75 origin-right data-[state=checked]:bg-red-600"
              />
            </div>

            {/* Toggle Lampiran Foto */}
            <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px] shrink-0">
              <label htmlFor="photo-toggle-pub" className="font-bold text-slate-700 cursor-pointer">
                Foto ({monthlyPhotos.length})
              </label>
              <Switch 
                id="photo-toggle-pub" 
                checked={includePhotosInMonthly} 
                onCheckedChange={setIncludePhotosInMonthly} 
                className="scale-75 origin-right"
              />
            </div>
          </div>
        </div>

        {/* Printable Paper Container */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible print:m-0">
          <div id="print-area-lckh-bulanan-pub" className="mx-auto print:w-full print:m-0 print:p-0">
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
                    <span className="font-bold text-emerald-800 flex-1">{monthlyReportData.length} Kegiatan Terlaksana</span>
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
                        <th style={{ width: '13%' }} className="border border-black p-1 text-center">Hari / Tanggal</th>
                        <th style={{ width: '35%' }} className="border border-black p-1 text-center">Uraian Kegiatan</th>
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
                        const isRed = holidayInfo.isRedDate;

                        return (
                          <tr 
                            key={item.id} 
                            className={`align-top page-break-inside-avoid ${
                              isRed 
                                ? 'bg-red-50/70 text-red-950 print:bg-red-50' 
                                : ''
                            }`}
                          >
                            <td className={`border border-black ${cellPadding} text-center font-semibold ${isRed ? 'text-red-700' : ''}`}>
                              {index + 1}
                            </td>
                            <td className={`border border-black ${cellPadding} text-center ${isRed ? 'bg-red-100/50' : ''}`}>
                              <div className={`font-semibold text-[7.5pt] leading-tight ${isRed ? 'text-red-700 font-bold' : ''}`}>
                                {dateFormatted}
                              </div>
                            </td>
                            <td className={`border border-black ${cellPadding} whitespace-pre-line leading-snug text-justify ${isRed ? 'text-red-900 font-medium' : ''}`}>
                              {item.kegiatan}
                            </td>
                            <td className={`border border-black ${cellPadding} text-center leading-tight ${isRed ? 'text-red-800' : ''}`}>
                              {item.jenis_kegiatan}
                            </td>
                            <td className={`border border-black ${cellPadding} text-center leading-tight`}>
                              {item.tempat_kegiatan || 'Kelas'}
                            </td>
                            <td className={`border border-black ${cellPadding} text-center font-medium`}>
                              {item.volume || '1'}
                            </td>
                            <td className={`border border-black ${cellPadding} whitespace-pre-line leading-snug text-justify ${isRed ? 'text-red-800 italic' : ''}`}>
                              {item.hasil_capaian}
                            </td>
                            <td className={`border border-black ${cellPadding} text-center ${isRed ? 'text-red-700 font-bold bg-red-100/40' : ''}`}>
                              {item.keterangan || (isRed ? 'Libur' : 'Terlaksana')}
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

              {/* LAMPIRAN DOKUMENTASI FOTO KEGIATAN BULANAN */}
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

            #print-area-lckh-bulanan-pub { 
              position: static !important;
              width: 100% !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              display: block !important;
              overflow: visible !important;
            }
            #print-area-lckh-bulanan-pub > div { 
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
  // 3. MAIN PUBLIC LCKH VIEW & DIRECTORY
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <SEO />
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Top Back Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/ruang-guru')}
                className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-bold text-xs rounded-xl h-9 px-3.5 flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" /> Kembali ke Ruang Guru
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-slate-600 hover:text-emerald-700 text-xs font-semibold h-9 rounded-xl hidden sm:flex items-center gap-1"
              >
                <Home className="w-3.5 h-3.5" /> Beranda
              </Button>
            </div>

            {isAuthenticated && currentTeacher && (
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px] font-bold">
                  <ShieldCheck className="w-3 h-3 mr-1" /> {currentTeacher.nama}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Header Banner */}
          <div className="text-center mb-8">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1 mb-3">
              Portal Publikasi & Cetak Hasil LCKH
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Rekapitulasi Capaian Kinerja Guru <span className="text-emerald-600 font-serif-premium italic">(LCKH)</span>
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-xs sm:text-base mt-2">
              Laporan Capaian Kinerja Harian dan Rekapitulasi Bulanan Guru Madrasah yang tersinkronisasi. Untuk mencatat jurnal kegiatan harian baru, silakan gunakan menu di <strong>Ruang Guru</strong>.
            </p>

            {/* Teacher Info / Action Bar */}
            <div className="mt-4 max-w-2xl mx-auto p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-left">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${isAuthenticated ? 'bg-emerald-600' : 'bg-emerald-700'}`}>
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  {isAuthenticated && currentTeacher ? (
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{currentTeacher.nama}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">NIP: {currentTeacher.nip} • {currentTeacher.jabatan || 'Pendidik'}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">Laporan Kinerja Seluruh Guru</p>
                      <p className="text-[11px] text-slate-500 leading-tight">Pilih nama guru pada filter untuk melihat dan mencetak rekap LCKH</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate('/ruang-guru')}
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Input di Ruang Guru
                </Button>
              </div>
            </div>

            {/* Quick Action Button Header */}
            <div className="mt-5 flex flex-wrap justify-center items-center gap-3">
              <Button
                onClick={() => setShowMonthlyPreview(true)}
                className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-xs sm:text-sm transform hover:-translate-y-0.5 transition-all"
              >
                <Printer className="w-4 h-4 text-white" /> Cetak Rekap LCKH Bulanan
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="h-11 bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200 rounded-2xl px-5 font-bold shadow-sm flex items-center gap-2 text-xs sm:text-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Ekspor Excel
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-[11px] font-semibold uppercase tracking-wider">Total Kegiatan</p>
                  <h3 className="text-2xl font-black mt-0.5">{data.length}</h3>
                  <p className="text-[10px] text-emerald-100/80 mt-0.5">Tersimpan dalam sistem</p>
                </div>
                <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-sm bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Periode Aktif</p>
                  <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                    {selectedMonth !== 'all' ? BULAN_NAMES[parseInt(selectedMonth) - 1] : 'Semua'} {selectedYear}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{filteredData.length} laporan sesuai filter</p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-sm bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Pendidik Terdaftar</p>
                  <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                    {distinctTeachers.length > 0 ? distinctTeachers.length : teachersList.length} Guru
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tersinkron data guru madrasah</p>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-sm bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Bukti Foto</p>
                  <h3 className="text-lg font-bold text-emerald-700 mt-0.5">
                    {data.filter(d => d.foto_url).length} Foto
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dokumentasi kegiatan harian</p>
                </div>
                <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="border-0 shadow-sm rounded-2xl p-4 mb-6 bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Cari kegiatan, guru, NIP..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="pl-9 rounded-xl h-10 text-xs border-slate-200" 
                  />
                </div>

                {/* Filter Guru */}
                <div className="w-full sm:w-48">
                  <Select value={selectedTeacherFilter} onValueChange={setSelectedTeacherFilter}>
                    <SelectTrigger className="rounded-xl h-10 text-xs border-slate-200">
                      <SelectValue placeholder="Pilih Guru" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Guru</SelectItem>
                      {distinctTeachers.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Bulan */}
                <div className="w-32">
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

                {/* Filter Jenis Kegiatan */}
                <div className="w-full sm:w-48">
                  <Select value={selectedJenisKegiatan} onValueChange={setSelectedJenisKegiatan}>
                    <SelectTrigger className="rounded-xl h-10 text-xs border-slate-200">
                      <SelectValue placeholder="Jenis Kegiatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_KEGIATAN_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reset filter */}
              {(selectedTeacherFilter !== 'all' || selectedMonth !== String(currentMonth) || selectedJenisKegiatan !== 'Semua Jenis Kegiatan' || searchQuery) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSelectedTeacherFilter('all');
                    setSelectedMonth(String(currentMonth));
                    setSelectedYear(String(currentYear));
                    setSelectedJenisKegiatan('Semua Jenis Kegiatan');
                    setSearchQuery('');
                  }}
                  className="text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </Card>

          {/* Data List Table */}
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  Daftar Catatan Kegiatan Guru ({filteredData.length})
                </h3>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Klik tombol <span className="font-bold text-emerald-700">Cetak</span> untuk mencetak lembar LCKH
              </div>
            </div>

            {loading ? (
              <div className="p-16 text-center">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-500">Memuat data LCKH...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="p-16 text-center">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">Belum ada catatan LCKH yang ditemukan</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Silakan sesuaikan filter pencarian, bulan, atau nama guru untuk melihat laporan kegiatan yang tersimpan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-10 text-center font-bold">No</TableHead>
                      <TableHead className="w-32 font-bold">Tanggal</TableHead>
                      <TableHead className="w-48 font-bold">Nama Guru</TableHead>
                      <TableHead className="w-36 font-bold">Jenis Kegiatan</TableHead>
                      <TableHead className="min-w-[220px] font-bold">Uraian Kegiatan</TableHead>
                      <TableHead className="min-w-[180px] font-bold">Hasil / Capaian</TableHead>
                      <TableHead className="w-20 text-center font-bold">Foto</TableHead>
                      <TableHead className="w-28 text-center font-bold">Cetak Dokumen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, idx) => {
                      const holidayInfo = getHolidayInfo(item.tanggal, calendarEvents);
                      return (
                        <TableRow 
                          key={item.id} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            holidayInfo.isRedDate ? 'bg-red-50/40' : ''
                          }`}
                        >
                          <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                          <TableCell className={`whitespace-nowrap ${holidayInfo.isRedDate ? 'bg-red-50/60' : ''}`}>
                            <div className={`font-bold ${holidayInfo.isRedDate ? 'text-red-700' : 'text-slate-900'}`}>
                              {formatShortDate(item.tanggal)}
                            </div>
                            <div className={`text-[10px] ${holidayInfo.isRedDate ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                              {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'short' })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900">{item.nama_guru}</div>
                            <div className="text-[10px] text-slate-500 font-mono">NIP: {item.nip || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-medium whitespace-nowrap">
                              {item.jenis_kegiatan}
                            </Badge>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {item.tempat_kegiatan || 'Kelas'} • {item.volume || '1'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed">
                              {item.kegiatan}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-slate-600 line-clamp-2 leading-relaxed">
                              {item.hasil_capaian}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.foto_url ? (
                              <button
                                onClick={() => setSelectedImageModal(item.foto_url || null)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                title="Lihat Foto Bukti Kegiatan"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-300">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <Button
                              onClick={() => setPreviewSingleItem(item)}
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] px-3 shadow-xs"
                              title="Cetak Lembar LCKH Harian"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Harian
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Image Modal Dialog */}
      <Dialog open={!!selectedImageModal} onOpenChange={() => setSelectedImageModal(null)}>
        <DialogContent className="max-w-2xl p-4 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" /> Bukti Dokumentasi Kegiatan Guru
            </DialogTitle>
          </DialogHeader>
          {selectedImageModal && (
            <div className="mt-2 bg-slate-50 rounded-xl p-2 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img 
                src={formatImageUrl(selectedImageModal)} 
                alt="Dokumentasi LCKH" 
                className="max-h-[65vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          )}
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setSelectedImageModal(null)} className="rounded-xl text-xs">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Auth Modal */}
      <TeacherAuthModal />

      <Footer />
    </div>
  );
};

export default LCKHPublic;
