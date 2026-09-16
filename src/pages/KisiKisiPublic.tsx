"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Pencil, Trash2, FileSpreadsheet, Sparkles, Loader2, 
  Save, Printer, ArrowLeft, Search, ChevronRight, BookOpen, ListChecks, Wand2,
  LayoutGrid, Settings2, CheckSquare, Square, GraduationCap, ShieldCheck, Home
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import TeacherAuthModal from '@/components/TeacherAuthModal';

interface KisiKisiItem {
  id: string;
  nama_ujian: string;
  mata_pelajaran: string;
  fase: string;
  materi_pokok: string;
  indikator_soal: string;
  level_kognitif: 'L1' | 'L2' | 'L3' | 'HOTS';
  bentuk_soal: 'PG' | 'Isian' | 'Uraian';
  no_soal: string;
  created_at: string;
  teacher_id?: string;
  guru_penyusun?: string;
  nip_penyusun?: string;
}

const MATA_PELAJARAN = [
  'Al-Quran Hadits', 'Akidah Akhlak', 'Fiqih', 'Sejarah Kebudayaan Islam',
  'Bahasa Arab', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 
  'IPAS', 'Seni Budaya', 'PJOK', 'Bahasa Inggris', 'Muatan Lokal'
];

const KisiKisiPublic: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const { requireTeacherAuth, currentTeacher, isAuthenticated } = useTeacherAuth();

  const [data, setData] = useState<KisiKisiItem[]>([]);
  const [bedahCPData, setBedahCPData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingItem, setEditingItem] = useState<KisiKisiItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUjian, setSelectedUjian] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<KisiKisiItem, 'id' | 'created_at'>>({
    nama_ujian: '',
    mata_pelajaran: 'Al-Quran Hadits',
    fase: 'A',
    materi_pokok: '',
    indikator_soal: '',
    level_kognitif: 'L1',
    bentuk_soal: 'PG',
    no_soal: '1'
  });

  const [genConfig, setGenConfig] = useState({
    nama_ujian: '',
    mata_pelajaran: 'Al-Quran Hadits',
    fase: 'A',
    jumlah_soal: '10',
    bentuk_soal: 'Campuran',
    selected_materi: [] as string[]
  });

  useEffect(() => {
    fetchKisiKisi();
    fetchBedahCP();
  }, []);

  const fetchKisiKisi = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'kisi_kisi_data').maybeSingle();
      if (res?.value) setData(res.value as KisiKisiItem[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchBedahCP = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'bedah_cp_data').maybeSingle();
      if (res?.value) setBedahCPData(res.value as any[]);
    } catch (err) { console.error(err); }
  };

  const uniqueUjian = useMemo(() => {
    const list = Array.from(new Set(data.map(d => d.nama_ujian))).filter(Boolean);
    return list;
  }, [data]);

  const activeUjianName = selectedUjian || (uniqueUjian.length > 0 ? uniqueUjian[0] : null);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchUjian = activeUjianName ? item.nama_ujian === activeUjianName : true;
      const matchSearch = 
        item.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.materi_pokok.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.indikator_soal.toLowerCase().includes(searchQuery.toLowerCase());
      return matchUjian && matchSearch;
    });
  }, [data, activeUjianName, searchQuery]);

  const handleSave = () => {
    requireTeacherAuth(async () => {
      if (!formData.nama_ujian || !formData.materi_pokok || !formData.indikator_soal) {
        showError('Lengkapi semua kolom bertanda *');
        return;
      }
      setIsSaving(true);
      try {
        let updated: KisiKisiItem[];
        if (editingItem) {
          updated = data.map(item => item.id === editingItem.id ? { 
            ...item, 
            ...formData,
            teacher_id: item.teacher_id || currentTeacher?.id,
            guru_penyusun: item.guru_penyusun || currentTeacher?.nama,
            nip_penyusun: item.nip_penyusun || currentTeacher?.nip
          } : item);
        } else {
          const newItem: KisiKisiItem = {
            id: `kisi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            ...formData,
            teacher_id: currentTeacher?.id,
            guru_penyusun: currentTeacher?.nama,
            nip_penyusun: currentTeacher?.nip,
            created_at: new Date().toISOString()
          };
          updated = [newItem, ...data];
        }
        await supabase.from('site_settings').upsert({
          id: 'kisi_kisi_data',
          value: updated,
          updated_at: new Date().toISOString()
        });
        setData(updated);
        setSelectedUjian(formData.nama_ujian);
        showSuccess(editingItem ? 'Kisi-kisi diperbarui!' : 'Kisi-kisi disimpan!');
        setDialogOpen(false);
        setEditingItem(null);
      } catch (err) { showError('Gagal menyimpan kisi-kisi'); } finally { setIsSaving(false); }
    });
  };

  const handleDelete = (id: string) => {
    requireTeacherAuth(async () => {
      if (!confirm('Hapus butir kisi-kisi ini?')) return;
      const updated = data.filter(i => i.id !== id);
      await supabase.from('site_settings').upsert({ id: 'kisi_kisi_data', value: updated });
      setData(updated);
      showSuccess('Dihapus');
    });
  };

  if (isPrinting) {
    return (
      <div className="min-h-screen bg-white p-8 print:p-0 text-black">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center print:hidden border-b pb-4">
            <Button variant="outline" onClick={() => setIsPrinting(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <Button onClick={() => window.print()} className="bg-emerald-600 text-white font-bold">
              <Printer className="w-4 h-4 mr-2" /> Cetak Naskah Kisi-Kisi
            </Button>
          </div>

          <KopSurat />

          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold uppercase underline">KISI-KISI PENULISAN SOAL ASESMEN</h2>
            <p className="text-sm font-semibold">Tahun Pelajaran {settings.tahun_pelajaran?.active_year || '2026/2027'} - Semester {settings.tahun_pelajaran?.semester || 'Ganjil'}</p>
          </div>

          <div className="grid grid-cols-2 text-xs font-semibold gap-y-1">
            <div>Nama Asesmen: {activeUjianName}</div>
            <div>Mata Pelajaran: {filteredData[0]?.mata_pelajaran || '-'}</div>
            <div>Fase: {filteredData[0]?.fase || '-'}</div>
            <div>Jumlah Soal: {filteredData.length} Butir</div>
            <div>Guru Penyusun: {filteredData[0]?.guru_penyusun || currentTeacher?.nama || 'Guru Mata Pelajaran'}</div>
            <div>NIP / NPK: {filteredData[0]?.nip_penyusun || (currentTeacher?.nip && currentTeacher.nip !== '-' ? currentTeacher.nip : '-')}</div>
          </div>

          <Table className="border border-black text-xs">
            <TableHeader className="bg-gray-100">
              <TableRow className="border-black">
                <TableHead className="border-black text-black font-bold text-center w-10">No</TableHead>
                <TableHead className="border-black text-black font-bold">Materi Pokok</TableHead>
                <TableHead className="border-black text-black font-bold">Indikator Soal</TableHead>
                <TableHead className="border-black text-black font-bold text-center w-16">Level</TableHead>
                <TableHead className="border-black text-black font-bold text-center w-16">Bentuk</TableHead>
                <TableHead className="border-black text-black font-bold text-center w-12">No. Soal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, idx) => (
                <TableRow key={item.id} className="border-black">
                  <TableCell className="border-black text-center">{idx + 1}</TableCell>
                  <TableCell className="border-black font-medium">{item.materi_pokok}</TableCell>
                  <TableCell className="border-black">{item.indikator_soal}</TableCell>
                  <TableCell className="border-black text-center">{item.level_kognitif}</TableCell>
                  <TableCell className="border-black text-center">{item.bentuk_soal}</TableCell>
                  <TableCell className="border-black text-center font-bold">{item.no_soal}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <PenandatanganDokumen 
            kategori="guru_kelas" 
            targetKelas={filteredData[0]?.fase ? `Fase ${filteredData[0].fase}` : undefined}
            tanggalCetak={new Date().toISOString().split('T')[0]}
            customGuru={{
              nama: filteredData[0]?.guru_penyusun || currentTeacher?.nama,
              nip: filteredData[0]?.nip_penyusun || currentTeacher?.nip,
              jabatan: (filteredData[0]?.guru_penyusun || currentTeacher?.nama) 
                ? `Guru ${filteredData[0]?.mata_pelajaran || currentTeacher?.mapel_diampu || 'Mata Pelajaran'}`
                : undefined,
              tanda_tangan_url: currentTeacher?.tanda_tangan_url
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pt-20">
      <SEO 
        title="Kisi-Kisi Soal Asesmen - Ruang Guru"
        description="Penyusunan instrumen kisi-kisi soal evaluasi dan cetak format standar Kurikulum Merdeka."
      />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/ruang-guru')}
              className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-bold text-xs rounded-xl h-9 px-3.5 flex items-center gap-1.5 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" /> Kembali ke Ruang Guru
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-slate-600 hover:text-purple-700 text-xs font-semibold h-9 rounded-xl hidden sm:flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" /> Beranda
            </Button>
          </div>

          {isAuthenticated && currentTeacher && (
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[11px] font-bold">
                <ShieldCheck className="w-3 h-3 mr-1" /> {currentTeacher.nama}
              </Badge>
            </div>
          )}
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" /> Ruang Kerja Pendidik • Evaluasi & Asesmen
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Kisi-Kisi Instrumen Soal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Susun dan cetak kisi-kisi soal asesmen (Format L1, L2, L3, HOTS) siap pakai untuk madrasah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  nama_ujian: activeUjianName || 'Penilaian Tengah Semester (PTS)',
                  mata_pelajaran: 'Al-Quran Hadits',
                  fase: 'A',
                  materi_pokok: '',
                  indikator_soal: '',
                  level_kognitif: 'L1',
                  bentuk_soal: 'PG',
                  no_soal: String(filteredData.length + 1)
                });
                setDialogOpen(true);
              }}
              className="rounded-xl h-11 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Butir Kisi-Kisi
            </Button>
            <Button
              variant="outline"
              disabled={filteredData.length === 0}
              onClick={() => setIsPrinting(true)}
              className="rounded-xl h-11 px-5 border-purple-300 text-purple-700 hover:bg-purple-50 font-bold text-xs flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Cetak Naskah
            </Button>
          </div>
        </div>

        {/* Package Tabs */}
        {uniqueUjian.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {uniqueUjian.map((ujian) => (
              <Button
                key={ujian}
                variant={activeUjianName === ujian ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedUjian(ujian)}
                className={`rounded-xl text-xs font-bold shrink-0 ${activeUjianName === ujian ? 'bg-purple-600 text-white' : 'border-slate-200 text-slate-600'}`}
              >
                {ujian}
              </Button>
            ))}
          </div>
        )}

        {/* Content Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Memuat kisi-kisi...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-600 font-bold text-sm">Belum ada butir kisi-kisi untuk paket asesmen ini.</p>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Klik tombol "Tambah Butir Kisi-Kisi" untuk mulai merancang instrumen ujian.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-700 w-12 text-center">No</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 w-44">Mata Pelajaran & Fase</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 w-44">Materi Pokok</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Indikator Soal</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 w-24 text-center">Level & Bentuk</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 w-20 text-center">No Soal</TableHead>
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
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                            Fase {item.fase}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-semibold text-slate-800">{item.materi_pokok}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-700 leading-relaxed">{item.indikator_soal}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-[10px] font-bold text-purple-700 border-purple-300">
                            {item.level_kognitif}
                          </Badge>
                          <span className="text-[10px] text-slate-500 font-semibold">{item.bentuk_soal}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-slate-800">{item.no_soal}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(item);
                              setFormData({
                                nama_ujian: item.nama_ujian,
                                mata_pelajaran: item.mata_pelajaran,
                                fase: item.fase,
                                materi_pokok: item.materi_pokok,
                                indikator_soal: item.indikator_soal,
                                level_kognitif: item.level_kognitif,
                                bentuk_soal: item.bentuk_soal,
                                no_soal: item.no_soal
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

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingItem ? 'Edit Butir Kisi-Kisi' : 'Tambah Butir Kisi-Kisi'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Nama Asesmen / Ujian</label>
              <Input
                value={formData.nama_ujian}
                onChange={e => setFormData({ ...formData, nama_ujian: e.target.value })}
                placeholder="Contoh: Penilaian Akhir Semester (PAS)"
                className="rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Mata Pelajaran</label>
                <Select value={formData.mata_pelajaran} onValueChange={v => setFormData({ ...formData, mata_pelajaran: v })}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Pilih Mapel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {MATA_PELAJARAN.map(m => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Materi Pokok</label>
              <Input
                value={formData.materi_pokok}
                onChange={e => setFormData({ ...formData, materi_pokok: e.target.value })}
                placeholder="Contoh: Hukum Nun Sukun dan Tanwin"
                className="rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Indikator Soal</label>
              <Textarea
                value={formData.indikator_soal}
                onChange={e => setFormData({ ...formData, indikator_soal: e.target.value })}
                rows={3}
                placeholder="Disajikan beberapa potongan ayat, peserta didik mampu mengidentifikasi..."
                className="rounded-xl text-xs leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Level Kognitif</label>
                <Select value={formData.level_kognitif} onValueChange={(v: any) => setFormData({ ...formData, level_kognitif: v })}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="L1">L1 (Mengingat/C1-C2)</SelectItem>
                    <SelectItem value="L2">L2 (Menerapkan/C3)</SelectItem>
                    <SelectItem value="L3">L3 (Penalaran/C4)</SelectItem>
                    <SelectItem value="HOTS">HOTS (Tinggi/C5-C6)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Bentuk Soal</label>
                <Select value={formData.bentuk_soal} onValueChange={(v: any) => setFormData({ ...formData, bentuk_soal: v })}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="PG">Pilihan Ganda</SelectItem>
                    <SelectItem value="Isian">Isian Singkat</SelectItem>
                    <SelectItem value="Uraian">Uraian / Essay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Nomor Soal</label>
                <Input
                  value={formData.no_soal}
                  onChange={e => setFormData({ ...formData, no_soal: e.target.value })}
                  className="rounded-xl h-10 text-xs font-bold text-center"
                />
              </div>
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
                className="rounded-xl text-xs font-bold h-11 px-6 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Kisi-Kisi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TeacherAuthModal />
      <Footer />
    </div>
  );
};

export default KisiKisiPublic;
