"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, Medal, Award, Search, Printer, FileSpreadsheet,
  Calendar, Users, Filter, Sparkles, LayoutGrid, List,
  Image as ImageIcon, Share2, Eye, ArrowUpDown, ChevronRight,
  School, CheckCircle2, Bookmark, Flame
} from 'lucide-react';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { PrestasiItem, defaultPrestasiList } from '@/types/prestasi';
import Navbar from '@/components/Navbar';
import StickyFooter from '@/components/StickyFooter';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import CetakPiagamPrestasiModal from '@/components/CetakPiagamPrestasiModal';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import * as XLSX from 'xlsx';

const PrestasiPublic = () => {
  const { activeMadrasah, getScopedKey } = useMadrasah();
  const { settings } = useSiteSettings();
  const { requirePrintAuth } = usePrintSecurity();

  const [loading, setLoading] = useState(true);
  const [prestasiList, setPrestasiList] = useState<PrestasiItem[]>(defaultPrestasiList);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('all');
  const [filterBidang, setFilterBidang] = useState('all');
  const [filterTahun, setFilterTahun] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modals
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string; desc: string } | null>(null);
  const [selectedCertificateItem, setSelectedCertificateItem] = useState<PrestasiItem | null>(null);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  
  // Print Mode State for Report
  const [isPrintReportView, setIsPrintReportView] = useState(false);
  const [customTanggalCetak, setCustomTanggalCetak] = useState(new Date().toISOString().split('T')[0]);
  const [includePhotosInReport, setIncludePhotosInReport] = useState(true);

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

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    prestasiList.forEach(item => {
      if (item.tanggal_kegiatan) {
        const y = item.tanggal_kegiatan.split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [prestasiList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return prestasiList.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.nama_siswa.toLowerCase().includes(q) ||
        item.jenis_lomba.toLowerCase().includes(q) ||
        (item.penyelenggara && item.penyelenggara.toLowerCase().includes(q)) ||
        (item.pembimbing && item.pembimbing.toLowerCase().includes(q)) ||
        (item.bidang && item.bidang.toLowerCase().includes(q)) ||
        (item.kelas && item.kelas.toLowerCase().includes(q));

      const matchTingkat = filterTingkat === 'all' || item.tingkat === filterTingkat;
      const matchBidang = filterBidang === 'all' || item.bidang === filterBidang;
      const matchTahun = filterTahun === 'all' || (item.tanggal_kegiatan && item.tanggal_kegiatan.startsWith(filterTahun));

      return matchSearch && matchTingkat && matchBidang && matchTahun;
    });
  }, [prestasiList, searchQuery, filterTingkat, filterBidang, filterTahun]);

  // Statistics
  const stats = useMemo(() => {
    const total = prestasiList.length;
    const juara1 = prestasiList.filter(p => 
      p.juara_ke.toLowerCase().includes('juara 1') || 
      p.juara_ke.toLowerCase().includes('juara i') ||
      p.juara_ke.toLowerCase().includes('emas')
    ).length;
    const nasionalProvinsi = prestasiList.filter(p => 
      ['Provinsi', 'Nasional', 'Internasional'].includes(p.tingkat)
    ).length;
    const kabupaten = prestasiList.filter(p => p.tingkat === 'Kabupaten').length;

    return { total, juara1, nasionalProvinsi, kabupaten };
  }, [prestasiList]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenCertificate = (item: PrestasiItem) => {
    setSelectedCertificateItem(item);
    setCertificateModalOpen(true);
  };

  const handleExportExcel = () => {
    const exportData = filteredList.map((p, idx) => ({
      No: idx + 1,
      'Nama Siswa / Tim': p.nama_siswa,
      NISN: p.nisn || '-',
      Kelas: p.kelas || '-',
      'Tanggal Kegiatan': p.tanggal_kegiatan,
      'Jenis Lomba': p.jenis_lomba,
      'Tingkat Kejuaraan': p.tingkat,
      Bidang: p.bidang || 'Umum',
      'Juara Ke': p.juara_ke,
      Penyelenggara: p.penyelenggara || '-',
      'Guru Pembina': p.pembimbing || '-',
      'No. Piagam': p.nomor_piagam || '-',
      Keterangan: p.keterangan || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekapitulasi Prestasi");
    XLSX.writeFile(wb, `Rekap_Prestasi_Siswa_${activeMadrasah?.nama_madrasah || 'Madrasah'}.xlsx`);
  };

  const handlePrintReport = () => {
    requirePrintAuth(() => {
      window.print();
    });
  };

  const getTingkatBadgeColor = (tingkat: string) => {
    switch (tingkat) {
      case 'Internasional': return 'bg-purple-600 text-white';
      case 'Nasional': return 'bg-rose-600 text-white';
      case 'Provinsi': return 'bg-blue-600 text-white';
      case 'Kabupaten': return 'bg-amber-600 text-white';
      case 'Kecamatan': return 'bg-emerald-600 text-white';
      default: return 'bg-slate-700 text-white';
    }
  };

  const getJuaraBadgeStyle = (juara: string) => {
    const clean = juara.toLowerCase();
    if (clean.includes('1') || clean.includes('emas') || clean.includes('utama')) {
      return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-amber-200';
    }
    if (clean.includes('2') || clean.includes('perak')) {
      return 'bg-gradient-to-r from-slate-400 to-slate-600 text-white shadow-slate-200';
    }
    if (clean.includes('3') || clean.includes('perunggu')) {
      return 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-amber-200';
    }
    return 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Printable Area for Full Report */}
        <div className="hidden print:block mb-8 text-black">
          <KopSurat />
          <div className="text-center my-4 space-y-1">
            <h2 className="text-base font-bold uppercase underline tracking-wide">
              REKAPITULASI PRESTASI &amp; KEJUARAAN SISWA MADRASAH
            </h2>
            <p className="text-xs font-semibold text-slate-700">
              {activeMadrasah?.nama_madrasah || settings.general?.school_name || 'Madrasah Ibtidaiyah'}
            </p>
            <p className="text-[11px] text-slate-500">
              Periode Dokumen: {filterTahun !== 'all' ? `Tahun ${filterTahun}` : 'Semua Periode'} • Tingkat: {filterTingkat !== 'all' ? filterTingkat : 'Semua Tingkat'} • Bidang: {filterBidang !== 'all' ? filterBidang : 'Semua Bidang'}
            </p>
          </div>

          {/* Printable Summary Table */}
          <table className="w-full text-[11px] border-collapse border border-black my-4">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold uppercase">
                <th className="border border-black p-1.5 w-8 text-center">No</th>
                <th className="border border-black p-1.5 text-left">Nama Siswa / Tim</th>
                <th className="border border-black p-1.5 text-center w-20">Tanggal</th>
                <th className="border border-black p-1.5 text-left">Jenis Lomba / Ajang</th>
                <th className="border border-black p-1.5 text-center w-24">Tingkat</th>
                <th className="border border-black p-1.5 text-center w-20">Juara</th>
                <th className="border border-black p-1.5 text-left">Penyelenggara</th>
                <th className="border border-black p-1.5 text-left">Pembimbing</th>
                <th className="border border-black p-1.5 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item, idx) => (
                <tr key={item.id} className="page-break-inside-avoid">
                  <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-bold">
                    {item.nama_siswa}
                    {item.kelas && <span className="block font-normal text-[10px] text-slate-600">Kelas: {item.kelas}</span>}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">{item.tanggal_kegiatan}</td>
                  <td className="border border-black p-1.5">{item.jenis_lomba}</td>
                  <td className="border border-black p-1.5 text-center font-semibold">{item.tingkat}</td>
                  <td className="border border-black p-1.5 text-center font-bold">{item.juara_ke}</td>
                  <td className="border border-black p-1.5">{item.penyelenggara || '-'}</td>
                  <td className="border border-black p-1.5">{item.pembimbing || '-'}</td>
                  <td className="border border-black p-1.5 text-[10px]">{item.keterangan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Optional Documentation Gallery in Print */}
          {includePhotosInReport && filteredList.some(i => i.foto_url) && (
            <div className="mt-8 pt-4 border-t border-dashed border-black page-break-after">
              <h3 className="text-xs font-bold uppercase underline mb-3 text-center">
                DOKUMENTASI FOTO PENYERAHAN PIALA &amp; PIAGAM PRESTASI
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {filteredList.filter(i => i.foto_url).map((photoItem) => (
                  <div key={photoItem.id} className="border border-black p-2 rounded bg-white text-center page-break-inside-avoid">
                    <img
                      src={photoItem.foto_url}
                      alt={photoItem.nama_siswa}
                      className="h-28 w-full object-cover rounded mb-1 border border-slate-200"
                    />
                    <p className="font-bold text-[10px] truncate">{photoItem.nama_siswa}</p>
                    <p className="text-[9px] text-slate-700 truncate">{photoItem.juara_ke} • {photoItem.jenis_lomba}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Printable Signature */}
          <div className="mt-8 pt-4 page-break-inside-avoid">
            <PenandatanganDokumen tanggalCetak={customTanggalCetak} />
          </div>
        </div>

        {/* ======================================================== */}
        {/* PUBLIC INTERACTIVE VIEW (Screen View) */}
        {/* ======================================================== */}
        <div className="print:hidden space-y-6">
          {/* Top Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-white p-6 sm:p-10 shadow-2xl border border-amber-600/30">
            {/* Background glowing decorations */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-md px-3.5 py-1 rounded-full text-amber-200 text-xs font-bold border border-amber-400/30">
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  Hall of Fame &amp; Prestasi Gemilang
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Galeri Prestasi &amp; Kejuaraan Siswa
                </h1>
                <p className="text-amber-100/90 text-xs sm:text-sm leading-relaxed">
                  Catatan kebanggaan atas capaian gemilang peserta didik dan madrasah dalam berbagai ajang kompetisi akademik, sains, seni islami, olahraga, dan kepramukaan.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold h-11 px-4 gap-2 backdrop-blur-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>Export Excel</span>
                </Button>

                <Button
                  onClick={handlePrintReport}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs h-11 px-5 gap-2 shadow-lg shadow-amber-950/30 transition-all hover:scale-105"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Rekap Prestasi</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Statistic Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="rounded-2xl border-0 shadow-md bg-white overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Prestasi</p>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</p>
                  <p className="text-[10px] font-semibold text-amber-700">Penghargaan Tercatat</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md bg-white overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Juara 1 &amp; Emas</p>
                  <p className="text-2xl sm:text-3xl font-black text-amber-900">{stats.juara1}</p>
                  <p className="text-[10px] font-semibold text-emerald-700">Tropi Juara Utama</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <Medal className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md bg-white overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Provinsi &amp; Nasional</p>
                  <p className="text-2xl sm:text-3xl font-black text-blue-900">{stats.nasionalProvinsi}</p>
                  <p className="text-[10px] font-semibold text-blue-700">Tingkat Wilayah Tinggi</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md bg-white overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tingkat Kab / Kota</p>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-900">{stats.kabupaten}</p>
                  <p className="text-[10px] font-semibold text-emerald-700">Ajang KSM / Porseni</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <School className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search, Filter Toolbar & View Mode Switcher */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-100 space-y-3">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full lg:w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <Input
                  placeholder="Cari nama siswa, jenis lomba, pembimbing..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl text-xs bg-slate-50 border-slate-200 h-10 font-medium"
                />
              </div>

              {/* Multi-Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <Select value={filterTingkat} onValueChange={setFilterTingkat}>
                  <SelectTrigger className="w-[130px] sm:w-[150px] rounded-xl text-xs font-semibold h-10 border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Tingkat" />
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
                  <SelectTrigger className="w-[130px] sm:w-[150px] rounded-xl text-xs font-semibold h-10 border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Bidang" />
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

                {availableYears.length > 0 && (
                  <Select value={filterTahun} onValueChange={setFilterTahun}>
                    <SelectTrigger className="w-[110px] rounded-xl text-xs font-semibold h-10 border-slate-200 bg-slate-50">
                      <SelectValue placeholder="Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tahun</SelectItem>
                      {availableYears.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* View Switcher Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto lg:ml-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-amber-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Galeri Foto"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-amber-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Tabel Rinci"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count & Active Filter Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>
                Menampilkan <strong className="text-slate-800">{filteredList.length}</strong> catatan prestasi
              </span>
              {(filterTingkat !== 'all' || filterBidang !== 'all' || filterTahun !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterTingkat('all');
                    setFilterBidang('all');
                    setFilterTahun('all');
                    setSearchQuery('');
                  }}
                  className="text-amber-700 hover:text-amber-800 font-bold hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* VIEW MODE 1: GRID GALLERY CARDS */}
          {/* ======================================================== */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredList.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700">Tidak ada data prestasi yang cocok</h3>
                  <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter tingkat/bidang.</p>
                </div>
              ) : (
                filteredList.map((item) => (
                  <Card
                    key={item.id}
                    className="rounded-3xl border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden flex flex-col justify-between group"
                  >
                    {/* Top Image or Hero Header */}
                    <div className="relative aspect-[16/10] bg-gradient-to-tr from-slate-900 to-amber-950 overflow-hidden cursor-pointer">
                      {item.foto_url ? (
                        <img
                          src={item.foto_url}
                          alt={item.nama_siswa}
                          onClick={() => setSelectedPhoto({
                            url: item.foto_url!,
                            title: item.nama_siswa,
                            desc: `${item.juara_ke} • ${item.jenis_lomba} (Tingkat ${item.tingkat})`
                          })}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-amber-200/60 bg-gradient-to-br from-amber-900 to-slate-950">
                          <Trophy className="w-16 h-16 mb-2 text-amber-400/70" />
                          <span className="text-[11px] font-semibold text-amber-300/80">Dokumentasi Prestasi</span>
                        </div>
                      )}

                      {/* Floating Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <Badge className={`${getTingkatBadgeColor(item.tingkat)} font-bold text-[10px] shadow-sm border-0`}>
                          {item.tingkat}
                        </Badge>
                        {item.bidang && (
                          <Badge className="bg-slate-900/80 backdrop-blur-md text-amber-300 font-semibold text-[10px] border border-amber-400/30">
                            {item.bidang}
                          </Badge>
                        )}
                      </div>

                      {/* Juara Floating Ribbon */}
                      <div className="absolute bottom-3 right-3">
                        <div className={`px-3 py-1 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 ${getJuaraBadgeStyle(item.juara_ke)}`}>
                          <Medal className="w-3.5 h-3.5 text-white" />
                          <span>{item.juara_ke}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        {/* Student Name */}
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-amber-700 transition-colors">
                            {item.nama_siswa}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                            {item.kelas && <span>{item.kelas}</span>}
                            {item.kelas && item.nisn && <span>•</span>}
                            {item.nisn && <span>NISN: {item.nisn}</span>}
                          </div>
                        </div>

                        {/* Competition Name */}
                        <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100/80">
                          <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">Ajang Kejuaraan:</p>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-2">
                            {item.jenis_lomba}
                          </p>
                        </div>

                        {/* Details Metadata */}
                        <div className="space-y-1 text-xs text-slate-600">
                          {item.penyelenggara && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-slate-400 shrink-0">Penyelenggara:</span>
                              <span className="font-medium text-slate-800">{item.penyelenggara}</span>
                            </div>
                          )}
                          {item.pembimbing && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-slate-400 shrink-0">Pembina:</span>
                              <span className="font-medium text-slate-800">{item.pembimbing}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(item.tanggal_kegiatan)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {item.foto_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPhoto({
                              url: item.foto_url!,
                              title: item.nama_siswa,
                              desc: `${item.juara_ke} • ${item.jenis_lomba} (Tingkat ${item.tingkat})`
                            })}
                            className="text-xs font-semibold text-slate-600 hover:text-amber-700 h-8 px-2.5 rounded-xl gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Foto
                          </Button>
                        )}

                        <Button
                          type="button"
                          onClick={() => handleOpenCertificate(item)}
                          size="sm"
                          className="ml-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-xl gap-1.5 shadow-sm shadow-amber-600/20"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Cetak Piagam</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW MODE 2: TABLE LIST VIEW */}
          {/* ======================================================== */}
          {viewMode === 'table' && (
            <Card className="rounded-3xl border-0 shadow-lg bg-white overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="w-full text-xs">
                    <TableHeader>
                      <TableRow className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                        <TableHead className="w-12 text-center p-3.5">No</TableHead>
                        <TableHead className="p-3.5">Foto</TableHead>
                        <TableHead className="p-3.5">Nama Siswa / Tim</TableHead>
                        <TableHead className="p-3.5 text-center">Tanggal</TableHead>
                        <TableHead className="p-3.5">Jenis Lomba</TableHead>
                        <TableHead className="text-center p-3.5">Tingkat</TableHead>
                        <TableHead className="text-center p-3.5">Juara Ke</TableHead>
                        <TableHead className="p-3.5">Penyelenggara</TableHead>
                        <TableHead className="p-3.5">Pembimbing</TableHead>
                        <TableHead className="w-28 text-center p-3.5">Aksi Cetak</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                            Tidak ada catatan prestasi yang sesuai.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredList.map((item, idx) => (
                          <TableRow key={item.id} className="hover:bg-amber-50/40 transition-colors">
                            <TableCell className="text-center font-bold text-slate-500">{idx + 1}</TableCell>
                            <TableCell className="p-2">
                              {item.foto_url ? (
                                <img
                                  src={item.foto_url}
                                  alt={item.nama_siswa}
                                  onClick={() => setSelectedPhoto({
                                    url: item.foto_url!,
                                    title: item.nama_siswa,
                                    desc: `${item.juara_ke} • ${item.jenis_lomba}`
                                  })}
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Trophy className="w-4 h-4" />
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
                              <Badge className={`${getTingkatBadgeColor(item.tingkat)} text-[10px] font-bold border-0`}>
                                {item.tingkat}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${getJuaraBadgeStyle(item.juara_ke)}`}>
                                {item.juara_ke}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-600">{item.penyelenggara || '-'}</TableCell>
                            <TableCell className="text-slate-600">{item.pembimbing || '-'}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleOpenCertificate(item)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] h-7 px-2.5 rounded-lg gap-1"
                              >
                                <Award className="w-3 h-3" /> Piagam
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
          )}
        </div>

        {/* Modal Lightbox Foto Dokumentasi */}
        <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
          <DialogContent className="max-w-2xl rounded-3xl p-4 sm:p-6 bg-slate-950 text-white border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-amber-400">
                {selectedPhoto?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                {selectedPhoto?.desc}
              </DialogDescription>
            </DialogHeader>
            {selectedPhoto?.url && (
              <div className="mt-3 rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.title}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Cetak Piagam Satuan */}
        <CetakPiagamPrestasiModal
          open={certificateModalOpen}
          onOpenChange={setCertificateModalOpen}
          item={selectedCertificateItem}
        />
      </main>

      <StickyFooter />
    </div>
  );
};

export default PrestasiPublic;
