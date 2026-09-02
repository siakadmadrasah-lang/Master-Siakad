"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Trophy, Plus, Pencil, Trash2, Search, Printer, FileSpreadsheet,
  Save, Medal, Award, Calendar, Users, Filter, Sparkles,
  Upload, Image as ImageIcon, X, ExternalLink, Eye, CheckCircle
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { useMadrasah } from '@/contexts/MadrasahContext';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import CetakPiagamPrestasiModal from '@/components/CetakPiagamPrestasiModal';
import { PrestasiItem, defaultPrestasiList } from '@/types/prestasi';
import { uploadImageToStorage, compressImage } from '@/utils/imageCompression';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const DataPrestasi = () => {
  const navigate = useNavigate();
  const { activeMadrasah, getScopedKey } = useMadrasah();
  
  const [loading, setLoading] = useState(true);
  const [prestasiList, setPrestasiList] = useState<PrestasiItem[]>(defaultPrestasiList);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('all');
  const [filterBidang, setFilterBidang] = useState('all');
  
  const [prestasiModalOpen, setPrestasiModalOpen] = useState(false);
  const [editingPrestasi, setEditingPrestasi] = useState<PrestasiItem | null>(null);
  
  // Certificate Print Modal
  const [selectedCertificateItem, setSelectedCertificateItem] = useState<PrestasiItem | null>(null);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  
  // Photo Lightbox
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  // Form State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [prestasiForm, setPrestasiForm] = useState<Omit<PrestasiItem, 'id'>>({
    nama_siswa: '',
    nisn: '',
    kelas: '',
    tanggal_kegiatan: new Date().toISOString().split('T')[0],
    jenis_lomba: 'KSM (Kompetisi Sains Madrasah)',
    tingkat: 'Kabupaten',
    bidang: 'Sains & Teknologi',
    juara_ke: 'Juara 1',
    penyelenggara: '',
    pembimbing: '',
    nomor_piagam: '',
    keterangan: '',
    foto_url: '',
  });

  useEffect(() => {
    fetchPrestasi();
  }, [activeMadrasah?.id]);

  const fetchPrestasi = async () => {
    setLoading(true);
    try {
      const prestasiKey = getScopedKey('prestasi_madrasah');
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', prestasiKey)
        .maybeSingle();

      if (error) throw error;

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        setPrestasiList(data.value);
      } else {
        setPrestasiList(defaultPrestasiList);
      }
    } catch (err: any) {
      console.error('Error fetching data prestasi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrestasiList = async (newList: PrestasiItem[]) => {
    setPrestasiList(newList);
    try {
      const prestasiKey = getScopedKey('prestasi_madrasah');
      await supabase
        .from('site_settings')
        .upsert({ id: prestasiKey, value: newList, updated_at: new Date().toISOString() });
      showSuccess('Data prestasi siswa/madrasah berhasil disimpan!');
    } catch (e: any) {
      showError('Gagal menyimpan data prestasi: ' + e.message);
    }
  };

  const handleOpenAdd = () => {
    setEditingPrestasi(null);
    setPrestasiForm({
      nama_siswa: '',
      nisn: '',
      kelas: '',
      tanggal_kegiatan: new Date().toISOString().split('T')[0],
      jenis_lomba: '',
      tingkat: 'Kabupaten',
      bidang: 'Akademik',
      juara_ke: 'Juara 1',
      penyelenggara: '',
      pembimbing: '',
      nomor_piagam: '',
      keterangan: '',
      foto_url: '',
    });
    setPrestasiModalOpen(true);
  };

  const handleOpenEdit = (item: PrestasiItem) => {
    setEditingPrestasi(item);
    setPrestasiForm({
      nama_siswa: item.nama_siswa,
      nisn: item.nisn || '',
      kelas: item.kelas || '',
      tanggal_kegiatan: item.tanggal_kegiatan,
      jenis_lomba: item.jenis_lomba,
      tingkat: item.tingkat,
      bidang: item.bidang || 'Akademik',
      juara_ke: item.juara_ke,
      penyelenggara: item.penyelenggara || '',
      pembimbing: item.pembimbing || '',
      nomor_piagam: item.nomor_piagam || '',
      keterangan: item.keterangan || '',
      foto_url: item.foto_url || '',
    });
    setPrestasiModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan prestasi ini?')) {
      const updated = prestasiList.filter(item => item.id !== id);
      handleSavePrestasiList(updated);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImageToStorage(file, 'prestasi');
      if (url) {
        setPrestasiForm(prev => ({ ...prev, foto_url: url }));
        showSuccess('Foto dokumentasi prestasi berhasil diunggah!');
      } else {
        showError('Gagal mengunggah foto. Silakan coba lagi.');
      }
    } catch (err: any) {
      showError('Terjadi kesalahan saat mengunggah foto: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestasiForm.nama_siswa.trim()) {
      showError('Nama siswa atau tim wajib diisi');
      return;
    }

    if (editingPrestasi) {
      const updated = prestasiList.map(item =>
        item.id === editingPrestasi.id
          ? { ...prestasiForm, id: editingPrestasi.id }
          : item
      );
      handleSavePrestasiList(updated);
    } else {
      const newItem: PrestasiItem = {
        ...prestasiForm,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      handleSavePrestasiList([newItem, ...prestasiList]);
    }
    setPrestasiModalOpen(false);
  };

  const filteredList = prestasiList.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      item.nama_siswa.toLowerCase().includes(q) ||
      item.jenis_lomba.toLowerCase().includes(q) ||
      (item.penyelenggara && item.penyelenggara.toLowerCase().includes(q)) ||
      (item.pembimbing && item.pembimbing.toLowerCase().includes(q));
    
    const matchTingkat = filterTingkat === 'all' || item.tingkat === filterTingkat;
    const matchBidang = filterBidang === 'all' || item.bidang === filterBidang;
    return matchSearch && matchTingkat && matchBidang;
  });

  // Stats
  const totalPrestasi = prestasiList.length;
  const totalJuara1 = prestasiList.filter(p => p.juara_ke.toLowerCase().includes('juara 1') || p.juara_ke.toLowerCase().includes('juara i') || p.juara_ke.toLowerCase().includes('emas')).length;
  const totalKabupatenProvinsi = prestasiList.filter(p => ['Kabupaten', 'Provinsi', 'Nasional', 'Internasional'].includes(p.tingkat)).length;

  const exportExcel = () => {
    const exportData = prestasiList.map((p, idx) => ({
      No: idx + 1,
      'Nama Siswa / Tim': p.nama_siswa,
      NISN: p.nisn || '-',
      Kelas: p.kelas || '-',
      'Tanggal Kegiatan': p.tanggal_kegiatan,
      'Jenis Lomba': p.jenis_lomba,
      'Tingkat Lomba': p.tingkat,
      Bidang: p.bidang || 'Umum',
      'Juara Ke': p.juara_ke,
      'Penyelenggara': p.penyelenggara || '-',
      'Guru Pembina': p.pembimbing || '-',
      'No. Piagam': p.nomor_piagam || '-',
      'Keterangan': p.keterangan || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Prestasi");
    XLSX.writeFile(wb, `Data_Prestasi_Madrasah_${activeMadrasah?.nama_madrasah || 'Madrasah'}.xlsx`);
  };

  const handleOpenCertificate = (item: PrestasiItem) => {
    setSelectedCertificateItem(item);
    setCertificateModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Printable Header */}
        <div className="hidden print:block mb-6">
          <KopSurat />
          <div className="text-center my-4">
            <h2 className="text-base font-bold uppercase underline">DAFTAR REKAPITULASI PRESTASI SISWA MADRASAH</h2>
            <p className="text-xs font-semibold">{activeMadrasah?.nama_madrasah || 'Madrasah'}</p>
          </div>
        </div>

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden print:hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-amber-600/60 backdrop-blur-md px-3 py-1 rounded-full text-amber-200 text-xs font-semibold border border-amber-400/30">
                <Trophy className="w-4 h-4 text-amber-300" />
                Modul Prestasi &amp; Portofolio Lembaga
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Data Prestasi &amp; Kejuaraan Siswa
              </h1>
              <p className="text-amber-100/90 text-xs sm:text-sm max-w-xl">
                Dokumentasi capaian prestasi siswa, tim regu, dan madrasah dengan fitur unggah foto dokumentasi, cetak piagam resmi, dan publikasi terbuka.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => navigate('/prestasi')}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
              >
                <ExternalLink className="w-4 h-4 text-amber-300" /> Lihat Halaman Publik
              </Button>
              <Button
                type="button"
                onClick={handleOpenAdd}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs gap-2 px-5 py-6 shadow-lg shadow-amber-950/20"
              >
                <Plus className="w-4 h-4" /> Catat Prestasi Baru
              </Button>
              <Button
                type="button"
                onClick={exportExcel}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" /> Export Excel
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
              >
                <Printer className="w-4 h-4 text-amber-300" /> Cetak Rekap
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <Card className="border-0 shadow-md rounded-2xl bg-amber-50/50 border border-amber-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Prestasi Tercatat</p>
                <p className="text-2xl font-black text-amber-950 mt-1">{totalPrestasi} Kejuaraan</p>
                <p className="text-[11px] text-amber-700 mt-1">Akademik &amp; Non-Akademik</p>
              </div>
              <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <Trophy className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Capaian Juara 1</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">{totalJuara1} Tropi / Emas</p>
                <p className="text-[11px] text-emerald-700 mt-1">Juara Utama Pertama</p>
              </div>
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <Medal className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-blue-50/50 border border-blue-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Tingkat Kab/Prov/Nasional</p>
                <p className="text-2xl font-black text-blue-950 mt-1">{totalKabupatenProvinsi} Prestasi</p>
                <p className="text-[11px] text-blue-700 mt-1">Di Luar Tingkat Kecamatan</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <Award className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table Card */}
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Trophy className="w-5 h-5 text-amber-600" /> Daftar Rekapitulasi Kejuaraan &amp; Prestasi
              </CardTitle>
              <CardDescription className="text-xs">
                Kelola data prestasi siswa, unggah foto dokumentasi, serta cetak piagam penghargaan resmi.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterTingkat} onValueChange={setFilterTingkat}>
                <SelectTrigger className="w-36 rounded-xl text-xs font-bold border-slate-200">
                  <SelectValue placeholder="Semua Tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tingkat</SelectItem>
                  <SelectItem value="Kecamatan">Kecamatan</SelectItem>
                  <SelectItem value="Kabupaten">Kabupaten / Kota</SelectItem>
                  <SelectItem value="Provinsi">Provinsi</SelectItem>
                  <SelectItem value="Nasional">Nasional</SelectItem>
                  <SelectItem value="Internasional">Internasional</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBidang} onValueChange={setFilterBidang}>
                <SelectTrigger className="w-36 rounded-xl text-xs font-bold border-slate-200">
                  <SelectValue placeholder="Semua Bidang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bidang</SelectItem>
                  <SelectItem value="Akademik">Akademik</SelectItem>
                  <SelectItem value="Keagamaan / MTQ">Keagamaan / MTQ</SelectItem>
                  <SelectItem value="Sains & Teknologi">Sains &amp; Robotik</SelectItem>
                  <SelectItem value="Olahraga">Olahraga</SelectItem>
                  <SelectItem value="Seni & Budaya">Seni &amp; Budaya</SelectItem>
                  <SelectItem value="Kepramukaan">Kepramukaan</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Cari siswa / nama lomba..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl text-xs bg-white border-slate-200"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader>
                  <TableRow className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px]">
                    <TableHead className="w-12 text-center p-3">No</TableHead>
                    <TableHead className="p-3">Foto</TableHead>
                    <TableHead className="p-3">Nama Siswa / Tim</TableHead>
                    <TableHead className="p-3 text-center">Tanggal</TableHead>
                    <TableHead className="p-3">Jenis Lomba / Kejuaraan</TableHead>
                    <TableHead className="text-center p-3">Tingkat</TableHead>
                    <TableHead className="text-center p-3">Juara Ke</TableHead>
                    <TableHead className="p-3">Penyelenggara</TableHead>
                    <TableHead className="p-3">Pembimbing</TableHead>
                    <TableHead className="w-32 text-center p-3 print:hidden">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                        Belum ada catatan prestasi yang sesuai. Klik "Catat Prestasi Baru" untuk menambahkan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((item, idx) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-bold text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="p-2">
                          {item.foto_url ? (
                            <img
                              src={item.foto_url}
                              alt={item.nama_siswa}
                              onClick={() => setSelectedPhoto({ url: item.foto_url!, title: item.nama_siswa })}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {item.nama_siswa}
                          {item.kelas && <span className="block text-[10px] text-slate-500 font-normal">{item.kelas}</span>}
                        </TableCell>
                        <TableCell className="text-center font-mono text-slate-600">{item.tanggal_kegiatan}</TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {item.jenis_lomba}
                          {item.bidang && <span className="block text-[10px] text-amber-700 font-normal">Bidang: {item.bidang}</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 font-bold border-0 text-[10px]">
                            {item.tingkat}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
                            {item.juara_ke}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{item.penyelenggara || '-'}</TableCell>
                        <TableCell className="text-slate-600">{item.pembimbing || '-'}</TableCell>
                        <TableCell className="text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCertificate(item)}
                              className="h-8 px-2 text-amber-700 border-amber-300 hover:bg-amber-50 rounded-xl text-[10px] font-bold gap-1"
                              title="Cetak Piagam Penghargaan"
                            >
                              <Award className="w-3.5 h-3.5" /> Piagam
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl"
                              title="Edit Data"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Printable Signature */}
        <div className="hidden print:block mt-12">
          <PenandatanganDokumen />
        </div>

        {/* Modal Form Dialog */}
        <Dialog open={prestasiModalOpen} onOpenChange={setPrestasiModalOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-800">
                <Trophy className="w-5 h-5 text-amber-600" />
                {editingPrestasi ? 'Edit Data Prestasi Siswa' : 'Catat Prestasi Baru'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Lengkapi rincian juara, data peserta didik, dan unggah foto dokumentasi piala/piagam.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveForm} className="space-y-4 pt-2">
              {/* Photo Upload Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Foto Dokumentasi Prestasi / Penyerahan Piala
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-amber-400 transition-colors rounded-2xl p-3 bg-slate-50/60">
                  {prestasiForm.foto_url ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={prestasiForm.foto_url}
                        alt="Preview Foto"
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm"
                      />
                      <div className="space-y-1 flex-1">
                        <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Foto Siap Digunakan
                        </p>
                        <p className="text-[11px] text-slate-500 break-all line-clamp-1">{prestasiForm.foto_url}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrestasiForm(prev => ({ ...prev, foto_url: '' }))}
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 h-7 px-2 rounded-lg gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Hapus Foto
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-700">Pilih atau Unggah Foto Dokumentasi</p>
                      <p className="text-[11px] text-slate-500 mb-2">Format JPG, PNG, atau WebP (Otomatis Dicompress)</p>
                      
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold rounded-xl gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {isUploading ? 'Mengunggah & Mengompres...' : 'Pilih Foto dari Galeri / Kamera'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Nama Siswa & Kelas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Siswa / Tim Regu</label>
                  <Input
                    required
                    placeholder="Contoh: Ahmad Fauzi / Tim Pramuka"
                    value={prestasiForm.nama_siswa}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, nama_siswa: e.target.value })}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas (Opsional)</label>
                  <Input
                    placeholder="Kelas 5A"
                    value={prestasiForm.kelas || ''}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, kelas: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* NISN & Nomor Piagam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NISN (Opsional)</label>
                  <Input
                    placeholder="Contoh: 3128940192"
                    value={prestasiForm.nisn || ''}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, nisn: e.target.value })}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Piagam / Sertifikat</label>
                  <Input
                    placeholder="Contoh: 421.2/PP/VIII/2024"
                    value={prestasiForm.nomor_piagam || ''}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, nomor_piagam: e.target.value })}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Tanggal & Tingkat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Kegiatan</label>
                  <Input
                    type="date"
                    required
                    value={prestasiForm.tanggal_kegiatan}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, tanggal_kegiatan: e.target.value })}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Lomba</label>
                  <Select
                    value={prestasiForm.tingkat}
                    onValueChange={(val) => setPrestasiForm({ ...prestasiForm, tingkat: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Pilih tingkat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kecamatan">Kecamatan</SelectItem>
                      <SelectItem value="Kabupaten">Kabupaten / Kota</SelectItem>
                      <SelectItem value="Provinsi">Provinsi</SelectItem>
                      <SelectItem value="Nasional">Nasional</SelectItem>
                      <SelectItem value="Internasional">Internasional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bidang & Juara Ke */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bidang Lomba</label>
                  <Select
                    value={prestasiForm.bidang || 'Akademik'}
                    onValueChange={(val) => setPrestasiForm({ ...prestasiForm, bidang: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Pilih bidang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Akademik">Akademik</SelectItem>
                      <SelectItem value="Keagamaan / MTQ">Keagamaan / MTQ</SelectItem>
                      <SelectItem value="Sains & Teknologi">Sains &amp; Robotik</SelectItem>
                      <SelectItem value="Olahraga">Olahraga</SelectItem>
                      <SelectItem value="Seni & Budaya">Seni &amp; Budaya</SelectItem>
                      <SelectItem value="Kepramukaan">Kepramukaan</SelectItem>
                      <SelectItem value="Literasi & Bahasa">Literasi &amp; Bahasa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Juara Ke</label>
                  <Input
                    required
                    placeholder="Juara 1, Juara 2, Harapan 1, Medali Emas..."
                    value={prestasiForm.juara_ke}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, juara_ke: e.target.value })}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Jenis Lomba */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Lomba / Ajang Kejuaraan</label>
                <Input
                  required
                  placeholder="KSM Matematika Terintegrasi, MTQ Tilawah Anak, Porseni..."
                  value={prestasiForm.jenis_lomba}
                  onChange={(e) => setPrestasiForm({ ...prestasiForm, jenis_lomba: e.target.value })}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              {/* Penyelenggara & Guru Pembimbing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penyelenggara Kegiatan</label>
                  <Input
                    placeholder="Kemenag Kab / KKMI / Kwarcab..."
                    value={prestasiForm.penyelenggara || ''}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, penyelenggara: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guru Pembina / Pelatih</label>
                  <Input
                    placeholder="Nama Ustadz / Ustadzah Pendamping"
                    value={prestasiForm.pembimbing || ''}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, pembimbing: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Tambahan</label>
                <Input
                  placeholder="Maju tingkat provinsi, Piala bergilir, dll"
                  value={prestasiForm.keterangan || ''}
                  onChange={(e) => setPrestasiForm({ ...prestasiForm, keterangan: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrestasiModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs gap-1.5"
                >
                  <Save className="w-4 h-4" /> Simpan Prestasi
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Lightbox Foto */}
        <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
          <DialogContent className="max-w-2xl rounded-3xl p-4 bg-slate-950 text-white border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-amber-400">
                {selectedPhoto?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedPhoto?.url && (
              <div className="mt-2 rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.title}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Cetak Piagam */}
        <CetakPiagamPrestasiModal
          open={certificateModalOpen}
          onOpenChange={setCertificateModalOpen}
          item={selectedCertificateItem}
        />
      </div>
    </AdminLayout>
  );
};

export default DataPrestasi;
