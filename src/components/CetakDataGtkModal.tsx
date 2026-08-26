"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Printer, ArrowLeft, Download, Eye, EyeOff, Layout, FileSpreadsheet, 
  SlidersHorizontal, Check, X, ShieldCheck, Users, GraduationCap, 
  Award, QrCode, FileText, UserCheck, School, Phone, Mail, CheckCircle2,
  Calendar, Layers, Sparkles, Filter, ChevronDown, Scissors, CreditCard
} from 'lucide-react';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import { Teacher } from '@/pages/admin/TeachersAdmin';
import { formatImageUrl } from '@/utils/imageCompression';
import * as XLSX from 'xlsx';

export interface CetakDataGtkModalProps {
  teachersList: Teacher[];
  selectedTeacher?: Teacher | null;
  initialMode?: 'rekap' | 'biodata' | 'kartu';
  onClose: () => void;
}

export const CetakDataGtkModal: React.FC<CetakDataGtkModalProps> = ({
  teachersList = [],
  selectedTeacher = null,
  initialMode = 'rekap',
  onClose
}) => {
  const { settings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId } = useMadrasah();
  const { requirePrintAuth } = usePrintSecurity();

  const [printMode, setPrintMode] = useState<'rekap' | 'biodata' | 'kartu'>(initialMode);
  const [activeTeacherId, setActiveTeacherId] = useState<string>(
    selectedTeacher?.id || teachersList[0]?.id || ''
  );

  // Scope: Single vs All for Biodata & Kartu
  const [printScope, setPrintScope] = useState<'all' | 'single'>('all');
  
  // Data Filters
  const [useAllDataForRekap, setUseAllDataForRekap] = useState<boolean>(true);
  const [filterSertifikasi, setFilterSertifikasi] = useState<string>('all');
  const [filterKepegawaian, setFilterKepegawaian] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Print Customization Options
  const [showKop, setShowKop] = useState(true);
  const [showPhotosInTable, setShowPhotosInTable] = useState(false);
  const [showNik, setShowNik] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showNuptk, setShowNuptk] = useState(true);
  const [showTmt, setShowTmt] = useState(false);
  const [showSignatures, setShowSignatures] = useState(true);
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Legal'>('A4');
  const [tableFontSize, setTableFontSize] = useState<'compact' | 'normal' | 'large'>('compact');
  
  // Card ID Customization
  const [cardTheme, setCardTheme] = useState<'resmi_putih' | 'hijau_kemenag' | 'navy_formal'>('resmi_putih');
  const [showCutGuides, setShowCutGuides] = useState<boolean>(true);
  
  const [customKota, setCustomKota] = useState<string>('');
  const [customTanggal, setCustomTanggal] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const scopedPenandatanganKey = `penandatangan_${activeMadrasahId || 'default'}`;
  const scopedIdentitasKey = `identitas_madrasah_${activeMadrasahId || 'default'}`;
  const penandatangan = useMemo(() => settings[scopedPenandatanganKey] || settings.penandatangan || {}, [settings, scopedPenandatanganKey]);
  const identitas = useMemo(() => settings[scopedIdentitasKey] || settings.identitas_madrasah || {}, [settings, scopedIdentitasKey]);
  
  const defaultKota = identitas.kabupaten || (activeMadrasah as any)?.kabupaten || 'Indonesia';
  const displayKota = customKota.trim() ? customKota : defaultKota;

  const currentTeacher = useMemo(() => {
    return teachersList.find(t => t.id === activeTeacherId) || teachersList[0] || null;
  }, [teachersList, activeTeacherId]);

  // Filtered teachers list based on active filters
  const filteredTeachers = useMemo(() => {
    if (useAllDataForRekap && printMode === 'rekap') {
      return teachersList;
    }
    return teachersList.filter(t => {
      const matchSertifikasi = filterSertifikasi === 'all' || t.sertifikasi === filterSertifikasi;
      const matchKepegawaian = filterKepegawaian === 'all' || t.status_kepegawaian === filterKepegawaian;
      const matchStatus = filterStatus === 'all' || t.status_keaktifan === filterStatus;
      return matchSertifikasi && matchKepegawaian && matchStatus;
    });
  }, [teachersList, useAllDataForRekap, printMode, filterSertifikasi, filterKepegawaian, filterStatus]);

  // Teachers to render in Biodata / Kartu mode
  const teachersToRenderInMulti = useMemo(() => {
    if (printScope === 'single') {
      return currentTeacher ? [currentTeacher] : [];
    }
    return filteredTeachers.length > 0 ? filteredTeachers : teachersList;
  }, [printScope, currentTeacher, filteredTeachers, teachersList]);

  // Summary counts
  const stats = useMemo(() => {
    const list = filteredTeachers;
    const total = list.length;
    const sertifikasiCount = list.filter(t => t.sertifikasi === 'Sudah Sertifikasi').length;
    const prosesPpgCount = list.filter(t => t.sertifikasi === 'Dalam Proses').length;
    const pnsCount = list.filter(t => t.status_kepegawaian === 'PNS' || t.status_kepegawaian === 'PPPK').length;
    const gtyCount = list.filter(t => t.status_kepegawaian === 'GTY / Guru Tetap Yayasan').length;
    const gttCount = list.filter(t => t.status_kepegawaian === 'GTT / Honorer').length;
    const tendikCount = list.filter(t => t.status_kepegawaian === 'Staf / Tenaga Kependidikan').length;
    const maleCount = list.filter(t => t.gender === 'Laki-laki').length;
    const femaleCount = list.filter(t => t.gender === 'Perempuan').length;

    return {
      total,
      sertifikasiCount,
      prosesPpgCount,
      pnsCount,
      gtyCount,
      gttCount,
      tendikCount,
      maleCount,
      femaleCount
    };
  }, [filteredTeachers]);

  useEffect(() => {
    document.body.classList.add('portal-print-active');
    return () => {
      document.body.classList.remove('portal-print-active');
    };
  }, []);

  const handlePrint = () => {
    let docTitle = `Daftar GTK Lengkap (${filteredTeachers.length} GTK)`;
    if (printMode === 'biodata') {
      docTitle = printScope === 'single' && currentTeacher 
        ? `Biodata GTK - ${currentTeacher.nama}` 
        : `Biodata Lengkap Semua GTK (${teachersToRenderInMulti.length} GTK)`;
    } else if (printMode === 'kartu') {
      docTitle = printScope === 'single' && currentTeacher 
        ? `Kartu GTK - ${currentTeacher.nama}` 
        : `Kartu Identitas Semua GTK (${teachersToRenderInMulti.length} GTK)`;
    }

    requirePrintAuth(() => {
      window.print();
    }, docTitle);
  };

  const handleExportExcel = () => {
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data GTK Lengkap');

    // Auto calculate column widths
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 32 }, // Nama
      { wch: 15 }, // Gelar
      { wch: 6 },  // L/P
      { wch: 20 }, // NIK
      { wch: 20 }, // NIP
      { wch: 15 }, // NPK
      { wch: 18 }, // NUPTK
      { wch: 16 }, // NRG
      { wch: 16 }, // Peg ID
      { wch: 18 }, // Tempat Lahir
      { wch: 14 }, // Tgl Lahir
      { wch: 26 }, // Pendidikan
      { wch: 22 }, // Kepegawaian
      { wch: 24 }, // Jabatan
      { wch: 25 }, // Mapel
      { wch: 16 }, // Kelas
      { wch: 18 }, // Sertifikasi
      { wch: 22 }, // No Sertifikat
      { wch: 16 }, // HP
      { wch: 25 }, // Email
      { wch: 12 }, // Status
      { wch: 14 }  // TMT
    ];

    const fileName = `DATA_GTK_LENGKAP_${(activeMadrasah.nama_madrasah || 'MADRASAH').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const formattedDateString = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const tableFontClass = {
    compact: 'text-[9px] leading-tight',
    normal: 'text-[10px] leading-normal',
    large: 'text-[11.5px] leading-normal'
  }[tableFontSize];

  const tableCellPadding = {
    compact: 'p-1',
    normal: 'p-1.5',
    large: 'p-2'
  }[tableFontSize];

  return createPortal(
    <div id="printable-gtk-modal-root" className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Interactive Navbar / Toolbar (Screen Only) */}
      <header className="print:hidden bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-xl z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl gap-1.5 font-bold h-9 text-xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" /> Kembali
          </Button>
          <div className="h-5 w-px bg-slate-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md border border-emerald-500/30">
                Pusat Cetak Dokumen GTK Lengkap
              </span>
              <span className="text-slate-400 text-xs font-semibold hidden md:inline">
                {activeMadrasah.nama_madrasah || "Madrasah"}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-emerald-400" />
              {printMode === 'rekap' && `Rekapitulasi Data Semua GTK (${filteredTeachers.length} Orang)`}
              {printMode === 'biodata' && (printScope === 'all' ? `Lembar Biodata Semua GTK (${teachersToRenderInMulti.length} Lembar)` : `Biodata GTK: ${currentTeacher?.nama || '-'}`)}
              {printMode === 'kartu' && (printScope === 'all' ? `Kartu Identitas Semua GTK (${teachersToRenderInMulti.length} Kartu)` : `Kartu GTK: ${currentTeacher?.nama || '-'}`)}
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 ml-auto">
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </Button>

          <PrintSecurityIndicator documentTitle="Data GTK Lengkap" />

          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs gap-1.5 h-9 shadow-lg shadow-emerald-500/20 px-4"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Sekarang</span>
          </Button>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-1"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sub-toolbar: Mode Selector & Scope Selector (Screen Only) */}
      <div className="print:hidden bg-slate-900/95 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
        {/* Mode Selector Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setPrintMode('rekap');
              setPaperOrientation('landscape');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              printMode === 'rekap'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Rekap Data Lengkap ({filteredTeachers.length})</span>
          </button>

          <button
            onClick={() => {
              setPrintMode('biodata');
              setPaperOrientation('portrait');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              printMode === 'biodata'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>2. Lembar Biodata Resmi</span>
          </button>

          <button
            onClick={() => {
              setPrintMode('kartu');
              setPaperOrientation('portrait');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              printMode === 'kartu'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>3. Kartu Identitas (ID Card)</span>
          </button>
        </div>

        {/* Scope & Mode Specific Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector for Biodata & Kartu */}
          {printMode !== 'rekap' && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setPrintScope('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  printScope === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cetak Semua ({teachersList.length} GTK)
              </button>
              <button
                onClick={() => setPrintScope('single')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  printScope === 'single'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cetak 1 GTK
              </button>
            </div>
          )}

          {/* Teacher Selector if Single */}
          {printMode !== 'rekap' && printScope === 'single' && (
            <div className="flex items-center gap-1.5">
              <Select value={activeTeacherId} onValueChange={setActiveTeacherId}>
                <SelectTrigger className="w-[230px] h-8 bg-slate-950 border-slate-700 text-white text-xs font-bold rounded-lg">
                  <SelectValue placeholder="Pilih Guru / GTK" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs max-h-[300px]">
                  {teachersList.map(t => (
                    <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                      {t.nama} {t.gelar ? `(${t.gelar})` : ''} - {t.jabatan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Rekap Controls */}
          {printMode === 'rekap' && (
            <>
              {/* Filter vs All toggle */}
              <button
                onClick={() => setUseAllDataForRekap(!useAllDataForRekap)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                  useAllDataForRekap 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{useAllDataForRekap ? `Semua Data GTK (${teachersList.length})` : `Gunakan Filter (${filteredTeachers.length})`}</span>
              </button>

              {!useAllDataForRekap && (
                <>
                  <Select value={filterSertifikasi} onValueChange={setFilterSertifikasi}>
                    <SelectTrigger className="w-[145px] h-8 bg-slate-950 border-slate-700 text-white text-xs font-semibold rounded-lg">
                      <SelectValue placeholder="Sertifikasi" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs">
                      <SelectItem value="all">Semua Sertifikasi</SelectItem>
                      <SelectItem value="Sudah Sertifikasi">Sudah Sertifikasi</SelectItem>
                      <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                      <SelectItem value="Belum Sertifikasi">Belum Sertifikasi</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterKepegawaian} onValueChange={setFilterKepegawaian}>
                    <SelectTrigger className="w-[145px] h-8 bg-slate-950 border-slate-700 text-white text-xs font-semibold rounded-lg">
                      <SelectValue placeholder="Kepegawaian" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs">
                      <SelectItem value="all">Semua Kepegawaian</SelectItem>
                      <SelectItem value="PNS">PNS</SelectItem>
                      <SelectItem value="PPPK">PPPK</SelectItem>
                      <SelectItem value="GTY / Guru Tetap Yayasan">GTY (Tetap Yayasan)</SelectItem>
                      <SelectItem value="GTT / Honorer">GTT / Honorer</SelectItem>
                      <SelectItem value="Staf / Tenaga Kependidikan">Staf Tendik</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Table Font Density */}
              <Select value={tableFontSize} onValueChange={(val: any) => setTableFontSize(val)}>
                <SelectTrigger className="w-[125px] h-8 bg-slate-950 border-slate-700 text-white text-xs font-semibold rounded-lg">
                  <SelectValue placeholder="Ukuran Teks" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs">
                  <SelectItem value="compact">Teks Rapat (Muat Banyak)</SelectItem>
                  <SelectItem value="normal">Teks Standar</SelectItem>
                  <SelectItem value="large">Teks Besar</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* Kartu Specific Controls */}
          {printMode === 'kartu' && (
            <>
              {/* Theme Selector */}
              <Select value={cardTheme} onValueChange={(val: any) => setCardTheme(val)}>
                <SelectTrigger className="w-[180px] h-8 bg-slate-950 border-slate-700 text-white text-xs font-semibold rounded-lg">
                  <SelectValue placeholder="Tema Kartu" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs">
                  <SelectItem value="resmi_putih">Desain Putih Resmi (Hemat Tinta)</SelectItem>
                  <SelectItem value="hijau_kemenag">Desain Hijau Kemenag</SelectItem>
                  <SelectItem value="navy_formal">Desain Biru Formal</SelectItem>
                </SelectContent>
              </Select>

              {/* Cut Guides Toggle */}
              <button
                onClick={() => setShowCutGuides(!showCutGuides)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  showCutGuides 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
                title="Tampilkan garis putus-putus panduan potong gunting"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{showCutGuides ? 'Garis Potong: Aktif' : 'Garis Potong: Off'}</span>
              </button>
            </>
          )}

          {/* Paper Size */}
          <Select value={paperSize} onValueChange={(val: any) => setPaperSize(val)}>
            <SelectTrigger className="w-[100px] h-8 bg-slate-950 border-slate-700 text-white text-xs font-semibold rounded-lg">
              <SelectValue placeholder="Kertas" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs">
              <SelectItem value="A4">Kertas A4</SelectItem>
              <SelectItem value="F4">Kertas F4 / Folio</SelectItem>
              <SelectItem value="Legal">Kertas Legal</SelectItem>
            </SelectContent>
          </Select>

          {/* Orientation */}
          <button
            onClick={() => setPaperOrientation(paperOrientation === 'landscape' ? 'portrait' : 'landscape')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1 hover:text-white"
          >
            <Layout className="w-3.5 h-3.5 text-teal-400" />
            <span>{paperOrientation === 'landscape' ? 'Lanskap' : 'Potret'}</span>
          </button>

          {/* Toggle Kop */}
          <button
            onClick={() => setShowKop(!showKop)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
              showKop 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            {showKop ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-slate-500" />}
            <span>Kop</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Scrollable Paper Preview */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex justify-center items-start">
        {/* Printable Paper Wrapper */}
        <div 
          id="printable-gtk-paper"
          className={`bg-white text-slate-950 shadow-2xl rounded-sm transition-all duration-200 ${
            paperOrientation === 'landscape' 
              ? 'w-full max-w-[1240px] min-h-[780px] p-6 sm:p-8' 
              : 'w-full max-w-[860px] min-h-[1100px] p-6 sm:p-8'
          }`}
          style={{
            fontFamily: "'Times New Roman', Times, serif"
          }}
        >
          {/* ========================================================
              MODE 1: REKAPITULASI TABEL GTK LENGKAP
              ======================================================== */}
          {printMode === 'rekap' && (
            <div className="space-y-4">
              {/* Kop Surat Resmi */}
              {showKop && (
                <div className="border-b-2 border-slate-950 pb-2 mb-3">
                  <KopSurat />
                </div>
              )}

              {/* Document Header */}
              <div className="text-center space-y-1 mb-4">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950">
                  DAFTAR GURU DAN TENAGA KEPENDIDIKAN (GTK)
                </h1>
                <h2 className="text-sm font-bold uppercase text-slate-800">
                  {activeMadrasah.nama_madrasah || "MADRASAH IBTIDAIYAH MA'ARIF"}
                </h2>
                <p className="text-xs italic text-slate-600">
                  NSM: {activeMadrasah.nsm || '-'} &nbsp;|&nbsp; NPSN: {activeMadrasah.npsn || '-'} &nbsp;|&nbsp; Status Akreditasi: {activeMadrasah.akreditasi || 'A (Unggul)'}
                </p>
                <div className="text-[11px] text-slate-700 font-semibold pt-0.5">
                  Jumlah GTK Terdaftar: {filteredTeachers.length} Orang
                </div>
              </div>

              {/* Tabel Data GTK Lengkap (Full Multi-Page Flow) */}
              <div className="print-table-wrapper w-full">
                <table className={`print-gtk-table w-full border-collapse border border-slate-900 text-center ${tableFontClass}`}>
                  <thead>
                    <tr className="bg-slate-200/90 text-slate-950 font-black uppercase text-[9.5px]">
                      <th className={`border border-slate-900 ${tableCellPadding} w-7`}>No</th>
                      {showPhotosInTable && (
                        <th className={`border border-slate-900 ${tableCellPadding} w-10`}>Foto</th>
                      )}
                      <th className={`border border-slate-900 ${tableCellPadding} text-left min-w-[150px]`}>
                        Nama Lengkap &amp; Gelar
                      </th>
                      <th className={`border border-slate-900 ${tableCellPadding} w-7`}>L/P</th>
                      <th className={`border border-slate-900 ${tableCellPadding} min-w-[110px]`}>
                        NIP / NPK
                      </th>
                      {showNuptk && (
                        <th className={`border border-slate-900 ${tableCellPadding} min-w-[105px]`}>
                          NUPTK / PegID
                        </th>
                      )}
                      {showNik && (
                        <th className={`border border-slate-900 ${tableCellPadding} min-w-[110px]`}>
                          NIK (16 Digit)
                        </th>
                      )}
                      <th className={`border border-slate-900 ${tableCellPadding} text-left min-w-[110px]`}>
                        Pendidikan
                      </th>
                      <th className={`border border-slate-900 ${tableCellPadding} text-left min-w-[110px]`}>
                        Kepegawaian
                      </th>
                      <th className={`border border-slate-900 ${tableCellPadding} text-left min-w-[130px]`}>
                        Jabatan &amp; Mapel
                      </th>
                      <th className={`border border-slate-900 ${tableCellPadding} min-w-[70px]`}>
                        Kelas
                      </th>
                      <th className={`border border-slate-900 ${tableCellPadding} min-w-[100px]`}>
                        Sertifikasi
                      </th>
                      {showPhone && (
                        <th className={`border border-slate-900 ${tableCellPadding} min-w-[90px]`}>
                          No. HP
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.length > 0 ? (
                      filteredTeachers.map((teacher, index) => (
                        <tr 
                          key={teacher.id || index}
                          className={index % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}
                          style={{ pageBreakInside: 'avoid' }}
                        >
                          <td className={`border border-slate-900 ${tableCellPadding} font-bold text-slate-800`}>
                            {index + 1}
                          </td>
                          {showPhotosInTable && (
                            <td className={`border border-slate-900 ${tableCellPadding}`}>
                              <div className="w-8 h-10 mx-auto bg-slate-100 border border-slate-400 overflow-hidden flex items-center justify-center">
                                {teacher.foto_url ? (
                                  <img 
                                    src={formatImageUrl(teacher.foto_url)} 
                                    alt={teacher.nama} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="font-bold text-[10px] text-slate-500">
                                    {teacher.nama.charAt(0)}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          <td className={`border border-slate-900 ${tableCellPadding} text-left font-bold text-slate-950`}>
                            <div>{teacher.nama}</div>
                            {teacher.gelar && (
                              <div className="text-[9px] font-normal text-slate-700 italic">
                                {teacher.gelar}
                              </div>
                            )}
                          </td>
                          <td className={`border border-slate-900 ${tableCellPadding} font-bold`}>
                            {teacher.gender === 'Laki-laki' ? 'L' : 'P'}
                          </td>
                          <td className={`border border-slate-900 ${tableCellPadding} font-mono text-[9.5px]`}>
                            {teacher.nip && teacher.nip !== '-' ? (
                              <div className="font-bold">{teacher.nip}</div>
                            ) : null}
                            {teacher.npk && teacher.npk !== '-' ? (
                              <div className="text-[9px] text-slate-600">NPK: {teacher.npk}</div>
                            ) : (!teacher.nip || teacher.nip === '-') && (!teacher.npk || teacher.npk === '-') ? (
                              <span className="text-slate-400">-</span>
                            ) : null}
                          </td>
                          {showNuptk && (
                            <td className={`border border-slate-900 ${tableCellPadding} font-mono text-[9px]`}>
                              {teacher.nuptk && teacher.nuptk !== '-' ? (
                                <div>NUPTK: {teacher.nuptk}</div>
                              ) : null}
                              {teacher.peg_id && teacher.peg_id !== '-' ? (
                                <div className="text-slate-600">PegID: {teacher.peg_id}</div>
                              ) : (!teacher.nuptk || teacher.nuptk === '-') && (!teacher.peg_id || teacher.peg_id === '-') ? (
                                <span className="text-slate-400">-</span>
                              ) : null}
                            </td>
                          )}
                          {showNik && (
                            <td className={`border border-slate-900 ${tableCellPadding} font-mono text-[9.5px]`}>
                              {teacher.nik || '-'}
                            </td>
                          )}
                          <td className={`border border-slate-900 ${tableCellPadding} text-left`}>
                            <div className="font-semibold">{teacher.pendidikan}</div>
                          </td>
                          <td className={`border border-slate-900 ${tableCellPadding} text-left text-[9.5px]`}>
                            <span className="font-bold">{teacher.status_kepegawaian || 'GTY'}</span>
                          </td>
                          <td className={`border border-slate-900 ${tableCellPadding} text-left`}>
                            <div className="font-bold text-slate-900">{teacher.jabatan}</div>
                            {teacher.mapel_diampu && (
                              <div className="text-[9px] text-slate-700 italic">
                                Mapel: {teacher.mapel_diampu}
                              </div>
                            )}
                          </td>
                          <td className={`border border-slate-900 ${tableCellPadding} font-bold text-[9.5px]`}>
                            {teacher.mengajar_kelas || '-'}
                          </td>
                          <td className={`border border-slate-900 ${tableCellPadding} font-bold text-[9px]`}>
                            <span className={teacher.sertifikasi === 'Sudah Sertifikasi' ? 'text-emerald-950' : 'text-slate-700'}>
                              {teacher.sertifikasi}
                            </span>
                            {teacher.no_sertifikat_pendidik && (
                              <div className="font-mono text-[8.5px] font-normal text-slate-600">
                                {teacher.no_sertifikat_pendidik}
                              </div>
                            )}
                          </td>
                          {showPhone && (
                            <td className={`border border-slate-900 ${tableCellPadding} font-mono text-[9px]`}>
                              {teacher.telepon || '-'}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="border border-slate-900 p-6 text-center italic text-slate-500">
                          Tidak ada data GTK yang sesuai dengan kriteria yang dipilih.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rekapitulasi Statistik Ringkas di Bawah Tabel */}
              <div className="page-break-inside-avoid mt-4 p-3 border border-slate-900 rounded-xs bg-slate-50/70 text-[10.5px] space-y-1.5" style={{ pageBreakInside: 'avoid' }}>
                <div className="font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Rekapitulasi Keadaan GTK ({filteredTeachers.length} Orang):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-800">
                  <div>• Total GTK: <strong>{stats.total} Orang</strong></div>
                  <div>• Laki-laki: <strong>{stats.maleCount} Orang</strong></div>
                  <div>• Perempuan: <strong>{stats.femaleCount} Orang</strong></div>
                  <div>• Sudah Sertifikasi: <strong>{stats.sertifikasiCount} Orang</strong></div>
                  <div>• Dalam Proses PPG: <strong>{stats.prosesPpgCount} Orang</strong></div>
                  <div>• PNS / PPPK: <strong>{stats.pnsCount} Orang</strong></div>
                  <div>• Guru Tetap Yayasan (GTY): <strong>{stats.gtyCount} Orang</strong></div>
                  <div>• GTT / Staf Tendik: <strong>{stats.gttCount + stats.tendikCount} Orang</strong></div>
                </div>
              </div>

              {/* Tanda Tangan Resmi Pengesahan Dokumen */}
              {showSignatures && (
                <div className="page-break-inside-avoid mt-6 pt-2" style={{ pageBreakInside: 'avoid' }}>
                  <PenandatanganDokumen
                    title="Mengesahkan,"
                    showGuru={false}
                    customKota={displayKota}
                    tanggalCetak={customTanggal}
                  />
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              MODE 2: LEMBAR BIODATA / PROFIL RESMI INDIVIDU GTK
              (Renders 1 GTK or ALL GTKs with Page Breaks)
              ======================================================== */}
          {printMode === 'biodata' && (
            <div className="space-y-12">
              {teachersToRenderInMulti.map((teacher, idx) => (
                <div 
                  key={teacher.id || idx} 
                  className={`space-y-4 ${idx > 0 ? 'page-break pt-4' : ''}`}
                  style={idx > 0 ? { pageBreakBefore: 'always', breakBefore: 'page' } : {}}
                >
                  {/* Kop Surat Resmi */}
                  {showKop && (
                    <div className="border-b-2 border-slate-950 pb-2 mb-3">
                      <KopSurat />
                    </div>
                  )}

                  {/* Document Header */}
                  <div className="text-center space-y-1 mb-4">
                    <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950 underline">
                      BIODATA LENGKAP PENDIDIK &amp; TENAGA KEPENDIDIKAN
                    </h1>
                    <p className="text-xs italic text-slate-600">
                      Kode Registrasi GTK: {teacher.id.toUpperCase()} | {activeMadrasah.nama_madrasah || "Madrasah"}
                    </p>
                  </div>

                  {/* Main Content with Photo on Top Right */}
                  <div className="flex flex-col-reverse md:flex-row gap-5 items-start justify-between">
                    <div className="flex-1 w-full space-y-4">
                      {/* Bagian I: Identitas Pribadi */}
                      <div>
                        <h3 className="font-black text-xs uppercase bg-slate-100 p-1.5 border-l-4 border-slate-900 text-slate-950 mb-2">
                          I. IDENTITAS PRIBADI
                        </h3>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 w-44 font-semibold text-slate-700">Nama Lengkap &amp; Gelar</td>
                              <td className="py-1.5 w-3">:</td>
                              <td className="py-1.5 font-bold text-slate-950">
                                {teacher.nama} {teacher.gelar ? `, ${teacher.gelar}` : ''}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Nomor Induk Kependudukan (NIK)</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-mono font-bold">{teacher.nik || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Jenis Kelamin</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5">{teacher.gender}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Tempat, Tanggal Lahir</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5">
                                {teacher.tempat_lahir || '-'}, {formattedDateString(teacher.tanggal_lahir)}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Alamat Rumah / Domisili</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-medium">{teacher.alamat_rumah || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">No. Handphone / WhatsApp</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-mono">{teacher.telepon || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Alamat Email Resmi</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-mono">{teacher.email || '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Bagian II: Status Kepegawaian & Nomor Identitas Pendidik */}
                      <div>
                        <h3 className="font-black text-xs uppercase bg-slate-100 p-1.5 border-l-4 border-slate-900 text-slate-950 mb-2">
                          II. STATUS KEPEGAWAIAN &amp; IDENTITAS RESMI
                        </h3>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 w-44 font-semibold text-slate-700">Status Kepegawaian</td>
                              <td className="py-1.5 w-3">:</td>
                              <td className="py-1.5 font-bold text-slate-950">
                                {teacher.status_kepegawaian || 'GTY / Guru Tetap Yayasan'}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">NIP (Nomor Induk Pegawai)</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-mono font-bold">{teacher.nip || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">NPK (Nomor Pendidik Kemenag)</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-mono">{teacher.npk || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">NUPTK</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-mono">{teacher.nuptk || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">NRG (Nomor Registrasi Guru)</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-mono">{teacher.nrg || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Peg ID (SIMPATIKA / SIAGA)</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-mono">{teacher.peg_id || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">TMT Awal Pendidik</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5">{formattedDateString(teacher.tmt_pendidik)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Status Keaktifan</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-bold text-emerald-800">
                                {teacher.status_keaktifan || 'Aktif Bertugas'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Bagian III: Kualifikasi Akademik & Sertifikasi */}
                      <div>
                        <h3 className="font-black text-xs uppercase bg-slate-100 p-1.5 border-l-4 border-slate-900 text-slate-950 mb-2">
                          III. KUALIFIKASI PENDIDIKAN &amp; SERTIFIKASI
                        </h3>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 w-44 font-semibold text-slate-700">Pendidikan Terakhir</td>
                              <td className="py-1.5 w-3">:</td>
                              <td className="py-1.5 font-bold text-slate-950">{teacher.pendidikan}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Status Sertifikasi Pendidik</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-bold">
                                <span className={teacher.sertifikasi === 'Sudah Sertifikasi' ? 'text-emerald-800' : 'text-slate-800'}>
                                  {teacher.sertifikasi}
                                </span>
                              </td>
                            </tr>
                            {teacher.no_sertifikat_pendidik && (
                              <tr className="border-b border-slate-200">
                                <td className="py-1.5 font-semibold text-slate-700">No. Sertifikat Pendidik</td>
                                <td className="py-1.5">:</td>
                                <td className="py-1.5 font-mono">{teacher.no_sertifikat_pendidik}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Bagian IV: Tugas Pokok & Pembelajaran */}
                      <div>
                        <h3 className="font-black text-xs uppercase bg-slate-100 p-1.5 border-l-4 border-slate-900 text-slate-950 mb-2">
                          IV. TUGAS POKOK &amp; PEMBELAJARAN
                        </h3>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 w-44 font-semibold text-slate-700">Jabatan / Tugas Utama</td>
                              <td className="py-1.5 w-3">:</td>
                              <td className="py-1.5 font-bold text-slate-950">{teacher.jabatan}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Mata Pelajaran yang Diampu</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-semibold">{teacher.mapel_diampu || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 font-semibold text-slate-700">Mengajar di Kelas</td>
                              <td className="py-1.5">:</td>
                              <td className="py-1.5 font-semibold">{teacher.mengajar_kelas || '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Foto Resmi GTK (Box 3x4 / 4x6) */}
                    <div className="w-36 shrink-0 flex flex-col items-center gap-2">
                      <div className="w-32 h-44 border-2 border-slate-900 p-1 bg-white shadow-md flex items-center justify-center">
                        {teacher.foto_url ? (
                          <img
                            src={formatImageUrl(teacher.foto_url)}
                            alt={teacher.nama}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                            <span className="font-bold text-3xl">{teacher.nama.charAt(0)}</span>
                            <span className="text-[9px] mt-1">Foto 3x4 Resmi</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-center font-mono text-slate-600">
                        {teacher.nip && teacher.nip !== '-' ? `NIP. ${teacher.nip}` : `ID: ${teacher.id}`}
                      </div>
                    </div>
                  </div>

                  {/* Pengesahan Tanda Tangan GTK & Kepala Madrasah */}
                  <div className="page-break-inside-avoid mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-center" style={{ pageBreakInside: 'avoid' }}>
                    <div>
                      <p className="text-slate-600 mb-1">Pendidik / Tenaga Kependidikan ybs,</p>
                      <div className="h-16 flex items-center justify-center">
                        {teacher.tanda_tangan_url ? (
                          <img src={teacher.tanda_tangan_url} alt="TTD" className="h-12" />
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">(Tanda Tangan ybs)</span>
                        )}
                      </div>
                      <p className="font-black underline text-slate-950">
                        {teacher.nama} {teacher.gelar ? `, ${teacher.gelar}` : ''}
                      </p>
                      <p className="text-[10px] font-mono text-slate-700">
                        NIP. {teacher.nip || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-600 mb-0.5">{displayKota}, {formattedDateString(customTanggal)}</p>
                      <p className="font-bold text-slate-900 mb-1">Kepala Madrasah,</p>
                      <div className="h-16 flex items-center justify-center relative">
                        {penandatangan.kepala_stempel_url && (
                          <img 
                            src={penandatangan.kepala_stempel_url} 
                            alt="Stempel" 
                            className="absolute h-14 opacity-80 pointer-events-none" 
                          />
                        )}
                        {penandatangan.kepala_tanda_tangan_url ? (
                          <img 
                            src={penandatangan.kepala_tanda_tangan_url} 
                            alt="TTD" 
                            className="h-12 relative z-10" 
                          />
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">(Tanda Tangan &amp; Stempel)</span>
                        )}
                      </div>
                      <p className="font-black underline uppercase text-slate-950">
                        {penandatangan.kepala_nama || activeMadrasah?.nama_pimpinan || settings.general?.headmaster_name || '[Nama Kepala Madrasah]'}
                      </p>
                      <p className="text-[10px] font-mono text-slate-700">
                        NIP. {penandatangan.kepala_nip || activeMadrasah?.nip_pimpinan || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================
              MODE 3: KARTU IDENTITAS GTK / ID CARD RESMI
              (Renders 1 GTK or ALL GTKs in Clean 2-Column Grid)
              ======================================================== */}
          {printMode === 'kartu' && (
            <div className="space-y-6">
              <div className="text-center space-y-1 mb-3 print:mb-2">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950">
                  KARTU IDENTITAS PENDIDIK &amp; TENAGA KEPENDIDIKAN
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {activeMadrasah.nama_madrasah || "Madrasah"} • Format Resmi ID Card GTK
                </p>
              </div>

              {/* ID Cards Loop */}
              <div className="space-y-6">
                {teachersToRenderInMulti.map((teacher, idx) => {
                  const isThemeWhite = cardTheme === 'resmi_putih';
                  const isThemeGreen = cardTheme === 'hijau_kemenag';
                  const isThemeNavy = cardTheme === 'navy_formal';

                  return (
                    <div 
                      key={teacher.id || idx}
                      className={`page-break-inside-avoid w-full max-w-[820px] mx-auto ${idx > 0 && idx % 2 === 0 ? 'page-break pt-4' : ''}`}
                      style={{ pageBreakInside: 'avoid' }}
                    >
                      {showCutGuides && (
                        <div className="text-[9px] text-slate-400 font-mono mb-1 flex items-center gap-1">
                          <Scissors className="w-3 h-3 text-slate-400" />
                          <span>Garis Panduan Potong Kartu GTK #{idx + 1} - {teacher.nama}</span>
                        </div>
                      )}

                      {/* 2-COLUMN GRID: SISI DEPAN (FRONT) & SISI BELAKANG (BACK) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
                        
                        {/* ================= SISI DEPAN (FRONT) ================= */}
                        <div className={`w-full min-h-[245px] h-[245px] rounded-xl border-2 p-3 shadow-sm flex flex-col justify-between relative overflow-hidden ${
                          isThemeWhite 
                            ? 'bg-white border-emerald-800 text-slate-900' 
                            : isThemeGreen 
                              ? 'bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 border-emerald-600 text-white' 
                              : 'bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 border-sky-600 text-white'
                        } ${showCutGuides ? 'outline-dashed outline-1 outline-slate-300 -outline-offset-4' : ''}`}>
                          
                          {/* Accent Top Bar */}
                          {isThemeWhite && (
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800" />
                          )}

                          {/* Header Kartu Depan */}
                          <div className={`flex items-center gap-2.5 pb-1.5 border-b ${
                            isThemeWhite ? 'border-emerald-800/30' : 'border-white/20'
                          }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden ${
                              isThemeWhite ? 'bg-emerald-50 border-emerald-300' : 'bg-white/10 border-white/20'
                            }`}>
                              {activeMadrasah.logo_url ? (
                                <img src={formatImageUrl(activeMadrasah.logo_url)} alt="Logo" className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <School className={`w-4 h-4 ${isThemeWhite ? 'text-emerald-700' : 'text-emerald-300'}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-[10px] font-black uppercase tracking-tight truncate leading-none ${
                                isThemeWhite ? 'text-emerald-950' : 'text-emerald-300'
                              }`}>
                                {activeMadrasah.nama_madrasah || "MADRASAH IBTIDAIYAH"}
                              </div>
                              <div className={`text-[7.5px] font-mono leading-tight mt-0.5 ${
                                isThemeWhite ? 'text-slate-500' : 'text-emerald-200/80'
                              }`}>
                                NSM: {activeMadrasah.nsm || '-'} • NPSN: {activeMadrasah.npsn || '-'}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                isThemeWhite ? 'bg-emerald-800 text-white' : 'bg-emerald-400 text-slate-950'
                              }`}>
                                KARTU GTK
                              </span>
                            </div>
                          </div>

                          {/* Body Kartu: Foto (Kiri) + Tabel 2 Kolom Data (Kanan) */}
                          <div className="flex items-start gap-2.5 my-auto pt-1">
                            {/* Kolom Kiri: Foto 3x4 + Badge Jabatan */}
                            <div className="flex flex-col items-center shrink-0 w-[72px]">
                              <div className={`w-[72px] h-[92px] rounded-lg border-2 overflow-hidden shrink-0 shadow-sm flex items-center justify-center ${
                                isThemeWhite ? 'bg-slate-100 border-emerald-800' : 'bg-slate-800 border-emerald-400'
                              }`}>
                                {teacher.foto_url ? (
                                  <img
                                    src={formatImageUrl(teacher.foto_url)}
                                    alt={teacher.nama}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className={`font-black text-xl ${isThemeWhite ? 'text-emerald-800' : 'text-emerald-300'}`}>
                                    {teacher.nama.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className={`text-[6.5px] font-black uppercase text-center w-full px-1 py-0.5 rounded mt-1 truncate border ${
                                isThemeWhite 
                                  ? 'bg-emerald-50 text-emerald-950 border-emerald-300' 
                                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                              }`}>
                                {teacher.jabatan || 'GTK'}
                              </div>
                            </div>

                            {/* Kolom Kanan: Tabel 2 Kolom Rapi (Label : Nilai) */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              {/* Nama Lengkap */}
                              <div className="border-b pb-0.5 mb-1 border-slate-200/50">
                                <h3 className={`font-black text-[11px] leading-tight truncate ${
                                  isThemeWhite ? 'text-slate-950' : 'text-white'
                                }`}>
                                  {teacher.nama}
                                </h3>
                                {teacher.gelar && (
                                  <p className={`text-[8.5px] font-semibold italic truncate ${
                                    isThemeWhite ? 'text-emerald-800' : 'text-emerald-200'
                                  }`}>
                                    {teacher.gelar}
                                  </p>
                                )}
                              </div>

                              {/* Data List (Label - Titik Dua - Nilai) */}
                              <div className={`text-[7.5px] space-y-0.5 font-sans leading-tight ${
                                isThemeWhite ? 'text-slate-700' : 'text-slate-200'
                              }`}>
                                <div className="grid grid-cols-[48px_6px_1fr] items-center">
                                  <span className={`font-semibold ${isThemeWhite ? 'text-emerald-900' : 'text-emerald-300'}`}>NIP</span>
                                  <span>:</span>
                                  <span className="font-mono truncate font-semibold">{teacher.nip || '-'}</span>
                                </div>
                                <div className="grid grid-cols-[48px_6px_1fr] items-center">
                                  <span className={`font-semibold ${isThemeWhite ? 'text-emerald-900' : 'text-emerald-300'}`}>NPK</span>
                                  <span>:</span>
                                  <span className="font-mono truncate font-semibold">{teacher.npk || '-'}</span>
                                </div>
                                <div className="grid grid-cols-[48px_6px_1fr] items-center">
                                  <span className={`font-semibold ${isThemeWhite ? 'text-emerald-900' : 'text-emerald-300'}`}>NUPTK</span>
                                  <span>:</span>
                                  <span className="font-mono truncate">{teacher.nuptk || '-'}</span>
                                </div>
                                <div className="grid grid-cols-[48px_6px_1fr] items-center">
                                  <span className={`font-semibold ${isThemeWhite ? 'text-emerald-900' : 'text-emerald-300'}`}>NRG</span>
                                  <span>:</span>
                                  <span className="font-mono truncate font-semibold">{teacher.nrg || '-'}</span>
                                </div>
                                <div className="grid grid-cols-[48px_6px_1fr] items-center">
                                  <span className={`font-semibold ${isThemeWhite ? 'text-emerald-900' : 'text-emerald-300'}`}>Peg ID</span>
                                  <span>:</span>
                                  <span className="font-mono truncate">{teacher.peg_id || '-'}</span>
                                </div>
                                <div className="grid grid-cols-[48px_6px_1fr] items-center">
                                  <span className={`font-semibold ${isThemeWhite ? 'text-emerald-900' : 'text-emerald-300'}`}>NIK</span>
                                  <span>:</span>
                                  <span className="font-mono truncate">{teacher.nik || '-'}</span>
                                </div>
                                <div className="grid grid-cols-[48px_6px_1fr] items-start">
                                  <span className={`font-semibold ${isThemeWhite ? 'text-emerald-900' : 'text-emerald-300'}`}>TTL</span>
                                  <span>:</span>
                                  <span className="truncate">{teacher.tempat_lahir || '-'}{teacher.tanggal_lahir ? `, ${formattedDateString(teacher.tanggal_lahir)}` : ''}</span>
                                </div>
                                {teacher.mapel_diampu && teacher.mapel_diampu !== '-' && (
                                  <div className="grid grid-cols-[48px_6px_1fr] items-start">
                                    <span className={`font-semibold ${isThemeWhite ? 'text-emerald-900' : 'text-emerald-300'}`}>Tugas</span>
                                    <span>:</span>
                                    <span className="truncate font-medium">{teacher.mapel_diampu}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Footer Sisi Depan */}
                          <div className={`flex items-center justify-between pt-1 border-t text-[7px] ${
                            isThemeWhite ? 'border-emerald-800/20 text-slate-500' : 'border-white/20 text-emerald-200/80'
                          }`}>
                            <span className="font-semibold">STATUS: {teacher.status_keaktifan || 'AKTIF BERTUGAS'}</span>
                            <span className="font-mono">KARTU RESMI GTK</span>
                          </div>
                        </div>

                        {/* ================= SISI BELAKANG (BACK) ================= */}
                        <div className={`w-full min-h-[245px] h-[245px] rounded-xl border-2 border-emerald-800 bg-white text-slate-900 p-3 shadow-sm flex flex-col justify-between relative overflow-hidden ${
                          showCutGuides ? 'outline-dashed outline-1 outline-slate-300 -outline-offset-4' : ''
                        }`}>
                          
                          {/* Accent Top Bar */}
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800" />

                          {/* Header Sisi Belakang */}
                          <div className="text-center border-b border-slate-200 pb-1">
                            <h4 className="font-black text-[9px] uppercase tracking-wider text-slate-950">
                              KETENTUAN PEMEGANG KARTU
                            </h4>
                            <p className="text-[7px] text-slate-500 font-medium">
                              Sistem Informasi Akademik Madrasah (SIAKAD)
                            </p>
                          </div>

                          {/* Ketentuan Pemegang Kartu */}
                          <div className="my-auto space-y-1">
                            <ul className="text-[7.5px] space-y-1 text-slate-700 list-disc pl-3.5 leading-tight">
                              <li>Kartu ini merupakan bukti identitas resmi GTK {activeMadrasah.nama_madrasah || "Madrasah"}.</li>
                              <li>Wajib dibawa selama menjalankan tugas kedinasan di madrasah.</li>
                              <li>Dilarang memindahtangankan atau meminjamkan kartu kepada pihak lain.</li>
                              <li>Jika kartu hilang/menemukan kartu ini, segera serahkan ke pihak madrasah.</li>
                            </ul>

                            {/* Ringkasan Kode GTK */}
                            <div className="mt-1 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 grid grid-cols-4 text-center text-[6.5px] font-mono text-slate-600 gap-1">
                              <span className="truncate">NIP: <strong className="text-slate-900">{teacher.nip || '-'}</strong></span>
                              <span className="truncate">NPK: <strong className="text-slate-900">{teacher.npk || '-'}</strong></span>
                              <span className="truncate">NUPTK: <strong className="text-slate-900">{teacher.nuptk || '-'}</strong></span>
                              <span className="truncate">NRG: <strong className="text-slate-900">{teacher.nrg || '-'}</strong></span>
                            </div>
                          </div>

                          {/* Footer Pengesahan Sisi Belakang (QR + TTD Kepala) */}
                          <div className="border-t border-slate-200 pt-1.5 flex items-end justify-between">
                            {/* QR Code Verifikasi */}
                            <div className="text-left space-y-0.5">
                              <div className="w-11 h-11 bg-slate-50 border border-slate-300 rounded flex items-center justify-center p-0.5">
                                <QrCode className="w-8 h-8 text-slate-800" />
                              </div>
                              <span className="text-[6.5px] font-mono text-slate-500 block">ID: {teacher.peg_id || teacher.nik || 'GTK-VALID'}</span>
                            </div>

                            {/* Pengesahan Kepala Madrasah */}
                            <div className="text-right text-[7.5px] space-y-0 leading-tight">
                              <p className="text-slate-600">{displayKota}, {formattedDateString(customTanggal)}</p>
                              <p className="font-bold text-slate-900">Kepala Madrasah,</p>
                              
                              <div className="h-7 flex items-center justify-end">
                                {penandatangan.kepala_tanda_tangan_url ? (
                                  <img src={penandatangan.kepala_tanda_tangan_url} alt="TTD" className="h-6" />
                                ) : (
                                  <span className="italic text-slate-300 text-[6.5px]">( TTD &amp; Cap )</span>
                                )}
                              </div>

                              <p className="font-black underline text-slate-950">
                                {penandatangan.kepala_nama || activeMadrasah?.nama_pimpinan || settings.general?.headmaster_name || '[Kepala Madrasah]'}
                              </p>
                              <p className="font-mono text-[7px] text-slate-600">
                                NIP. {penandatangan.kepala_nip || activeMadrasah?.nip_pimpinan || '-'}
                              </p>
                            </div>
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Print Specific Isolation CSS - Essential for Multi-Page Complete Printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Reset Document & Body */
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
          }

          /* Hide application background, navigation, and everything outside the modal */
          #root,
          body > div:not(#printable-gtk-modal-root),
          body > header,
          body > nav,
          body > aside,
          body > footer,
          body > section,
          .portal-print-active #root {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }

          @page {
            margin: 10mm 12mm;
            size: ${paperSize === 'F4' ? '215mm 330mm' : paperSize === 'Legal' ? 'legal' : 'A4'} ${paperOrientation};
          }

          /* Modal Root & Paper container reset */
          #printable-gtk-modal-root {
            position: static !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            z-index: 9999999 !important;
            display: block !important;
            visibility: visible !important;
          }

          #printable-gtk-modal-root * {
            visibility: visible !important;
          }

          #printable-gtk-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
            overflow: visible !important;
          }

          .print\\:hidden,
          .print\\:hidden *,
          [class*="print:hidden"],
          [class*="print\\:hidden"] {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* Multi-Page Table Handling */
          .print-table-wrapper {
            overflow: visible !important;
            width: 100% !important;
            display: block !important;
          }

          table.print-gtk-table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          table.print-gtk-table thead {
            display: table-header-group !important;
          }

          table.print-gtk-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto !important;
          }

          table.print-gtk-table td,
          table.print-gtk-table th {
            border: 1px solid #0f172a !important;
            word-break: normal !important;
          }

          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }

          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />
    </div>,
    document.body
  );
};

export default CetakDataGtkModal;
