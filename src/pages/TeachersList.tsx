"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Search, ShieldCheck, GraduationCap, School, 
  Printer, ArrowLeft, Mail, Phone, CheckCircle, Clock, BookOpen, Award, Home,
  FileSpreadsheet, Eye, UserCheck, Layers, Sparkles, Filter, ChevronRight,
  QrCode, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import { Teacher } from '@/pages/admin/TeachersAdmin';
import { formatImageUrl } from '@/utils/imageCompression';
import { CetakDataGtkModal } from '@/components/CetakDataGtkModal';
import { GtkDetailModal } from '@/components/GtkDetailModal';
import { formatTeacherDisplayName } from '@/utils/formatGelar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import * as XLSX from 'xlsx';

const defaultTeachersPublic: Teacher[] = [
  {
    id: 'g-1',
    nama: 'Ahmad Syafii',
    gelar: 'S.Pd.I, M.Pd',
    nip: '198501152010011001',
    nik: '3302151501850001',
    nuptk: '1234567890123456',
    npk: '987654321012',
    peg_id: '20198501150001',
    nrg: '120984756',
    pendidikan: 'S2 Pendidikan Agama Islam',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '123456789012',
    status_kepegawaian: 'PNS',
    jabatan: 'Kepala Madrasah & Guru PAI',
    mapel_diampu: 'Akidah Akhlak',
    mengajar_kelas: 'Kelas 4, 5, 6',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1985-01-15',
    gender: 'Laki-laki',
    telepon: '081234567890',
    email: 'ahmad.syafii@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2010-01-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-2',
    nama: 'Siti Nurjanah',
    gelar: 'S.Pd',
    nip: '199003202015022002',
    nik: '3302156003900002',
    nuptk: '2345678901234567',
    npk: '876543210987',
    peg_id: '20199003200002',
    nrg: '120984757',
    pendidikan: 'S1 PGMI / PGSD',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '234567890123',
    status_kepegawaian: 'PPPK',
    jabatan: 'Guru Kelas I',
    mapel_diampu: 'Guru Kelas / Tematik',
    mengajar_kelas: 'Kelas 1',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1990-03-20',
    gender: 'Perempuan',
    telepon: '082198765432',
    email: 'siti.nurjanah@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2015-02-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-3',
    nama: 'M. Ridwan Kurniawan',
    gelar: 'S.Pd',
    nip: '199307122019031003',
    nik: '3302151207930003',
    nuptk: '3456789012345678',
    npk: '765432109876',
    peg_id: '20199307120003',
    pendidikan: 'S1 Pendidikan Bahasa Arab',
    sertifikasi: 'Dalam Proses',
    status_kepegawaian: 'GTY / Guru Tetap Yayasan',
    jabatan: 'Guru Mapel Bahasa Arab',
    mapel_diampu: 'Bahasa Arab & Al-Qur\'an Hadis',
    mengajar_kelas: 'Kelas 1, 2, 3, 4, 5, 6',
    tempat_lahir: 'Cilacap',
    tanggal_lahir: '1993-07-12',
    gender: 'Laki-laki',
    telepon: '085712345678',
    email: 'ridwan.kurniawan@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2019-03-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-4',
    nama: 'Dewi Rahmawati',
    gelar: 'S.Kom',
    nip: '-',
    nik: '3302154508950004',
    nuptk: '4567890123456789',
    npk: '-',
    peg_id: '20199508150004',
    pendidikan: 'S1 Teknik Informatika',
    sertifikasi: 'Belum Sertifikasi',
    status_kepegawaian: 'Staf / Tenaga Kependidikan',
    jabatan: 'Guru TIK & Operator EMIS / SIAKAD',
    mapel_diampu: 'Informatika / TIK',
    mengajar_kelas: 'Kelas 4, 5, 6',
    tempat_lahir: 'Purwokerto',
    tanggal_lahir: '1995-08-15',
    gender: 'Perempuan',
    telepon: '088812349999',
    email: 'dewi.rahmawati@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2020-07-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-5',
    nama: 'Bambang Subagyo',
    gelar: 'S.Pd',
    nip: '198811022014011005',
    nik: '3302150211880005',
    nuptk: '5678901234567890',
    npk: '654321098765',
    peg_id: '20198811020005',
    pendidikan: 'S1 Pendidikan Jasmani (PJOK)',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '345678901234',
    status_kepegawaian: 'GTY / Guru Tetap Yayasan',
    jabatan: 'Guru PJOK & Pembina Pramuka',
    mapel_diampu: 'PJOK',
    mengajar_kelas: 'Kelas 1, 2, 3, 4, 5, 6',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1988-11-02',
    gender: 'Laki-laki',
    telepon: '081398761234',
    email: 'bambang.subagyo@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2014-01-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-6',
    nama: 'Khadijah Al-Azizah',
    gelar: 'S.Pd.I',
    nip: '199204182018022006',
    nik: '3302155804920006',
    nuptk: '6789012345678901',
    npk: '543210987654',
    peg_id: '20199204180006',
    pendidikan: 'S1 Pendidikan Guru Madrasah Ibtidaiyah',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '456789012345',
    status_kepegawaian: 'GTY / Guru Tetap Yayasan',
    jabatan: 'Guru Kelas II & Bendahara',
    mapel_diampu: 'Guru Kelas / Tematik',
    mengajar_kelas: 'Kelas 2',
    tempat_lahir: 'Kebumen',
    tanggal_lahir: '1992-04-18',
    gender: 'Perempuan',
    telepon: '081298712345',
    email: 'khadijah@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2016-08-01',
    created_at: new Date().toISOString(),
  }
];

