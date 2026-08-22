"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Save, Loader2, Search, Filter, BookOpen, Users, 
  CheckCircle2, AlertCircle, RefreshCw, PenTool, Info, GraduationCap,
  ArrowLeft, Home, ShieldCheck
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { fetchMataPelajaran, DEFAULT_MAPELS, MapelItem } from '@/utils/mapel';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import TeacherAuthModal from '@/components/TeacherAuthModal';

interface NilaiItem {
  student_id: string;
  mapel_id: string;
  mapel_nama?: string;
  tp_scores: Record<string, number>;
  sas_score: number;
  description: string;
  final_score?: number;
}

const InputNilaiPublic: React.FC = () => {
  const navigate = useNavigate();
  const { requireTeacherAuth, currentTeacher, isAuthenticated } = useTeacherAuth();

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [mapels, setMapels] = useState<MapelItem[]>(DEFAULT_MAPELS);
  const [bedahCP, setBedahCP] = useState<any[]>([]);
  const [nilaiList, setNilaiList] = useState<NilaiItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      
      setStudents(res?.find(s => s.id === 'students_list')?.value || []);
      const loadedClasses = res?.find(s => s.id === 'kelas_list')?.value || [];
      setClasses(loadedClasses);
      if (loadedClasses.length > 0 && !selectedClass) {
        setSelectedClass(loadedClasses[0].id || loadedClasses[0].name);
      }
      setBedahCP(res?.find(s => s.id === 'bedah_cp_data')?.value || []);
      setNilaiList(res?.find(s => s.id === 'nilai_siswa_list')?.value || []);

      const loadedMapels = await fetchMataPelajaran();
      const finalMapels = loadedMapels && loadedMapels.length > 0 ? loadedMapels : DEFAULT_MAPELS;
      setMapels(finalMapels);
      if (finalMapels.length > 0 && !selectedMapel) {
        setSelectedMapel(finalMapels[0].id);
      }
    } catch (err) {
      showError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const currentClassStudents = useMemo(() => {
    return students.filter(s => s.class_id === selectedClass || s.rombel === selectedClass);
  }, [students, selectedClass]);

  const currentMapelObj = useMemo(() => {
    return mapels.find(m => m.id === selectedMapel);
  }, [mapels, selectedMapel]);

  const currentMapelTP = useMemo(() => {
    if (!currentMapelObj) return [];
    return [
      { id: `tp1_${currentMapelObj.id}`, materi_pokok: 'Tujuan Pembelajaran 1 (TP 1)', tp: 'TP 1' },
      { id: `tp2_${currentMapelObj.id}`, materi_pokok: 'Tujuan Pembelajaran 2 (TP 2)', tp: 'TP 2' },
      { id: `tp3_${currentMapelObj.id}`, materi_pokok: 'Tujuan Pembelajaran 3 (TP 3)', tp: 'TP 3' },
      { id: `tp4_${currentMapelObj.id}`, materi_pokok: 'Tujuan Pembelajaran 4 (TP 4)', tp: 'TP 4' },
    ];
  }, [currentMapelObj]);

  const handleScoreChange = (studentId: string, tpId: string, score: number) => {
    const mapelNama = currentMapelObj?.nama || '';
    setNilaiList(prev => {
      const existing = prev.find(n => n.student_id === studentId && (n.mapel_id === selectedMapel || n.mapel_nama === mapelNama));
      if (existing) {
        return prev.map(n => (n.student_id === studentId && (n.mapel_id === selectedMapel || n.mapel_nama === mapelNama))
          ? { ...n, mapel_id: selectedMapel, mapel_nama: mapelNama, tp_scores: { ...n.tp_scores, [tpId]: score } } 
          : n
        );
      }
      return [...prev, { student_id: studentId, mapel_id: selectedMapel, mapel_nama: mapelNama, tp_scores: { [tpId]: score }, sas_score: 0, description: '' }];
    });
  };

  const handleSASChange = (studentId: string, score: number) => {
    const mapelNama = currentMapelObj?.nama || '';
    setNilaiList(prev => {
      const existing = prev.find(n => n.student_id === studentId && (n.mapel_id === selectedMapel || n.mapel_nama === mapelNama));
      if (existing) {
        return prev.map(n => (n.student_id === studentId && (n.mapel_id === selectedMapel || n.mapel_nama === mapelNama))
          ? { ...n, mapel_id: selectedMapel, mapel_nama: mapelNama, sas_score: score } 
          : n
        );
      }
      return [...prev, { student_id: studentId, mapel_id: selectedMapel, mapel_nama: mapelNama, tp_scores: {}, sas_score: score, description: '' }];
    });
  };

  const handleSaveAll = () => {
    requireTeacherAuth(async () => {
      setIsSaving(true);
      try {
        const mapelNama = currentMapelObj?.nama || '';
        const updatedNilai = nilaiList.map(n => {
          if (n.mapel_id === selectedMapel || n.mapel_nama === mapelNama) {
            const tpScores = Object.values(n.tp_scores || {}).filter(s => typeof s === 'number' && !isNaN(s));
            const avgTP = tpScores.length > 0 ? tpScores.reduce((a, b) => a + b, 0) / tpScores.length : 0;
            const sas = typeof n.sas_score === 'number' ? n.sas_score : 0;
            let finalScore = 0;
            if (avgTP > 0 && sas > 0) finalScore = Math.round((avgTP + sas) / 2);
            else if (sas > 0) finalScore = sas;
            else if (avgTP > 0) finalScore = Math.round(avgTP);

            return { 
              ...n, 
              mapel_id: selectedMapel,
              mapel_nama: mapelNama,
              final_score: finalScore
            };
          }
          return n;
        });

        const { error } = await supabase
          .from('site_settings')
          .upsert({ 
            id: 'nilai_siswa_list', 
            value: updatedNilai, 
            updated_at: new Date().toISOString() 
          });

        if (error) throw error;
        setNilaiList(updatedNilai);
        showSuccess('Seluruh nilai siswa berhasil disimpan!');
      } catch (err) {
        showError('Gagal menyimpan nilai');
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pt-20">
      <SEO 
        title="Input Nilai Formatif & Sumatif - Ruang Guru"
        description="Pengisian nilai capaian TP, SAS (Sumatif Akhir Semester), dan rekapitulasi penilaian kelas."
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
              className="text-slate-600 hover:text-cyan-700 text-xs font-semibold h-9 rounded-xl hidden sm:flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" /> Beranda
            </Button>
          </div>

          {isAuthenticated && currentTeacher && (
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 text-[11px] font-bold">
                <ShieldCheck className="w-3 h-3 mr-1" /> {currentTeacher.nama}
              </Badge>
            </div>
          )}
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" /> Ruang Kerja Pendidik • Penilaian Kelas
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Input Nilai Formatif & Sumatif Siswa
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Pengisian nilai per TP (Tujuan Pembelajaran) dan Sumatif Akhir Semester (SAS) berbasis Kurikulum Merdeka.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="rounded-xl h-11 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Seluruh Nilai
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pilih Rombongan Belajar / Kelas</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 text-xs font-semibold">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {classes.map(c => (
                  <SelectItem key={c.id || c.name} value={c.id || c.name} className="text-xs">
                    {c.name || `Kelas ${c.tingkat}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pilih Mata Pelajaran</label>
            <Select value={selectedMapel} onValueChange={setSelectedMapel}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 text-xs font-semibold">
                <SelectValue placeholder="Pilih Mata Pelajaran" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-56">
                {mapels.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table of students */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Memuat data siswa dan nilai...</p>
            </div>
          ) : currentClassStudents.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-600 font-bold text-sm">Tidak ada siswa terdaftar pada rombel ini.</p>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Silakan pilih rombel lain atau pastikan data siswa telah diisi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-700 w-12 text-center">No</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 w-28">NISN</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 min-w-[180px]">Nama Lengkap Siswa</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-center w-24">TP 1</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-center w-24">TP 2</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-center w-24">TP 3</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-center w-24">TP 4</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-center w-24">SAS (Akhir)</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-center w-24">Rata-Rata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentClassStudents.map((student, idx) => {
                    const mapelNama = currentMapelObj?.nama || '';
                    const n = nilaiList.find(item => item.student_id === student.id && (item.mapel_id === selectedMapel || item.mapel_nama === mapelNama));
                    const tp1 = n?.tp_scores?.[`tp1_${selectedMapel}`] ?? '';
                    const tp2 = n?.tp_scores?.[`tp2_${selectedMapel}`] ?? '';
                    const tp3 = n?.tp_scores?.[`tp3_${selectedMapel}`] ?? '';
                    const tp4 = n?.tp_scores?.[`tp4_${selectedMapel}`] ?? '';
                    const sas = n?.sas_score ?? '';

                    const validScores = [tp1, tp2, tp3, tp4].filter(s => s !== '' && !isNaN(Number(s))).map(Number);
                    const avgTP = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
                    const finalAvg = (avgTP > 0 && sas !== '') ? Math.round((avgTP + Number(sas)) / 2) : (sas !== '' ? Number(sas) : Math.round(avgTP));

                    return (
                      <TableRow key={student.id} className="hover:bg-slate-50/60">
                        <TableCell className="text-center font-bold text-xs text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">{student.nisn || student.nis || '-'}</TableCell>
                        <TableCell className="font-bold text-xs text-slate-900">{student.nama || student.name}</TableCell>
                        
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={tp1}
                            onChange={e => handleScoreChange(student.id, `tp1_${selectedMapel}`, Number(e.target.value))}
                            className="h-9 w-16 text-center font-bold text-xs mx-auto rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={tp2}
                            onChange={e => handleScoreChange(student.id, `tp2_${selectedMapel}`, Number(e.target.value))}
                            className="h-9 w-16 text-center font-bold text-xs mx-auto rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={tp3}
                            onChange={e => handleScoreChange(student.id, `tp3_${selectedMapel}`, Number(e.target.value))}
                            className="h-9 w-16 text-center font-bold text-xs mx-auto rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={tp4}
                            onChange={e => handleScoreChange(student.id, `tp4_${selectedMapel}`, Number(e.target.value))}
                            className="h-9 w-16 text-center font-bold text-xs mx-auto rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={sas}
                            onChange={e => handleSASChange(student.id, Number(e.target.value))}
                            className="h-9 w-16 text-center font-bold text-xs mx-auto rounded-lg border-cyan-300 bg-cyan-50/50"
                          />
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs text-cyan-800">
                          {finalAvg > 0 ? finalAvg : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      <TeacherAuthModal />
      <Footer />
    </div>
  );
};

export default InputNilaiPublic;
