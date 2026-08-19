"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { 
  Printer, ArrowLeft, Calendar, Tag, FileText, CheckCircle2, 
  Users, MapPin, Clock, UserCheck, Eye, EyeOff, Layout, FileSpreadsheet
} from 'lucide-react';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import * as XLSX from 'xlsx';

export interface PembiasaanItem {
  id: string;
  nama_kegiatan: string;
  kategori: string;
  tanggal: string;
  waktu?: string;
  lokasi?: string;
  sasaran_kelas: string;
  guru_pendamping: string;
  penandatangan_nama?: string;
  penandatangan_nip?: string;
  penandatangan_jabatan?: string;
  tujuan?: string;
  uraian_kegiatan?: string;
  hasil_kegiatan?: string;
  jumlah_peserta?: string | number;
  status_keterlaksanaan?: 'Terlaksana' | 'Terlaksana Sebagian' | 'Tertunda';
  catatan?: string;
  images?: string[];
  is_featured_web?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CetakLaporanPembiasaanProps {
  item?: PembiasaanItem | null;
  itemsList?: PembiasaanItem[];
  mode?: 'single' | 'rekap';
  periodeLabel?: string;
  onClose: () => void;
}

export const CetakLaporanPembiasaan: React.FC<CetakLaporanPembiasaanProps> = ({
  item,
  itemsList = [],
  mode = 'single',
  periodeLabel = 'Semester Ganjil / Genap',
  onClose
}) => {
  const { settings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId } = useMadrasah();
  const { requirePrintAuth } = usePrintSecurity();
  
  const [showKop, setShowKop] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [signerType, setSignerType] = useState<'pendamping' | 'koordinator' | 'kepala_only'>('pendamping');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    mode === 'rekap' ? 'landscape' : 'portrait'
  );

  const scopedPenandatanganKey = `penandatangan_${activeMadrasahId || 'default'}`;
  const scopedIdentitasKey = `identitas_madrasah_${activeMadrasahId || 'default'}`;

  const penandatangan = settings[scopedPenandatanganKey] || settings.penandatangan || {};
  const identitas = settings[scopedIdentitasKey] || settings.identitas_madrasah || {};
  const kota = identitas.kabupaten || (activeMadrasah as any)?.kabupaten || 'Indonesia';

  const kepala = {
    nama: penandatangan.kepala_nama || identitas.nama_pimpinan || activeMadrasah?.nama_pimpinan || settings.general?.headmaster_name || '[Nama Kepala Madrasah]',
    nip: penandatangan.kepala_nip || identitas.nip_pimpinan || activeMadrasah?.nip_pimpinan || '-',
    jabatan: penandatangan.kepala_jabatan || settings.general?.headmaster_title || 'Kepala Madrasah',
    ttd: penandatangan.kepala_tanda_tangan_url,
    stempel: penandatangan.kepala_stempel_url
  };

  const primaryPendampingName = item?.guru_pendamping 
    ? item.guru_pendamping.split(',')[0].trim() 
    : 'Guru Pendamping Kegiatan';

  useEffect(() => {
    document.body.classList.add('portal-print-active');
    return () => {
      document.body.classList.remove('portal-print-active');
    };
  }, []);

  const handlePrint = () => {
    const docName = mode === 'rekap'
      ? `Rekap Jurnal Laporan Pembiasaan Santri (${periodeLabel})`
      : `Laporan Pembiasaan: ${item?.nama_kegiatan || 'Santri'}`;
    
    requirePrintAuth(() => {
      window.print();
    }, docName);
  };

