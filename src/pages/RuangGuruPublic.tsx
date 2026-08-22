"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { 
  GraduationCap, ClipboardList, HeartHandshake, BookMarked, 
  FileSpreadsheet, Layout, UserCheck2, Sparkles, Presentation,
  Languages, Award, ArrowRight, ShieldCheck, Lock, Unlock, 
  User, CheckCircle2, ChevronRight, BookOpen, Layers, PlusCircle,
  FolderKanban, Calendar, Users, RefreshCw, LogOut, Check,
  KeyRound, Plus, Pencil, Trash2, Printer, Camera, Image as ImageIcon,
  CheckCircle, AlertCircle, Eye, ShieldAlert, Sparkle, X, Upload, Save,
  ArrowLeft, Home, FileText, FolderOpen, FileCheck, ExternalLink, Trophy,
  MapPin, Clock, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import TeacherAuthModal from '@/components/TeacherAuthModal';
import CetakLaporanPembiasaan, { PembiasaanItem } from '@/components/CetakLaporanPembiasaan';
import { formatImageUrl, compressImage, uploadImageToStorage } from '@/utils/imageCompression';
import { showSuccess, showError } from '@/utils/toast';
import CalendarHolidayPicker from '@/components/CalendarHolidayPicker';

interface LCKHItem {
  id: string;
  tanggal: string;
  nama_guru: string;
  nip: string;
  kegiatan: string;
  hasil_capaian: string;
  tempat_kegiatan?: string;
  jenis_kegiatan?: string;
  volume?: string;
  materi?: string;
  keterangan?: string;
  foto_url?: string;
  created_at?: string;
  teacher_id?: string;
}

interface SavedCoverItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  author: string;
  nip: string;
  nama_yayasan?: string;
  nama_madrasah?: string;
  logo_url?: string;
  created_at?: string;
  teacher_id?: string;
}

interface KisiKisiSavedItem {
  id: string;
  nama_ujian: string;
  mata_pelajaran: string;
  fase: string;
  materi_pokok: string;
  indikator_soal: string;
  level_kognitif: string;
  bentuk_soal: string;
  no_soal: string;
  guru_penyusun?: string;
  nip_penyusun?: string;
  teacher_id?: string;
  created_at?: string;
}

