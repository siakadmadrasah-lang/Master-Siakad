"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Pencil, Trash2, Search, Sparkles, Loader2, Save, 
  BookOpen, Copy, RefreshCw, Database, CheckCircle2, GraduationCap,
  ShieldCheck, ArrowLeft, Layers, BookMarked, Tag, Home
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import TeacherAuthModal from '@/components/TeacherAuthModal';

interface BedahCPItem {
  id: string;
  mata_pelajaran: string;
  fase: string;
  elemen: string;
  cp: string;
  tp: string;
  materi_pokok: string;
  integrasi_nilai: string[];
  created_at: string;
}

// MASTER DATA REFERENSI RESMI KOMPREHENSIF (KMA 450/2024 & BSKAP 032/2024)
const MASTER_REFERENSI = [
  // === AL-QUR'AN HADITS (KMA 450/2024) ===
  { mapel: 'Al-Quran Hadits', fase: 'A', elemen: 'Al-Qur\'an', cp: 'Peserta didik mampu mengenal huruf hijaiyah secara terpisah dan bersambung beserta tanda bacanya; melafalkan dan menghafal surah-surah pendek Al-Qur\'an dengan benar dan tepat.' },
  { mapel: 'Al-Quran Hadits', fase: 'A', elemen: 'Tajwid', cp: 'Peserta didik mampu mengenal dan mempraktikkan tanda baca Al-Qur\'an (fathah, kasrah, dammah, sukun, tasydid) secara sederhana dalam kata-kata pilihan.' },
  { mapel: 'Al-Quran Hadits', fase: 'A', elemen: 'Hadits', cp: 'Peserta didik mampu menghafal, mengartikan, dan menunjukkan perilaku sesuai hadits tentang kebersihan dan keutamaan belajar Al-Qur\'an.' },
  { mapel: 'Al-Quran Hadits', fase: 'B', elemen: 'Al-Qur\'an', cp: 'Peserta didik mampu membaca Al-Qur\'an dengan tartil; menghafal surah-surah pendek pilihan; memahami arti dan isi kandungan surah secara sederhana.' },
  { mapel: 'Al-Quran Hadits', fase: 'B', elemen: 'Tajwid', cp: 'Peserta didik mampu memahami dan menerapkan hukum bacaan Nun Sukun dan Tanwin (Idzhar, Idgham Bighunnah, Idgham Bilaghunnah, Iqlab, dan Ikhfa) serta hukum bacaan Qalqalah dalam membaca ayat-ayat Al-Qur\'an.' },
  { mapel: 'Al-Quran Hadits', fase: 'B', elemen: 'Hadits', cp: 'Peserta didik mampu memahami arti dan isi kandungan hadits tentang niat, silaturahim, shalat berjamaah, dan ciri-ciri orang munafik.' },
  { mapel: 'Al-Quran Hadits', fase: 'C', elemen: 'Al-Qur\'an', cp: 'Peserta didik mampu menganalisis arti dan isi kandungan surah-surah pendek pilihan; menghafal surah dengan tartil dan fasih.' },
  { mapel: 'Al-Quran Hadits', fase: 'C', elemen: 'Tajwid', cp: 'Peserta didik mampu menganalisis dan menerapkan hukum bacaan Mim Sukun, hukum bacaan Mad, dan hukum bacaan Alif Lam (Qamariyah & Syamsiyah).' },
  { mapel: 'Al-Quran Hadits', fase: 'C', elemen: 'Hadits', cp: 'Peserta didik mampu menganalisis hadits tentang menyayangi anak yatim, keutamaan memberi, dan amal shalih dalam kehidupan bermasyarakat.' },

  // === AKIDAH AKHLAK (KMA 450/2024) ===
  { mapel: 'Akidah Akhlak', fase: 'A', elemen: 'Akidah', cp: 'Peserta didik mampu mengenal rukun iman, Asmaul Husna (al-Ahad, al-Khaliq), dan kalimat thayyibah (Basmalah, Hamdalah) sebagai landasan keyakinan.' },
  { mapel: 'Akidah Akhlak', fase: 'A', elemen: 'Akhlak', cp: 'Peserta didik mampu membiasakan akhlak terpuji kepada Allah (syukur, sabar) dan menghindari akhlak tercela dalam kehidupan sehari-hari.' },
  { mapel: 'Akidah Akhlak', fase: 'B', elemen: 'Akidah', cp: 'Peserta didik mampu memahami makna iman kepada Kitab-kitab Allah, Rasul-rasul Allah, dan mengenal sifat-sifat wajib bagi Allah SWT.' },
  { mapel: 'Akidah Akhlak', fase: 'B', elemen: 'Akhlak', cp: 'Peserta didik mampu membiasakan sikap rendah hati, jujur, dan amanah; serta menghindari sikap sombong, kikir, dan berbohong.' },
  { mapel: 'Akidah Akhlak', fase: 'C', elemen: 'Akidah', cp: 'Peserta didik mampu memahami makna iman kepada Hari Akhir dan Qada Qadar Allah SWT sebagai motivasi beramal shalih.' },
  { mapel: 'Akidah Akhlak', fase: 'C', elemen: 'Akhlak', cp: 'Peserta didik mampu membiasakan akhlak terpuji dalam pergaulan (tasamuh, ta\'awun) dan menjaga kelestarian lingkungan.' },

  // === FIQIH (KMA 450/2024) ===
  { mapel: 'Fiqih', fase: 'A', elemen: 'Ibadah', cp: 'Peserta didik mampu mengenal rukun Islam, tata cara bersuci (thaharah) dari hadats kecil, dan gerakan shalat fardhu secara sederhana.' },
  { mapel: 'Fiqih', fase: 'B', elemen: 'Ibadah', cp: 'Peserta didik mampu memahami ketentuan shalat berjamaah, shalat jumat, shalat jamak qashar, ketentuan puasa Ramadhan, serta mengenal khitan dan tanda-tanda baligh.' },
  { mapel: 'Fiqih', fase: 'C', elemen: 'Ibadah', cp: 'Peserta didik mampu menganalisis ketentuan zakat fitrah, zakat mal, infaq, sedekah, serta tata cara haji dan umrah.' },

  // === BAHASA ARAB ===
  { mapel: 'Bahasa Arab', fase: 'A', elemen: 'Menyimak (Istima\')', cp: 'Peserta didik mampu memahami kosa kata dan ungkapan sederhana tentang identitas diri, peralatan sekolah, dan anggota keluarga.' },
  { mapel: 'Bahasa Arab', fase: 'B', elemen: 'Berbicara (Kalam)', cp: 'Peserta didik mampu melakukan dialog sederhana tentang hobi, cita-cita, dan alamat rumah dengan intonasi yang benar.' },
  { mapel: 'Bahasa Arab', fase: 'C', elemen: 'Membaca (Qira\'ah)', cp: 'Peserta didik mampu membaca dan memahami teks visual/tulisan sederhana tentang profesi dan kegiatan sehari-hari.' },

  // === MATEMATIKA (BSKAP 032/2024) ===
  { mapel: 'Matematika', fase: 'A', elemen: 'Bilangan', cp: 'Peserta didik mampu menunjukkan pemahaman dan memiliki intuisi bilangan (number sense) pada bilangan cacah sampai 100; membaca, menulis, membandingkan, dan mengurutkan.' },
  { mapel: 'Matematika', fase: 'B', elemen: 'Bilangan', cp: 'Peserta didik mampu menunjukkan pemahaman bilangan cacah sampai 10.000; melakukan operasi perkalian dan pembagian; serta memahami konsep pecahan sederhana.' },
  { mapel: 'Matematika', fase: 'C', elemen: 'Bilangan', cp: 'Peserta didik mampu memahami bilangan desimal dan persen; melakukan operasi hitung campuran pada bilangan cacah, pecahan, dan desimal.' },

  // === PENDIDIKAN PANCASILA ===
  { mapel: 'Pendidikan Pancasila', fase: 'A', elemen: 'Pancasila', cp: 'Peserta didik mampu mengenal dan menceritakan simbol dan sila-sila Pancasila dalam lambang negara Garuda Pancasila; mengidentifikasi hubungan antara simbol dan sila.' },
  { mapel: 'Pendidikan Pancasila', fase: 'B', elemen: 'Pancasila', cp: 'Peserta didik mampu memahami makna dan nilai-nilai Pancasila sebagai dasar negara, pandangan hidup bangsa, dan ideologi negara.' },
  { mapel: 'Pendidikan Pancasila', fase: 'C', elemen: 'Pancasila', cp: 'Peserta didik mampu menganalisis penerapan nilai-nilai Pancasila dalam kehidupan sehari-hari; mempraktikkan nilai-nilai Pancasila.' },

  // === BAHASA INDONESIA ===
  { mapel: 'Bahasa Indonesia', fase: 'A', elemen: 'Menyimak', cp: 'Peserta didik mampu bersikap menjadi penyimak yang baik; memahami pesan lisan dan informasi dari media audio, teks aural, dan instruksi lisan.' },
  { mapel: 'Bahasa Indonesia', fase: 'B', elemen: 'Membaca dan Memirsa', cp: 'Peserta didik mampu memahami pesan dan informasi tentang kehidupan sehari-hari, teks narasi, dan puisi anak dalam bentuk cetak atau elektronik.' },
  { mapel: 'Bahasa Indonesia', fase: 'C', elemen: 'Menulis', cp: 'Peserta didik mampu menulis teks eksplanasi, laporan, dan eksposisi persuasif dengan informasi yang rinci dan akurat.' },

  // === IPAS ===
  { mapel: 'IPAS', fase: 'B', elemen: 'Pemahaman IPAS (Sains)', cp: 'Peserta didik mampu menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada manusia; memahami siklus hidup makhluk hidup.' },
  { mapel: 'IPAS', fase: 'C', elemen: 'Pemahaman IPAS (Sains)', cp: 'Peserta didik mampu menganalisis hubungan antar ekosistem; memahami konsep gelombang bunyi dan cahaya dalam kehidupan.' }
];

