"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  HeartHandshake, Search, Calendar, Clock, MapPin, Users,
  Printer, ArrowLeft, Image as ImageIcon, Eye, CheckCircle2,
  Sparkles, Filter, FileSpreadsheet, Layers, ShieldCheck, ChevronRight,
  ArrowUp, ChevronUp, Home, Plus, Pencil, Trash2, UploadCloud, X,
  UserCheck, AlertCircle, RefreshCw, Check, BookOpen
} from 'lucide-react';
import CetakLaporanPembiasaan, { PembiasaanItem } from '@/components/CetakLaporanPembiasaan';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import { formatImageUrl, compressImage, uploadImageToStorage } from '@/utils/imageCompression';
import { showSuccess, showError } from '@/utils/toast';
import CalendarHolidayPicker from '@/components/CalendarHolidayPicker';

const KATEGORI_LIST = [
  'Semua',
  'Ibadah & Spiritual',
  'Karakter & Akhlak',
  'Kesehatan & Lingkungan',
  'Literasi & Bahasa',
  'Kedisiplinan & 5S',
  'Sosial & Kepedulian',
  'Nasionalisme & Karakter'
];

const PRESET_TEMPLATES = [
  {
    nama_kegiatan: "Sholat Dhuha Berjamaah & Doa Pagi",
    kategori: "Ibadah & Spiritual",
    waktu: "06:45 - 07:15 WIB",
    lokasi: "Musholla / Masjid Madrasah",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Membiasakan peserta didik melaksanakan sholat sunnah Dhuha secara istiqomah, membaca doa pagi, dan menumbuhkan kecintaan pada ibadah harian sejak dini.",
    uraian_kegiatan: "Siswa berwudhu dengan tertib, menempati shaf sholat secara rapi, dilanjutkan Sholat Dhuha 4 rakaat dipimpin oleh Imam Guru Piket. Setelah sholat, bersama-sama melafalkan Dzikir Pagi, Asmaul Husna, dan doa memohon kemudahan belajar.",
    hasil_kegiatan: "Seluruh siswa mengikuti dengan khusyuk dan tertib. Kesadaran beribadah dan disiplin wudhu semakin meningkat.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Tadarus Al-Qur'an / Juz 'Amma / Tahfidz Harian",
    kategori: "Ibadah & Spiritual",
    waktu: "07:15 - 07:35 WIB",
    lokasi: "Ruang Kelas Masing-masing",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Meningkatkan kelancaran membaca Al-Qur'an dengan tartil, hafalan surat-surat pendek Juz 30, serta menanamkan adab terhadap kitab suci.",
    uraian_kegiatan: "Kegiatan dipandu oleh Wali Kelas. Siswa membaca bersama surat pilihan sesuai target kurikulum madrasah, dilanjutkan setoran hafalan mandiri secara bergantian.",
    hasil_kegiatan: "Target hafalan surat harian tercapai 95%, kefasihan makharijul huruf siswa menunjukkan kemajuan yang signifikan.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Sholat Dzuhur Berjamaah & Kultum Siswa",
    kategori: "Ibadah & Spiritual",
    waktu: "12:00 - 12:40 WIB",
    lokasi: "Masjid / Musholla Madrasah",
    sasaran_kelas: "Kelas III, IV, V, VI",
    tujuan: "Membentuk kedisiplinan waktu sholat fardhu, melatih keberanian public speaking santri melalui kultum singkat, serta mempererat ukhuwah islamiyah.",
    uraian_kegiatan: "Adzan dan iqamah dikumandangkan oleh perwakilan santri putra, sholat berjamaah 4 rakaat, dzikir bada sholat, dan dilanjutkan penyampaian kultum 5 menit oleh perwakilan siswa berprestasi.",
    hasil_kegiatan: "Pelaksanaan tertib dan khidmat. Santri yang bertugas kultum mampu menyampaikan pesan akhlak dengan percaya diri.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Infaq & Sedekah Jumat Berkah",
    kategori: "Sosial & Kepedulian",
    waktu: "07:00 - 07:30 WIB",
    lokasi: "Halaman Utama Madrasah",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Melatih kepekaan sosial, sifat kedermawanan, serta memahami keutamaan sedekah di hari Jumat bagi sesama yang membutuhkan.",
    uraian_kegiatan: "Petugas OSIM/Kesiswaan mengedarkan kotak infaq kelas secara bergilir. Seluruh guru dan siswa berpartisipasi menyisihkan sebagian uang saku secara sukarela.",
    hasil_kegiatan: "Terkumpul dana infaq sosial yang langsung dibukukan oleh bendahara madrasah untuk santunan anak yatim dan operasional kepedulian sosial.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Upacara Bendera Hari Senin & Mars Madrasah",
    kategori: "Nasionalisme & Karakter",
    waktu: "07:00 - 07:45 WIB",
    lokasi: "Halaman Utama Madrasah",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Menumbuhkan jiwa patriotisme, nasionalisme, cinta tanah air, penghormatan kepada pahlawan, serta penguatan identitas santri madrasah.",
    uraian_kegiatan: "Pengibaran bendera Merah Putih diiringi Lagu Kebangsaan Indonesia Raya, pembacaan Teks Pancasila, UUD 1945, Janji Siswa Madrasah, Mars Madrasah, dan amanat Pembina Upacara.",
    hasil_kegiatan: "Upacara berjalan khidmat dan tertib. Petugas upacara menjalankan tugas dengan sangat disiplin dan rapi.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Senam Kesegaran Jasmani & Sarapan Sehat",
    kategori: "Kesehatan & Lingkungan",
    waktu: "06:45 - 07:45 WIB",
    lokasi: "Halaman Madrasah",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Menjaga kebugaran jasmani, mengedukasi gizi seimbang, serta membiasakan pola hidup bersih dan sehat (PHBS) di madrasah.",
    uraian_kegiatan: "Senam ceria dipandu instruktur guru olahraga, dilanjutkan cuci tangan pakai sabun bersama, berdoa, dan menikmati bekal sehat bernutrisi dari rumah.",
    hasil_kegiatan: "Siswa sangat antusias dan bersemangat. Seluruh siswa membawa bekal bergizi dan tertib mencuci tangan sebelum makan.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Gerakan Literasi 15 Menit & Pojok Baca",
    kategori: "Literasi & Bahasa",
    waktu: "07:00 - 07:15 WIB",
    lokasi: "Pojok Baca / Perpustakaan / Kelas",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Meningkatkan minat baca siswa, memperkaya wawasan pengetahuan umum & keagamaan, serta melatih kemampuan merangkum isi bacaan.",
    uraian_kegiatan: "Siswa memilih buku bacaan fiksi/non-fiksi di Pojok Baca kelas, membaca secara hening selama 15 menit, lalu mencatat ringkasan dan hikmah di Jurnal Literasi.",
    hasil_kegiatan: "Meningkatnya ketertarikan membaca santri, 100% siswa mengisi jurnal baca harian dengan ulasan positif.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Jumat Bersih & Operasi Semut (Go Green)",
    kategori: "Kesehatan & Lingkungan",
    waktu: "07:30 - 08:30 WIB",
    lokasi: "Seluruh Area Madrasah & Taman",
    sasaran_kelas: "Semua Kelas (I - VI)",
    tujuan: "Menanamkan nilai kebersihan sebagian dari iman, menjaga kelestarian lingkungan madrasah, dan melatih gotong royong.",
    uraian_kegiatan: "Siswa bersama guru membersihkan ruang kelas, menata taman madrasah, memilah sampah organik dan anorganik, serta merawat tanaman obat madrasah.",
    hasil_kegiatan: "Lingkungan madrasah menjadi asri, bersih, dan nyaman untuk proses pembelajaran.",
    status_keterlaksanaan: "Terlaksana" as const
  },
  {
    nama_kegiatan: "Pembiasaan Budaya 5S & Apel Pagi",
    kategori: "Kedisiplinan & 5S",
    waktu: "06:30 - 06:45 WIB",
    lokasi: "Gerbang Utama Madrasah",
    sasaran_kelas: "Semua Siswa",
    tujuan: "Menerapkan budaya Senyum, Salam, Sapa, Sopan, dan Santun serta kedisiplinan waktu kedatangan di madrasah.",
    uraian_kegiatan: "Guru piket menyambut kedatangan siswa di pintu gerbang dengan salam hangat, bersalaman, memeriksa kerapian seragam dan atribut sekolah.",
    hasil_kegiatan: "Hubungan hangat dan tawadhu antara siswa dan guru terjalin erat, tingkat kedisiplinan seragam mencapai 99%.",
    status_keterlaksanaan: "Terlaksana" as const
  }
];

