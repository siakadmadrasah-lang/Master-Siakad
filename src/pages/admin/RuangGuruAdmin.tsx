"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  GraduationCap, Key, ShieldCheck, UserCheck, Calendar, ClipboardList, 
  CheckCircle2, Clock, AlertCircle, Search, RefreshCw, Eye, ExternalLink,
  BookOpen, FileSpreadsheet, Layers, FileText, Check, X, Printer, Lock, Sparkles, Filter,
  Users, BarChart3, TrendingUp
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { useMadrasah } from '@/contexts/MadrasahContext';

interface Teacher {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  mapel_diampu?: string;
  status_keaktifan?: string;
  email?: string;
  telepon?: string;
  pin?: string;
}

interface LCKHRecord {
  id: string;
  tanggal: string;
  nama_guru: string;
  nip: string;
  kegiatan: string;
  hasil_capaian: string;
  jenis_kegiatan: string;
  tempat_kegiatan?: string;
  volume?: string;
  keterangan?: string;
  foto_url?: string;
  status_validasi?: 'Menunggu' | 'Disetujui' | 'Revisi';
  catatan_admin?: string;
  created_at: string;
}

interface DocumentValidationItem {
  id: string;
  type: 'LCKH' | 'Nilai Siswa' | 'Bedah CP' | 'Kisi-Kisi' | 'Pembiasaan';
  title: string;
  authorName: string;
  authorNip: string;
  date: string;
  status: 'Menunggu' | 'Disetujui' | 'Revisi';
  summary: string;
  linkUrl: string;
}

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function RuangGuruAdmin() {
  const navigate = useNavigate();
  const { activeMadrasahId } = useMadrasah();

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [lckhList, setLckhList] = useState<LCKHRecord[]>([]);
  const [nilaiList, setNilaiList] = useState<any[]>([]);
  const [bedahCPList, setBedahCPList] = useState<any[]>([]);
  const [kisiKisiList, setKisiKisiList] = useState<any[]>([]);
  const [pembiasaanList, setPembiasaanList] = useState<any[]>([]);
  const [customPins, setCustomPins] = useState<Record<string, string>>({});

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');

  // PIN Edit Dialog
  const [pinDialogTeacher, setPinDialogTeacher] = useState<Teacher | null>(null);
  const [newPinValue, setNewPinValue] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Validation Action Dialog
  const [selectedDoc, setSelectedDoc] = useState<LCKHRecord | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeMadrasahId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');

      // 1. Teachers list from GTK Module (check multiple fallback keys)
      const loadedTeachers = 
        res?.find(s => s.id === `siakad_data_guru_${activeMadrasahId}`)?.value ||
        res?.find(s => s.id === 'data_guru')?.value ||
        res?.find(s => s.id === 'siakad_data_guru')?.value ||
        res?.find(s => s.id === 'teachers_list')?.value || [];
      setTeachers(loadedTeachers);

      // 2. Custom PINs
      const pins = res?.find(s => s.id === 'teacher_pins')?.value || {};
      setCustomPins(pins);

      // 3. LCKH records
      const loadedLckh = res?.find(s => s.id === 'lckh_records')?.value || [];
      setLckhList(loadedLckh);

      // 4. Other Teacher Documents
      setNilaiList(res?.find(s => s.id === 'nilai_siswa_list')?.value || []);
      setBedahCPList(res?.find(s => s.id === 'bedah_cp_data')?.value || []);
      setKisiKisiList(res?.find(s => s.id === 'kisi_kisi_data')?.value || []);
      setPembiasaanList(res?.find(s => s.id === 'pembiasaan_records')?.value || []);

    } catch (err) {
      showError('Gagal memuat data Ruang Guru Admin');
    } finally {
      setLoading(false);
    }
  };

  // Realtime Statistics
  const stats = useMemo(() => {
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter(t => (t.status_keaktifan || 'Aktif') === 'Aktif').length;

    // Filter LCKH by month and year
    const currentMonthLckh = lckhList.filter(item => {
      if (!item.tanggal) return false;
      const [year, month] = item.tanggal.split('-');
      return year === selectedYear && String(Number(month)) === selectedMonth;
    });

    const teachersWithLckhThisMonth = new Set(currentMonthLckh.map(l => l.nama_guru)).size;
    const totalLckhEntries = currentMonthLckh.length;
    
    // Pending validations
    const pendingLckh = currentMonthLckh.filter(l => !l.status_validasi || l.status_validasi === 'Menunggu').length;
    const approvedLckh = currentMonthLckh.filter(l => l.status_validasi === 'Disetujui').length;

    return {
      totalTeachers,
      activeTeachers,
      teachersWithLckhThisMonth,
      totalLckhEntries,
      pendingLckh,
      approvedLckh,
      completionRate: activeTeachers > 0 ? Math.round((teachersWithLckhThisMonth / activeTeachers) * 100) : 0
    };
  }, [teachers, lckhList, selectedMonth, selectedYear]);

  // Teacher status & activity breakdown
  const teacherActivityStats = useMemo(() => {
    return teachers.map(t => {
      // Find LCKH entries for this teacher in selected month/year
      const teacherEntries = lckhList.filter(l => {
        const isMatched = (l.nama_guru && l.nama_guru.toLowerCase().trim() === t.nama.toLowerCase().trim()) ||
                          (l.nip && t.nip && l.nip !== '-' && l.nip.replace(/\D/g, '') === t.nip.replace(/\D/g, ''));
        if (!isMatched) return false;
        if (!l.tanggal) return false;
        const [year, month] = l.tanggal.split('-');
        return year === selectedYear && String(Number(month)) === selectedMonth;
      });

      const assignedPin = 
        customPins[t.id] || 
        customPins[t.nama] || 
        (t.nip && customPins[t.nip]) || 
        t.pin;

      const hasPin = Boolean(assignedPin || (t.nip && t.nip !== '-' && t.nip.length >= 4));
      const effectivePin = assignedPin || (t.nip && t.nip !== '-' ? t.nip.replace(/\D/g, '').slice(-6) : '-');

      return {
        ...t,
        lckhCount: teacherEntries.length,
        hasPin,
        effectivePin,
        assignedPin,
        lastActive: teacherEntries.length > 0 ? teacherEntries.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0].tanggal : null,
        pendingCount: teacherEntries.filter(e => !e.status_validasi || e.status_validasi === 'Menunggu').length,
        approvedCount: teacherEntries.filter(e => e.status_validasi === 'Disetujui').length
      };
    }).filter(t => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return t.nama.toLowerCase().includes(s) || (t.nip && t.nip.includes(s)) || (t.jabatan && t.jabatan.toLowerCase().includes(s));
    });
  }, [teachers, lckhList, selectedMonth, selectedYear, customPins, searchTerm]);

  // Documents requiring validation
  const pendingValidations = useMemo(() => {
    const list: DocumentValidationItem[] = [];

    // LCKH entries requiring validation
    lckhList
      .filter(l => !l.status_validasi || l.status_validasi === 'Menunggu')
      .slice(0, 100)
      .forEach(l => {
        list.push({
          id: `lckh_${l.id}`,
          type: 'LCKH',
          title: `LCKH: ${l.kegiatan?.slice(0, 45) || 'Kegiatan Harian'}...`,
          authorName: l.nama_guru,
          authorNip: l.nip || '-',
          date: l.tanggal,
          status: 'Menunggu',
          summary: `${l.jenis_kegiatan || 'KBM'} • Hasil: ${l.hasil_capaian || '-'}`,
          linkUrl: '/admin/kurikulum/lckh'
        });
      });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [lckhList]);

  const handleOpenPinModal = (teacher: Teacher) => {
    setPinDialogTeacher(teacher);
    const existingPin = 
      customPins[teacher.id] || 
      customPins[teacher.nama] || 
      (teacher.nip && customPins[teacher.nip]) || 
      teacher.pin || 
      (teacher.nip && teacher.nip !== '-' ? teacher.nip.replace(/\D/g, '').slice(-6) : '');
    setNewPinValue(existingPin);
  };

  const handleSavePin = async () => {
    if (!pinDialogTeacher) return;
    if (!newPinValue || newPinValue.length < 4) {
      showError('PIN minimal terdiri dari 4 karakter!');
      return;
    }

    setIsSavingPin(true);
    try {
      const cleanVal = newPinValue.trim();
      const updatedPins = {
        ...customPins,
        [pinDialogTeacher.id]: cleanVal,
        [pinDialogTeacher.nama]: cleanVal,
        ...(pinDialogTeacher.nip && pinDialogTeacher.nip !== '-' ? { [pinDialogTeacher.nip]: cleanVal } : {})
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 'teacher_pins',
          value: updatedPins,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Sync to local cache
      localStorage.setItem('siakad_teacher_pins', JSON.stringify(updatedPins));
      localStorage.setItem(`siakad_teacher_pins_${activeMadrasahId}`, JSON.stringify(updatedPins));

      // Broadcast event so TeacherAuthContext immediately knows the updated PIN
      window.dispatchEvent(new CustomEvent('teacher_pins_updated'));

      setCustomPins(updatedPins);
      showSuccess(`PIN untuk ${pinDialogTeacher.nama} berhasil disimpan (${cleanVal})!`);
      setPinDialogTeacher(null);
    } catch (err) {
      showError('Gagal memperbarui PIN pendidik');
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleValidateLCKH = async (status: 'Disetujui' | 'Revisi', item: LCKHRecord) => {
    try {
      const updatedList = lckhList.map(l => {
        if (l.id === item.id) {
          return {
            ...l,
            status_validasi: status,
            catatan_admin: adminNote || l.catatan_admin
          };
        }
        return l;
      });

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 'lckh_records',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setLckhList(updatedList);
      setSelectedDoc(null);
      setAdminNote('');
      showSuccess(`Dokumen LCKH ${status === 'Disetujui' ? 'disetujui' : 'dikembalikan untuk revisi'}`);
    } catch (err) {
      showError('Gagal memvalidasi dokumen LCKH');
    }
  };

  const handleApproveAllMonth = async () => {
    if (!window.confirm(`Setujui seluruh catatan LCKH yang masih menunggu pada bulan ${BULAN_NAMES[Number(selectedMonth) - 1]} ${selectedYear}?`)) {
      return;
    }

    try {
      const updatedList = lckhList.map(l => {
        if (l.tanggal) {
          const [year, month] = l.tanggal.split('-');
          if (year === selectedYear && String(Number(month)) === selectedMonth && (!l.status_validasi || l.status_validasi === 'Menunggu')) {
            return { ...l, status_validasi: 'Disetujui' as const };
          }
        }
        return l;
      });

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 'lckh_records',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setLckhList(updatedList);
      showSuccess(`Seluruh LCKH bulan ${BULAN_NAMES[Number(selectedMonth) - 1]} berhasil divalidasi!`);
    } catch (err) {
      showError('Gagal memvalidasi massal');
    }
  };

  return (
    <AdminLayout title="Pusat Kendali Ruang Guru">
      <div className="space-y-6 pb-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" /> Monitoring & Otorisasi GTK
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pusat Kendali & Validasi Ruang Guru
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Pantau aktivitas pengerjaan LCKH guru, validasi dokumen pembelajaran secara real-time, dan kelola PIN akses pendidik yang terhubung langsung dengan Modul Data GTK.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <Button
              onClick={() => navigate('/ruang-guru')}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl text-xs font-bold h-11 px-4 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Buka Ruang Guru (Publik)
            </Button>
            <Button
              onClick={handleApproveAllMonth}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold h-11 px-5 shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Validasi Massal LCKH Bulan Ini
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 uppercase">Periode Pantau:</span>
            </div>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs font-semibold border-slate-200">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {BULAN_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)} className="text-xs">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 w-28 rounded-xl text-xs font-semibold border-slate-200">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {[2024, 2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama guru atau NIP..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs border-slate-200 w-full"
              />
            </div>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-200 text-xs text-slate-600 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Real-time Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden hover:border-emerald-300 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Guru Terdaftar (GTK)</p>
                <h3 className="text-2xl font-black text-slate-900">{stats.totalTeachers} <span className="text-xs font-medium text-emerald-600">({stats.activeTeachers} Aktif)</span></h3>
                <p className="text-[11px] text-slate-400">Sinkron dengan Modul GTK</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden hover:border-blue-300 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tingkat Kepatuhan LCKH</p>
                <h3 className="text-2xl font-black text-blue-600">{stats.completionRate}%</h3>
                <p className="text-[11px] text-slate-400">{stats.teachersWithLckhThisMonth} dari {stats.activeTeachers} guru aktif mengisi</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden hover:border-amber-300 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Menunggu Validasi</p>
                <h3 className="text-2xl font-black text-amber-600">{stats.pendingLckh} <span className="text-xs font-normal text-slate-500">entri</span></h3>
                <p className="text-[11px] text-slate-400">Perlu persetujuan admin</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden hover:border-teal-300 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total LCKH Bulan Ini</p>
                <h3 className="text-2xl font-black text-teal-700">{stats.totalLckhEntries} <span className="text-xs font-normal text-emerald-600">({stats.approvedLckh} Valid)</span></h3>
                <p className="text-[11px] text-slate-400">{BULAN_NAMES[Number(selectedMonth) - 1]} {selectedYear}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <ClipboardList className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs defaultValue="teachers" className="space-y-4">
          <TabsList className="bg-slate-200/70 p-1 rounded-2xl h-12">
            <TabsTrigger value="teachers" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 gap-2 h-10">
              <UserCheck className="w-4 h-4" /> Kredensial PIN & Status Guru GTK
            </TabsTrigger>
            <TabsTrigger value="validation" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 gap-2 h-10">
              <ShieldCheck className="w-4 h-4" /> Antrean Validasi Dokumen ({pendingValidations.length})
            </TabsTrigger>
            <TabsTrigger value="lckh_matrix" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 gap-2 h-10">
              <BarChart3 className="w-4 h-4" /> Matriks Pengerjaan LCKH Guru
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Teachers Credentials & GTK PIN Management */}
          <TabsContent value="teachers" className="space-y-4">
            <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Key className="w-4 h-4 text-emerald-600" />
                      Daftar GTK & Pengaturan PIN Login Ruang Guru
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Mengacu langsung pada <strong>Modul Data GTK</strong>. Atur PIN khusus untuk masing-masing GTK. Guru akan login ke Ruang Guru menggunakan PIN yang Anda tetapkan di sini.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => navigate('/admin/teachers')}
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold border-slate-200 h-9"
                  >
                    Kelola Data GTK Lengkap &rarr;
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs text-slate-700 w-12 text-center">No</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">Nama Pendidik & Gelar</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">NIP / ID GTK</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">Jabatan & Tugas</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700 text-center">Status GTK</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700 text-center">PIN Ruang Guru</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700 text-center">Aktivitas LCKH ({BULAN_NAMES[Number(selectedMonth)-1]})</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700 text-center w-28">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacherActivityStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-xs text-slate-500">
                            Tidak ditemukan data guru yang sesuai.
                          </TableCell>
                        </TableRow>
                      ) : (
                        teacherActivityStats.map((teacher, idx) => (
                          <TableRow key={teacher.id} className="hover:bg-slate-50/60">
                            <TableCell className="text-center text-xs font-bold text-slate-500">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-bold text-xs text-slate-900">{teacher.nama}</div>
                              <div className="text-[11px] text-slate-400">{teacher.email || 'Email belum diatur'}</div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">
                              {teacher.nip && teacher.nip !== '-' ? teacher.nip : <Badge variant="outline" className="text-[10px] font-normal text-slate-400">Non-PNS</Badge>}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              <span className="font-medium">{teacher.jabatan || 'Guru'}</span>
                              {teacher.mapel_diampu && (
                                <span className="block text-[11px] text-emerald-700">{teacher.mapel_diampu}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={teacher.status_keaktifan === 'Aktif' || !teacher.status_keaktifan ? 'bg-emerald-100 text-emerald-800 text-[10px]' : 'bg-rose-100 text-rose-800 text-[10px]'}>
                                {teacher.status_keaktifan || 'Aktif'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-800">
                                <Lock className="w-3 h-3 text-emerald-600" />
                                {customPins[teacher.id] ? (
                                  <span className="text-emerald-700">{customPins[teacher.id]}</span>
                                ) : (
                                  <span className="text-slate-500">{teacher.effectivePin}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {teacher.lckhCount > 0 ? (
                                <Badge className="bg-blue-100 text-blue-800 text-[11px] font-bold">
                                  {teacher.lckhCount} Kegiatan
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 text-[10px]">
                                  Belum Mengisi
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                onClick={() => handleOpenPinModal(teacher)}
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs font-bold border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 gap-1"
                              >
                                <Key className="w-3.5 h-3.5" /> Ubah PIN
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Pending Document Validations */}
          <TabsContent value="validation" className="space-y-4">
            <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Antrean Dokumen Guru Menunggu Validasi
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Pemeriksaan lembar kerja harian (LCKH), hasil asesmen, dan perangkat kurikulum yang diserahkan bapak/ibu guru.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs text-slate-700 w-12 text-center">No</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">Jenis Dokumen</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">Nama Pendidik</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">Tanggal Kegiatan</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">Uraian / Ringkasan</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700 text-center">Status</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700 text-center w-36">Tindakan Validasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingValidations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16 space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                            <p className="text-sm font-bold text-slate-700">Semua Dokumen Telah Divalidasi!</p>
                            <p className="text-xs text-slate-400">Tidak ada antrean dokumen yang tertunda saat ini.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingValidations.map((doc, idx) => {
                          const originalItem = lckhList.find(l => `lckh_${l.id}` === doc.id);
                          return (
                            <TableRow key={doc.id} className="hover:bg-slate-50/60">
                              <TableCell className="text-center text-xs font-bold text-slate-500">{idx + 1}</TableCell>
                              <TableCell>
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  {doc.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold text-xs text-slate-900">
                                {doc.authorName}
                                <span className="block text-[10px] font-mono text-slate-400">{doc.authorNip}</span>
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                {doc.date}
                              </TableCell>
                              <TableCell className="text-xs text-slate-700 max-w-xs">
                                <div className="font-semibold truncate">{doc.title}</div>
                                <div className="text-[11px] text-slate-500 truncate">{doc.summary}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  Menunggu
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {originalItem && (
                                    <>
                                      <Button
                                        onClick={() => handleValidateLCKH('Disetujui', originalItem)}
                                        size="sm"
                                        className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg"
                                      >
                                        <Check className="w-3.5 h-3.5 mr-1" /> Setujui
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          setSelectedDoc(originalItem);
                                          setAdminNote('');
                                        }}
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 border-slate-200 text-slate-700 text-[11px] rounded-lg"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: LCKH Matrix Overview */}
          <TabsContent value="lckh_matrix" className="space-y-4">
            <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      Rekapitulasi Kinerja & Real-Time LCKH Guru
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Tinjauan detail jumlah entri kegiatan harian per guru pada periode {BULAN_NAMES[Number(selectedMonth) - 1]} {selectedYear}.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => navigate('/admin/kurikulum/lckh')}
                    size="sm"
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9"
                  >
                    Buka Modul LCKH Penuh &rarr;
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherActivityStats.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {teacher.jabatan || 'Guru'}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {teacher.lckhCount} Catatan
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-2">{teacher.nama}</h4>
                        <p className="text-xs font-mono text-slate-500">NIP: {teacher.nip || '-'}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">
                          Terakhir: {teacher.lastActive || 'Belum ada'}
                        </span>
                        <Button
                          onClick={() => navigate(`/admin/kurikulum/lckh`)}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2"
                        >
                          Lihat Detail &rarr;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOG: Change Teacher PIN */}
      <Dialog open={Boolean(pinDialogTeacher)} onOpenChange={() => setPinDialogTeacher(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" />
              Kelola PIN Ruang Guru Pendidik
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              PIN ini digunakan oleh pendidik saat melakukan verifikasi simpan/edit dokumen mandiri di halaman publik Ruang Guru.
            </DialogDescription>
          </DialogHeader>

          {pinDialogTeacher && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-slate-800">{pinDialogTeacher.nama}</div>
                <div className="text-xs text-slate-500 font-mono">NIP: {pinDialogTeacher.nip || '-'}</div>
                <div className="text-xs text-emerald-700 font-medium">{pinDialogTeacher.jabatan}</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  PIN Baru (Minimal 4 Angka / Karakter)
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: 123456"
                  value={newPinValue}
                  onChange={e => setNewPinValue(e.target.value)}
                  className="rounded-xl h-11 text-center font-mono font-bold text-lg tracking-widest border-slate-300"
                />
                <p className="text-[11px] text-slate-400">
                  Default sistem jika tidak diubah: 6 digit terakhir NIP atau 123456.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPinDialogTeacher(null)}
              className="rounded-xl text-xs h-10 font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSavePin}
              disabled={isSavingPin}
              className="rounded-xl text-xs h-10 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSavingPin ? 'Menyimpan...' : 'Simpan PIN Pendidik'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Validation Details */}
      <Dialog open={Boolean(selectedDoc)} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Detail Dokumen LCKH Guru
            </DialogTitle>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Guru</span>
                  <span className="font-bold text-slate-800">{selectedDoc.nama_guru}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tanggal</span>
                  <span className="font-bold text-slate-800">{selectedDoc.tanggal}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Jenis Kegiatan</span>
                  <span className="font-bold text-slate-800">{selectedDoc.jenis_kegiatan}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tempat / Volume</span>
                  <span className="font-bold text-slate-800">{selectedDoc.tempat_kegiatan || '-'} ({selectedDoc.volume || '-'})</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Uraian Kegiatan:</label>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap">
                  {selectedDoc.kegiatan}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Hasil Capaian / Output:</label>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap">
                  {selectedDoc.hasil_capaian || '-'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Catatan Admin / Evaluator (Opsional):</label>
                <Input
                  placeholder="Tambahkan catatan atau instruksi revisi..."
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  className="rounded-xl text-xs h-10 border-slate-300"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => selectedDoc && handleValidateLCKH('Revisi', selectedDoc)}
              className="rounded-xl text-xs h-10 font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              Minta Revisi
            </Button>
            <Button
              onClick={() => selectedDoc && handleValidateLCKH('Disetujui', selectedDoc)}
              className="rounded-xl text-xs h-10 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Setujui Dokumen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