const BedahCPPublic: React.FC = () => {
  const navigate = useNavigate();
  const { requireTeacherAuth, currentTeacher, isAuthenticated } = useTeacherAuth();
  const { activeMadrasah } = useMadrasah();

  const [data, setData] = useState<BedahCPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BedahCPItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refSearch, setRefSearch] = useState('');
  const [filterFase, setFilterFase] = useState('all');
  
  const [formData, setFormData] = useState({ 
    mata_pelajaran: 'Al-Quran Hadits', 
    fase: 'A', 
    elemen: '', 
    cp: '', 
    tp: '', 
    materi_pokok: '',
    integrasi_nilai: [] as string[]
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: dbData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'bedah_cp_data')
        .maybeSingle();

      if (dbData?.value && Array.isArray(dbData.value)) {
        setData(dbData.value);
      } else {
        const localCached = localStorage.getItem('siakad_bedah_cp_data');
        if (localCached) {
          setData(JSON.parse(localCached));
        } else {
          setData([]);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat bedah CP:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // AI Rule-based TP Generator
  const generateTP = () => {
    if (!formData.cp.trim()) {
      showError('Isi atau pilih CP terlebih dahulu');
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const verbs = ['Menganalisis', 'Mengidentifikasi', 'Memahami', 'Menerapkan', 'Menjelaskan', 'Mempraktikkan'];
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      const cleanedCP = formData.cp.replace(/^Peserta didik mampu /i, '');
      const generated = `${verb} ${cleanedCP} dalam konteks pembelajaran terpadu berbasis Kurikulum Merdeka.`;
      setFormData(prev => ({ ...prev, tp: generated }));
      setIsGenerating(false);
      showSuccess('Tujuan Pembelajaran berhasil dirumuskan!');
    }, 400);
  };

  const handleSave = () => {
    requireTeacherAuth(async () => {
      if (!formData.elemen.trim() || !formData.cp.trim() || !formData.tp.trim()) {
        showError('Elemen, CP, dan TP wajib diisi.');
        return;
      }
      setIsSaving(true);
      try {
        let updated: BedahCPItem[];
        if (editingItem) {
          updated = data.map(item => item.id === editingItem.id ? {
            ...item,
            ...formData,
            created_at: item.created_at || new Date().toISOString()
          } : item);
        } else {
          const newItem: BedahCPItem = {
            id: `cp-${Date.now()}`,
            ...formData,
            created_at: new Date().toISOString()
          };
          updated = [newItem, ...data];
        }

        setData(updated);
        localStorage.setItem('siakad_bedah_cp_data', JSON.stringify(updated));
        await supabase.from('site_settings').upsert({
          id: 'bedah_cp_data',
          value: updated,
          updated_at: new Date().toISOString()
        });

        showSuccess(editingItem ? 'Bedah CP diperbarui!' : 'Bedah CP berhasil disimpan!');
        setDialogOpen(false);
        setEditingItem(null);
      } catch (err) {
        showError('Gagal menyimpan bedah CP');
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    requireTeacherAuth(async () => {
      if (!confirm('Hapus rincian CP ini?')) return;
      const updated = data.filter(item => item.id !== id);
      setData(updated);
      localStorage.setItem('siakad_bedah_cp_data', JSON.stringify(updated));
      await supabase.from('site_settings').upsert({
        id: 'bedah_cp_data',
        value: updated,
        updated_at: new Date().toISOString()
      });
      showSuccess('Data CP dihapus');
    });
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = 
        item.mata_pelajaran?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.elemen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.materi_pokok?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tp?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFase = filterFase === 'all' || item.fase === filterFase;
      return matchSearch && matchFase;
    });
  }, [data, searchQuery, filterFase]);

  const filteredRefs = useMemo(() => {
    return MASTER_REFERENSI.filter(ref => {
      const matchSearch = 
        ref.mapel.toLowerCase().includes(refSearch.toLowerCase()) ||
        ref.elemen.toLowerCase().includes(refSearch.toLowerCase()) ||
        ref.cp.toLowerCase().includes(refSearch.toLowerCase());
      return matchSearch;
    });
  }, [refSearch]);

  const pickRef = (ref: typeof MASTER_REFERENSI[0]) => {
    setFormData(prev => ({
      ...prev,
      mata_pelajaran: ref.mapel,
      fase: ref.fase,
      elemen: ref.elemen,
      cp: ref.cp,
      materi_pokok: ref.elemen
    }));
    setRefDialogOpen(false);
    showSuccess(`Referensi ${ref.mapel} (${ref.elemen}) disalin ke formulir!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pt-20">
      <SEO 
        title="Bedah CP & Pemetaan TP/ATP Kurikulum Merdeka - Ruang Guru"
        description="Penyusunan Capaian Pembelajaran, Perumusan TP & Alur Tujuan Pembelajaran resmi KMA 450/2024 dan BSKAP 032/2024."
      />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
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

        {/* Header */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" /> Ruang Kerja Pendidik • Kurikulum Merdeka
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Bedah CP & Perumusan TP/ATP
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Eksplorasi elemen Capaian Pembelajaran resmi KMA 450/2024 & BSKAP 032/2024 dan perumusan Tujuan Pembelajaran per Fase (A, B, C).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  mata_pelajaran: 'Al-Quran Hadits',
                  fase: 'A',
                  elemen: '',
                  cp: '',
                  tp: '',
                  materi_pokok: '',
                  integrasi_nilai: []
                });
                setDialogOpen(true);
              }}
              className="rounded-xl h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Bedah CP
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <Input
              type="text"
              placeholder="Cari mapel, elemen, materi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-10 pl-9 rounded-xl border-slate-200 text-xs font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filterFase} onValueChange={setFilterFase}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold w-36">
                <SelectValue placeholder="Pilih Fase" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Semua Fase</SelectItem>
                <SelectItem value="A">Fase A (Kelas 1-2)</SelectItem>
                <SelectItem value="B">Fase B (Kelas 3-4)</SelectItem>
                <SelectItem value="C">Fase C (Kelas 5-6)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="h-10 rounded-xl border-slate-200 text-slate-600 font-bold text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang
            </Button>
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Memuat data bedah CP...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <BookMarked className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-600 font-bold text-sm">Belum ada data Bedah CP.</p>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Klik tombol "Tambah Bedah CP" dan gunakan referensi resmi KMA 450 untuk mempercepat perumusan TP Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-700 w-12 text-center">No</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 w-40">Mata Pelajaran & Fase</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 w-44">Elemen & Materi</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Capaian Pembelajaran (CP)</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Tujuan Pembelajaran (TP)</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 w-24 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/60">
                      <TableCell className="text-center font-bold text-xs text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-bold text-xs text-slate-900">{item.mata_pelajaran}</p>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                            Fase {item.fase}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-bold text-xs text-emerald-800">{item.elemen}</p>
                          <p className="text-[11px] text-slate-500">{item.materi_pokok || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{item.cp}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed line-clamp-3">{item.tp}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(item);
                              setFormData({
                                mata_pelajaran: item.mata_pelajaran,
                                fase: item.fase,
                                elemen: item.elemen,
                                cp: item.cp,
                                tp: item.tp,
                                materi_pokok: item.materi_pokok,
                                integrasi_nilai: item.integrasi_nilai || []
                              });
                              setDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
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
        </div>
      </main>

      {/* Dialog Form Bedah CP */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>{editingItem ? 'Edit Bedah CP' : 'Tambah Bedah CP Baru'}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRefDialogOpen(true)}
                className="rounded-xl text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" /> Ambil dari Referensi KMA 450
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Mata Pelajaran</label>
                <Input
                  value={formData.mata_pelajaran}
                  onChange={e => setFormData({ ...formData, mata_pelajaran: e.target.value })}
                  placeholder="Contoh: Al-Quran Hadits"
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Fase</label>
                <Select value={formData.fase} onValueChange={v => setFormData({ ...formData, fase: v })}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Pilih Fase" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="A">Fase A (Kelas 1-2)</SelectItem>
                    <SelectItem value="B">Fase B (Kelas 3-4)</SelectItem>
                    <SelectItem value="C">Fase C (Kelas 5-6)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Elemen</label>
                <Input
                  value={formData.elemen}
                  onChange={e => setFormData({ ...formData, elemen: e.target.value })}
                  placeholder="Contoh: Tajwid / Bilangan"
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Materi Pokok</label>
                <Input
                  value={formData.materi_pokok}
                  onChange={e => setFormData({ ...formData, materi_pokok: e.target.value })}
                  placeholder="Contoh: Hukum Nun Sukun"
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Capaian Pembelajaran (CP)</label>
              <Textarea
                value={formData.cp}
                onChange={e => setFormData({ ...formData, cp: e.target.value })}
                rows={4}
                placeholder="Salin atau ketik CP di sini..."
                className="rounded-xl text-xs leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-slate-500">Tujuan Pembelajaran (TP)</label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={generateTP}
                  disabled={isGenerating}
                  className="h-7 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-2 rounded-lg"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-500" /> Rumuskan Otomatis (AI)
                </Button>
              </div>
              <Textarea
                value={formData.tp}
                onChange={e => setFormData({ ...formData, tp: e.target.value })}
                rows={3}
                placeholder="Tujuan Pembelajaran yang dirumuskan..."
                className="rounded-xl text-xs leading-relaxed font-medium"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl text-xs font-bold h-11 px-5 border-slate-200"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-xl text-xs font-bold h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan CP/TP
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Master Referensi KMA 450 */}
      <Dialog open={refDialogOpen} onOpenChange={setRefDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" /> Bank Referensi Resmi KMA 450/2024 & BSKAP 032/2024
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Cari referensi mapel, elemen, teks CP..."
              value={refSearch}
              onChange={e => setRefSearch(e.target.value)}
              className="h-10 pl-9 rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredRefs.map((ref, idx) => (
              <div 
                key={idx}
                onClick={() => pickRef(ref)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500/80 bg-slate-50/60 hover:bg-emerald-50/40 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                      {ref.mapel}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-bold border-slate-300">
                      Fase {ref.fase}
                    </Badge>
                    <span className="text-xs font-bold text-slate-800">Elemen: {ref.elemen}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Gunakan
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{ref.cp}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <TeacherAuthModal />
      <Footer />
    </div>
  );
};

export default BedahCPPublic;
