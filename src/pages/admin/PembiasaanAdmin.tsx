"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  HeartHandshake, Plus, Pencil, Trash2, Printer, Search, Filter,
  Calendar, Clock, MapPin, Users, Sparkles, Image as ImageIcon,
  Upload, X, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet,
  BookOpen, Eye, ArrowRight, ArrowLeft, ShieldCheck, Check, Layers, ChevronDown,
  UploadCloud, Star, Maximize2, MoveLeft, MoveRight, UserCheck
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { compressImage, uploadImageToStorage } from '@/utils/imageCompression';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import CetakLaporanPembiasaan, { PembiasaanItem } from '@/components/CetakLaporanPembiasaan';
import { Teacher } from '@/pages/admin/TeachersAdmin';
import CalendarHolidayPicker from '@/components/CalendarHolidayPicker';
import * as XLSX from 'xlsx';

// Preset Template Kegiatan Pembiasaan Madrasah (Dapat dipilih secara opsional saat menambah data baru)
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

export const PembiasaanAdmin: React.FC = () => {
  const { activeMadrasah, activeMadrasahId } = useMadrasah();
  const { settings } = useSiteSettings();

  const [items, setItems] = useState<PembiasaanItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [selectedBulan, setSelectedBulan] = useState('Semua');

  // Modal Form States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PembiasaanItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  // Print Preview States
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState<PembiasaanItem | null>(null);
  const [printMode, setPrintMode] = useState<'single' | 'rekap'>('single');

  // Form Data State
  const [formData, setFormData] = useState<Partial<PembiasaanItem>>({
    nama_kegiatan: '',
    kategori: 'Ibadah & Spiritual',
    tanggal: new Date().toISOString().slice(0, 10),
    waktu: '06:45 - 07:15 WIB',
    lokasi: 'Musholla / Masjid Madrasah',
    sasaran_kelas: 'Semua Kelas (I - VI)',
    guru_pendamping: '',
    penandatangan_nama: '',
    penandatangan_nip: '',
    penandatangan_jabatan: '',
    jumlah_peserta: '',
    tujuan: '',
    uraian_kegiatan: '',
    hasil_kegiatan: '',
    status_keterlaksanaan: 'Terlaksana',
    images: [],
    is_featured_web: true
  });

  const storageKey = `laporan_pembiasaan_list_${activeMadrasahId || 'default'}`;

  // Helper to filter out legacy mock IDs
  const cleanMockItems = (rawList: PembiasaanItem[]): PembiasaanItem[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.filter(item => !['pemb-001', 'pemb-002', 'pemb-003'].includes(item.id));
  };

  // Fetch GTK Teachers for synchronization
  const fetchTeachers = async () => {
    try {
      const scopedKey = `data_guru_${activeMadrasahId || 'default'}`;
      const scopedCacheKey = `siakad_data_guru_${activeMadrasahId || 'default'}`;

      // 1. Try Supabase
      const { data: res } = await supabase
        .from('site_settings')
        .select('value')
        .in('id', [scopedKey, 'data_guru', scopedCacheKey, 'siakad_data_guru'])
        .limit(2);

      if (res && res.length > 0) {
        for (const row of res) {
          if (Array.isArray(row.value) && row.value.length > 0) {
            setTeachers(row.value);
            return;
          }
        }
      }

      // 2. Try LocalStorage
      const localKeys = [scopedCacheKey, scopedKey, 'siakad_data_guru', 'data_guru'];
      for (const key of localKeys) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTeachers(parsed);
              return;
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat data guru GTK:', err);
    }
  };

  // Fetch Data from Supabase with LocalStorage fallback
  const fetchItems = async () => {
    setLoading(true);
    try {
      // 1. Try Supabase
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', storageKey)
        .maybeSingle();

      if (!error && res?.value && Array.isArray(res.value)) {
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
              const cleaned = cleanMockItems(parsed);
              setItems(cleaned);
              localStorage.setItem(storageKey, JSON.stringify(cleaned));
              return;
            }
          } catch (e) {
            console.error('Error parsing local storage:', e);
          }
        }
        // 3. Clean initial state (empty)
        setItems([]);
        localStorage.setItem(storageKey, JSON.stringify([]));
      }
    } catch (err) {
      console.warn('Gagal load dari database, menggunakan fallback lokal:', err);
      const local = localStorage.getItem(storageKey);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setItems(cleanMockItems(parsed));
        } catch {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchTeachers();

    const handleTeacherUpdate = () => fetchTeachers();
    window.addEventListener('siakad_teachers_updated', handleTeacherUpdate);
    return () => {
      window.removeEventListener('siakad_teachers_updated', handleTeacherUpdate);
    };
  }, [activeMadrasahId]);

  // Save to database & localStorage
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

  // Open Dialog for New Item
  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      nama_kegiatan: '',
      kategori: 'Ibadah & Spiritual',
      tanggal: new Date().toISOString().slice(0, 10),
      waktu: '06:45 - 07:15 WIB',
      lokasi: 'Musholla / Masjid Madrasah',
      sasaran_kelas: 'Semua Kelas (I - VI)',
      guru_pendamping: 'Guru Piket & Tim Pembina',
      penandatangan_nama: '',
      penandatangan_nip: '',
      penandatangan_jabatan: 'Koordinator Pembiasaan',
      jumlah_peserta: 'Semua Siswa',
      tujuan: '',
      uraian_kegiatan: '',
      hasil_kegiatan: '',
      status_keterlaksanaan: 'Terlaksana',
      images: [],
      is_featured_web: true
    });
    setDialogOpen(true);
  };

  // Apply Preset Template
  const applyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      nama_kegiatan: preset.nama_kegiatan,
      kategori: preset.kategori,
      waktu: preset.waktu,
      lokasi: preset.lokasi,
      sasaran_kelas: preset.sasaran_kelas,
      tujuan: preset.tujuan,
      uraian_kegiatan: preset.uraian_kegiatan,
      hasil_kegiatan: preset.hasil_kegiatan,
      status_keterlaksanaan: preset.status_keterlaksanaan
    }));
    showSuccess(`Template "${preset.nama_kegiatan}" berhasil dimuat!`);
  };

  // AI Narrative Generator / Assistant
  const handleGenerateNarrative = () => {
    const nama = formData.nama_kegiatan || 'Pembiasaan Karakter Siswa';
    const kat = formData.kategori || 'Ibadah & Spiritual';
    const sasaran = formData.sasaran_kelas || 'Semua Kelas';

    const generatedTujuan = `Menanamkan nilai-nilai ${kat.toLowerCase()}, memperkuat karakter disiplin dan budi pekerti luhur peserta didik ${sasaran}, serta mewujudkan budaya madrasah yang religius, bersih, dan berakhlak mulia.`;
    const generatedUraian = `Kegiatan diawali dengan pengkondisian siswa di ${formData.lokasi || 'lingkungan madrasah'} tepat waktu. Siswa mengikuti rangkaian kegiatan dengan tertib di bawah bimbingan langsung ${formData.guru_pendamping || 'guru pendamping'}. Seluruh tahapan berjalan lancar dengan antusiasme santri yang sangat tinggi.`;
    const generatedHasil = `Kegiatan terlaksana 100% dengan baik. Peserta didik menunjukkan peningkatan sikap positif, kedisiplinan mandiri, dan penghayatan nilai ibadah secara konsisten.`;

    setFormData(prev => ({
      ...prev,
      tujuan: prev.tujuan || generatedTujuan,
      uraian_kegiatan: prev.uraian_kegiatan || generatedUraian,
      hasil_kegiatan: prev.hasil_kegiatan || generatedHasil
    }));

    showSuccess('Narasi deskripsi dan evaluasi otomatis berhasil dirumuskan!');
  };

  // Edit Item
  const handleEdit = (item: PembiasaanItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setDialogOpen(true);
  };

  // Delete Item
  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus laporan kegiatan pembiasaan ini?')) return;
    const updated = items.filter(it => it.id !== id);
    await persistItems(updated);
    showSuccess('Laporan pembiasaan berhasil dihapus');
  };

  // Save / Update Item
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kegiatan?.trim()) {
      showError('Nama kegiatan pembiasaan wajib diisi');
      return;
    }
    if (!formData.tanggal) {
      showError('Tanggal kegiatan wajib dipilih');
      return;
    }

    setSaving(true);
    try {
      let updated: PembiasaanItem[];
      if (editingItem) {
        updated = items.map(it => it.id === editingItem.id ? ({
          ...it,
          ...formData,
          updated_at: new Date().toISOString()
        } as PembiasaanItem) : it);
        showSuccess('Laporan pembiasaan berhasil diperbarui');
      } else {
        const newItem: PembiasaanItem = {
          id: `pemb-${Date.now()}`,
          nama_kegiatan: formData.nama_kegiatan || 'Kegiatan Pembiasaan',
          kategori: formData.kategori || 'Ibadah & Spiritual',
          tanggal: formData.tanggal || new Date().toISOString().slice(0, 10),
          waktu: formData.waktu || '06:45 - 07:15 WIB',
          lokasi: formData.lokasi || 'Madrasah',
          sasaran_kelas: formData.sasaran_kelas || 'Semua Kelas',
          guru_pendamping: formData.guru_pendamping || 'Guru Pembina Lapangan',
          penandatangan_nama: formData.penandatangan_nama || '',
          penandatangan_nip: formData.penandatangan_nip || '',
          penandatangan_jabatan: formData.penandatangan_jabatan || '',
          jumlah_peserta: formData.jumlah_peserta || 'Semua Siswa',
          tujuan: formData.tujuan || '',
          uraian_kegiatan: formData.uraian_kegiatan || '',
          hasil_kegiatan: formData.hasil_kegiatan || '',
          status_keterlaksanaan: formData.status_keterlaksanaan || 'Terlaksana',
          images: formData.images || [],
          is_featured_web: formData.is_featured_web ?? true,
          created_at: new Date().toISOString()
        };
        updated = [newItem, ...items];
        showSuccess('Laporan pembiasaan baru berhasil ditambahkan');
      }

      await persistItems(updated);
      setDialogOpen(false);
    } catch (err: any) {
      showError('Gagal menyimpan: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setSaving(false);
    }
  };

  // Helper promise for reading file as DataURL
  const readFileAsDataURL = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Process Multiple Files (from Input, Drag-Drop, or Clipboard)
  const processMultipleFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
      showError('Pilih file gambar (JPG, JPEG, PNG, WEBP, dll.)');
      return;
    }

    setUploading(true);
    setUploadProgress(`Menyiapkan ${validFiles.length} foto...`);

    try {
      const processedUrls: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress(`Memproses foto ke-${i + 1} dari ${validFiles.length}...`);
        
        try {
          // Compress image for optimal performance
          const compressed = await compressImage(file);
          const uploadedUrl = await uploadImageToStorage(compressed, 'pembiasaan');
          
          if (uploadedUrl) {
            processedUrls.push(uploadedUrl);
          } else {
            const dataUrl = await readFileAsDataURL(compressed);
            if (dataUrl) processedUrls.push(dataUrl);
          }
        } catch (err) {
          console.warn(`Fallback baca foto ${file.name}:`, err);
          const rawData = await readFileAsDataURL(file);
          if (rawData) processedUrls.push(rawData);
        }
      }

      if (processedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...processedUrls]
        }));
        showSuccess(`Berhasil menambahkan ${processedUrls.length} foto dokumentasi!`);
      }
    } catch (err) {
      showError('Gagal memproses beberapa foto sekaligus');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // Handle standard file input change
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processMultipleFiles(files);
    }
    e.target.value = '';
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processMultipleFiles(e.dataTransfer.files);
    }
  };

  // Paste image from clipboard
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        e.preventDefault();
        await processMultipleFiles(files);
      }
    }
  };

  // Photo Management Handlers
  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== index)
    }));
  };

  const clearAllImages = () => {
    if (window.confirm('Hapus semua foto dokumentasi yang telah dipilih?')) {
      setFormData(prev => ({ ...prev, images: [] }));
    }
  };

  const makeCoverImage = (index: number) => {
    if (index === 0) return;
    setFormData(prev => {
      const current = [...(prev.images || [])];
      const [selected] = current.splice(index, 1);
      return { ...prev, images: [selected, ...current] };
    });
    showSuccess('Foto dijadikan sampul utama!');
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setFormData(prev => {
      const current = [...(prev.images || [])];
      const targetIdx = direction === 'left' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= current.length) return prev;
      
      const temp = current[index];
      current[index] = current[targetIdx];
      current[targetIdx] = temp;
      return { ...prev, images: current };
    });
  };

  // Print Single Activity
  const openSinglePrint = (item: PembiasaanItem) => {
    setPrintItem(item);
    setPrintMode('single');
    setPrintModalOpen(true);
  };

  // Print Rekapitulasi Jurnal
  const openRekapPrint = () => {
    setPrintItem(null);
    setPrintMode('rekap');
    setPrintModalOpen(true);
  };

  // Export to Excel
  const handleExportExcelAll = () => {
    const dataToExport = filteredItems.map((it, idx) => ({
      'No': idx + 1,
      'Tanggal': it.tanggal,
      'Waktu': it.waktu || '-',
      'Nama Kegiatan Pembiasaan': it.nama_kegiatan,
      'Kategori': it.kategori,
      'Sasaran Kelas': it.sasaran_kelas,
      'Lokasi': it.lokasi || '-',
      'Guru Pendamping / PJ': it.guru_pendamping,
      'Jumlah Siswa': it.jumlah_peserta || 'Semua Siswa',
      'Status': it.status_keterlaksanaan || 'Terlaksana',
      'Tujuan': it.tujuan || '-',
      'Uraian Kegiatan': it.uraian_kegiatan || '-',
      'Hasil & Evaluasi': it.hasil_kegiatan || '-',
      'Jumlah Foto Dokumentasi': it.images ? it.images.length : 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Pembiasaan');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 16 },
      { wch: 34 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 26 },
      { wch: 16 },
      { wch: 16 },
      { wch: 36 },
      { wch: 45 },
      { wch: 36 },
      { wch: 12 },
    ];

    XLSX.writeFile(workbook, `Laporan_Pembiasaan_Madrasah_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showSuccess('File Excel Rekap Pembiasaan berhasil diunduh!');
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      // Search
      const matchSearch = !searchQuery || 
        it.nama_kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.guru_pendamping.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.lokasi && it.lokasi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (it.uraian_kegiatan && it.uraian_kegiatan.toLowerCase().includes(searchQuery.toLowerCase()));

      // Kategori
      const matchKategori = selectedKategori === 'Semua' || it.kategori === selectedKategori;

      // Status
      const matchStatus = selectedStatus === 'Semua' || it.status_keterlaksanaan === selectedStatus;

      // Bulan
      const matchBulan = selectedBulan === 'Semua' || (it.tanggal && it.tanggal.startsWith(selectedBulan));

      return matchSearch && matchKategori && matchStatus && matchBulan;
    });
  }, [items, searchQuery, selectedKategori, selectedStatus, selectedBulan]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = items.length;
    const terlaksana = items.filter(i => i.status_keterlaksanaan === 'Terlaksana').length;
    const totalFoto = items.reduce((acc, curr) => acc + (curr.images?.length || 0), 0);
    const persentase = total > 0 ? Math.round((terlaksana / total) * 100) : 100;
    
    // Category distribution
    const categoriesCount: Record<string, number> = {};
    items.forEach(i => {
      categoriesCount[i.kategori] = (categoriesCount[i.kategori] || 0) + 1;
    });
    let topKat = '-';
    let maxKat = 0;
    Object.entries(categoriesCount).forEach(([k, v]) => {
      if (v > maxKat) {
        maxKat = v;
        topKat = k;
      }
    });

    return { total, terlaksana, totalFoto, persentase, topKat };
  }, [items]);

  const categoriesList = [
    'Semua',
    'Ibadah & Spiritual',
    'Nasionalisme & Karakter',
    'Kesehatan & Lingkungan',
    'Literasi & Bahasa',
    'Sosial & Kepedulian',
    'Kedisiplinan & 5S'
  ];

  return (
    <AdminLayout title="Laporan Kegiatan Pembiasaan Siswa">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 max-w-2xl z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-semibold">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Modul Konten & Pendidikan Karakter Madrasah</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Laporan Kegiatan Pembiasaan Siswa
            </h1>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              Dokumentasi terpadu kegiatan ibadah, kedisiplinan, sosial, dan literasi madrasah. Siap cetak berita acara resmi dan rekapitulasi jurnal untuk instrumen PKKM, EMIS, & Akreditasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
            <Button
              onClick={handleAddNew}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md flex items-center gap-2 h-10 px-4 flex-1 md:flex-initial"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pembiasaan</span>
            </Button>
            <Button
              onClick={openRekapPrint}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium flex items-center gap-2 h-10 px-4 flex-1 md:flex-initial"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Jurnal Rekap</span>
            </Button>
          </div>
        </div>

        {/* Mini Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm bg-white hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Kegiatan</p>
                <h3 className="text-xl font-bold text-slate-800">{stats.total} <span className="text-xs font-normal text-slate-400">agenda</span></h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Keterlaksanaan</p>
                <h3 className="text-xl font-bold text-slate-800">{stats.persentase}% <span className="text-xs font-normal text-slate-400">tercapai</span></h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Foto Bukti Fisik</p>
                <h3 className="text-xl font-bold text-slate-800">{stats.totalFoto} <span className="text-xs font-normal text-slate-400">foto</span></h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Kategori Teraktif</p>
                <h3 className="text-sm font-bold text-slate-800 truncate max-w-[130px]" title={stats.topKat}>{stats.topKat}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar & Filters */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kegiatan, guru, lokasi..."
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcelAll}
                  className="h-9 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Excel</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchItems}
                  disabled={loading}
                  className="h-9 text-xs text-slate-600 hover:bg-slate-50"
                  title="Segarkan Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Kategori:
              </span>
              {categoriesList.map((kat) => (
                <button
                  key={kat}
                  onClick={() => setSelectedKategori(kat)}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                    selectedKategori === kat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {kat}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Terlaksana">Terlaksana</option>
                  <option value="Terlaksana Sebagian">Terlaksana Sebagian</option>
                  <option value="Tertunda">Tertunda</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Cards List */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-8 h-8 mx-auto text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-600">Memuat data laporan pembiasaan madrasah...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Tidak ada laporan kegiatan pembiasaan ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Silakan tambahkan data pembiasaan baru atau sesuaikan filter pencarian Anda.
            </p>
            <Button onClick={handleAddNew} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2">
              <Plus className="w-4 h-4 mr-1" /> Tambah Pembiasaan Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => (
              <Card key={item.id} className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
                <div>
                  {/* Card Thumbnail / Header Image */}
                  <div className="h-40 w-full bg-slate-100 relative overflow-hidden border-b border-slate-100">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.nama_kegiatan}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                        <ImageIcon className="w-8 h-8 mb-1 text-slate-300" />
                        <span className="text-[11px]">Belum ada foto</span>
                      </div>
                    )}
                    
                    {/* Category Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/80 text-white backdrop-blur-sm shadow-sm">
                        {item.kategori}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                        item.status_keterlaksanaan === 'Tertunda'
                          ? 'bg-red-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {item.status_keterlaksanaan || 'Terlaksana'}
                      </span>
                    </div>

                    {/* Photos Count Indicator */}
                    {item.images && item.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm">
                        +{item.images.length - 1} Foto
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {item.nama_kegiatan}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {item.waktu && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {item.waktu}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info Rows */}
                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate"><strong>Sasaran:</strong> {item.sasaran_kelas}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate"><strong>Lokasi:</strong> {item.lokasi || 'Madrasah'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate"><strong>Pendamping:</strong> {item.guru_pendamping || '-'}</span>
                      </div>
                      {item.penandatangan_nama && (
                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/60 px-1.5 py-0.5 rounded">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate"><strong>Penandatangan:</strong> {item.penandatangan_nama}</span>
                        </div>
                      )}
                    </div>

                    {/* Uraian Snippet */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic">
                      "{item.uraian_kegiatan || item.tujuan || 'Pembiasaan karakter rutin di madrasah.'}"
                    </p>
                  </CardContent>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSinglePrint(item)}
                    className="text-xs h-8 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 flex items-center gap-1 font-semibold flex-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Laporan</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-700 hover:bg-slate-200"
                      title="Edit Laporan"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Hapus Laporan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Form Tambah/Edit */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-600" />
                {editingItem ? 'Edit Laporan Kegiatan Pembiasaan' : 'Form Laporan Kegiatan Pembiasaan Baru'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Isi data rincian kegiatan pembiasaan karakter santri secara lengkap.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Template Picker (Shown when creating new) */}
            {!editingItem && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Template Cepat Pembiasaan Khas Madrasah:
                  </span>
                  <span className="text-[11px] text-emerald-700">Klik untuk auto-fill form</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {PRESET_TEMPLATES.map((tmpl, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => applyPreset(tmpl)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded text-[11px] font-medium transition-colors text-left"
                    >
                      {tmpl.nama_kegiatan}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Nama Kegiatan */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Nama Kegiatan Pembiasaan <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.nama_kegiatan}
                    onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value })}
                    placeholder="Contoh: Sholat Dhuha Berjamaah & Doa Pagi"
                    className="text-sm h-9"
                  />
                </div>

                {/* Kategori */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kategori Pembiasaan</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full h-9 text-xs border border-slate-300 rounded-md px-3 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Ibadah & Spiritual">Ibadah & Spiritual</option>
                    <option value="Nasionalisme & Karakter">Nasionalisme & Karakter</option>
                    <option value="Kesehatan & Lingkungan">Kesehatan & Lingkungan</option>
                    <option value="Literasi & Bahasa">Literasi & Bahasa</option>
                    <option value="Sosial & Kepedulian">Sosial & Kepedulian</option>
                    <option value="Kedisiplinan & 5S">Kedisiplinan & 5S</option>
                  </select>
                </div>

                {/* Tanggal */}
                <div>
                  <CalendarHolidayPicker
                    label="Tanggal Pelaksanaan"
                    required
                    value={formData.tanggal}
                    onChange={(date) => setFormData({ ...formData, tanggal: date })}
                  />
                </div>

                {/* Waktu Pelaksanaan */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Waktu Pelaksanaan</label>
                  <Input
                    value={formData.waktu}
                    onChange={(e) => setFormData({ ...formData, waktu: e.target.value })}
                    placeholder="06:45 - 07:15 WIB"
                    className="text-sm h-9"
                  />
                </div>

                {/* Lokasi / Tempat */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tempat / Lokasi</label>
                  <Input
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    placeholder="Masjid / Halaman / Ruang Kelas"
                    className="text-sm h-9"
                  />
                </div>

                {/* Sasaran Rombel / Kelas */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Sasaran Rombel / Siswa</label>
                  <Input
                    value={formData.sasaran_kelas}
                    onChange={(e) => setFormData({ ...formData, sasaran_kelas: e.target.value })}
                    placeholder="Semua Kelas (I - VI) / Kelas 1, 2"
                    className="text-sm h-9"
                  />
                </div>

                {/* Kolom 1: Guru Pendamping Lapangan (Terpisah dari Penandatangan) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Guru Pendamping / PJ Lapangan</span>
                  </label>
                  <Input
                    value={formData.guru_pendamping || ''}
                    onChange={(e) => setFormData({ ...formData, guru_pendamping: e.target.value })}
                    placeholder="Ustadz Ahmad Fauzi, S.Pd.I / Tim Guru Piket"
                    className="text-sm h-9"
                  />
                  <p className="text-[10px] text-slate-500">
                    * Pembimbing langsung saat kegiatan siswa di lapangan
                  </p>
                </div>

                {/* Kolom 2: Penandatangan Dokumen Laporan (Sync Modul GTK) */}
                <div className="space-y-2.5 md:col-span-2 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Pilih Guru Penandatangan (Kolom Tanda Tangan Dokumen)</span>
                    </label>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      Sync Modul GTK
                    </span>
                  </div>

                  {/* GTK Teacher Dropdown Picker & Manual Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                        Pilih dari Daftar GTK:
                      </label>
                      <select
                        onChange={(e) => {
                          const selectedTeacher = teachers.find(t => t.nama === e.target.value);
                          if (selectedTeacher) {
                            setFormData({
                              ...formData,
                              penandatangan_nama: selectedTeacher.nama,
                              penandatangan_nip: selectedTeacher.nip || selectedTeacher.nik || '-',
                              penandatangan_jabatan: selectedTeacher.jabatan || 'Koordinator Pembiasaan'
                            });
                          }
                        }}
                        value={teachers.some(t => t.nama === formData.penandatangan_nama) ? formData.penandatangan_nama : ""}
                        className="w-full h-9 text-xs border border-emerald-300 rounded-md px-2.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">-- Pilih Guru Penandatangan dari GTK --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.nama}>
                            {t.nama} — {t.jabatan || 'Guru'}{t.nip ? ` (NIP: ${t.nip})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                        Nama Penandatangan Resmi:
                      </label>
                      <Input
                        value={formData.penandatangan_nama || ''}
                        onChange={(e) => setFormData({ ...formData, penandatangan_nama: e.target.value })}
                        placeholder="Nama Lengkap Penandatangan & Gelar..."
                        className="text-xs h-9 bg-white border-emerald-300"
                      />
                    </div>
                  </div>

                  {/* NIP & Jabatan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10.5px] text-slate-600 font-medium block mb-0.5">
                        NIP / NPK Penandatangan:
                      </label>
                      <Input
                        value={formData.penandatangan_nip || ''}
                        onChange={(e) => setFormData({ ...formData, penandatangan_nip: e.target.value })}
                        placeholder="NIP. 198... / -"
                        className="text-xs h-8 bg-white border-emerald-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-slate-600 font-medium block mb-0.5">
                        Jabatan pada Kolom TTD:
                      </label>
                      <Input
                        value={formData.penandatangan_jabatan || ''}
                        onChange={(e) => setFormData({ ...formData, penandatangan_jabatan: e.target.value })}
                        placeholder="Koordinator Pembiasaan / Guru Pembimbing"
                        className="text-xs h-8 bg-white border-emerald-200"
                      />
                    </div>
                  </div>

                  {/* Quick Select Teacher Chips */}
                  {teachers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-emerald-200/60">
                      <span className="text-[10px] text-slate-500 font-medium mr-1">Pilih cepat:</span>
                      {teachers.slice(0, 6).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              penandatangan_nama: t.nama,
                              penandatangan_nip: t.nip || t.nik || '-',
                              penandatangan_jabatan: t.jabatan || 'Koordinator Pembiasaan'
                            });
                          }}
                          className={`text-[10.5px] px-2 py-0.5 border rounded-md font-medium transition-colors text-left ${
                            formData.penandatangan_nama === t.nama
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-white hover:bg-emerald-100 border-emerald-200 text-slate-700'
                          }`}
                        >
                          ✓ {t.nama.split(',')[0]}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 leading-tight italic pt-0.5">
                    * <strong>Penting:</strong> Guru yang dipilih pada bagian ini khusus untuk nama dan NIP yang akan tercantum di kolom penandatangan lembar cetak laporan, terpisah dari kolom guru pendamping lapangan.
                  </p>
                </div>

                {/* Jumlah Siswa / Peserta */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Jumlah Siswa Hadir</label>
                  <Input
                    value={formData.jumlah_peserta}
                    onChange={(e) => setFormData({ ...formData, jumlah_peserta: e.target.value })}
                    placeholder="Contoh: 185 Siswa / Seluruh Siswa"
                    className="text-sm h-9"
                  />
                </div>

                {/* Status Keterlaksanaan */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Status Keterlaksanaan</label>
                  <select
                    value={formData.status_keterlaksanaan}
                    onChange={(e) => setFormData({ ...formData, status_keterlaksanaan: e.target.value as any })}
                    className="w-full h-9 text-xs border border-slate-300 rounded-md px-3 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Terlaksana">Terlaksana (100%)</option>
                    <option value="Terlaksana Sebagian">Terlaksana Sebagian</option>
                    <option value="Tertunda">Tertunda</option>
                  </select>
                </div>

              </div>

              {/* AI Auto-Assistant Button for Narration */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700">Narasi Laporan & Instrumen Penilaian</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateNarrative}
                  className="text-xs h-7 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Bantu Susun Narasi Otomatis</span>
                </Button>
              </div>

              {/* Tujuan */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Tujuan Pembiasaan Karakter</label>
                <Textarea
                  rows={2}
                  value={formData.tujuan}
                  onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                  placeholder="Tujuan pelaksanaan kegiatan bagi pembentukan karakter santri..."
                  className="text-xs"
                />
              </div>

              {/* Uraian Pelaksanaan */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Uraian Pelaksanaan Kegiatan</label>
                <Textarea
                  rows={3}
                  value={formData.uraian_kegiatan}
                  onChange={(e) => setFormData({ ...formData, uraian_kegiatan: e.target.value })}
                  placeholder="Ceritakan jalannya kegiatan pembiasaan langkah demi langkah..."
                  className="text-xs"
                />
              </div>

              {/* Hasil & Evaluasi */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Hasil, Ketercapaian, & Tindak Lanjut</label>
                <Textarea
                  rows={2}
                  value={formData.hasil_kegiatan}
                  onChange={(e) => setFormData({ ...formData, hasil_kegiatan: e.target.value })}
                  placeholder="Catatan ketercapaian siswa, evaluasi keaktifan, dan tindak lanjut..."
                  className="text-xs"
                />
              </div>

              {/* Upload Foto Dokumentasi (Multi-Upload Support) */}
              <div 
                className="space-y-3 pt-3 border-t border-slate-200"
                onPaste={handlePaste}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      Foto Dokumentasi Bukti Fisik
                      {formData.images && formData.images.length > 0 && (
                        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {formData.images.length} Foto Terpilih
                        </span>
                      )}
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Bisa pilih & upload <span className="font-semibold text-emerald-700">lebih dari 1 foto sekaligus</span> (otomatis dikompresi hemat kuota & memori).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {formData.images && formData.images.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAllImages}
                        className="text-xs h-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Hapus Semua
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMediaModalOpen(true)}
                      className="text-xs h-7 text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-600" />
                      Media Library
                    </Button>

                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploading ? 'Memproses...' : '+ Pilih Banyak Foto'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                {/* Progress bar during multi-upload */}
                {uploading && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                    <div className="flex-1 font-medium">
                      {uploadProgress || 'Sedang mengunggah dan mengompres foto dokumentasi...'}
                    </div>
                  </div>
                )}

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-3 transition-colors text-center ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                      : 'border-slate-300 bg-slate-50/70 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-1 py-1">
                    <UploadCloud className={`w-6 h-6 ${isDragging ? 'text-emerald-600 animate-bounce' : 'text-slate-400'}`} />
                    <p className="text-xs font-medium">
                      Tarik & jatuhkan <span className="text-emerald-700 font-bold">beberapa file foto langsung ke sini</span> atau paste (Ctrl+V)
                    </p>
                  </div>
                </div>

                {/* Photo Previews & Management Grid */}
                {formData.images && formData.images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3 bg-slate-100/70 border border-slate-200 rounded-lg max-h-[340px] overflow-y-auto">
                      {formData.images.map((img, idx) => (
                        <div 
                          key={idx} 
                          className="relative group rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm hover:shadow transition-all"
                        >
                          <div className="aspect-4/3 w-full overflow-hidden bg-slate-200">
                            <img 
                              src={img} 
                              alt={`Dokumentasi ${idx + 1}`} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>

                          {/* Index badge */}
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white flex items-center gap-1 backdrop-blur-xs">
                            {idx === 0 ? (
                              <>
                                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                <span>Sampul Utama</span>
                              </>
                            ) : (
                              <span>Foto #{idx + 1}</span>
                            )}
                          </div>

                          {/* Hover action toolbar */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal(img)}
                                className="bg-white/90 hover:bg-white text-slate-800 rounded p-1 shadow"
                                title="Lihat Foto Ukuran Penuh"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="bg-red-600 hover:bg-red-700 text-white rounded p-1 shadow"
                                title="Hapus foto ini"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Reordering Controls */}
                            <div className="flex items-center justify-center gap-1 bg-black/60 rounded p-1 backdrop-blur-xs">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => makeCoverImage(idx)}
                                  className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[9px] font-semibold flex items-center gap-0.5"
                                  title="Jadikan Foto Sampul Utama"
                                >
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                  <span>Sampul</span>
                                </button>
                              )}

                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(idx, 'left')}
                                  className="p-1 bg-white/20 hover:bg-white/40 text-white rounded"
                                  title="Geser ke kiri"
                                >
                                  <MoveLeft className="w-3 h-3" />
                                </button>
                              )}

                              {idx < (formData.images?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(idx, 'right')}
                                  className="p-1 bg-white/20 hover:bg-white/40 text-white rounded"
                                  title="Geser ke kanan"
                                >
                                  <MoveRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-slate-200 rounded-lg text-center text-slate-400 text-xs bg-slate-50">
                    Belum ada foto dokumentasi terlampir. Anda dapat mengunggah <span className="font-semibold text-slate-600">banyak foto sekaligus</span> untuk kelengkapan administrasi dan cetak laporan.
                  </div>
                )}
              </div>

              {/* Toggle Tampilkan di Web */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_featured_web"
                  checked={formData.is_featured_web}
                  onChange={(e) => setFormData({ ...formData, is_featured_web: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="is_featured_web" className="text-xs text-slate-700 select-none cursor-pointer">
                  Tampilkan laporan pembiasaan ini di galeri konten publik madrasah
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="text-xs h-9"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving || uploading}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingItem ? 'Perbarui Laporan' : 'Simpan Laporan'}</span>
                </Button>
              </div>

            </form>
          </DialogContent>
        </Dialog>

        {/* Media Library Selector Modal */}
        <MediaLibraryModal
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelectImage={(url) => {
            setFormData(prev => ({
              ...prev,
              images: [...(prev.images || []), url]
            }));
            setMediaModalOpen(false);
            showSuccess('Foto dari Media Library ditambahkan!');
          }}
        />

        {/* Lightbox / Zoom Preview Modal */}
        {previewImageModal && (
          <Dialog open={!!previewImageModal} onOpenChange={() => setPreviewImageModal(null)}>
            <DialogContent className="max-w-3xl p-2 bg-black/95 border-none text-white overflow-hidden">
              <div className="relative flex flex-col items-center justify-center min-h-[300px] max-h-[85vh]">
                <img 
                  src={previewImageModal} 
                  alt="Pratinjau Foto" 
                  className="max-w-full max-h-[80vh] object-contain rounded"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewImageModal(null)}
                    className="text-white hover:bg-white/20 h-8 px-2.5 text-xs rounded-full bg-black/50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Tutup
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Dedicated Print Preview Component Overlay */}
        {printModalOpen && (
          <CetakLaporanPembiasaan
            item={printItem}
            itemsList={filteredItems}
            mode={printMode}
            periodeLabel={activeMadrasah?.tahun_ajaran || 'Tahun Pelajaran Berjalan'}
            onClose={() => setPrintModalOpen(false)}
          />
        )}

      </div>
    </AdminLayout>
  );
};

export default PembiasaanAdmin;
