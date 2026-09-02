"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Printer, FileText, Type, Calendar, User, 
  Tag, ArrowLeft, Layout, Sparkles, Download, Info, Fingerprint,
  Save, Trash2, History, Loader2, RefreshCw, FolderOpen, Building, ImageIcon, Upload, X,
  GraduationCap, ShieldCheck, Home
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import DocumentCover from '@/components/DocumentCover';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { compressImage } from '@/utils/imageCompression';
import TeacherAuthModal from '@/components/TeacherAuthModal';

interface SavedCover {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  author: string;
  nip: string;
  nama_yayasan: string;
  nama_madrasah: string;
  logo_url: string;
  created_at: string;
  teacher_id?: string;
}

const CoverGeneratorPublic = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const { activeMadrasah } = useMadrasah();
  const { currentTeacher, requireTeacherAuth, isAuthenticated } = useTeacherAuth();

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedCovers, setSavedCovers] = useState<SavedCover[]>([]);
  
  const [formData, setFormData] = useState({
    title: 'RENCANA PELAKSANAAN PEMBELAJARAN (RPP)',
    subtitle: 'Materi Al-Qur\'an Hadits Semester Ganjil',
    category: 'DOKUMEN AKADEMIK',
    year: settings.tahun_pelajaran?.active_year || '2026/2027',
    author: currentTeacher?.nama || settings.general?.headmaster_name || 'NAMA PENYUSUN',
    nip: currentTeacher?.nip || '',
    nama_yayasan: settings.identitas_madrasah?.nama_yayasan || 'YAYASAN PENDIDIKAN ISLAM',
    nama_madrasah: activeMadrasah?.nama || settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || 'Si@Kad Madrasah',
    logo_url: settings.identitas_madrasah?.logo_url || ''
  });

  useEffect(() => {
    if (currentTeacher) {
      setFormData(prev => ({
        ...prev,
        author: currentTeacher.nama || prev.author,
        nip: currentTeacher.nip || prev.nip
      }));
    }
  }, [currentTeacher]);

  useEffect(() => { fetchSavedCovers(); }, []);

  const fetchSavedCovers = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'saved_covers_list').maybeSingle();
      if (res?.value) setSavedCovers(res.value as SavedCover[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const fileName = `cover-logo-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `covers/${fileName}`;
      await supabase.storage.from('public').upload(filePath, compressedFile);
      const { data } = supabase.storage.from('public').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, logo_url: data.publicUrl }));
      showSuccess('Logo cover diunggah!');
    } catch (err) { showError('Gagal upload'); } finally { setUploading(false); }
  };

  const handleSave = () => {
    requireTeacherAuth(async () => {
      if (!formData.title.trim()) { showError('Judul kosong!'); return; }
      setIsSaving(true);
      try {
        const newCover: SavedCover = { 
          ...formData, 
          id: `cover-${Date.now()}`, 
          created_at: new Date().toISOString(),
          teacher_id: currentTeacher?.id,
          author: currentTeacher?.nama || formData.author,
          nip: currentTeacher?.nip || formData.nip
        };
        const newList = [newCover, ...savedCovers];
        await supabase.from('site_settings').upsert({ id: 'saved_covers_list', value: newList, updated_at: new Date().toISOString() });
        setSavedCovers(newList as any);
        showSuccess('Desain cover berhasil disimpan!');
      } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
    });
  };

  const handleDelete = (id: string) => {
    requireTeacherAuth(async () => {
      if (!confirm('Hapus desain cover ini?')) return;
      const newList = savedCovers.filter(c => c.id !== id);
      await supabase.from('site_settings').upsert({ id: 'saved_covers_list', value: newList });
      setSavedCovers(newList);
      showSuccess('Cover dihapus');
    });
  };

  const loadCover = (cover: SavedCover) => {
    setFormData({
      title: cover.title,
      subtitle: cover.subtitle,
      category: cover.category,
      year: cover.year,
      author: cover.author,
      nip: cover.nip,
      nama_yayasan: cover.nama_yayasan || formData.nama_yayasan,
      nama_madrasah: cover.nama_madrasah || formData.nama_madrasah,
      logo_url: cover.logo_url || formData.logo_url
    });
    showSuccess('Data cover dimuat!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isPreviewing) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPreviewing(false)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Editor
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Sampul Sekarang
          </Button>
        </div>
        <div className="flex-1 p-4 sm:p-12 overflow-y-auto print:p-0 flex justify-center items-start">
          <DocumentCover {...formData} className="print:m-0 shadow-2xl print:shadow-none" />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4 portrait; margin: 0 !important; } html, body { height: 297mm; overflow: hidden !important; background: white !important; margin: 0 !important; padding: 0 !important; } .print\\:hidden { display: none !important; } }` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pt-20">
      <SEO 
        title="Generator Cover Perangkat Pembelajaran - Ruang Guru"
        description="Buat sampul resmi RPP/Modul Ajar, Silabus, dan Dokumen Administrasi Guru dengan logo dan kop resmi madrasah."
      />
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        
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

        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" /> Ruang Kerja Pendidik
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Generator Cover Dokumen Pembelajaran
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Desain sampul eksklusif RPP, Modul Ajar, dan Administrasi Guru dalam hitungan detik.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPreviewing(true)}
              className="rounded-xl font-bold text-xs h-11 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Pratinjau & Cetak
            </Button>
          </div>
        </div>

        {/* Workspace Form & Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="border-0 shadow-lg overflow-hidden rounded-3xl bg-white">
              <div className="h-2 bg-emerald-600"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Layout className="w-5 h-5 text-emerald-600" /> Konfigurasi Cover
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                    <Building className="w-3 h-3" /> Identitas Madrasah
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 border-2 border-dashed rounded-xl flex items-center justify-center bg-white overflow-hidden group shrink-0">
                      {formData.logo_url ? (
                        <>
                          <img src={formData.logo_url} className="w-full h-full object-contain" alt="" />
                          <button 
                            onClick={() => setFormData({...formData, logo_url: ''})} 
                            className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 shadow-lg"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center">
                          {uploading ? (
                            <Loader2 className="animate-spin text-emerald-500" />
                          ) : (
                            <>
                              <ImageIcon className="text-gray-300 w-5 h-5" />
                              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </>
                          )}
                        </label>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input 
                        value={formData.nama_yayasan} 
                        onChange={e => setFormData({...formData, nama_yayasan: e.target.value})} 
                        placeholder="Yayasan / Instansi" 
                        className="h-9 text-xs rounded-lg" 
                      />
                      <Input 
                        value={formData.nama_madrasah} 
                        onChange={e => setFormData({...formData, nama_madrasah: e.target.value})} 
                        placeholder="Nama Madrasah" 
                        className="h-9 text-xs font-bold rounded-lg" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Kategori Dokumen</label>
                  <Input 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    placeholder="Contoh: DOKUMEN AKADEMIK / MODUL AJAR"
                    className="rounded-xl h-11 text-xs font-semibold" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Judul Utama</label>
                  <Textarea 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="rounded-xl min-h-[80px] font-bold text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Sub-Judul / Materi</label>
                  <Input 
                    value={formData.subtitle} 
                    onChange={e => setFormData({...formData, subtitle: e.target.value})} 
                    className="rounded-xl h-11 italic text-xs" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Tahun Pelajaran</label>
                    <Input 
                      value={formData.year} 
                      onChange={e => setFormData({...formData, year: e.target.value})} 
                      className="rounded-xl h-11 text-xs font-semibold" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Nama Penyusun / Guru</label>
                    <Input 
                      value={formData.author} 
                      onChange={e => setFormData({...formData, author: e.target.value})} 
                      className="rounded-xl h-11 text-xs font-semibold" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">NIP / NUPTK</label>
                  <Input 
                    value={formData.nip} 
                    onChange={e => setFormData({...formData, nip: e.target.value})} 
                    placeholder="NIP: -" 
                    className="rounded-xl h-11 text-xs font-semibold" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    variant="outline" 
                    className="rounded-xl h-13 font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} 
                    Simpan Desain
                  </Button>
                  <Button 
                    onClick={() => setIsPreviewing(true)} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-13 font-bold shadow-lg shadow-emerald-600/20"
                  >
                    <Printer className="w-4 h-4 mr-2" /> Cetak A4 / F4
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:block sticky top-24">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">
              Pratinjau Langsung (Live Preview)
            </p>
            <div className="scale-[0.42] origin-top transform shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
              <DocumentCover {...formData} />
            </div>
          </div>
        </div>

        {/* Saved Covers History */}
        <div className="space-y-4 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" /> Riwayat Desain Tersimpan
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchSavedCovers} className="text-slate-500">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : savedCovers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-xs">Belum ada desain cover yang disimpan.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCovers.map((cover) => {
                const isMine = currentTeacher && (
                  (cover.teacher_id && cover.teacher_id === currentTeacher.id) ||
                  (cover.author && cover.author.toLowerCase().includes(currentTeacher.nama.toLowerCase()))
                );
                return (
                  <Card key={cover.id} className={`border shadow-sm hover:shadow-md transition-all group overflow-hidden rounded-2xl bg-white ${isMine ? 'border-emerald-300 ring-1 ring-emerald-400/30' : 'border-slate-200/80'}`}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase">
                            {cover.category}
                          </Badge>
                          {isMine && (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                              Milik Saya
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => loadCover(cover)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" title="Muat Desain">
                            <FolderOpen className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(cover.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 line-clamp-2 text-sm leading-snug">{cover.title}</h4>
                      <p className="text-xs text-slate-500 italic line-clamp-1">{cover.subtitle}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[10px]">
                        <span className="font-bold text-slate-400">{cover.year}</span>
                        <span className="font-bold text-emerald-600 uppercase truncate max-w-[150px]">{cover.author}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </main>

      <TeacherAuthModal />
      <Footer />
    </div>
  );
};

export default CoverGeneratorPublic;