  const handleExportExcel = () => {
    const dataToExport = (mode === 'rekap' ? itemsList : (item ? [item] : [])).map((it, idx) => ({
      'No': idx + 1,
      'Tanggal': it.tanggal,
      'Waktu': it.waktu || '-',
      'Nama Kegiatan': it.nama_kegiatan,
      'Kategori': it.kategori,
      'Sasaran Kelas': it.sasaran_kelas,
      'Lokasi': it.lokasi || '-',
      'Guru Pendamping / PJ': it.guru_pendamping,
      'Jumlah Peserta': it.jumlah_peserta || 'Semua Siswa',
      'Status': it.status_keterlaksanaan || 'Terlaksana',
      'Tujuan': it.tujuan || '-',
      'Uraian Pelaksanaan': it.uraian_kegiatan || '-',
      'Hasil & Evaluasi': it.hasil_kegiatan || '-',
      'Jumlah Foto Dokumentasi': it.images ? it.images.length : 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Pembiasaan');
    
    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // Tanggal
      { wch: 15 }, // Waktu
      { wch: 32 }, // Nama Kegiatan
      { wch: 22 }, // Kategori
      { wch: 20 }, // Sasaran
      { wch: 24 }, // Lokasi
      { wch: 26 }, // Guru
      { wch: 16 }, // Jumlah
      { wch: 16 }, // Status
      { wch: 35 }, // Tujuan
      { wch: 45 }, // Uraian
      { wch: 35 }, // Hasil
      { wch: 12 }, // Foto
    ];

    const fileName = mode === 'rekap' 
      ? `Rekap_Laporan_Pembiasaan_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Laporan_Pembiasaan_${item?.nama_kegiatan?.replace(/[^a-zA-Z0-9]/g, '_') || 'Siswa'}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const portalContent = (
    <div 
      id="printable-pembiasaan-root"
      className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-md overflow-y-auto flex flex-col items-center p-0 md:p-6 print:p-0 print:bg-white print:static print:overflow-visible"
    >
      {/* Control Bar (Hidden when printing) */}
      <div className="w-full max-w-5xl bg-white border border-slate-200 shadow-xl rounded-b-xl md:rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            className="flex items-center gap-1.5 text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </Button>
          <div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              {mode === 'rekap' ? 'Pratinjau Jurnal Rekap Pembiasaan' : 'Pratinjau Laporan Kegiatan Pembiasaan'}
            </h2>
            <p className="text-xs text-slate-500">
              Format Dokumen Siap Cetak (Akreditasi & Administrasi Madrasah)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Kop */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKop(!showKop)}
            className={`text-xs h-8 ${showKop ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-slate-600'}`}
          >
            {showKop ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
            Kop Surat
          </Button>

          {/* Toggle Signature */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSignature(!showSignature)}
            className={`text-xs h-8 ${showSignature ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-slate-600'}`}
          >
            {showSignature ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
            Tanda Tangan
          </Button>

          {/* Signer Type Selector */}
          {showSignature && (
            <select
              value={signerType}
              onChange={(e) => setSignerType(e.target.value as any)}
              className="text-xs h-8 px-2 border border-slate-300 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
            >
              <option value="pendamping">TTD: Kepala & Guru Pendamping</option>
              <option value="koordinator">TTD: Kepala & Koordinator</option>
              <option value="kepala_only">TTD: Kepala Madrasah Saja</option>
            </select>
          )}

          {mode === 'single' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImages(!showImages)}
              className={`text-xs h-8 ${showImages ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-slate-600'}`}
            >
              {showImages ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
              Foto Bukti
            </Button>
          )}

          {/* Orientation Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')}
            className="text-xs h-8 text-slate-700"
          >
            <Layout className="w-3.5 h-3.5 mr-1" />
            {orientation === 'portrait' ? 'Tegak (Portrait)' : 'Mendatar (Landscape)'}
          </Button>

          {/* Paper Size */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaperSize(paperSize === 'A4' ? 'F4' : 'A4')}
            className="text-xs h-8 text-slate-700"
          >
            Ukuran: {paperSize}
          </Button>

          {/* Excel Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-xs h-8 bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </Button>

          {/* Security Indicator */}
          <PrintSecurityIndicator 
            documentTitle={mode === 'rekap' ? `Rekap Jurnal Pembiasaan (${periodeLabel})` : `Laporan Pembiasaan: ${item?.nama_kegiatan || 'Santri'}`} 
          />

          {/* Direct Print */}
          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </Button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div 
        id="printable-pembiasaan-paper"
        className={`w-full ${orientation === 'landscape' ? 'max-w-[1120px]' : 'max-w-[850px]'} bg-white text-black p-8 md:p-12 shadow-2xl rounded-lg font-serif min-h-[1100px] print:shadow-none print:m-0 print:p-0 print:w-full print:max-w-none print:min-h-0`}
      >
        
        {/* KOP SURAT */}
        {showKop && (
          <div className="mb-6 pb-2 border-b-0">
            <KopSurat />
          </div>
        )}

        {/* MODE 1: SINGLE ACTIVITY REPORT (BERITA ACARA & NARASI LENGKAP) */}
        {mode === 'single' && item && (
          <div className="space-y-6">
            {/* Judul Dokumen Resmi */}
            <div className="text-center space-y-1">
              <h1 className="text-lg md:text-xl font-bold uppercase tracking-wide underline underline-offset-4 decoration-2">
                LAPORAN KEGIATAN PEMBIASAAN SISWA
              </h1>
              <p className="text-xs md:text-sm font-sans font-medium text-slate-700">
                Nomor: {new Date(item.tanggal || Date.now()).getFullYear()}/PEMB/{item.id.slice(0, 6).toUpperCase()}
              </p>
              <div className="inline-flex items-center gap-2 mt-1 px-3 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-sans text-slate-800">
                <Tag className="w-3 h-3 text-emerald-700" />
                <span className="font-semibold">Kategori:</span> {item.kategori}
              </div>
            </div>

            {/* Tabel Informasi Kegiatan */}
            <div className="border border-black text-sm">
              <div className="bg-slate-100 font-bold px-3 py-1.5 border-b border-black text-xs md:text-sm uppercase tracking-wider font-sans">
                I. IDENTITAS & PELAKSANAAN KEGIATAN
              </div>
              <table className="w-full text-xs md:text-sm">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="w-44 py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">Nama Pembiasaan</td>
                    <td className="py-1.5 px-3 font-bold text-slate-900">{item.nama_kegiatan}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">Hari / Tanggal</td>
                    <td className="py-1.5 px-3">{formatDate(item.tanggal)}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">Waktu Pelaksanaan</td>
                    <td className="py-1.5 px-3">{item.waktu || '06:45 - 07:15 WIB'}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">Tempat / Lokasi</td>
                    <td className="py-1.5 px-3">{item.lokasi || 'Lingkungan / Masjid Madrasah'}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">Sasaran / Rombel</td>
                    <td className="py-1.5 px-3">{item.sasaran_kelas}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">
                      <div>Guru Pendamping / PJ Lapangan</div>
                      <div className="text-[10px] text-slate-500 font-normal italic">(Pembimbing Lapangan Kegiatan)</div>
                    </td>
                    <td className="py-1.5 px-3 font-medium text-slate-900">{item.guru_pendamping || '-'}</td>
                  </tr>
                  {item.penandatangan_nama && (
                    <tr className="border-b border-slate-300 bg-emerald-50/30">
                      <td className="py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">
                        <div>Guru Penandatangan Dokumen</div>
                        <div className="text-[10px] text-slate-500 font-normal italic">(Pengesahan Lembar Laporan)</div>
                      </td>
                      <td className="py-1.5 px-3 font-medium text-slate-900">
                        {item.penandatangan_nama}
                        {item.penandatangan_nip && item.penandatangan_nip !== '-' ? ` (${item.penandatangan_nip.startsWith('NIP') ? item.penandatangan_nip : `NIP. ${item.penandatangan_nip}`})` : ''}
                        {item.penandatangan_jabatan ? ` — ${item.penandatangan_jabatan}` : ''}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-300">
                    <td className="py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">Jumlah Siswa Hadir</td>
                    <td className="py-1.5 px-3">{item.jumlah_peserta ? `${item.jumlah_peserta} Siswa` : 'Seluruh Siswa Sasaran'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold bg-slate-50 border-r border-slate-300">Status Keterlaksanaan</td>
                    <td className="py-1.5 px-3">
                      <span className="font-bold text-emerald-800 uppercase">
                        {item.status_keterlaksanaan || 'Terlaksana'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Uraian Tujuan & Deskripsi */}
            <div className="space-y-4 text-xs md:text-sm leading-relaxed text-justify">
              <div>
                <h3 className="font-bold font-sans uppercase text-xs md:text-sm border-b border-slate-300 pb-1 mb-2">
                  II. TUJUAN PEMBIASAAN KARAKTER & KEAGAMAAN
                </h3>
                <p className="pl-2">
                  {item.tujuan || `Menanamkan nilai-nilai keagamaan, kedisiplinan, serta pembentukan akhlakul karimah dan karakter mulia peserta didik melalui kegiatan rutin terpadu di lingkungan madrasah.`}
                </p>
              </div>

              <div>
                <h3 className="font-bold font-sans uppercase text-xs md:text-sm border-b border-slate-300 pb-1 mb-2">
                  III. URAIAN PELAKSANAAN KEGIATAN
                </h3>
                <p className="pl-2 whitespace-pre-line">
                  {item.uraian_kegiatan || `Kegiatan pembiasaan dimulai tepat waktu dengan bimbingan dan pendampingan oleh guru piket dan wali kelas. Seluruh siswa mengikuti seluruh rangkaian pembiasaan dengan tertib, khusyuk, dan antusias.`}
                </p>
              </div>

              <div>
                <h3 className="font-bold font-sans uppercase text-xs md:text-sm border-b border-slate-300 pb-1 mb-2">
                  IV. HASIL & EVALUASI KETERCAPAIAN SISWA
                </h3>
                <p className="pl-2 whitespace-pre-line">
                  {item.hasil_kegiatan || `Kegiatan terlaksana dengan baik dan mencapai target pembiasaan. Siswa menunjukkan peningkatan kesadaran beribadah dan kedisiplinan belajar secara mandiri.`}
                </p>
              </div>
            </div>

            {/* Galeri Dokumentasi Foto (Siap Cetak / Rapi) */}
            {showImages && item.images && item.images.length > 0 && (
              <div className="space-y-3 pt-2 page-break-inside-avoid">
                <h3 className="font-bold font-sans uppercase text-xs md:text-sm border-b border-slate-300 pb-1">
                  V. DOKUMENTASI BUKTI FISIK PELAKSANAAN
                </h3>
                <div className={`grid ${item.images.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : item.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-3`}>
                  {item.images.map((img, idx) => (
                    <div key={idx} className="border border-slate-400 p-1.5 bg-slate-50 text-center rounded">
                      <div className="h-44 md:h-52 w-full overflow-hidden bg-slate-200 flex items-center justify-center">
                        <img 
                          src={img} 
                          alt={`Dokumentasi ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1 font-sans italic">
                        Foto {idx + 1}: Dokumentasi {item.nama_kegiatan}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: JURNAL REKAPITULASI PEMBIASAAN (TABEL REKAP BULANAN/SEMESTER) */}
        {mode === 'rekap' && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-lg md:text-xl font-bold uppercase tracking-wide underline underline-offset-4 decoration-2">
                JURNAL REKAPITULASI KEGIATAN PEMBIASAAN SISWA
              </h1>
              <p className="text-xs md:text-sm font-sans font-medium text-slate-700">
                Periode / Tahun Pelajaran: {periodeLabel}
              </p>
              <p className="text-xs font-sans text-slate-500">
                Instrumen Bukti Keterlaksanaan Program Pendidikan Karakter & Budaya Religius Madrasah
              </p>
            </div>

            {/* Tabel Rekap */}
            <div className="overflow-x-auto border border-black">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-200 text-black border-b border-black font-bold text-center">
                    <th className="p-2 border-r border-black w-8">No</th>
                    <th className="p-2 border-r border-black w-24">Hari / Tgl</th>
                    <th className="p-2 border-r border-black">Nama Kegiatan Pembiasaan</th>
                    <th className="p-2 border-r border-black w-28">Kategori</th>
                    <th className="p-2 border-r border-black w-24">Sasaran</th>
                    <th className="p-2 border-r border-black w-32">Guru Pembimbing</th>
                    <th className="p-2 border-r border-black w-20">Keterlaksanaan</th>
                    <th className="p-2 border-black w-32">Keterangan / Evaluasi</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-slate-500 italic">
                        Belum ada data kegiatan pembiasaan untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    itemsList.map((row, index) => (
                      <tr key={row.id || index} className="border-b border-slate-300 hover:bg-slate-50">
                        <td className="p-2 border-r border-black text-center font-medium">{index + 1}</td>
                        <td className="p-2 border-r border-black whitespace-nowrap">
                          {new Date(row.tanggal || Date.now()).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-2 border-r border-black font-semibold text-slate-900">
                          {row.nama_kegiatan}
                          {row.waktu && <span className="block text-[10px] text-slate-500">{row.waktu} • {row.lokasi || 'Madrasah'}</span>}
                        </td>
                        <td className="p-2 border-r border-black">{row.kategori}</td>
                        <td className="p-2 border-r border-black">{row.sasaran_kelas}</td>
                        <td className="p-2 border-r border-black">{row.guru_pendamping}</td>
                        <td className="p-2 border-r border-black text-center font-semibold">
                          <span className={row.status_keterlaksanaan === 'Tertunda' ? 'text-red-700' : 'text-emerald-800'}>
                            {row.status_keterlaksanaan || 'Terlaksana'}
                          </span>
                        </td>
                        <td className="p-2 border-black text-[11px] text-slate-700">
                          {row.hasil_kegiatan ? (
                            row.hasil_kegiatan.length > 60 ? `${row.hasil_kegiatan.slice(0, 60)}...` : row.hasil_kegiatan
                          ) : (
                            'Berjalan tertib & lancar'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-xs font-sans text-slate-600 flex justify-between items-center px-1">
              <span>Total Kegiatan Terekam: <strong>{itemsList.length} Kegiatan</strong></span>
              <span>Dokumen Resmi Sistem Informasi Akademik & Mutu Madrasah</span>
            </div>
          </div>
        )}

        {/* TANDA TANGAN RESMI */}
        {showSignature && (
          <div className="mt-8 pt-2 page-break-inside-avoid">
            <div className="flex justify-between items-start text-xs md:text-sm font-serif">
              {/* Kolom Kiri: Kepala Madrasah (Penandatangan Resmi) */}
              <div className="w-56 text-center">
                <p className="font-semibold text-slate-800">Mengetahui,</p>
                <p className="font-bold text-slate-900 mb-16">{kepala.jabatan}</p>
                
                <p className="font-bold text-slate-900 underline uppercase tracking-wide">
                  {kepala.nama}
                </p>
                <p className="text-xs text-slate-700">
                  {kepala.nip && kepala.nip !== '-' ? `NIP. ${kepala.nip}` : 'NIP. -'}
                </p>
              </div>

              {/* Kolom Kanan: Guru Penandatangan / Koordinator (Modul GTK) */}
              {signerType !== 'kepala_only' && (
                <div className="w-56 text-center">
                  <p className="text-slate-800">
                    {kota}, {formatDate(item?.tanggal || new Date().toISOString().slice(0, 10))}
                  </p>
                  <p className="font-bold text-slate-900 mb-16">
                    {item?.penandatangan_nama
                      ? (item.penandatangan_jabatan ? `${item.penandatangan_jabatan},` : 'Guru Penandatangan Dokumen,')
                      : (signerType === 'koordinator' ? 'Koordinator Pembiasaan,' : 'Koordinator / Pembina Pembiasaan,')}
                  </p>

                  <p className="font-bold text-slate-900 underline uppercase tracking-wide">
                    {item?.penandatangan_nama || penandatangan.koordinator_pembiasaan_nama || 'Ustadz / Ustadzah Pembiasaan'}
                  </p>
                  <p className="text-xs text-slate-700">
                    {item?.penandatangan_nama
                      ? (item.penandatangan_nip && item.penandatangan_nip !== '-'
                          ? (item.penandatangan_nip.startsWith('NIP') ? item.penandatangan_nip : `NIP. ${item.penandatangan_nip}`)
                          : 'NIP. -')
                      : (penandatangan.koordinator_pembiasaan_nip
                          ? (penandatangan.koordinator_pembiasaan_nip.startsWith('NIP') ? penandatangan.koordinator_pembiasaan_nip : `NIP. ${penandatangan.koordinator_pembiasaan_nip}`)
                          : 'NIP. -')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Print Specific Isolation CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Complete application UI suppression */
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            overflow: visible !important;
          }

          #root,
          body > div:not(#printable-pembiasaan-root),
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
            margin: 12mm 15mm;
            size: ${paperSize === 'F4' ? '215mm 330mm' : 'A4'} ${orientation};
          }

          #printable-pembiasaan-root {
            position: absolute !important;
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

          #printable-pembiasaan-root * {
            visibility: visible !important;
          }

          #printable-pembiasaan-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          }

          .print\\:hidden,
          .print\\:hidden *,
          [class*="print:hidden"],
          [class*="print\\:hidden"] {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );

  return createPortal(portalContent, document.body);
};

export default CetakLaporanPembiasaan;