const JENIS_KEGIATAN_OPTIONS = [
  'Intrakurikuler (KBM)',
  'Kokurikuler (P5/PPRA)',
  'Ekstrakurikuler',
  'Pengembangan Keprofesian (PKB)',
  'Evaluasi & Asesmen',
  'Administrasi Guru',
  'Rapat & Koordinasi',
  'Bimbingan & Konseling',
  'Kegiatan Keagamaan & Pembiasaan'
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

const TEMPAT_PRESETS = [
  'Ruang Kelas',
  'Lab Komputer',
  'Mushola / Masjid Madrasah',
  'Ruang Guru / Kantor',
  'Aula Madrasah',
  'Perpustakaan',
  'Halaman / Lapangan Madrasah'
];

const PRESET_PEMBIASAAN = [
  {
    nama_kegiatan: "Sholat Dhuha Berjamaah & Doa Pagi",
    kategori: "Ibadah & Spiritual",
    waktu: "06:45 - 07:15 WIB",
    lokasi: "Musholla / Masjid Madrasah",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Membiasakan sholat sunnah Dhuha, membaca doa pagi, dan menumbuhkan kecintaan ibadah harian.",
    uraian_kegiatan: "Sholat Dhuha 4 rakaat dipimpin Imam Guru Piket dilanjutkan Dzikir Asmaul Husna.",
    hasil_kegiatan: "Seluruh siswa mengikuti dengan khusyuk dan tertib.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Tadarus Al-Qur'an / Juz 'Amma Harian",
    kategori: "Ibadah & Spiritual",
    waktu: "07:15 - 07:35 WIB",
    lokasi: "Ruang Kelas Masing-masing",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Meningkatkan kelancaran membaca Al-Qur'an dengan tartil dan hafalan surat pendek Juz 30.",
    uraian_kegiatan: "Membaca bersama surat pilihan dipandu wali kelas dilanjutkan setoran hafalan.",
    hasil_kegiatan: "Target hafalan surat harian tercapai 95%.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Sholat Dzuhur Berjamaah & Kultum",
    kategori: "Ibadah & Spiritual",
    waktu: "12:00 - 12:40 WIB",
    lokasi: "Masjid / Musholla Madrasah",
    sasaran_kelas: "Kelas III, IV, V, VI",
    tujuan: "Membentuk kedisiplinan sholat fardhu dan melatih public speaking santri lewat kultum.",
    uraian_kegiatan: "Sholat berjamaah 4 rakaat dan penyampaian kultum 5 menit oleh perwakilan siswa.",
    hasil_kegiatan: "Pelaksanaan tertib dan khidmat.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Infaq & Sedekah Jumat Berkah",
    kategori: "Sosial & Kepedulian",
    waktu: "07:00 - 07:30 WIB",
    lokasi: "Halaman Utama Madrasah",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Melatih kepekaan sosial dan keutamaan sedekah hari Jumat.",
    uraian_kegiatan: "Petugas mengedarkan kotak infaq kelas secara bergilir dan sukarela.",
    hasil_kegiatan: "Terkumpul dana infaq sosial untuk santunan dan kegiatan sosial.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Upacara Bendera Hari Senin & Mars Madrasah",
    kategori: "Nasionalisme & Karakter",
    waktu: "07:00 - 07:45 WIB",
    lokasi: "Halaman Utama Madrasah",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Menumbuhkan jiwa patriotisme, disiplin, dan cinta tanah air.",
    uraian_kegiatan: "Pengibaran bendera, pembacaan teks Pancasila, UUD 1945, Janji Siswa, dan amanat Pembina.",
    hasil_kegiatan: "Upacara berjalan khidmat dan tertib.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Senam Kesegaran Jasmani & Sarapan Sehat",
    kategori: "Kesehatan & Lingkungan",
    waktu: "06:45 - 07:45 WIB",
    lokasi: "Halaman Madrasah",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Menjaga kebugaran jasmani dan membiasakan pola hidup bersih dan sehat (PHBS).",
    uraian_kegiatan: "Senam ceria bersama dilanjutkan makan bekal sehat bergizi dari rumah.",
    hasil_kegiatan: "Siswa sangat antusias dan bersemangat.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Gerakan Literasi 15 Menit & Pojok Baca",
    kategori: "Literasi & Bahasa",
    waktu: "07:00 - 07:15 WIB",
    lokasi: "Pojok Baca / Ruang Kelas",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Meningkatkan minat baca dan wawasan pengetahuan santri.",
    uraian_kegiatan: "Membaca hening selama 15 menit dan mencatat ulasan di jurnal baca.",
    hasil_kegiatan: "100% siswa mengisi jurnal baca harian.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Jumat Bersih & Operasi Semut (Go Green)",
    kategori: "Kesehatan & Lingkungan",
    waktu: "07:30 - 08:30 WIB",
    lokasi: "Area Madrasah & Taman",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Menanamkan nilai kebersihan lingkungan dan gotong royong.",
    uraian_kegiatan: "Membersihkan ruang kelas, menata taman, dan memilah sampah bersama.",
    hasil_kegiatan: "Lingkungan madrasah menjadi asri, bersih, dan nyaman.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Pembiasaan Budaya 5S & Apel Pagi",
    kategori: "Kedisiplinan & 5S",
    waktu: "06:30 - 06:45 WIB",
    lokasi: "Gerbang Utama Madrasah",
    sasaran_kelas: "Semua Siswa",
    tujuan: "Menerapkan budaya Senyum, Salam, Sapa, Sopan, dan Santun.",
    uraian_kegiatan: "Guru piket menyambut kedatangan siswa di gerbang dengan salam hangat dan cek kerapian.",
    hasil_kegiatan: "Hubungan hangat tawadhu dan disiplin seragam mencapai 99%.",
    status_keterlaksanaan: "Terlaksana" as const
  }
];

const RuangGuruPublic: React.FC = () => {
  const navigate = useNavigate();
  const { currentTeacher, isAuthenticated, openTeacherModal, logoutTeacher, updateTeacherPin } = useTeacherAuth();
  const { activeMadrasah, activeMadrasahId, getScopedKey } = useMadrasah();
  const { settings } = useSiteSettings();

  const currentYear = settings?.tahun_pelajaran?.active_year || '2026/2027';
  const currentSemester = settings?.tahun_pelajaran?.semester || 'Ganjil';

  // Tab State
  const [activeTab, setActiveTab] = useState<string>('modules');

  // LCKH State for Current Teacher
  const [teacherLckhList, setTeacherLckhList] = useState<LCKHItem[]>([]);
  const [loadingLckh, setLoadingLckh] = useState(false);

  // Pembiasaan State
  const [pembiasaanList, setPembiasaanList] = useState<PembiasaanItem[]>([]);
  const [loadingPembiasaan, setLoadingPembiasaan] = useState(false);

  // Saved Covers for Current Teacher
  const [savedCoversList, setSavedCoversList] = useState<SavedCoverItem[]>([]);
  const [loadingCovers, setLoadingCovers] = useState(false);

  // Saved Kisi-Kisi for Current Teacher
  const [kisiKisiList, setKisiKisiList] = useState<KisiKisiSavedItem[]>([]);
  const [loadingKisiKisi, setLoadingKisiKisi] = useState(false);

  // LCKH Modal States
  const [createLckhModalOpen, setCreateLckhModalOpen] = useState(false);
  const [editingLckhId, setEditingLckhId] = useState<string | null>(null);
  const [isSavingLckh, setIsSavingLckh] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  // Pembiasaan Modal States
  const [pembiasaanModalOpen, setPembiasaanModalOpen] = useState(false);
  const [editingPembiasaanId, setEditingPembiasaanId] = useState<string | null>(null);
  const [isSavingPembiasaan, setIsSavingPembiasaan] = useState(false);
  const [uploadingPembiasaanPhoto, setUploadingPembiasaanPhoto] = useState(false);
  const [printPembiasaanModalOpen, setPrintPembiasaanModalOpen] = useState(false);
  const [printPembiasaanItem, setPrintPembiasaanItem] = useState<PembiasaanItem | null>(null);
  const [printPembiasaanMode, setPrintPembiasaanMode] = useState<'single' | 'rekap'>('single');

  // Change PIN States
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Form Data for LCKH
  const [lckhFormData, setLckhFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nama_guru: currentTeacher?.nama || 'Guru Madrasah',
    nip: currentTeacher?.nip || '-',
    jenis_kegiatan: 'Intrakurikuler (KBM)',
    tempat_kegiatan: 'Ruang Kelas',
    volume: '2 JP',
    materi: '',
    kegiatan: '',
    hasil_capaian: '',
    keterangan: 'Terlaksana dengan baik',
    foto_url: ''
  });

  // Form Data for Pembiasaan
  const [pembiasaanFormData, setPembiasaanFormData] = useState({
    nama_kegiatan: '',
    kategori: 'Ibadah & Spiritual',
    tanggal: new Date().toISOString().slice(0, 10),
    waktu: '06:45 - 07:15 WIB',
    lokasi: 'Musholla / Masjid Madrasah',
    sasaran_kelas: 'Semua Kelas (I - VI)',
    guru_pendamping: currentTeacher?.nama || 'Guru Madrasah',
    nip_pendamping: currentTeacher?.nip || '-',
    tujuan: '',
    uraian_kegiatan: '',
    hasil_kegiatan: '',
    status_keterlaksanaan: 'Terlaksana' as 'Terlaksana' | 'Terlaksana Sebagian' | 'Tertunda',
    images: [] as string[]
  });

  // Sync Form when currentTeacher changes
  useEffect(() => {
    if (currentTeacher) {
      setLckhFormData(prev => ({
        ...prev,
        nama_guru: currentTeacher.nama || prev.nama_guru,
        nip: currentTeacher.nip || prev.nip,
        tempat_kegiatan: currentTeacher.kelas ? `Ruang Kelas ${currentTeacher.kelas}` : prev.tempat_kegiatan
      }));

      setPembiasaanFormData(prev => ({
        ...prev,
        guru_pendamping: currentTeacher.nama || prev.guru_pendamping,
        nip_pendamping: currentTeacher.nip || prev.nip_pendamping,
        sasaran_kelas: currentTeacher.kelas ? `Kelas ${currentTeacher.kelas}` : prev.sasaran_kelas
      }));
    }
  }, [currentTeacher]);

  // Fetch LCKH records for active madrasah
  const fetchLckhData = async () => {
    setLoadingLckh(true);
    try {
      const storageKey = getScopedKey('lckh_guru_list');
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;

      let list: LCKHItem[] = [];

      // 1. Try Supabase
      const { data: res } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', storageKey)
        .maybeSingle();

      if (res?.value && Array.isArray(res.value)) {
        list = res.value;
      } else {
        // Try fallback key
        const { data: fallbackRes } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'lckh_guru_list')
          .maybeSingle();

        if (fallbackRes?.value && Array.isArray(fallbackRes.value)) {
          list = fallbackRes.value;
        } else {
          // Try local storage
          const cached = localStorage.getItem(scopedLocalKey) || localStorage.getItem('siakad_lckh_guru_list');
          if (cached) {
            list = JSON.parse(cached);
          }
        }
      }

      setTeacherLckhList(list);
    } catch (e) {
      console.error('Error fetching teacher LCKH in Ruang Guru:', e);
    } finally {
      setLoadingLckh(false);
    }
  };

  // Fetch Pembiasaan Data
  const fetchPembiasaanData = async () => {
    setLoadingPembiasaan(true);
    try {
      const storageKey = `laporan_pembiasaan_list_${activeMadrasahId || 'default'}`;
      let list: PembiasaanItem[] = [];

      const { data: res } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', storageKey)
        .maybeSingle();

      if (res?.value && Array.isArray(res.value)) {
        list = res.value.filter(item => !['pemb-001', 'pemb-002', 'pemb-003'].includes(item.id));
      } else {
        const local = localStorage.getItem(storageKey);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) {
              list = parsed.filter(item => !['pemb-001', 'pemb-002', 'pemb-003'].includes(item.id));
            }
          } catch (e) {
            console.error('Error parsing local storage:', e);
          }
        }
      }

      setPembiasaanList(list);
    } catch (e) {
      console.error('Error fetching pembiasaan in Ruang Guru:', e);
    } finally {
      setLoadingPembiasaan(false);
    }
  };

  // Fetch Saved Covers
  const fetchCoversData = async () => {
    setLoadingCovers(true);
    try {
      const scopedKey = getScopedKey('saved_covers_list');
      const { data: res } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', scopedKey)
        .maybeSingle();

      if (res?.value && Array.isArray(res.value)) {
        setSavedCoversList(res.value);
      } else {
        const { data: fallback } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'saved_covers_list')
          .maybeSingle();
        if (fallback?.value && Array.isArray(fallback.value)) {
          setSavedCoversList(fallback.value);
        }
      }
    } catch (e) {
      console.error('Error fetching covers in Ruang Guru:', e);
    } finally {
      setLoadingCovers(false);
    }
  };

  // Fetch Kisi-Kisi
  const fetchKisiKisiData = async () => {
    setLoadingKisiKisi(true);
    try {
      const scopedKey = getScopedKey('kisi_kisi_data');
      const { data: res } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', scopedKey)
        .maybeSingle();

      if (res?.value && Array.isArray(res.value)) {
        setKisiKisiList(res.value);
      } else {
        const { data: fallback } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'kisi_kisi_data')
          .maybeSingle();
        if (fallback?.value && Array.isArray(fallback.value)) {
          setKisiKisiList(fallback.value);
        }
      }
    } catch (e) {
      console.error('Error fetching kisi-kisi in Ruang Guru:', e);
    } finally {
      setLoadingKisiKisi(false);
    }
  };

  // Initial and refresh loader
  const refreshAllTeacherData = () => {
    fetchLckhData();
    fetchPembiasaanData();
    fetchCoversData();
    fetchKisiKisiData();
  };

  useEffect(() => {
    refreshAllTeacherData();
  }, [activeMadrasahId]);

  // Filtered LCKH strictly for current teacher
  const myLckhItems = useMemo(() => {
    if (!currentTeacher || !currentTeacher.nama) return [];
    const myName = currentTeacher.nama.toLowerCase().trim();
    const myNip = currentTeacher.nip && currentTeacher.nip !== '-' ? currentTeacher.nip.trim() : '';

    return teacherLckhList.filter(item => {
      if (item.teacher_id && item.teacher_id === currentTeacher.id) return true;
      const itemGuru = (item.nama_guru || '').toLowerCase().trim();
      const itemNip = (item.nip || '').trim();
      return itemGuru.includes(myName) || (myNip && itemNip === myNip);
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [teacherLckhList, currentTeacher]);

  // Filtered Pembiasaan strictly for current teacher
  const myPembiasaanItems = useMemo(() => {
    if (!currentTeacher || !currentTeacher.nama) return [];
    const myName = currentTeacher.nama.toLowerCase().trim();
    const myNip = currentTeacher.nip && currentTeacher.nip !== '-' ? currentTeacher.nip.trim() : '';

    return pembiasaanList.filter(item => {
      const itemGuru = (item.guru_pendamping || item.penandatangan_nama || '').toLowerCase().trim();
      const itemNip = (item.nip_pendamping || item.penandatangan_nip || '').trim();
      return itemGuru.includes(myName) || (myNip && itemNip === myNip);
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [pembiasaanList, currentTeacher]);

  // Filtered Covers strictly for current teacher
  const myCoverItems = useMemo(() => {
    if (!currentTeacher || !currentTeacher.nama) return [];
    const myName = currentTeacher.nama.toLowerCase().trim();
    const myNip = currentTeacher.nip && currentTeacher.nip !== '-' ? currentTeacher.nip.trim() : '';

    return savedCoversList.filter(item => {
      if (item.teacher_id && item.teacher_id === currentTeacher.id) return true;
      const author = (item.author || '').toLowerCase().trim();
      const itemNip = (item.nip || '').trim();
      return author.includes(myName) || (myNip && itemNip === myNip);
    });
  }, [savedCoversList, currentTeacher]);

  // Filtered Kisi-Kisi strictly for current teacher
  const myKisiKisiItems = useMemo(() => {
    if (!currentTeacher || !currentTeacher.nama) return [];
    const myName = currentTeacher.nama.toLowerCase().trim();
    const myNip = currentTeacher.nip && currentTeacher.nip !== '-' ? currentTeacher.nip.trim() : '';

    return kisiKisiList.filter(item => {
      if (item.teacher_id && item.teacher_id === currentTeacher.id) return true;
      const author = (item.guru_penyusun || '').toLowerCase().trim();
      const itemNip = (item.nip_penyusun || '').trim();
      return author.includes(myName) || (myNip && itemNip === myNip);
    });
  }, [kisiKisiList, currentTeacher]);

  // Helper to extract day name in Indonesian
  const getIndonesianDayName = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return days[d.getDay()] || '';
      }
      const d = new Date(dateStr);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[d.getDay()] || '';
    } catch {
      return '';
    }
  };

  // Generate automated activity wording with day prefix according to rule:
  // Senin -> kegiatan upacara
  // Selasa s.d. Kamis -> pembiasaan religi, baca asmaul husna dan suratan pendek
  // Jumat -> membaca surat yasin dan tahlil
  // Sabtu -> senam
  const generateLckhActivityText = (materi: string, dateStr: string, style: 'interaktif' | 'latihan' | 'praktik' | 'ringkas' = 'interaktif'): string => {
    const day = getIndonesianDayName(dateStr).toLowerCase();
    const cleanMateri = materi.trim();

    let habitPrefix = '';
    if (day === 'senin') {
      habitPrefix = 'Mengikuti kegiatan upacara bendera hari Senin';
    } else if (day === 'selasa' || day === 'rabu' || day === 'kamis') {
      habitPrefix = 'Melaksanakan pembiasaan religi (membaca Asmaul Husna dan suratan pendek)';
    } else if (day === 'jumat') {
      habitPrefix = 'Melaksanakan pembiasaan membaca surat Yasin dan tahlil bersama';
    } else if (day === 'sabtu') {
      habitPrefix = 'Melaksanakan kegiatan senam kesegaran jasmani';
    }

    if (cleanMateri) {
      let coreActivity = '';
      if (style === 'interaktif') {
        coreActivity = `dilanjutkan KBM tatap muka materi ${cleanMateri} melalui apersepsi, penjelasan konsep secara interaktif, tanya jawab aktif, pendampingan diskusi kelas, serta asesmen formatif pemahaman peserta didik.`;
      } else if (style === 'latihan') {
        coreActivity = `dilanjutkan KBM materi ${cleanMateri} melalui pemecahan masalah kontekstual, pendampingan pengerjaan lembar kerja siswa (LKS), bimbingan tutor sebaya, serta evaluasi latihan harian.`;
      } else if (style === 'praktik') {
        coreActivity = `dilanjutkan KBM dan pembinaan materi ${cleanMateri} melalui demonstrasi langkah kerja, bimbingan praktik langsung peserta didik secara terbimbing, serta asesmen unjuk kerja/keterampilan.`;
      } else {
        coreActivity = `dilanjutkan kegiatan belajar mengajar (KBM) materi ${cleanMateri} serta evaluasi pemahaman siswa di kelas.`;
      }

      if (habitPrefix) {
        return `${habitPrefix}, ${coreActivity}`;
      }
      return `Melaksanakan ${coreActivity.replace(/^dilanjutkan\s+/i, '')}`;
    } else {
      if (habitPrefix) {
        return `${habitPrefix}, dilanjutkan kegiatan belajar mengajar (KBM), pendampingan peserta didik di kelas, dan asesmen harian.`;
      }
      return 'Melaksanakan kegiatan belajar mengajar (KBM), pendampingan belajar peserta didik, dan evaluasi hasil belajar di kelas.';
    }
  };

  const generateLckhOutputText = (materi: string, style: 'interaktif' | 'latihan' | 'praktik' | 'ringkas' = 'interaktif'): string => {
    const cleanMateri = materi.trim();
    if (cleanMateri) {
      if (style === 'interaktif') {
        return `Peserta didik memahami konsep pokok materi ${cleanMateri} dengan baik, aktif berpartisipasi dalam diskusi, serta mampu menjawab pertanyaan pemantik dengan tepat.`;
      } else if (style === 'latihan') {
        return `Terselesaikannya latihan dan tugas mandiri materi ${cleanMateri} oleh seluruh peserta didik dengan nilai mencapai ketuntasan tujuan pembelajaran (KKTP).`;
      } else if (style === 'praktik') {
        return `Peserta didik mampu mempraktikkan keterampilan materi ${cleanMateri} secara tepat sesuai rubrik unjuk kerja yang ditentukan.`;
      }
      return `Peserta didik memahami materi ${cleanMateri} dengan baik serta menyelesaikan tugas pembelajaran hari ini.`;
    }
    return 'Terlaksananya kegiatan pembelajaran dan pembiasaan siswa dengan tertib serta tercapainya target aktivitas harian.';
  };

  // Handle Open Create LCKH
  const handleOpenCreateLckh = () => {
    const today = new Date().toISOString().split('T')[0];
    if (!isAuthenticated) {
      openTeacherModal(() => {
        setEditingLckhId(null);
        setLckhFormData({
          tanggal: today,
          nama_guru: currentTeacher?.nama || 'Guru Madrasah',
          nip: currentTeacher?.nip || '-',
          jenis_kegiatan: 'Intrakurikuler (KBM)',
          tempat_kegiatan: currentTeacher?.kelas ? `Ruang Kelas ${currentTeacher.kelas}` : 'Ruang Kelas',
          volume: '2 JP',
          materi: '',
          kegiatan: generateLckhActivityText('', today),
          hasil_capaian: 'Peserta didik memahami materi pembelajaran dengan baik.',
          keterangan: 'Terlaksana dengan baik',
          foto_url: ''
        });
        setCreateLckhModalOpen(true);
      });
      return;
    }

    setEditingLckhId(null);
    setLckhFormData({
      tanggal: today,
      nama_guru: currentTeacher?.nama || 'Guru Madrasah',
      nip: currentTeacher?.nip || '-',
      jenis_kegiatan: 'Intrakurikuler (KBM)',
      tempat_kegiatan: currentTeacher?.kelas ? `Ruang Kelas ${currentTeacher.kelas}` : 'Ruang Kelas',
      volume: '2 JP',
      materi: '',
      kegiatan: generateLckhActivityText('', today),
      hasil_capaian: 'Peserta didik memahami materi pembelajaran dengan baik.',
      keterangan: 'Terlaksana dengan baik',
      foto_url: ''
    });
    setCreateLckhModalOpen(true);
  };

  // Handle Edit LCKH
  const handleEditLckh = (item: LCKHItem) => {
    setEditingLckhId(item.id);
    setLckhFormData({
      tanggal: item.tanggal,
      nama_guru: item.nama_guru,
      nip: item.nip,
      jenis_kegiatan: item.jenis_kegiatan || 'Intrakurikuler (KBM)',
      tempat_kegiatan: item.tempat_kegiatan || 'Ruang Kelas',
      volume: item.volume || '2 JP',
      materi: item.materi || '',
      kegiatan: item.kegiatan,
      hasil_capaian: item.hasil_capaian,
      keterangan: item.keterangan || 'Terlaksana dengan baik',
      foto_url: item.foto_url || ''
    });
    setCreateLckhModalOpen(true);
  };

  // Handle Duplicate LCKH (Salin kegiatan, cukup ganti hari & tanggal)
  const handleDuplicateLckh = (item: LCKHItem) => {
    if (!isAuthenticated) {
      openTeacherModal();
      return;
    }
    setEditingLckhId(null);
    setLckhFormData({
      tanggal: item.tanggal || new Date().toISOString().split('T')[0],
      nama_guru: item.nama_guru || currentTeacher?.nama || 'Guru Madrasah',
      nip: item.nip || currentTeacher?.nip || '-',
      jenis_kegiatan: item.jenis_kegiatan || 'Intrakurikuler (KBM)',
      tempat_kegiatan: item.tempat_kegiatan || 'Ruang Kelas',
      volume: item.volume || '2 JP',
      materi: item.materi || '',
      kegiatan: item.kegiatan || '',
      hasil_capaian: item.hasil_capaian || '',
      keterangan: item.keterangan || 'Terlaksana dengan baik',
      foto_url: item.foto_url || ''
    });
    setCreateLckhModalOpen(true);
    showToast('success', 'Kegiatan disalin! Silakan pilih hari & tanggal baru, lalu Simpan.');
  };

  // Handle Save LCKH
  const handleSaveLckh = async () => {
    if (!lckhFormData.kegiatan.trim()) {
      showToast('error', 'Uraian kegiatan wajib diisi');
      return;
    }
    if (!lckhFormData.hasil_capaian.trim()) {
      showToast('error', 'Hasil / Capaian kinerja wajib diisi');
      return;
    }

    setIsSavingLckh(true);
    try {
      const storageKey = getScopedKey('lckh_guru_list');
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;

      let updatedList: LCKHItem[] = [];

      if (editingLckhId) {
        updatedList = teacherLckhList.map(item => {
          if (item.id === editingLckhId) {
            return {
              ...item,
              tanggal: lckhFormData.tanggal,
              nama_guru: lckhFormData.nama_guru,
              nip: lckhFormData.nip,
              jenis_kegiatan: lckhFormData.jenis_kegiatan,
              tempat_kegiatan: lckhFormData.tempat_kegiatan,
              volume: lckhFormData.volume,
              materi: lckhFormData.materi,
              kegiatan: lckhFormData.kegiatan,
              hasil_capaian: lckhFormData.hasil_capaian,
              keterangan: lckhFormData.keterangan,
              foto_url: lckhFormData.foto_url,
              teacher_id: currentTeacher?.id || item.teacher_id
            };
          }
          return item;
        });
        showToast('success', 'Catatan LCKH berhasil diperbarui!');
      } else {
        const newItem: LCKHItem = {
          id: `lckh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tanggal: lckhFormData.tanggal,
          nama_guru: lckhFormData.nama_guru,
          nip: lckhFormData.nip,
          jenis_kegiatan: lckhFormData.jenis_kegiatan,
          tempat_kegiatan: lckhFormData.tempat_kegiatan,
          volume: lckhFormData.volume,
          materi: lckhFormData.materi,
          kegiatan: lckhFormData.kegiatan,
          hasil_capaian: lckhFormData.hasil_capaian,
          keterangan: lckhFormData.keterangan,
          foto_url: lckhFormData.foto_url,
          created_at: new Date().toISOString(),
          teacher_id: currentTeacher?.id
        };
        updatedList = [newItem, ...teacherLckhList];
        showToast('success', 'Catatan LCKH baru berhasil disimpan!');
      }

      setTeacherLckhList(updatedList);
      localStorage.setItem(scopedLocalKey, JSON.stringify(updatedList));

      // Sync Supabase
      await supabase.from('site_settings').upsert({
        id: storageKey,
        value: updatedList,
        updated_at: new Date().toISOString()
      });

      setCreateLckhModalOpen(false);
    } catch (e) {
      console.error('Error saving LCKH:', e);
      showToast('error', 'Gagal menyimpan catatan LCKH');
    } finally {
      setIsSavingLckh(false);
    }
  };

  // Handle Delete LCKH
  const handleDeleteLckh = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan LCKH ini?')) {
      return;
    }

    try {
      const storageKey = getScopedKey('lckh_guru_list');
      const scopedLocalKey = `siakad_lckh_${activeMadrasahId}`;
      const updated = teacherLckhList.filter(item => item.id !== id);

      setTeacherLckhList(updated);
      localStorage.setItem(scopedLocalKey, JSON.stringify(updated));

      await supabase.from('site_settings').upsert({
        id: storageKey,
        value: updated,
        updated_at: new Date().toISOString()
      });

      showToast('success', 'Catatan LCKH berhasil dihapus');
    } catch (e) {
      console.error('Error deleting LCKH:', e);
      showToast('error', 'Gagal menghapus LCKH');
    }
  };

  // Open Create Pembiasaan Modal
  const handleOpenCreatePembiasaan = () => {
    if (!isAuthenticated) {
      openTeacherModal(() => {
        initCreatePembiasaanForm();
      });
      return;
    }
    initCreatePembiasaanForm();
  };

  const initCreatePembiasaanForm = () => {
    setEditingPembiasaanId(null);
    setPembiasaanFormData({
      nama_kegiatan: '',
      kategori: 'Ibadah & Spiritual',
      tanggal: new Date().toISOString().slice(0, 10),
      waktu: '06:45 - 07:15 WIB',
      lokasi: 'Musholla / Masjid Madrasah',
      sasaran_kelas: currentTeacher?.kelas ? `Kelas ${currentTeacher.kelas}` : 'Semua Kelas (I - VI)',
      guru_pendamping: currentTeacher?.nama || 'Guru Madrasah',
      nip_pendamping: currentTeacher?.nip || '-',
      tujuan: '',
      uraian_kegiatan: '',
      hasil_kegiatan: '',
      status_keterlaksanaan: 'Terlaksana',
      images: []
    });
    setPembiasaanModalOpen(true);
  };

  // Open Edit Pembiasaan Modal
  const handleOpenEditPembiasaan = (item: PembiasaanItem) => {
    setEditingPembiasaanId(item.id);
    setPembiasaanFormData({
      nama_kegiatan: item.nama_kegiatan || '',
      kategori: item.kategori || 'Ibadah & Spiritual',
      tanggal: item.tanggal || new Date().toISOString().slice(0, 10),
      waktu: item.waktu || '06:45 - 07:15 WIB',
      lokasi: item.lokasi || 'Musholla / Masjid Madrasah',
      sasaran_kelas: item.sasaran_kelas || 'Semua Kelas (I - VI)',
      guru_pendamping: item.guru_pendamping || currentTeacher?.nama || '',
      nip_pendamping: item.nip_pendamping || item.penandatangan_nip || currentTeacher?.nip || '-',
      tujuan: item.tujuan || '',
      uraian_kegiatan: item.uraian_kegiatan || '',
      hasil_kegiatan: item.hasil_kegiatan || '',
      status_keterlaksanaan: item.status_keterlaksanaan || 'Terlaksana',
      images: item.images || []
    });
    setPembiasaanModalOpen(true);
  };

  // Apply Preset Pembiasaan Template
  const applyPresetPembiasaan = (preset: typeof PRESET_PEMBIASAAN[0]) => {
    setPembiasaanFormData(prev => ({
      ...prev,
      nama_kegiatan: preset.nama_kegiatan,
      kategori: preset.kategori,
      waktu: preset.waktu,
      lokasi: preset.lokasi,
      sasaran_kelas: prev.sasaran_kelas || preset.sasaran_kelas,
      tujuan: preset.tujuan,
      uraian_kegiatan: preset.uraian_kegiatan,
      hasil_kegiatan: preset.hasil_kegiatan,
      status_keterlaksanaan: preset.status_keterlaksanaan
    }));
    showToast('success', `Template "${preset.nama_kegiatan}" dimuat!`);
  };

  // Save Pembiasaan Record
  const handleSavePembiasaan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pembiasaanFormData.nama_kegiatan.trim()) {
      showToast('error', 'Nama kegiatan pembiasaan wajib diisi');
      return;
    }

    setIsSavingPembiasaan(true);
    try {
      const storageKey = `laporan_pembiasaan_list_${activeMadrasahId || 'default'}`;
      let updatedList: PembiasaanItem[] = [];

      if (editingPembiasaanId) {
        updatedList = pembiasaanList.map(item => {
          if (item.id === editingPembiasaanId) {
            return {
              ...item,
              nama_kegiatan: pembiasaanFormData.nama_kegiatan,
              kategori: pembiasaanFormData.kategori,
              tanggal: pembiasaanFormData.tanggal,
              waktu: pembiasaanFormData.waktu,
              lokasi: pembiasaanFormData.lokasi,
              sasaran_kelas: pembiasaanFormData.sasaran_kelas,
              guru_pendamping: pembiasaanFormData.guru_pendamping,
              nip_pendamping: pembiasaanFormData.nip_pendamping,
              penandatangan_nama: pembiasaanFormData.guru_pendamping,
              penandatangan_nip: pembiasaanFormData.nip_pendamping,
              tujuan: pembiasaanFormData.tujuan,
              uraian_kegiatan: pembiasaanFormData.uraian_kegiatan,
              hasil_kegiatan: pembiasaanFormData.hasil_kegiatan,
              status_keterlaksanaan: pembiasaanFormData.status_keterlaksanaan,
              images: pembiasaanFormData.images,
              updated_at: new Date().toISOString()
            };
          }
          return item;
        });
        showToast('success', 'Jurnal pembiasaan berhasil diperbarui!');
      } else {
        const newItem: PembiasaanItem = {
          id: `pemb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          nama_kegiatan: pembiasaanFormData.nama_kegiatan,
          kategori: pembiasaanFormData.kategori,
          tanggal: pembiasaanFormData.tanggal,
          waktu: pembiasaanFormData.waktu,
          lokasi: pembiasaanFormData.lokasi,
          sasaran_kelas: pembiasaanFormData.sasaran_kelas,
          guru_pendamping: pembiasaanFormData.guru_pendamping,
          nip_pendamping: pembiasaanFormData.nip_pendamping,
          penandatangan_nama: pembiasaanFormData.guru_pendamping,
          penandatangan_nip: pembiasaanFormData.nip_pendamping,
          tujuan: pembiasaanFormData.tujuan,
          uraian_kegiatan: pembiasaanFormData.uraian_kegiatan,
          hasil_kegiatan: pembiasaanFormData.hasil_kegiatan,
          status_keterlaksanaan: pembiasaanFormData.status_keterlaksanaan,
          images: pembiasaanFormData.images,
          created_at: new Date().toISOString()
        };
        updatedList = [newItem, ...pembiasaanList];
        showToast('success', 'Jurnal pembiasaan baru berhasil dicatat!');
      }

      setPembiasaanList(updatedList);
      localStorage.setItem(storageKey, JSON.stringify(updatedList));

      await supabase.from('site_settings').upsert({
        id: storageKey,
        value: updatedList,
        updated_at: new Date().toISOString()
      });

      setPembiasaanModalOpen(false);
    } catch (err: any) {
      console.error('Gagal menyimpan pembiasaan:', err);
      showToast('error', 'Gagal menyimpan data');
    } finally {
      setIsSavingPembiasaan(false);
    }
  };

  // Delete Pembiasaan Record
  const handleDeletePembiasaan = async (id: string, name: string) => {
    if (!window.confirm(`Hapus catatan pembiasaan "${name}"?`)) return;
    try {
      const storageKey = `laporan_pembiasaan_list_${activeMadrasahId || 'default'}`;
      const updated = pembiasaanList.filter(item => item.id !== id);
      setPembiasaanList(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));

      await supabase.from('site_settings').upsert({
        id: storageKey,
        value: updated,
        updated_at: new Date().toISOString()
      });

      showToast('success', 'Jurnal pembiasaan berhasil dihapus');
    } catch (e) {
      showToast('error', 'Gagal menghapus jurnal pembiasaan');
    }
  };

  // Handle Image Upload for LCKH
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `lckh_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
      const url = await uploadImageToStorage(compressed, fileName, 'lckh');
      if (url) {
        setLckhFormData(prev => ({ ...prev, foto_url: url }));
        showToast('success', 'Foto bukti kegiatan berhasil diunggah!');
      }
    } catch (err) {
      console.error('Upload LCKH photo error:', err);
      showToast('error', 'Gagal mengunggah foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Image Upload for Pembiasaan
  const handlePembiasaanImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPembiasaanPhoto(true);
    try {
      const uploadedUrls: string[] = [...(pembiasaanFormData.images || [])];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file);
        const fileName = `pembiasaan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
        const url = await uploadImageToStorage(compressed, fileName, 'pembiasaan');
        if (url) {
          uploadedUrls.push(url);
        }
      }
      setPembiasaanFormData(prev => ({ ...prev, images: uploadedUrls }));
      showToast('success', 'Foto dokumentasi pembiasaan berhasil diunggah!');
    } catch (err) {
      console.error('Upload pembiasaan photo error:', err);
      showToast('error', 'Gagal mengunggah foto pembiasaan');
    } finally {
      setUploadingPembiasaanPhoto(false);
    }
  };

  // Change PIN handler
  const handleSaveNewPin = async () => {
    setPinError('');
    setPinSuccess('');

    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      setPinError('PIN harus berupa 4-6 digit angka');
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setPinError('PIN hanya boleh berisi angka');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Konfirmasi PIN tidak cocok');
      return;
    }

    setIsSavingPin(true);
    try {
      const success = await updateTeacherPin(newPin);
      if (success) {
        setPinSuccess('PIN Pendidik berhasil diperbarui!');
        setNewPin('');
        setConfirmPin('');
        setTimeout(() => {
          setPinModalOpen(false);
          setPinSuccess('');
        }, 1500);
      } else {
        setPinError('Gagal mengubah PIN');
      }
    } catch (err: any) {
      setPinError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSavingPin(false);
    }
  };

  const teacherModules = [
    {
      id: 'lckh',
      title: 'LCKH Guru (Laporan Capaian Kinerja Harian)',
      subtitle: 'Input kegiatan harian, upload foto dokumentasi, cetak SPTJM & rekapitulasi bulanan.',
      icon: ClipboardList,
      path: '/lckh',
      color: 'from-emerald-500 to-teal-700',
      tag: 'Prioritas Utama',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      actionText: 'Buka Jurnal LCKH',
      onCreate: handleOpenCreateLckh
    },
    {
      id: 'pembiasaan',
      title: 'Jurnal Pembiasaan Karakter Siswa',
      subtitle: 'Pencatatan kegiatan harian keagamaan: Tadarus, Shalat Dhuha, Berjamaah, dan Infaq.',
      icon: HeartHandshake,
      path: '/pembiasaan',
      color: 'from-rose-500 to-pink-700',
      tag: 'Karakter & Ibadah',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      actionText: 'Buka Jurnal Pembiasaan',
      onCreate: handleOpenCreatePembiasaan
    },
    {
      id: 'bedah-cp',
      title: 'Bedah CP & Pemetaan TP/ATP (KMA 450)',
      subtitle: 'Penyusunan Capaian Pembelajaran, Tujuan Pembelajaran & Alur Tujuan Pembelajaran.',
      icon: BookMarked,
      path: '/bedah-cp',
      color: 'from-indigo-500 to-blue-700',
      tag: 'Kurikulum Merdeka',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      actionText: 'Buka Bedah CP',
      onCreate: () => handleModuleClick('/bedah-cp')
    },
    {
      id: 'kisi-kisi',
      title: 'Kisi-Kisi & Bank Soal Asesmen',
      subtitle: 'Penyusunan instrumen soal ujian (PG, Isian, Uraian) berbasis kisi-kisi dan cetak naskah soal.',
      icon: FileSpreadsheet,
      path: '/kisi-kisi',
      color: 'from-purple-500 to-violet-700',
      tag: 'Evaluasi Pembelajaran',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      actionText: 'Buka Kisi-Kisi & Soal',
      onCreate: () => handleModuleClick('/kisi-kisi')
    },
    {
      id: 'cover',
      title: 'Generator Cover Perangkat Pembelajaran',
      subtitle: 'Pembuat sampul resmi RPP/Modul Ajar, Silabus, dan Dokumen Administrasi Guru.',
      icon: Layout,
      path: '/cover-generator',
      color: 'from-amber-500 to-orange-700',
      tag: 'Sampul & Berkas',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      actionText: 'Buat Sampul Cover',
      onCreate: () => handleModuleClick('/cover-generator')
    },
    {
      id: 'nilai',
      title: 'Input Nilai Formatif & Sumatif',
      subtitle: 'Pengisian nilai capaian TP, SAS (Sumatif Akhir Semester), dan deskripsi nilai rapor.',
      icon: UserCheck2,
      path: '/input-nilai',
      color: 'from-cyan-500 to-sky-700',
      tag: 'Penilaian Akademik',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      actionText: 'Input Nilai Siswa',
      onCreate: () => handleModuleClick('/input-nilai')
    },
    {
      id: 'ai-teaching',
      title: 'AI Teaching Assistant & Perangkat Ajar',
      subtitle: 'Asisten AI untuk merancang modul ajar, materi interaktif, rubrik penilaian, dan bahan tayang.',
      icon: Sparkles,
      path: '/ai-teaching',
      color: 'from-teal-500 to-emerald-700',
      tag: 'Kecerdasan Buatan',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      actionText: 'Buka AI Teaching',
      onCreate: () => handleModuleClick('/ai-teaching')
    },
    {
      id: 'teaching-aids',
      title: 'Alat Bantu Mengajar & Flashcard Interaktif',
      subtitle: 'Media pembelajaran audio-visual interaktif dengan ilustrasi dan suara pendukung.',
      icon: Presentation,
      path: '/teaching-aids',
      color: 'from-blue-500 to-indigo-700',
      tag: 'Media Kelas',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      actionText: 'Buka Alat Mengajar',
      onCreate: () => handleModuleClick('/teaching-aids')
    },
    {
      id: 'prestasi',
      title: 'Galeri Prestasi & Kejuaraan Siswa',
      subtitle: 'Daftar rekapitulasi prestasi kejuaraan, piagam penghargaan resmi siswa, dan dokumentasi piala.',
      icon: Trophy,
      path: '/prestasi',
      color: 'from-amber-500 to-yellow-700',
      tag: 'Hall of Fame',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      actionText: 'Lihat Prestasi Siswa',
      onCreate: () => handleModuleClick('/prestasi')
    },
    {
      id: 'exam-cards',
      title: 'Cetak Kartu Peserta Ujian / TKAD',
      subtitle: 'Cetak kartu tes kendali mutu dan asesmen siswa per rombel lengkap dengan foto.',
      icon: Award,
      path: '/exam-cards',
      color: 'from-fuchsia-500 to-pink-700',
      tag: 'Kartu Asesmen',
      badgeColor: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
      actionText: 'Cetak Kartu Ujian',
      onCreate: () => handleModuleClick('/exam-cards')
    }
  ];

  const handleModuleClick = (path: string) => {
    if (!isAuthenticated) {
      openTeacherModal(() => {
        navigate(path);
      });
      return;
    }
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-200/40 text-slate-800 flex flex-col pt-20">
      <SEO 
        title="Ruang Kerja Guru & Pendidik Mandiri - Si@Kad Madrasah"
        description="Portal pengerjaan dokumen administrasi guru, LCKH harian, jurnal pembiasaan, bedah CP, kisi-kisi soal, dan cover perangkat pembelajaran."
      />
      <Navbar />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold text-white ${toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Back Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3.5 sm:px-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-bold text-xs rounded-xl h-9 px-3.5 flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" /> Kembali
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-xs rounded-xl h-9 px-3.5 flex items-center gap-1.5 shadow-xs"
            >
              <Home className="w-4 h-4 text-emerald-600" /> Beranda
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-bold px-3 py-1 rounded-xl">
              T.P. {currentYear} • Semester {currentSemester}
            </Badge>
          </div>
        </div>

        {/* Identity & Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-950 text-white p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-semibold">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span>Portal Administrasi Mandiri Pendidik</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Ruang Kerja Guru & Pendidik
              </h1>
              <p className="text-sm text-emerald-100 max-w-2xl leading-relaxed">
                Platform terpadu untuk menyusun modul ajar, mencatat LCKH harian, mengisi jurnal pembiasaan karakter, menyusun kisi-kisi soal, dan mengelola nilai siswa secara mandiri.
              </p>
            </div>

            {/* Teacher Profile Widget */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-[280px]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Status Akun</span>
                  {isAuthenticated ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                      <Unlock className="w-3 h-3" /> Terverifikasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-200 border border-amber-400/30">
                      <Lock className="w-3 h-3" /> Belum Login
                    </span>
                  )}
                </div>

                {isAuthenticated && currentTeacher ? (
                  <div className="mt-2">
                    <h3 className="font-bold text-base text-white">{currentTeacher.nama}</h3>
                    <p className="text-xs text-emerald-200 font-mono">NIP: {currentTeacher.nip || '-'}</p>
                    <p className="text-xs text-emerald-300 mt-0.5">
                      {currentTeacher.jabatan || 'Guru Pendidik'} {currentTeacher.kelas ? `• Kelas ${currentTeacher.kelas}` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-100 mt-2">
                    Silakan masuk dengan PIN untuk mengaktifkan sinkronisasi otomatis nama & NIP pada seluruh dokumen perangkat ajar.
                  </p>
                )}
              </div>

              <div>
                {isAuthenticated && currentTeacher ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setPinModalOpen(true)}
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-300" /> Ubah PIN
                      </Button>
                      <Button
                        onClick={() => openTeacherModal()}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl"
                      >
                        Ganti Guru
                      </Button>
                      <Button
                        onClick={logoutTeacher}
                        size="sm"
                        variant="destructive"
                        className="px-2.5 rounded-xl text-xs font-semibold"
                        title="Keluar Sesi Guru"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => openTeacherModal()}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    <UserCheck2 className="w-4 h-4" /> Masuk dengan PIN Guru
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Bar for Instant Creation across ALL Modules */}
        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Menu Cepat Buat & Catat Dokumen Pendidik</h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Akses langsung pembuatan dokumen di setiap modul yang terhubung ke profil Anda</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5 pt-2 border-t border-slate-100">
            {/* 1. LCKH */}
            <button
              onClick={handleOpenCreateLckh}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 hover:bg-emerald-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-emerald-950 truncate">+ Catat LCKH</div>
                <div className="text-[10px] text-emerald-700/80 truncate">Kinerja Harian</div>
              </div>
            </button>

            {/* 2. Pembiasaan */}
            <button
              onClick={handleOpenCreatePembiasaan}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-rose-200/90 bg-rose-50/70 hover:bg-rose-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-rose-950 truncate">+ Pembiasaan</div>
                <div className="text-[10px] text-rose-700/80 truncate">Karakter & Ibadah</div>
              </div>
            </button>

            {/* 3. Cover */}
            <button
              onClick={() => handleModuleClick('/cover-generator')}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/70 hover:bg-amber-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Layout className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-amber-950 truncate">+ Buat Cover</div>
                <div className="text-[10px] text-amber-700/80 truncate">Sampul Modul</div>
              </div>
            </button>

            {/* 4. Kisi-Kisi */}
            <button
              onClick={() => handleModuleClick('/kisi-kisi')}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-purple-200/90 bg-purple-50/70 hover:bg-purple-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-purple-950 truncate">+ Kisi-Kisi</div>
                <div className="text-[10px] text-purple-700/80 truncate">Bank & Soal Ujian</div>
              </div>
            </button>

            {/* 5. Bedah CP */}
            <button
              onClick={() => handleModuleClick('/bedah-cp')}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-indigo-200/90 bg-indigo-50/70 hover:bg-indigo-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <BookMarked className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-indigo-950 truncate">+ Bedah CP</div>
                <div className="text-[10px] text-indigo-700/80 truncate">TP / ATP (KMA 450)</div>
              </div>
            </button>

            {/* 6. Input Nilai */}
            <button
              onClick={() => handleModuleClick('/input-nilai')}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-cyan-200/90 bg-cyan-50/70 hover:bg-cyan-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <UserCheck2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-cyan-950 truncate">+ Input Nilai</div>
                <div className="text-[10px] text-cyan-700/80 truncate">Formatif & SAS</div>
              </div>
            </button>

            {/* 7. AI Teaching */}
            <button
              onClick={() => handleModuleClick('/ai-teaching')}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-teal-200/90 bg-teal-50/70 hover:bg-teal-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-teal-950 truncate">+ AI Assistant</div>
                <div className="text-[10px] text-teal-700/80 truncate">Modul & Rubrik</div>
              </div>
            </button>

            {/* 8. Media Flashcard */}
            <button
              onClick={() => handleModuleClick('/teaching-aids')}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-blue-200/90 bg-blue-50/70 hover:bg-blue-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Presentation className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-blue-950 truncate">+ Flashcard</div>
                <div className="text-[10px] text-blue-700/80 truncate">Media Audio-Visual</div>
              </div>
            </button>

            {/* 9. Prestasi Siswa */}
            <button
              onClick={() => handleModuleClick('/prestasi')}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-yellow-200/90 bg-yellow-50/70 hover:bg-yellow-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-yellow-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-yellow-950 truncate">+ Prestasi</div>
                <div className="text-[10px] text-yellow-700/80 truncate">Piagam Kejuaraan</div>
              </div>
            </button>

            {/* 10. Kartu Peserta Ujian */}
            <button
              onClick={() => handleModuleClick('/exam-cards')}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-fuchsia-200/90 bg-fuchsia-50/70 hover:bg-fuchsia-100/80 transition-all text-left group shadow-2xs hover:shadow-sm active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Award className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-fuchsia-950 truncate">+ Kartu Ujian</div>
                <div className="text-[10px] text-fuchsia-700/80 truncate">Asesmen & TKAD</div>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Navigation Workspace */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-slate-200/80 p-1 rounded-2xl h-auto border border-slate-300/60 inline-flex flex-nowrap sm:flex-wrap gap-1 min-w-full sm:min-w-0 sm:w-auto">
              <TabsTrigger value="modules" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs py-2 px-3 whitespace-nowrap">
                <FolderKanban className="w-3.5 h-3.5 mr-1.5" /> 10 Modul Pendidik
              </TabsTrigger>
              <TabsTrigger value="my-lckh" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs py-2 px-3 whitespace-nowrap">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Jurnal LCKH ({isAuthenticated ? myLckhItems.length : 0})
              </TabsTrigger>
              <TabsTrigger value="my-pembiasaan" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs py-2 px-3 whitespace-nowrap">
                <HeartHandshake className="w-3.5 h-3.5 mr-1.5" /> Jurnal Pembiasaan ({isAuthenticated ? myPembiasaanItems.length : 0})
              </TabsTrigger>
              <TabsTrigger value="my-documents" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs py-2 px-3 whitespace-nowrap">
                <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Arsip Dokumen ({isAuthenticated ? (myCoverItems.length + myKisiKisiItems.length) : 0})
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs py-2 px-3 whitespace-nowrap">
                <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Keamanan PIN
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: 10 MODULES BENTO GRID */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teacherModules.map((item) => {
                const Icon = item.icon;
                return (
                  <Card 
                    key={item.id}
                    className="group relative border border-slate-200/80 hover:border-emerald-500/60 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white flex flex-col justify-between hover:-translate-y-1"
                  >
                    <CardHeader className="p-5 pb-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${item.badgeColor}`}>
                          {item.tag}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {item.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.subtitle}
                        </CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-3">
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {item.onCreate ? (
                          <Button
                            size="sm"
                            onClick={item.onCreate}
                            className="text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white rounded-xl h-8 px-3 flex-1 flex items-center justify-center gap-1 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Buat / Catat Baru</span>
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModuleClick(item.path)}
                          className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 rounded-xl h-8 px-3 flex items-center gap-1"
                        >
                          <span>Buka Modul</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: MY LCKH JOURNAL */}
          <TabsContent value="my-lckh" className="space-y-4">
            <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                    Jurnal LCKH Pendidik: {isAuthenticated && currentTeacher ? currentTeacher.nama : 'Belum Login'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar kegiatan harian yang dibuat khusus untuk akun ini ({myLckhItems.length} catatan tersimpan tanpa tercampur guru lain)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleOpenCreateLckh}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 h-9 px-4"
                  >
                    <Plus className="w-4 h-4" /> + Catat LCKH Baru
                  </Button>
                  <Button
                    onClick={() => navigate('/lckh')}
                    variant="outline"
                    className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 h-9"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-600" /> Cetak LCKH & SPTJM
                  </Button>
                </div>
              </div>

              {!isAuthenticated ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Silakan Masuk Akun Guru Terlebih Dahulu</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Masukkan PIN pendidik untuk melihat dan mengelola catatan kegiatan harian Anda secara otomatis.
                  </p>
                  <Button
                    onClick={() => openTeacherModal()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5"
                  >
                    Masuk PIN Guru
                  </Button>
                </div>
              ) : loadingLckh ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">Memuat jurnal LCKH...</p>
                </div>
              ) : myLckhItems.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Belum ada catatan LCKH untuk akun ini</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Mulai catat aktivitas pembelajaran, tugas administrasi, atau asesmen hari ini dengan mudah.
                  </p>
                  <Button
                    onClick={handleOpenCreateLckh}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5"
                  >
                    + Buat Catatan Pertama
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10 text-center font-bold">No</TableHead>
                        <TableHead className="w-28 font-bold">Tanggal</TableHead>
                        <TableHead className="w-36 font-bold">Jenis Kegiatan</TableHead>
                        <TableHead className="min-w-[200px] font-bold">Uraian Aktivitas</TableHead>
                        <TableHead className="min-w-[160px] font-bold">Hasil / Output</TableHead>
                        <TableHead className="w-16 text-center font-bold">Foto</TableHead>
                        <TableHead className="w-36 text-center font-bold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myLckhItems.map((item, idx) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/80">
                          <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="whitespace-nowrap font-bold text-slate-800">
                            {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                              {item.jenis_kegiatan}
                            </Badge>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.tempat_kegiatan || 'Kelas'} • {item.volume || '1'}</div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-800 line-clamp-2">{item.kegiatan}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-slate-600 line-clamp-2">{item.hasil_capaian}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.foto_url ? (
                              <button
                                onClick={() => setSelectedPhotoModal(item.foto_url || null)}
                                className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center justify-center border border-emerald-200"
                                title="Lihat Foto"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDuplicateLckh(item)}
                                className="h-7 px-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-[11px] font-semibold"
                                title="Duplikat Kegiatan (Salin data untuk tanggal lain)"
                              >
                                <Copy className="w-3.5 h-3.5 text-blue-600" />
                                <span className="hidden sm:inline">Duplikat</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditLckh(item)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                title="Edit LCKH"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteLckh(item.id)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Hapus LCKH"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 3: MY PEMBIASAAN JOURNAL */}
          <TabsContent value="my-pembiasaan" className="space-y-4">
            <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-rose-600" />
                    Jurnal Pembiasaan Karakter & Ibadah: {isAuthenticated && currentTeacher ? currentTeacher.nama : 'Belum Login'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar kegiatan pembiasaan harian santri yang dicatat oleh akun ini ({myPembiasaanItems.length} kegiatan tersimpan)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleOpenCreatePembiasaan}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 h-9 px-4"
                  >
                    <Plus className="w-4 h-4" /> + Catat Pembiasaan Baru
                  </Button>
                  <Button
                    onClick={() => {
                      setPrintPembiasaanItem(null);
                      setPrintPembiasaanMode('rekap');
                      setPrintPembiasaanModalOpen(true);
                    }}
                    variant="outline"
                    className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 h-9"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-600" /> Cetak Rekap Jurnal
                  </Button>
                  <Button
                    onClick={() => navigate('/pembiasaan')}
                    variant="outline"
                    className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 h-9"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" /> Halaman Publik
                  </Button>
                </div>
              </div>

              {!isAuthenticated ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Silakan Masuk Akun Guru Terlebih Dahulu</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Masukkan PIN pendidik untuk mengelola catatan pembiasaan karakter dan ibadah santri.
                  </p>
                  <Button
                    onClick={() => openTeacherModal()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5"
                  >
                    Masuk PIN Guru
                  </Button>
                </div>
              ) : loadingPembiasaan ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">Memuat jurnal pembiasaan...</p>
                </div>
              ) : myPembiasaanItems.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Belum ada catatan pembiasaan untuk akun ini</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Catat aktivitas shalat dhuha, tadarus, shalat berjamaah, infaq, atau pembiasaan karakter lainnya.
                  </p>
                  <Button
                    onClick={handleOpenCreatePembiasaan}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl px-5"
                  >
                    + Catat Pembiasaan Pertama
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10 text-center font-bold">No</TableHead>
                        <TableHead className="w-28 font-bold">Tanggal</TableHead>
                        <TableHead className="w-36 font-bold">Kategori</TableHead>
                        <TableHead className="min-w-[200px] font-bold">Nama Kegiatan</TableHead>
                        <TableHead className="min-w-[160px] font-bold">Sasaran / Lokasi</TableHead>
                        <TableHead className="w-20 text-center font-bold">Status</TableHead>
                        <TableHead className="w-32 text-center font-bold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myPembiasaanItems.map((item, idx) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/80">
                          <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="whitespace-nowrap font-bold text-slate-800">
                            {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            <div className="text-[10px] text-slate-400 font-normal">{item.waktu || 'Pagi'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px]">
                              {item.kategori}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-slate-800 line-clamp-1">{item.nama_kegiatan}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.uraian_kegiatan || item.tujuan}</p>
                          </TableCell>
                          <TableCell>
                            <div className="text-slate-700 font-medium">{item.sasaran_kelas || 'Semua Siswa'}</div>
                            <div className="text-[10px] text-slate-400">{item.lokasi || 'Madrasah'}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                              {item.status_keterlaksanaan || 'Terlaksana'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditPembiasaan(item)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                title="Edit Jurnal"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setPrintPembiasaanItem(item);
                                  setPrintPembiasaanMode('single');
                                  setPrintPembiasaanModalOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                title="Cetak Lembar Kegiatan"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeletePembiasaan(item.id, item.nama_kegiatan)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Hapus Jurnal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 4: ARSIP DOKUMEN SAYA (COVERS, KISI-KISI, PERANGKAT AJAR) */}
          <TabsContent value="my-documents" className="space-y-6">
            <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                    Arsip Perangkat & Dokumen Khusus Akun: {isAuthenticated && currentTeacher ? currentTeacher.nama : 'Belum Login'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Koleksi sampul modul ajar, kisi-kisi soal, dan berkas yang dibuat oleh akun ini. Dokumen tidak tercampur dengan akun lain.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleModuleClick('/cover-generator')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 h-9"
                  >
                    <Layout className="w-3.5 h-3.5" /> + Cover Baru
                  </Button>
                  <Button
                    onClick={() => handleModuleClick('/kisi-kisi')}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 h-9"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> + Kisi-Kisi Baru
                  </Button>
                </div>
              </div>

              {!isAuthenticated ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Silakan Masuk Akun Guru Terlebih Dahulu</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Masukkan PIN pendidik untuk membuka arsip dokumen pembelajaran yang tersimpan khusus untuk akun Anda.
                  </p>
                  <Button
                    onClick={() => openTeacherModal()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5"
                  >
                    Masuk PIN Guru
                  </Button>
                </div>
              ) : (
                <div className="p-6 space-y-8">
                  {/* Isolation Assurance Badge */}
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-emerald-900">Arsip Terproteksi & Terisolasi Akun</h4>
                      <p className="text-xs text-emerald-800/90 leading-relaxed">
                        Anda sedang membuka dokumen atas nama <strong>{currentTeacher?.nama}</strong> (NIP: {currentTeacher?.nip}). Semua dokumen yang dibuat dari menu ini tersimpan eksklusif untuk profil Anda.
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Cover & Sampul Perangkat Ajar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Layout className="w-4 h-4 text-amber-600" />
                        Sampul & Cover Dokumen Pembelajaran ({myCoverItems.length})
                      </h4>
                      <Button
                        onClick={() => handleModuleClick('/cover-generator')}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-amber-700 hover:text-amber-800 font-bold"
                      >
                        Buka Generator Cover →
                      </Button>
                    </div>

                    {myCoverItems.length === 0 ? (
                      <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                        <p className="text-xs text-slate-500">Belum ada cover modul pembelajaran yang tersimpan untuk akun Anda.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {myCoverItems.map(cover => (
                          <Card key={cover.id} className="p-4 border border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <Badge className="bg-amber-100 text-amber-800 text-[10px]">{cover.category}</Badge>
                              <span className="text-[10px] text-slate-400 font-mono">{cover.year}</span>
                            </div>
                            <h5 className="font-bold text-xs text-slate-800 mt-2 line-clamp-1">{cover.title}</h5>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{cover.subtitle}</p>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Penyusun: {cover.author}</span>
                              <Button
                                onClick={() => navigate('/cover-generator')}
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] font-bold text-amber-700 border-amber-200 hover:bg-amber-50 rounded-lg px-2"
                              >
                                Lihat Cover
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Kisi-Kisi Soal Asesmen */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                        Kisi-Kisi & Butir Soal Asesmen ({myKisiKisiItems.length})
                      </h4>
                      <Button
                        onClick={() => handleModuleClick('/kisi-kisi')}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-purple-700 hover:text-purple-800 font-bold"
                      >
                        Buka Generator Kisi-Kisi →
                      </Button>
                    </div>

                    {myKisiKisiItems.length === 0 ? (
                      <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                        <p className="text-xs text-slate-500">Belum ada kisi-kisi atau butir soal yang tersimpan untuk akun Anda.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {myKisiKisiItems.map(kisi => (
                          <Card key={kisi.id} className="p-4 border border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <Badge className="bg-purple-100 text-purple-800 text-[10px]">{kisi.mata_pelajaran}</Badge>
                              <span className="text-[10px] text-slate-400">Fase {kisi.fase}</span>
                            </div>
                            <h5 className="font-bold text-xs text-slate-800 mt-2 line-clamp-1">{kisi.nama_ujian}</h5>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{kisi.materi_pokok}</p>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-500">No. {kisi.no_soal} ({kisi.bentuk_soal})</span>
                              <Button
                                onClick={() => navigate('/kisi-kisi')}
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] font-bold text-purple-700 border-purple-200 hover:bg-purple-50 rounded-lg px-2"
                              >
                                Lihat Naskah
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 5: PIN & SECURITY SETTINGS */}
          <TabsContent value="security" className="space-y-4">
            <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Manajemen Keamanan PIN Pendidik</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                      PIN digunakan untuk memproteksi akun Anda saat menyusun dokumen, nilai, LCKH, dan jurnal pembiasaan agar tidak dapat diubah oleh pihak yang tidak berwenang.
                    </p>
                  </div>
                </div>

                {!isAuthenticated ? (
                  <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-slate-600">Silakan login akun guru untuk mengubah PIN keamanan Anda.</p>
                    <Button onClick={() => openTeacherModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5">
                      Masuk PIN Guru
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4 max-w-md">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-xs text-slate-500 font-medium">Akun Terhubung:</span>
                        <p className="text-sm font-bold text-slate-900">{currentTeacher?.nama}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800">Aktif</Badge>
                    </div>

                    <Button
                      onClick={() => setPinModalOpen(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 flex items-center justify-center gap-2"
                    >
                      <KeyRound className="w-4 h-4 text-amber-300" />
                      <span>Ubah PIN Keamanan Guru</span>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* PIN Change Dialog */}
      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent className="max-w-sm p-6 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>Ubah PIN Guru</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Perbarui PIN keamanan 4-6 digit angka untuk akun {currentTeacher?.nama}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {pinError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}
            {pinSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pinSuccess}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">PIN Baru (4-6 Angka)</Label>
              <Input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Masukkan PIN baru"
                className="text-center font-mono tracking-widest text-base h-11 rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Konfirmasi PIN Baru</Label>
              <Input
                type="password"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ulangi PIN baru"
                className="text-center font-mono tracking-widest text-base h-11 rounded-xl border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPinModalOpen(false)}
              className="rounded-xl text-xs flex-1"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveNewPin}
              disabled={isSavingPin}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex-1"
            >
              {isSavingPin ? 'Menyimpan...' : 'Simpan PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LCKH Create & Edit Dialog */}
      <Dialog open={createLckhModalOpen} onOpenChange={setCreateLckhModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              <span>{editingLckhId ? 'Edit Catatan LCKH' : 'Catat Kegiatan LCKH Baru'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isi data kegiatan harian yang telah dilaksanakan untuk laporan kinerja bulanan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tanggal & Pendidik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CalendarHolidayPicker
                label="Tanggal Pelaksanaan"
                required
                value={lckhFormData.tanggal}
                onChange={(date) => {
                  setLckhFormData(prev => ({
                    ...prev,
                    tanggal: date,
                    kegiatan: prev.materi ? generateLckhActivityText(prev.materi, date) : generateLckhActivityText('', date)
                  }));
                }}
              />

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nama Guru / Pendidik *</Label>
                <Input
                  value={lckhFormData.nama_guru}
                  onChange={(e) => setLckhFormData({ ...lckhFormData, nama_guru: e.target.value })}
                  placeholder="Nama Lengkap Pendidik..."
                  className="h-10 text-xs rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">NIP / NUPTK / NPK</Label>
                <Input
                  value={lckhFormData.nip}
                  onChange={(e) => setLckhFormData({ ...lckhFormData, nip: e.target.value })}
                  placeholder="NIP / NUPTK..."
                  className="h-10 text-xs rounded-xl border-slate-200 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Jenis Kegiatan *</Label>
                <Select
                  value={lckhFormData.jenis_kegiatan}
                  onValueChange={(val) => setLckhFormData({ ...lckhFormData, jenis_kegiatan: val })}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200">
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

            {/* Tempat & Volume */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tempat Pelaksanaan</Label>
                <Input
                  value={lckhFormData.tempat_kegiatan}
                  onChange={(e) => setLckhFormData({ ...lckhFormData, tempat_kegiatan: e.target.value })}
                  placeholder="Contoh: Ruang Kelas 4, Lab Komputer, Musholla..."
                  className="h-10 text-xs rounded-xl border-slate-200"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {TEMPAT_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setLckhFormData({ ...lckhFormData, tempat_kegiatan: p })}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                        lckhFormData.tempat_kegiatan === p
                          ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Volume / Jam Pelajaran</Label>
                <Input
                  value={lckhFormData.volume}
                  onChange={(e) => setLckhFormData({ ...lckhFormData, volume: e.target.value })}
                  placeholder="Contoh: 2 JP, 4 JP, 1 Dokumen..."
                  className="h-10 text-xs rounded-xl border-slate-200"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {VOLUME_PRESETS.map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setLckhFormData({ ...lckhFormData, volume: v })}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                        lckhFormData.volume === v
                          ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field Materi Pembelajaran (Tidak ikut tercetak, auto-fill Uraian Kegiatan dengan awalan kegiatan harian) */}
            <div className="space-y-2 p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/70">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Topik / Materi Pembelajaran
                  </Label>
                  <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-300 text-[10px] py-0 px-2 font-semibold">
                    Tidak Ikut Tercetak
                  </Badge>
                </div>

                <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 bg-emerald-100/70 px-2.5 py-0.5 rounded-lg">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  Hari: <span className="font-bold text-emerald-900">{getIndonesianDayName(lckhFormData.tanggal) || '-'}</span>
                </div>
              </div>

              <Input
                value={lckhFormData.materi || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setLckhFormData(prev => ({
                    ...prev,
                    materi: val,
                    kegiatan: generateLckhActivityText(val, prev.tanggal),
                    hasil_capaian: prev.hasil_capaian || generateLckhOutputText(val)
                  }));
                }}
                placeholder="Ketik materi (misal: Rukun Iman, FPB & KPK, Operasi Pecahan, Surat Al-Kafirun)..."
                className="h-10 text-xs rounded-xl bg-white border-emerald-200 focus:border-emerald-500 font-medium"
              />

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-emerald-900">Pilih Model / Variasi Uraian:</span>
                  <span className="text-[10px] text-emerald-700 font-medium">Klik untuk mengganti gaya uraian:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLckhFormData(prev => ({
                        ...prev,
                        kegiatan: generateLckhActivityText(prev.materi || '', prev.tanggal, 'interaktif'),
                        hasil_capaian: generateLckhOutputText(prev.materi || '', 'interaktif')
                      }));
                      showToast('success', 'Uraian diubah ke Model Konsep & Interaktif.');
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-900 font-medium transition-colors"
                  >
                    📖 Konsep & Diskusi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLckhFormData(prev => ({
                        ...prev,
                        kegiatan: generateLckhActivityText(prev.materi || '', prev.tanggal, 'latihan'),
                        hasil_capaian: generateLckhOutputText(prev.materi || '', 'latihan')
                      }));
                      showToast('success', 'Uraian diubah ke Model Pemecahan Masalah & Latihan.');
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-900 font-medium transition-colors"
                  >
                    ✍️ Latihan Soal & LKS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLckhFormData(prev => ({
                        ...prev,
                        kegiatan: generateLckhActivityText(prev.materi || '', prev.tanggal, 'praktik'),
                        hasil_capaian: generateLckhOutputText(prev.materi || '', 'praktik')
                      }));
                      showToast('success', 'Uraian diubah ke Model Praktik & Unjuk Kerja.');
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-900 font-medium transition-colors"
                  >
                    🧪 Praktik & Unjuk Kerja
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLckhFormData(prev => ({
                        ...prev,
                        kegiatan: generateLckhActivityText(prev.materi || '', prev.tanggal, 'ringkas'),
                        hasil_capaian: generateLckhOutputText(prev.materi || '', 'ringkas')
                      }));
                      showToast('success', 'Uraian diubah ke format ringkas.');
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-900 font-medium transition-colors"
                  >
                    ⚡ Ringkas
                  </button>
                </div>

                <p className="text-[11px] text-emerald-700/90 leading-relaxed pt-1">
                  💡 <em>Otomatis mengikuti hari:</em> 
                  {getIndonesianDayName(lckhFormData.tanggal).toLowerCase() === 'senin' && ' Upacara bendera hari Senin.'}
                  {(['selasa', 'rabu', 'kamis'].includes(getIndonesianDayName(lckhFormData.tanggal).toLowerCase())) && ' Pembiasaan religi (Asmaul Husna & suratan pendek).'}
                  {getIndonesianDayName(lckhFormData.tanggal).toLowerCase() === 'jumat' && ' Pembiasaan membaca surat Yasin & tahlil bersama.'}
                  {getIndonesianDayName(lckhFormData.tanggal).toLowerCase() === 'sabtu' && ' Kegiatan senam kesegaran jasmani.'}
                </p>
              </div>
            </div>

            {/* Uraian Kegiatan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Uraian Kegiatan Pembelajaran / Administrasi *</Label>
                <span className="text-[10px] text-slate-400">Ikut dicetak pada tabel LCKH</span>
              </div>
              <Textarea
                rows={3}
                value={lckhFormData.kegiatan}
                onChange={(e) => setLckhFormData({ ...lckhFormData, kegiatan: e.target.value })}
                placeholder="Tuliskan secara jelas kegiatan yang dilaksanakan, pembiasaan harian, materi ajar, dan aktivitas peserta didik..."
                className="text-xs rounded-xl border-slate-200 font-normal"
              />
            </div>

            {/* Hasil / Output */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Hasil / Capaian Pembelajaran / Output Kinerja *</Label>
                <span className="text-[10px] text-slate-400">Ikut dicetak pada tabel LCKH</span>
              </div>
              <Textarea
                rows={2}
                value={lckhFormData.hasil_capaian}
                onChange={(e) => setLckhFormData({ ...lckhFormData, hasil_capaian: e.target.value })}
                placeholder="Contoh: Peserta didik memahami materi pecahan dengan baik serta menyelesaikan latihan tugas..."
                className="text-xs rounded-xl border-slate-200"
              />
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Keterangan / Catatan Tambahan</Label>
              <Input
                value={lckhFormData.keterangan}
                onChange={(e) => setLckhFormData({ ...lckhFormData, keterangan: e.target.value })}
                placeholder="Contoh: Terlaksana dengan baik, tuntas 100%..."
                className="h-10 text-xs rounded-xl border-slate-200"
              />
            </div>

            {/* Upload Foto Dokumentasi */}
            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" /> Foto Bukti Kegiatan (Opsional)
              </Label>
              
              {lckhFormData.foto_url ? (
                <div className="relative inline-block mt-2">
                  <img
                    src={formatImageUrl(lckhFormData.foto_url)}
                    alt="Preview Dokumentasi"
                    className="h-28 w-44 object-cover rounded-xl border border-slate-300 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setLckhFormData({ ...lckhFormData, foto_url: '' })}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700"
                    title="Hapus foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 cursor-pointer bg-white transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">
                      {uploadingPhoto ? 'Mengompres foto...' : 'Unggah Foto Dokumentasi'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP (Otomatis dikompres)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateLckhModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveLckh}
              disabled={isSavingLckh}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5 shadow-md flex items-center gap-1.5"
            >
              {isSavingLckh ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingLckhId ? 'Simpan Perubahan' : 'Simpan LCKH Baru'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pembiasaan Create & Edit Dialog */}
      <Dialog open={pembiasaanModalOpen} onOpenChange={setPembiasaanModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-rose-600" />
              <span>{editingPembiasaanId ? 'Edit Jurnal Pembiasaan Santri' : 'Catat Jurnal Pembiasaan Baru'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isi data kegiatan pembiasaan karakter & ibadah santri. Anda dapat memilih template otomatis di bawah.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Preset Selector */}
          {!editingPembiasaanId && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pilih Template Kegiatan Cepat:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {PRESET_PEMBIASAAN.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPresetPembiasaan(preset)}
                    className="text-[11px] font-medium bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 px-2.5 py-1 rounded-lg transition-all text-slate-700 cursor-pointer text-left"
                  >
                    {preset.nama_kegiatan}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSavePembiasaan} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nama Kegiatan Pembiasaan *</Label>
                <Input
                  required
                  value={pembiasaanFormData.nama_kegiatan}
                  onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, nama_kegiatan: e.target.value }))}
                  placeholder="Contoh: Sholat Dhuha Berjamaah & Doa Pagi"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Kategori</Label>
                <select
                  value={pembiasaanFormData.kategori}
                  onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, kategori: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white text-slate-800 font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  {['Ibadah & Spiritual', 'Karakter & Akhlak', 'Kesehatan & Lingkungan', 'Literasi & Bahasa', 'Kedisiplinan & 5S', 'Sosial & Kepedulian', 'Nasionalisme & Karakter'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div>
                <CalendarHolidayPicker
                  label="Tanggal Pelaksanaan"
                  required
                  value={pembiasaanFormData.tanggal}
                  onChange={(date) => setPembiasaanFormData(prev => ({ ...prev, tanggal: date }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Waktu Pelaksanaan</Label>
                <Input
                  value={pembiasaanFormData.waktu}
                  onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, waktu: e.target.value }))}
                  placeholder="06:45 - 07:15 WIB"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Lokasi Pelaksanaan</Label>
                <Input
                  value={pembiasaanFormData.lokasi}
                  onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, lokasi: e.target.value }))}
                  placeholder="Musholla / Halaman / Kelas"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Sasaran Rombel / Kelas</Label>
                <Input
                  value={pembiasaanFormData.sasaran_kelas}
                  onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, sasaran_kelas: e.target.value }))}
                  placeholder="Semua Kelas (I - VI) atau Kelas IV"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Status Keterlaksanaan</Label>
                <select
                  value={pembiasaanFormData.status_keterlaksanaan}
                  onChange={(e: any) => setPembiasaanFormData(prev => ({ ...prev, status_keterlaksanaan: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white text-slate-800 font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="Terlaksana">Terlaksana Penuh</option>
                  <option value="Terlaksana Sebagian">Terlaksana Sebagian</option>
                  <option value="Tertunda">Tertunda / Dijadwalkan Ulang</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Guru Pendamping</Label>
                <Input
                  value={pembiasaanFormData.guru_pendamping}
                  onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, guru_pendamping: e.target.value }))}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">NIP Pendamping</Label>
                <Input
                  value={pembiasaanFormData.nip_pendamping}
                  onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, nip_pendamping: e.target.value }))}
                  className="rounded-xl text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Tujuan & Nilai Karakter</Label>
              <Textarea
                rows={2}
                value={pembiasaanFormData.tujuan}
                onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, tujuan: e.target.value }))}
                placeholder="Tujuan pembiasaan dan nilai karakter santri..."
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Uraian Pelaksanaan Kegiatan</Label>
              <Textarea
                rows={3}
                value={pembiasaanFormData.uraian_kegiatan}
                onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, uraian_kegiatan: e.target.value }))}
                placeholder="Rangkaian jalannya kegiatan..."
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Hasil & Capaian</Label>
              <Textarea
                rows={2}
                value={pembiasaanFormData.hasil_kegiatan}
                onChange={(e) => setPembiasaanFormData(prev => ({ ...prev, hasil_kegiatan: e.target.value }))}
                placeholder="Tingkat partisipasi santri dan evaluasi..."
                className="rounded-xl text-xs"
              />
            </div>

            {/* Foto Upload */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-rose-600" /> Foto Dokumentasi Pembiasaan
                </span>
                {uploadingPembiasaanPhoto && <span className="text-[10px] text-rose-600 font-normal animate-pulse">Mengunggah Foto...</span>}
              </Label>

              {pembiasaanFormData.images && pembiasaanFormData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {pembiasaanFormData.images.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300">
                      <img src={formatImageUrl(url)} alt="Foto Dokumentasi" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPembiasaanFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                        className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-xs">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Unggah Foto dari Perangkat</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePembiasaanImageUpload}
                  disabled={uploadingPembiasaanPhoto}
                  className="hidden"
                />
              </label>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPembiasaanModalOpen(false)}
                className="text-xs rounded-xl h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSavingPembiasaan || uploadingPembiasaanPhoto}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-9 px-5 flex items-center gap-1.5"
              >
                {isSavingPembiasaan ? 'Menyimpan...' : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Simpan Jurnal Pembiasaan
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Modal Preview */}
      <Dialog open={!!selectedPhotoModal} onOpenChange={() => setSelectedPhotoModal(null)}>
        <DialogContent className="max-w-2xl p-4 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" /> Foto Bukti Kegiatan LCKH
            </DialogTitle>
          </DialogHeader>
          {selectedPhotoModal && (
            <div className="mt-2 bg-slate-50 rounded-xl p-2 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img 
                src={formatImageUrl(selectedPhotoModal)} 
                alt="Dokumentasi LCKH" 
                className="max-h-[65vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          )}
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setSelectedPhotoModal(null)} className="rounded-xl text-xs">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cetak Pembiasaan Modal */}
      {printPembiasaanModalOpen && (
        <CetakLaporanPembiasaan
          item={printPembiasaanItem || undefined}
          itemsList={pembiasaanList}
          mode={printPembiasaanMode}
          onClose={() => {
            setPrintPembiasaanModalOpen(false);
            setPrintPembiasaanItem(null);
          }}
        />
      )}

      {/* Teacher Auth Dialog */}
      <TeacherAuthModal />

      <Footer />
    </div>
  );
};

export default RuangGuruPublic;