const TeachersList = () => {
  const navigate = useNavigate();
  const { activeMadrasah, getScopedKey } = useMadrasah();
  const { settings } = useSiteSettings();
  const { requirePrintAuth } = usePrintSecurity();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSertifikasi, setFilterSertifikasi] = useState<string>('all');
  const [filterKepegawaian, setFilterKepegawaian] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalMode, setPrintModalMode] = useState<'rekap' | 'biodata' | 'kartu'>('rekap');
  const [selectedTeacherForPrint, setSelectedTeacherForPrint] = useState<Teacher | null>(null);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeDetailTeacher, setActiveDetailTeacher] = useState<Teacher | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const ALL_GURU_KEYS = Array.from(new Set([
        getScopedKey('data_guru'),
        `data_guru_${activeMadrasah?.id || 'madrasah_default'}`,
        'data_guru_madrasah_default',
        'data_guru',
        'siakad_data_guru'
      ]));

      const { data } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', ALL_GURU_KEYS);

      let loaded: Teacher[] | null = null;
      if (data && data.length > 0) {
        for (const k of ALL_GURU_KEYS) {
          const row = data.find(d => d.id === k);
          if (row?.value && Array.isArray(row.value) && row.value.length > 0) {
            loaded = row.value;
            break;
          }
        }
      }

      if (loaded === null && settings.data_guru && Array.isArray(settings.data_guru) && settings.data_guru.length > 0) {
        loaded = settings.data_guru;
      }

      if (loaded !== null && loaded.length > 0) {
        setTeachers(loaded);
      } else {
        setTeachers(defaultTeachersPublic);
      }
    } catch (err) {
      console.error('Error fetching public teachers:', err);
      setTeachers(defaultTeachersPublic);
    } finally {
      setLoading(false);
    }
  }, [activeMadrasah, getScopedKey, settings.data_guru]);

  useEffect(() => {
    fetchTeachers();

    const channel = supabase
      .channel('public:site_settings:teachers_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload?.new && payload.new.id?.includes('guru')) {
          fetchTeachers();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        t.nama.toLowerCase().includes(q) ||
        (t.gelar && t.gelar.toLowerCase().includes(q)) ||
        (t.nip && t.nip.toLowerCase().includes(q)) ||
        (t.nik && t.nik.toLowerCase().includes(q)) ||
        (t.nrg && t.nrg.toLowerCase().includes(q)) ||
        (t.tempat_lahir && t.tempat_lahir.toLowerCase().includes(q)) ||
        (t.tanggal_lahir && t.tanggal_lahir.toLowerCase().includes(q)) ||
        (t.nuptk && t.nuptk.toLowerCase().includes(q)) ||
        (t.npk && t.npk.toLowerCase().includes(q)) ||
        (t.jabatan && t.jabatan.toLowerCase().includes(q)) ||
        (t.mapel_diampu && t.mapel_diampu.toLowerCase().includes(q)) ||
        (t.pendidikan && t.pendidikan.toLowerCase().includes(q)) ||
        (t.mengajar_kelas && t.mengajar_kelas.toLowerCase().includes(q));

      const matchesSertifikasi = 
        filterSertifikasi === 'all' || t.sertifikasi === filterSertifikasi;

      const matchesKepegawaian = 
        filterKepegawaian === 'all' || t.status_kepegawaian === filterKepegawaian;

      const matchesGender = 
        filterGender === 'all' || t.gender === filterGender;

      return matchesSearch && matchesSertifikasi && matchesKepegawaian && matchesGender;
    });
  }, [teachers, searchQuery, filterSertifikasi, filterKepegawaian, filterGender]);

  // Statistics
  const stats = useMemo(() => {
    const total = teachers.length;
    const sertifikasi = teachers.filter(t => t.sertifikasi === 'Sudah Sertifikasi').length;
    const prosesPpg = teachers.filter(t => t.sertifikasi === 'Dalam Proses').length;
    const pns = teachers.filter(t => t.status_kepegawaian === 'PNS' || t.status_kepegawaian === 'PPPK').length;
    const gty = teachers.filter(t => t.status_kepegawaian === 'GTY / Guru Tetap Yayasan').length;
    const gttTendik = teachers.filter(t => t.status_kepegawaian === 'GTT / Honorer' || t.status_kepegawaian === 'Staf / Tenaga Kependidikan').length;
    const male = teachers.filter(t => t.gender === 'Laki-laki').length;
    const female = teachers.filter(t => t.gender === 'Perempuan').length;

    return {
      total,
      sertifikasi,
      prosesPpg,
      pns,
      gty,
      gttTendik,
      male,
      female
    };
  }, [teachers]);

  // Trigger Rekap Print Modal
  const handleOpenPrintModal = (mode: 'rekap' | 'biodata' | 'kartu' = 'rekap', teacher: Teacher | null = null) => {
    setPrintModalMode(mode);
    setSelectedTeacherForPrint(teacher);
    setIsPrintModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (teacher: Teacher) => {
    setActiveDetailTeacher(teacher);
    setIsDetailModalOpen(true);
  };

  // Quick Excel Export
  const handleExportExcelQuick = () => {
    const dataToExport = filteredTeachers.map((t, idx) => ({
      'No': idx + 1,
      'Nama Lengkap': t.nama,
      'Gelar': t.gelar || '-',
      'L/P': t.gender === 'Laki-laki' ? 'L' : 'P',
      'NIK (16 Digit)': t.nik || '-',
      'NIP': t.nip || '-',
      'NPK': t.npk || '-',
      'NUPTK': t.nuptk || '-',
      'NRG': t.nrg || '-',
      'Peg ID': t.peg_id || '-',
      'Tempat Lahir': t.tempat_lahir || '-',
      'Tanggal Lahir': t.tanggal_lahir || '-',
      'Pendidikan Terakhir': t.pendidikan || '-',
      'Status Kepegawaian': t.status_kepegawaian || 'GTY / Guru Tetap Yayasan',
      'Jabatan': t.jabatan || 'Guru',
      'Mapel yang Diampu': t.mapel_diampu || '-',
      'Mengajar Kelas': t.mengajar_kelas || '-',
      'Status Sertifikasi': t.sertifikasi || 'Belum Sertifikasi',
      'No. Sertifikat Pendidik': t.no_sertifikat_pendidik || '-',
      'No. HP / WhatsApp': t.telepon || '-',
      'Email': t.email || '-',
      'Status Keaktifan': t.status_keaktifan || 'Aktif',
      'TMT Pendidik': t.tmt_pendidik || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data GTK');

    const fileName = `DATA_GTK_${(activeMadrasah.nama_madrasah || 'MADRASAH').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 pb-20">
        {/* Header Hero Banner */}
        <section className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 text-white py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto space-y-5 relative z-10">
            {/* Top breadcrumb & quick links */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl gap-1.5 text-xs font-bold h-8 px-3"
                >
                  <Home className="w-3.5 h-3.5 text-emerald-300" /> Beranda
                </Button>
                <Button
                  onClick={() => navigate('/ruang-guru')}
                  variant="ghost"
                  size="sm"
                  className="text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl gap-1.5 text-xs font-semibold h-8 px-3"
                >
                  <GraduationCap className="w-3.5 h-3.5" /> Ruang Guru
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <PrintSecurityIndicator documentTitle="Daftar Guru & GTK" />
                <Button
                  size="sm"
                  onClick={handleExportExcelQuick}
                  className="bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold gap-1.5 h-8 shadow-md"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ekspor Excel</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenPrintModal('rekap')}
                  className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl text-xs gap-1.5 h-8 shadow-lg shadow-emerald-500/20 px-3.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Data GTK Lengkap</span>
                </Button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-400 text-emerald-950 font-black uppercase text-[10px] px-2.5 py-0.5 rounded-full">
                  Pangkalan Data Pendidik Resmi (EMIS / SIMPATIKA)
                </Badge>
                <Badge variant="outline" className="text-emerald-200 border-emerald-400/30 text-[10px]">
                  {activeMadrasah.nama_madrasah || "Madrasah"}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Data Guru & Tenaga Kependidikan (GTK)
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-3xl leading-relaxed">
                Direktori profil lengkap dewan guru, pendidik profesional, dan tenaga kependidikan {activeMadrasah.nama_madrasah || "Madrasah"} beserta kualifikasi pendidikan, nomor registrasi (NIP/NPK/NUPTK/NIK), dan status sertifikasi resmi.
              </p>
            </div>

            {/* Statistic Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                <div className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider">Total GTK</div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{stats.total} Orang</div>
                <div className="text-[10px] text-emerald-200/70 mt-0.5">{stats.male} Laki-laki • {stats.female} Perempuan</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                <div className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider">Sudah Sertifikasi</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">{stats.sertifikasi} Guru</div>
                <div className="text-[10px] text-emerald-200/70 mt-0.5">{stats.total ? Math.round((stats.sertifikasi / stats.total) * 100) : 0}% Bersertifikat</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                <div className="text-amber-300 text-[10px] font-bold uppercase tracking-wider">Proses PPG</div>
                <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{stats.prosesPpg} Guru</div>
                <div className="text-[10px] text-amber-100/70 mt-0.5">Pendidikan Profesi</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                <div className="text-teal-300 text-[10px] font-bold uppercase tracking-wider">PNS & PPPK</div>
                <div className="text-xl sm:text-2xl font-black text-teal-300 mt-0.5">{stats.pns} ASN</div>
                <div className="text-[10px] text-teal-100/70 mt-0.5">Aparatur Sipil Negara</div>
              </div>

              <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                <div className="text-sky-300 text-[10px] font-bold uppercase tracking-wider">GTY & Tendik</div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{stats.gty + stats.gttTendik} Orang</div>
                <div className="text-[10px] text-sky-100/70 mt-0.5">{stats.gty} GTY • {stats.gttTendik} GTT/Staf</div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
          {/* Search and Filters Toolbar Card */}
          <Card className="border border-slate-200/80 shadow-xl rounded-3xl overflow-hidden bg-white mb-6">
            <CardContent className="p-4 sm:p-5 space-y-3">
              {/* Row 1: Search & Mode Switch */}
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Cari nama guru, gelar, NIP, NIK, NPK, NUPTK, mata pelajaran, jabatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-2xl text-xs font-medium border-slate-200 h-10 bg-slate-50/60 focus:bg-white transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between md:justify-end">
                  {/* View Mode Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <Button
                      size="sm"
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('table')}
                      className={`h-8 text-xs font-bold rounded-xl px-3.5 ${
                        viewMode === 'table' 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tabel
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('cards')}
                      className={`h-8 text-xs font-bold rounded-xl px-3.5 ${
                        viewMode === 'cards' 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Kartu
                    </Button>
                  </div>

                  <Button
                    onClick={() => handleOpenPrintModal('rekap')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold h-9 px-4 gap-1.5 shadow-md shrink-0"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak GTK</span>
                  </Button>
                </div>
              </div>

              {/* Row 2: Filter Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Status Sertifikasi
                  </span>
                  <Select value={filterSertifikasi} onValueChange={setFilterSertifikasi}>
                    <SelectTrigger className="w-full h-9 rounded-xl text-xs font-semibold border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="Semua Sertifikasi" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all">Semua Sertifikasi ({teachers.length})</SelectItem>
                      <SelectItem value="Sudah Sertifikasi">Sudah Sertifikasi ({stats.sertifikasi})</SelectItem>
                      <SelectItem value="Dalam Proses">Dalam Proses PPG ({stats.prosesPpg})</SelectItem>
                      <SelectItem value="Belum Sertifikasi">Belum Sertifikasi ({teachers.length - stats.sertifikasi - stats.prosesPpg})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Status Kepegawaian
                  </span>
                  <Select value={filterKepegawaian} onValueChange={setFilterKepegawaian}>
                    <SelectTrigger className="w-full h-9 rounded-xl text-xs font-semibold border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="Semua Kepegawaian" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all">Semua Kepegawaian</SelectItem>
                      <SelectItem value="PNS">PNS</SelectItem>
                      <SelectItem value="PPPK">PPPK</SelectItem>
                      <SelectItem value="GTY / Guru Tetap Yayasan">GTY (Tetap Yayasan)</SelectItem>
                      <SelectItem value="GTT / Honorer">GTT / Honorer</SelectItem>
                      <SelectItem value="Staf / Tenaga Kependidikan">Staf / Tenaga Kependidikan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Jenis Kelamin
                  </span>
                  <Select value={filterGender} onValueChange={setFilterGender}>
                    <SelectTrigger className="w-full h-9 rounded-xl text-xs font-semibold border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="Semua Gender" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all">Semua Gender</SelectItem>
                      <SelectItem value="Laki-laki">Laki-laki ({stats.male})</SelectItem>
                      <SelectItem value="Perempuan">Perempuan ({stats.female})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Counter & Quick Feedback */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-slate-600">
              Menampilkan <span className="text-emerald-700 font-extrabold">{filteredTeachers.length}</span> dari {teachers.length} Data GTK
            </span>
            {(searchQuery || filterSertifikasi !== 'all' || filterKepegawaian !== 'all' || filterGender !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterSertifikasi('all');
                  setFilterKepegawaian('all');
                  setFilterGender('all');
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
              >
                Reset Semua Filter
              </button>
            )}
          </div>

          {/* VIEW MODE 1: MODERN DATA TABLE */}
          {viewMode === 'table' ? (
            <Card className="border border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                      <th className="p-3.5 text-center w-12 border-r border-slate-800">NO</th>
                      <th className="p-3.5 border-r border-slate-800 min-w-[240px]">NAMA LENGKAP & GELAR</th>
                      <th className="p-3.5 border-r border-slate-800 min-w-[140px]">NIP / NPK</th>
                      <th className="p-3.5 border-r border-slate-800 min-w-[140px]">NIK (16 DIGIT)</th>
                      <th className="p-3.5 border-r border-slate-800 min-w-[160px]">PENDIDIKAN TERAKHIR</th>
                      <th className="p-3.5 border-r border-slate-800 min-w-[100px]">MENGAJAR</th>
                      <th className="p-3.5 border-r border-slate-800 text-center min-w-[130px]">STATUS SERTIFIKASI</th>
                      <th className="p-3.5 text-center min-w-[130px]">AKSI / CETAK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
                            <span>Memuat data guru & GTK...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTeachers.length > 0 ? (
                      filteredTeachers.map((teacher, index) => (
                        <tr key={teacher.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-800 border-r border-slate-100 font-mono">
                            {index + 1}
                          </td>
                          <td className="p-3.5 border-r border-slate-100">
                            <div className="flex items-center gap-3">
                              {teacher.foto_url ? (
                                <img
                                  src={formatImageUrl(teacher.foto_url)}
                                  alt={teacher.nama}
                                  className="w-10 h-10 rounded-full object-cover border border-emerald-300 shadow-xs shrink-0 cursor-pointer"
                                  onClick={() => handleOpenDetail(teacher)}
                                />
                              ) : (
                                <div 
                                  onClick={() => handleOpenDetail(teacher)}
                                  className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-200 cursor-pointer hover:scale-105 transition-transform"
                                >
                                  {teacher.nama.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div 
                                  onClick={() => handleOpenDetail(teacher)}
                                  className="font-extrabold text-slate-900 text-sm hover:text-emerald-700 cursor-pointer"
                                >
                                  {formatTeacherDisplayName(teacher)}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  <span className="text-emerald-700 font-bold">{teacher.jabatan}</span>
                                  {teacher.status_kepegawaian && (
                                    <span className="text-slate-400"> • {teacher.status_kepegawaian}</span>
                                  )}
                                  {teacher.mapel_diampu && <span> • {teacher.mapel_diampu}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-mono text-slate-800">
                            <div className="font-bold">{teacher.nip || '-'}</div>
                            {teacher.npk && teacher.npk !== '-' && (
                              <div className="text-[10px] text-slate-500 font-normal">NPK: {teacher.npk}</div>
                            )}
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-mono text-slate-700 font-medium">
                            {teacher.nik || '-'}
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-bold text-slate-800">
                            {teacher.pendidikan}
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-bold text-teal-800">
                            {teacher.mengajar_kelas ? (
                              <Badge className="bg-teal-50 text-teal-800 border-teal-200 font-bold text-[10px] px-2 py-0.5 rounded-lg">
                                {teacher.mengajar_kelas}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3.5 border-r border-slate-100 text-center">
                            {teacher.sertifikasi === 'Sudah Sertifikasi' ? (
                              <Badge className="bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1 rounded-full text-[10px] border border-emerald-300">
                                <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Sudah Sertifikasi
                              </Badge>
                            ) : teacher.sertifikasi === 'Dalam Proses' ? (
                              <Badge className="bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full text-[10px] border border-amber-300">
                                <Clock className="w-3 h-3 mr-1 text-amber-700" /> Dalam Proses
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-600 border-slate-300 font-semibold px-2.5 py-1 rounded-full text-[10px]">
                                Belum Sertifikasi
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetail(teacher)}
                                className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 gap-1"
                                title="Lihat Profil Detail"
                              >
                                <Eye className="w-3 h-3 text-emerald-600" /> Detail
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleOpenPrintModal('biodata', teacher)}
                                className="h-7 px-2 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                                title="Cetak Biodata GTK"
                              >
                                <Printer className="w-3 h-3" /> Cetak
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">
                          Tidak ditemukan data GTK sesuai kata kunci atau filter pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* VIEW MODE 2: CARD GRID */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map((teacher) => (
                <Card 
                  key={teacher.id} 
                  className="border border-slate-200 shadow-md hover:shadow-xl rounded-3xl overflow-hidden bg-white transition-all p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5">
                      {teacher.foto_url ? (
                        <img 
                          src={formatImageUrl(teacher.foto_url)} 
                          alt={teacher.nama} 
                          className="w-14 h-16 rounded-2xl object-cover border-2 border-emerald-200 shadow-xs shrink-0 cursor-pointer"
                          onClick={() => handleOpenDetail(teacher)}
                        />
                      ) : (
                        <div 
                          onClick={() => handleOpenDetail(teacher)}
                          className="w-14 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center font-black text-xl shrink-0 border border-emerald-200 cursor-pointer"
                        >
                          {teacher.nama.charAt(0)}
                        </div>
                      )}

                      <div className="overflow-hidden flex-1">
                        <h3 
                          onClick={() => handleOpenDetail(teacher)}
                          className="font-black text-slate-900 text-sm hover:text-emerald-700 cursor-pointer line-clamp-2"
                        >
                          {formatTeacherDisplayName(teacher)}
                        </h3>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5 truncate">
                          {teacher.jabatan}
                        </p>
                        {teacher.status_kepegawaian && (
                          <span className="text-[10.5px] font-semibold text-slate-500 block">
                            {teacher.status_kepegawaian}
                          </span>
                        )}
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="space-y-1.5 text-xs">
                      {teacher.nip && teacher.nip !== '-' ? (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">NIP:</span>
                          <span className="font-mono font-bold text-slate-800">{teacher.nip}</span>
                        </div>
                      ) : null}
                      {teacher.npk && teacher.npk !== '-' ? (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">NPK:</span>
                          <span className="font-mono font-bold text-emerald-800">{teacher.npk}</span>
                        </div>
                      ) : null}
                      {(!teacher.nip || teacher.nip === '-') && (!teacher.npk || teacher.npk === '-') ? (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">NIP / NPK:</span>
                          <span className="font-mono text-slate-400">-</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">NIK:</span>
                        <span className="font-mono font-medium text-slate-700">{teacher.nik || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Pendidikan:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[170px] text-right">{teacher.pendidikan}</span>
                      </div>
                      {teacher.mapel_diampu && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Mapel:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[170px] text-right">{teacher.mapel_diampu}</span>
                        </div>
                      )}
                      {teacher.mengajar_kelas && (
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-slate-500 font-medium">Kelas:</span>
                          <Badge className="bg-teal-50 text-teal-800 border-teal-200 font-bold text-[10px] px-2 py-0.2 rounded-md">
                            {teacher.mengajar_kelas}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {teacher.sertifikasi === 'Sudah Sertifikasi' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        Sudah Sertifikasi
                      </Badge>
                    ) : teacher.sertifikasi === 'Dalam Proses' ? (
                      <Badge className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        Dalam Proses
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-600 border-slate-300 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                        Belum Sertifikasi
                      </Badge>
                    )}

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDetail(teacher)}
                        className="h-8 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                      >
                        Detail
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenPrintModal('biodata', teacher)}
                        className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" /> Cetak
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* MODAL 1: PUSAT CETAK DOKUMEN GTK LENGKAP */}
      {isPrintModalOpen && (
        <CetakDataGtkModal
          teachersList={teachers}
          selectedTeacher={selectedTeacherForPrint}
          initialMode={printModalMode}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* MODAL 2: DETAIL PROFIL GTK INTERAKTIF */}
      <GtkDetailModal
        teacher={activeDetailTeacher}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onPrintBiodata={(t) => {
          setIsDetailModalOpen(false);
          handleOpenPrintModal('biodata', t);
        }}
        onPrintCard={(t) => {
          setIsDetailModalOpen(false);
          handleOpenPrintModal('kartu', t);
        }}
      />
    </div>
  );
};

export default TeachersList;