export const PembiasaanPublic: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeMadrasah, activeMadrasahId } = useMadrasah();
  const { settings } = useSiteSettings();
  const { currentTeacher, isAuthenticated, openTeacherModal } = useTeacherAuth();

  const [items, setItems] = useState<PembiasaanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab View: All vs My Items
  const [activeTabScope, setActiveTabScope] = useState<'all' | 'mine'>('all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedBulan, setSelectedBulan] = useState('Semua');

  // Modal States
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState<PembiasaanItem | null>(null);
  const [printMode, setPrintMode] = useState<'single' | 'rekap'>('single');
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  // Form Modal States for Create / Edit
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
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

  // Scroll to top button visibility state
  const [showScrollTop, setShowScrollTop] = useState(false);

  const storageKey = `laporan_pembiasaan_list_${activeMadrasahId || 'default'}`;

  // Check URL params for ?action=create
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create') {
      handleOpenCreate();
    }
  }, [location.search]);

  // Sync Form when currentTeacher changes
  useEffect(() => {
    if (currentTeacher) {
      setFormData(prev => ({
        ...prev,
        guru_pendamping: currentTeacher.nama || prev.guru_pendamping,
        nip_pendamping: currentTeacher.nip || prev.nip_pendamping
      }));
    }
  }, [currentTeacher]);

  // Pastikan posisi scroll langsung ke atas saat halaman dimuat
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, []);

  // Deteksi event scroll untuk menampilkan tombol scroll ke atas
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  };

  // Helper to filter out legacy mock IDs
  const cleanMockItems = (rawList: PembiasaanItem[]): PembiasaanItem[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.filter(item => !['pemb-001', 'pemb-002', 'pemb-003'].includes(item.id));
  };

  const fetchPublicItems = async () => {
    setLoading(true);
    try {
      // 1. Try Supabase
      const { data: res } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', storageKey)
        .maybeSingle();

      if (res?.value && Array.isArray(res.value)) {
        const cleaned = cleanMockItems(res.value);
        setItems(cleaned);
        localStorage.setItem(storageKey, JSON.stringify(cleaned));
      } else {
        // 2. Try LocalStorage
        const local = localStorage.getItem(storageKey);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) {
              setItems(cleanMockItems(parsed));
              return;
            }
          } catch (e) {
            console.error('Error parsing local storage:', e);
          }
        }
        setItems([]);
      }
    } catch (err) {
      console.warn('Gagal memuat pembiasaan publik:', err);
      const local = localStorage.getItem(storageKey);
      if (local) {
        try {
          setItems(cleanMockItems(JSON.parse(local)));
        } catch {
          setItems([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicItems();
  }, [activeMadrasahId]);

  // Persist items to Supabase and LocalStorage
  const persistItems = async (updatedList: PembiasaanItem[]) => {
    setItems(updatedList);
    localStorage.setItem(storageKey, JSON.stringify(updatedList));

    try {
      await supabase
        .from('site_settings')
        .upsert({
          id: storageKey,
          value: updatedList,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Supabase sync warning (data tetap tersimpan di lokal):', error);
    }
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    if (!isAuthenticated) {
      openTeacherModal(() => {
        initCreateForm();
      });
      return;
    }
    initCreateForm();
  };

  const initCreateForm = () => {
    setEditingId(null);
    setFormData({
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
    setFormModalOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item: PembiasaanItem) => {
    if (!isAuthenticated) {
      openTeacherModal(() => {
        loadEditData(item);
      });
      return;
    }
    loadEditData(item);
  };

  const loadEditData = (item: PembiasaanItem) => {
    setEditingId(item.id);
    setFormData({
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
    setFormModalOpen(true);
  };

  // Apply Preset Template
  const applyPresetTemplate = (preset: typeof PRESET_TEMPLATES[0]) => {
    setFormData(prev => ({
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
    showSuccess(`Template "${preset.nama_kegiatan}" berhasil dimuat!`);
  };

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadedUrls: string[] = [...(formData.images || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file);
        const fileName = `pembiasaan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
        const url = await uploadImageToStorage(compressed, fileName, 'pembiasaan');
        if (url) {
          uploadedUrls.push(url);
        }
      }

      setFormData(prev => ({
        ...prev,
        images: uploadedUrls
      }));
      showSuccess('Foto dokumentasi berhasil diunggah!');
    } catch (err: any) {
      console.error('Upload foto pembiasaan gagal:', err);
      showError('Gagal mengunggah foto. Silakan coba lagi.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Save / Update Record
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kegiatan.trim()) {
      showError('Nama kegiatan wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      let updatedList: PembiasaanItem[] = [];

      if (editingId) {
        // Update Existing
        updatedList = items.map(item => {
          if (item.id === editingId) {
            return {
              ...item,
              nama_kegiatan: formData.nama_kegiatan,
              kategori: formData.kategori,
              tanggal: formData.tanggal,
              waktu: formData.waktu,
              lokasi: formData.lokasi,
              sasaran_kelas: formData.sasaran_kelas,
              guru_pendamping: formData.guru_pendamping,
              nip_pendamping: formData.nip_pendamping,
              penandatangan_nama: formData.guru_pendamping,
              penandatangan_nip: formData.nip_pendamping,
              tujuan: formData.tujuan,
              uraian_kegiatan: formData.uraian_kegiatan,
              hasil_kegiatan: formData.hasil_kegiatan,
              status_keterlaksanaan: formData.status_keterlaksanaan,
              images: formData.images,
              updated_at: new Date().toISOString()
            };
          }
          return item;
        });
        showSuccess('Jurnal pembiasaan berhasil diperbarui!');
      } else {
        // Create New Record
        const newItem: PembiasaanItem = {
          id: `pemb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          nama_kegiatan: formData.nama_kegiatan,
          kategori: formData.kategori,
          tanggal: formData.tanggal,
          waktu: formData.waktu,
          lokasi: formData.lokasi,
          sasaran_kelas: formData.sasaran_kelas,
          guru_pendamping: formData.guru_pendamping,
          nip_pendamping: formData.nip_pendamping,
          penandatangan_nama: formData.guru_pendamping,
          penandatangan_nip: formData.nip_pendamping,
          tujuan: formData.tujuan,
          uraian_kegiatan: formData.uraian_kegiatan,
          hasil_kegiatan: formData.hasil_kegiatan,
          status_keterlaksanaan: formData.status_keterlaksanaan,
          images: formData.images,
          created_at: new Date().toISOString()
        };
        updatedList = [newItem, ...items];
        showSuccess('Jurnal pembiasaan baru berhasil dicatat!');
      }

      await persistItems(updatedList);
      setFormModalOpen(false);
    } catch (err: any) {
      console.error('Gagal menyimpan jurnal pembiasaan:', err);
      showError('Gagal menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Record
  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus jurnal pembiasaan "${name}"?`)) {
      return;
    }
    const updated = items.filter(item => item.id !== id);
    await persistItems(updated);
    showSuccess('Jurnal pembiasaan berhasil dihapus');
  };

  // Extract unique months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    items.forEach(item => {
      if (item.tanggal) {
        const d = new Date(item.tanggal);
        const monthYear = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        months.add(monthYear);
      }
    });
    return Array.from(months);
  }, [items]);

  // Filtered for Current Teacher
  const myTeacherItems = useMemo(() => {
    if (!currentTeacher || !currentTeacher.nama) return [];
    const myName = currentTeacher.nama.toLowerCase().trim();
    const myNip = currentTeacher.nip && currentTeacher.nip !== '-' ? currentTeacher.nip.trim() : '';

    return items.filter(item => {
      const guru = (item.guru_pendamping || item.penandatangan_nama || '').toLowerCase().trim();
      const nip = (item.nip_pendamping || item.penandatangan_nip || '').trim();
      return guru.includes(myName) || (myNip && nip === myNip);
    });
  }, [items, currentTeacher]);

  // Filtered List based on scope & search
  const filteredItems = useMemo(() => {
    const baseList = activeTabScope === 'mine' ? myTeacherItems : items;

    return baseList.filter(item => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || 
        item.nama_kegiatan.toLowerCase().includes(q) ||
        item.guru_pendamping?.toLowerCase().includes(q) ||
        item.lokasi?.toLowerCase().includes(q) ||
        item.sasaran_kelas?.toLowerCase().includes(q) ||
        item.tujuan?.toLowerCase().includes(q);

      // Kategori
      const matchKategori = selectedKategori === 'Semua' || item.kategori === selectedKategori;

      // Bulan
      let matchBulan = true;
      if (selectedBulan !== 'Semua' && item.tanggal) {
        const itemMonthYear = new Date(item.tanggal).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        matchBulan = itemMonthYear === selectedBulan;
      }

      return matchQuery && matchKategori && matchBulan;
    });
  }, [items, myTeacherItems, activeTabScope, searchQuery, selectedKategori, selectedBulan]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative">
      <SEO 
        title="Jurnal & Laporan Pembiasaan Santri - Si@Kad Madrasah"
        description="Portal pencatatan kegiatan pembiasaan ibadah harian santri, penguatan karakter 5S, tadarus Qur'an, sholat dhuha, dan infaq berkah."
      />
      <Navbar />

      {/* Header Banner with top padding for fixed Navbar */}
      <div className="pt-24 sm:pt-28 md:pt-32 pb-6 md:pb-8 bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => navigate('/ruang-guru')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-white/20"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-300" />
                  <span>Kembali ke Ruang Guru</span>
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100 hover:text-white px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Beranda</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <HeartHandshake className="w-6 h-6 md:w-7 md:h-7 text-emerald-300" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                    <span>Jurnal Pembiasaan Santri</span>
                    {isAuthenticated && currentTeacher && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/40 text-emerald-100 border border-emerald-400/40 hidden sm:inline-block">
                        Akun: {currentTeacher.nama}
                      </span>
                    )}
                  </h1>
                  <p className="text-xs md:text-sm text-emerald-100 mt-0.5">
                    {activeMadrasah?.nama || 'Madrasah Ibtidaiyah'} — Jurnal Penguatan Karakter, Ibadah & Pembiasaan Harian
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Button & Security Indicator */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={handleOpenCreate}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Kegiatan Pembiasaan</span>
              </Button>

              <PrintSecurityIndicator documentTitle="Jurnal & Laporan Pembiasaan Santri" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrintItem(null);
                  setPrintMode('rekap');
                  setPrintModalOpen(true);
                }}
                className="text-xs h-9 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                <span>Cetak Rekap Jurnal</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1 w-full pb-32 lg:pb-24 space-y-6">
        
        {/* Tab Scopes: All vs My Items */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 sm:px-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTabScope('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabScope === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Pembiasaan ({items.length})</span>
            </button>

            {isAuthenticated && (
              <button
                onClick={() => setActiveTabScope('mine')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabScope === 'mine'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Jurnal Saya ({myTeacherItems.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Baru</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama kegiatan, guru pendamping, lokasi, rombel..."
                  className="pl-9 text-xs md:text-sm h-10 border-slate-200 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Month Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedBulan}
                  onChange={(e) => setSelectedBulan(e.target.value)}
                  className="w-full h-10 text-xs md:text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Semua">Semua Periode / Bulan</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedKategori}
                  onChange={(e) => setSelectedKategori(e.target.value)}
                  className="w-full h-10 text-xs md:text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {KATEGORI_LIST.map((k) => (
                    <option key={k} value={k}>{k === 'Semua' ? 'Semua Kategori' : k}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Kategori:
              </span>
              {KATEGORI_LIST.map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKategori(k)}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all text-xs whitespace-nowrap cursor-pointer ${
                    selectedKategori === k
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results Counter */}
        <div className="flex items-center justify-between">
          <p className="text-xs md:text-sm font-semibold text-slate-700">
            Menampilkan <span className="text-emerald-700 font-bold">{filteredItems.length}</span> kegiatan pembiasaan
            {activeTabScope === 'mine' && currentTeacher && <span className="text-slate-500 font-normal"> (milik {currentTeacher.nama})</span>}
          </p>
          {(searchQuery || selectedKategori !== 'Semua' || selectedBulan !== 'Semua') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedKategori('Semua');
                setSelectedBulan('Semua');
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Memuat jurnal pembiasaan santri...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-14 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
              <HeartHandshake className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Belum Ada Jurnal Pembiasaan</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {activeTabScope === 'mine'
                  ? 'Anda belum memiliki catatan kegiatan pembiasaan. Klik tombol di bawah untuk mencatat kegiatan ibadah & karakter baru.'
                  : 'Data kegiatan pembiasaan santri belum tersedia untuk filter ini. Silakan mulai input catatan pembiasaan.'}
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleOpenCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5 h-10 shadow-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> + Catat Kegiatan Pembiasaan Sekarang
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const coverImage = item.images && item.images.length > 0 ? item.images[0] : null;
              const isMyItem = currentTeacher && (
                (item.guru_pendamping || '').toLowerCase().includes(currentTeacher.nama.toLowerCase()) ||
                (currentTeacher.nip && currentTeacher.nip !== '-' && item.nip_pendamping === currentTeacher.nip)
              );
              
              return (
                <Card 
                  key={item.id}
                  className="bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all rounded-xl overflow-hidden flex flex-col group"
                >
                  {/* Photo Documentation Header */}
                  {coverImage ? (
                    <div className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer">
                      <img
                        src={formatImageUrl(coverImage)}
                        alt={item.nama_kegiatan}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onClick={() => setSelectedImageModal(coverImage)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-700/90 text-white rounded-md backdrop-blur-xs shadow-xs">
                          {item.kategori}
                        </span>
                        {item.images && item.images.length > 1 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-black/60 text-white rounded-md backdrop-blur-xs flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            +{item.images.length - 1} Foto
                          </span>
                        )}
                      </div>

                      {/* Bottom Date in Image */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
                        <span className="flex items-center gap-1 font-medium text-[11px] drop-shadow-xs">
                          <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                          {formatDate(item.tanggal)}
                        </span>
                        <span className="text-[11px] text-emerald-200 font-medium">
                          {item.waktu || 'Pagi'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                        {item.kategori}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        {formatDate(item.tanggal)}
                      </span>
                    </div>
                  )}

                  {/* Card Content */}
                  <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                          {item.nama_kegiatan}
                        </h3>
                      </div>

                      {/* Info Badges & Metadata */}
                      <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{item.lokasi || 'Madrasah'}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="font-medium text-slate-800 line-clamp-1">
                            Guru Pendamping: <strong className="text-emerald-800">{item.guru_pendamping || 'Tim Guru Piket'}</strong>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="text-slate-600">Sasaran: {item.sasaran_kelas || 'Semua Siswa'}</span>
                        </div>
                      </div>

                      {/* Tujuan / Uraian Ringkas */}
                      {(item.tujuan || item.uraian_kegiatan) && (
                        <p className="mt-3 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                          {item.tujuan || item.uraian_kegiatan}
                        </p>
                      )}
                    </div>

                    {/* Footer Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {item.status_keterlaksanaan || 'Terlaksana'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Edit & Delete for logged-in teacher or author */}
                        {isAuthenticated && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(item)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                              title="Edit Jurnal Pembiasaan"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteItem(item.id, item.nama_kegiatan)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Hapus Jurnal Pembiasaan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPrintItem(item);
                            setPrintMode('single');
                            setPrintModalOpen(true);
                          }}
                          className="text-xs h-7 px-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 flex items-center gap-1 cursor-pointer font-semibold rounded-lg"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Cetak</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          aria-label="Scroll ke Atas"
          className="fixed bottom-24 lg:bottom-12 right-4 sm:right-6 z-50 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center cursor-pointer border-2 border-white/50 backdrop-blur-xs group"
        >
          <ChevronUp className="w-5 h-5 group-hover:animate-bounce" />
          <span className="sr-only">Scroll ke Atas</span>
        </button>
      )}

      {/* Form Dialog for Create & Edit Pembiasaan */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <span>{editingId ? 'Edit Jurnal Pembiasaan Santri' : 'Catat Jurnal Pembiasaan Baru'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isi data kegiatan pembiasaan karakter & ibadah santri madrasah. Anda juga dapat memilih template otomatis di bawah.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Preset Selector */}
          {!editingId && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pilih Template Kegiatan Cepat (Otomatis):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {PRESET_TEMPLATES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPresetTemplate(preset)}
                    className="text-[11px] font-medium bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 px-2.5 py-1 rounded-lg transition-all text-slate-700 cursor-pointer text-left"
                  >
                    {preset.nama_kegiatan}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveForm} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Kegiatan */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Nama Kegiatan Pembiasaan <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={formData.nama_kegiatan}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama_kegiatan: e.target.value }))}
                  placeholder="Contoh: Sholat Dhuha Berjamaah & Doa Pagi"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Kategori Kegiatan</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData(prev => ({ ...prev, kategori: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  {KATEGORI_LIST.filter(k => k !== 'Semua').map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Tanggal */}
              <div>
                <CalendarHolidayPicker
                  label="Tanggal Pelaksanaan"
                  required
                  value={formData.tanggal}
                  onChange={(date) => setFormData(prev => ({ ...prev, tanggal: date }))}
                />
              </div>

              {/* Waktu */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Waktu / Jam Pelaksanaan</label>
                <Input
                  value={formData.waktu}
                  onChange={(e) => setFormData(prev => ({ ...prev, waktu: e.target.value }))}
                  placeholder="06:45 - 07:15 WIB"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              {/* Lokasi */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Lokasi / Tempat</label>
                <Input
                  value={formData.lokasi}
                  onChange={(e) => setFormData(prev => ({ ...prev, lokasi: e.target.value }))}
                  placeholder="Musholla / Halaman / Ruang Kelas"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              {/* Sasaran Kelas */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Sasaran Peserta / Rombel</label>
                <Input
                  value={formData.sasaran_kelas}
                  onChange={(e) => setFormData(prev => ({ ...prev, sasaran_kelas: e.target.value }))}
                  placeholder="Semua Kelas (I - VI) atau Kelas IV"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Status Keterlaksanaan</label>
                <select
                  value={formData.status_keterlaksanaan}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, status_keterlaksanaan: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Terlaksana">Terlaksana Penuh</option>
                  <option value="Terlaksana Sebagian">Terlaksana Sebagian</option>
                  <option value="Tertunda">Tertunda / Dijadwalkan Ulang</option>
                </select>
              </div>

              {/* Guru Pendamping */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Guru Pendamping / Wali Kelas</label>
                <Input
                  value={formData.guru_pendamping}
                  onChange={(e) => setFormData(prev => ({ ...prev, guru_pendamping: e.target.value }))}
                  placeholder="Nama Lengkap Guru"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              {/* NIP */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">NIP / NUPTK</label>
                <Input
                  value={formData.nip_pendamping}
                  onChange={(e) => setFormData(prev => ({ ...prev, nip_pendamping: e.target.value }))}
                  placeholder="-"
                  className="rounded-xl text-xs h-9"
                />
              </div>
            </div>

            {/* Tujuan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tujuan & Nilai Karakter</label>
              <Textarea
                rows={2}
                value={formData.tujuan}
                onChange={(e) => setFormData(prev => ({ ...prev, tujuan: e.target.value }))}
                placeholder="Tujuan pembiasaan karakter dan nilai spiritual yang ingin dicapai..."
                className="rounded-xl text-xs"
              />
            </div>

            {/* Uraian Kegiatan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Uraian Pelaksanaan Kegiatan</label>
              <Textarea
                rows={3}
                value={formData.uraian_kegiatan}
                onChange={(e) => setFormData(prev => ({ ...prev, uraian_kegiatan: e.target.value }))}
                placeholder="Rangkaian jalannya kegiatan dari awal sampai akhir..."
                className="rounded-xl text-xs"
              />
            </div>

            {/* Hasil Capaian */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Hasil & Evaluasi Ketercapaian</label>
              <Textarea
                rows={2}
                value={formData.hasil_kegiatan}
                onChange={(e) => setFormData(prev => ({ ...prev, hasil_kegiatan: e.target.value }))}
                placeholder="Tingkat partisipasi santri, ketertiban, dan capaian pembiasaan..."
                className="rounded-xl text-xs"
              />
            </div>

            {/* Upload Foto Dokumentasi */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" /> Foto Dokumentasi Kegiatan Pembiasaan
                </span>
                {uploadingImage && <span className="text-[10px] text-emerald-600 font-normal animate-pulse">Mengunggah & Mengompres Foto...</span>}
              </label>

              {/* Photo Thumbnails */}
              {formData.images && formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.images.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 group">
                      <img src={formatImageUrl(url)} alt="Foto Dokumentasi" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                        title="Hapus foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-xs">
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <span>Unggah Foto dari Perangkat</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormModalOpen(false)}
                className="text-xs rounded-xl h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving || uploadingImage}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-5 flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Simpan Jurnal Pembiasaan
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Lightbox */}
      {selectedImageModal && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-lg overflow-hidden flex flex-col items-center">
            <img
              src={formatImageUrl(selectedImageModal)}
              alt="Preview Dokumentasi"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-3 right-3 text-white bg-black/60 hover:bg-black/90 p-2 rounded-full text-xs font-bold cursor-pointer"
            >
              ✕ Tutup
            </button>
          </div>
        </div>
      )}

      {/* Cetak Modal Portal */}
      {printModalOpen && (
        <CetakLaporanPembiasaan
          item={printItem || undefined}
          itemsList={items}
          mode={printMode}
          onClose={() => {
            setPrintModalOpen(false);
            setPrintItem(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default PembiasaanPublic;
