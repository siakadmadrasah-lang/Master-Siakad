"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  Upload, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  FileJson,
  ShieldCheck,
  RefreshCw,
  Archive,
  Printer,
  ArrowRight,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  Sparkles
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { GoogleSheetsSyncModal } from '@/components/GoogleSheetsSyncModal';

const BackupAdmin = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, activeMadrasah } = useMadrasah();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [gsheetSyncOpen, setGsheetSyncOpen] = useState(false);
  const [syncTarget, setSyncTarget] = useState<'teachers' | 'students'>('teachers');

  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      showSuccess(`Menyiapkan unduhan ${filename}...`);
      if (filename.endsWith('.zip')) setDownloadingZip(true);
      
      const cacheBustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const fullUrl = new URL(cacheBustUrl, window.location.href).href;
      
      // Fetch binary blob to ensure complete file is captured (not a 12KB HTML redirect)
      const response = await fetch(fullUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
      // If it's a zip file but returned less than 50KB, it might be an HTML error page
      if (filename.endsWith('.zip') && blob.size < 50000) {
        console.warn('Suspicious small zip file size, falling back to direct link:', blob.size);
        window.open(fullUrl, '_blank');
        showSuccess(`Membuka unduhan ${filename} di tab baru`);
        return;
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);

      const sizeInMb = (blob.size / (1024 * 1024)).toFixed(2);
      showSuccess(`Berhasil mengunduh ${filename} (${sizeInMb > 0.01 ? sizeInMb + ' MB' : (blob.size / 1024).toFixed(1) + ' KB'})`);
    } catch (err: any) {
      console.error('Download failed, trying direct window download:', err);
      try {
        const fullUrl = new URL(url, window.location.href).href;
        window.open(fullUrl, '_blank');
        showSuccess(`Mengunduh ${filename} via tautan langsung`);
      } catch {
        showError(`Gagal mengunduh ${filename}`);
      }
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Ambil data dari site_settings
      const { data: settings, error: err1 } = await supabase.from('site_settings').select('*');
      if (err1) throw err1;

      // 2. Ambil data dari pendaftaran_spmb
      const { data: spmb, error: err2 } = await supabase.from('pendaftaran_spmb').select('*');
      // Jangan throw error jika tabel spmb belum ada/kosong
      
      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        school_name: settings?.find(s => s.id === 'general')?.value?.school_name || 'SiAKad',
        tables: {
          site_settings: settings || [],
          pendaftaran_spmb: spmb || []
        }
      };

      // Buat file blob
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `backup-siakad-full-${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('Seluruh data berhasil diekspor!');
    } catch (error: any) {
      console.error(error);
      showError('Gagal mengekspor data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "PERINGATAN: Mengimpor data akan menimpa data yang ada saat ini. Pastikan Anda memiliki cadangan data terbaru. Lanjutkan?"
    );
    if (!confirmRestore) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (!json.tables || !json.tables.site_settings) {
          throw new Error("Format file backup tidak valid.");
        }

        // 1. Restore site_settings
        for (const row of json.tables.site_settings) {
          const { error } = await supabase
            .from('site_settings')
            .upsert({ 
              id: row.id, 
              value: row.value, 
              updated_at: new Date().toISOString() 
            });
          if (error) console.error(`Gagal restore setting ${row.id}:`, error.message);
        }

        // 2. Restore pendaftaran_spmb (jika ada)
        if (json.tables.pendaftaran_spmb && json.tables.pendaftaran_spmb.length > 0) {
          for (const row of json.tables.pendaftaran_spmb) {
            const { error } = await supabase
              .from('pendaftaran_spmb')
              .upsert(row);
            if (error) console.error(`Gagal restore pendaftar ${row.id}:`, error.message);
          }
        }

        showSuccess('Data berhasil dipulihkan (Restore)! Silakan refresh halaman.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (error: any) {
        showError('Gagal mengimpor data: ' + error.message);
      } finally {
        setRestoring(false);
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <AdminLayout title="Backup & Restore Data">
      <div className="max-w-4xl space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-amber-900">Pusat Keselamatan Data</h4>
            <p className="text-sm text-amber-700 leading-relaxed">
              Halaman ini memungkinkan Anda untuk mengunduh seluruh database aplikasi dalam satu file. 
              Simpan file ini di tempat yang aman (seperti Google Drive) sebagai cadangan data.
            </p>
          </div>
        </div>

        {/* Paket Hosting ZIP Ready (Hanya untuk Super Admin) */}
        {isSuperAdmin && (
          <Card className="border-0 shadow-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden relative rounded-3xl">
            <CardContent className="p-6 md:p-8 space-y-6 z-10 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                    <Database className="w-3.5 h-3.5 text-emerald-400" /> Siap Deploy Hosting (Plesk / cPanel) - Khusus Super Admin
                  </div>
                  <h3 className="text-2xl font-black text-white">Paket Instalasi Hosting Siap Pakai (.ZIP)</h3>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    File ZIP kompilasi statis lengkap tanpa perlu install Node.js/npm di server hosting. Tinggal upload & extract di folder <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">httpdocs</code> (Plesk) atau <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">public_html</code> (cPanel).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button 
                    type="button"
                    disabled={downloadingZip}
                    onClick={() => handleDownloadFile('/siakadmadrasah-plesk-ready.zip', 'siakadmadrasah-plesk-ready.zip')}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl h-14 px-8 shadow-xl hover:scale-105 active:scale-95 transition-all text-base shrink-0 cursor-pointer"
                    title="Unduh file zip hosting siap pakai versi terbaru dari server AI ini"
                  >
                    {downloadingZip ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sedang Mengunduh ZIP...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Unduh ZIP Siap Deploy (Versi Terbaru Server)
                      </>
                    )}
                  </button>

                  <a 
                    href="https://raw.githubusercontent.com/siakadmadrasah-lang/Master-Siakad/main/public/siakadmadrasah-plesk-ready.zip"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl h-14 px-5 border border-white/20 hover:scale-105 transition-all text-sm shrink-0"
                    title="Unduh ZIP rilis dari GitHub Repository"
                  >
                    <ExternalLink className="w-4 h-4" />
                    ZIP dari GitHub
                  </a>

                  <a 
                    href="https://github.com/siakadmadrasah-lang/Master-Siakad/archive/refs/heads/main.zip"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl h-14 px-5 border border-white/20 hover:scale-105 transition-all text-sm shrink-0"
                    title="Unduh Source Code Utuh langsung dari GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Source ZIP
                  </a>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Optimasi Kecepatan
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Sudah dilengkapi <code className="text-amber-300">.htaccess</code> berisi Gzip compression, browser caching, dan routing SPA otomatis agar website di hosting sangat cepat & tangkas.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5">
                    <Database className="w-4 h-4" /> Database MySQL Included
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Sudah dilengkapi skema MySQL/MariaDB (<code className="text-blue-300">database-mysql.sql</code>), script <code className="text-blue-300">api.php</code>, dan <code className="text-blue-300">db_config.php</code> untuk phpMyAdmin hosting.
                  </p>
                  <button 
                    type="button"
                    onClick={() => handleDownloadFile('/database-mysql.sql', 'database-mysql.sql')}
                    className="inline-flex items-center text-blue-300 hover:text-white font-semibold underline text-xs pt-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 mr-1" /> Unduh Schema MySQL
                  </button>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                  <div className="font-bold text-purple-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Panduan Plesk & cPanel
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Disediakan panduan langkah demi langkah cara upload, extract, dan pengaturan database MySQL di Plesk/cPanel.
                  </p>
                  <button 
                    type="button"
                    onClick={() => handleDownloadFile('/PLESK_HOSTING_GUIDE.txt', 'PLESK_HOSTING_GUIDE.txt')}
                    className="inline-flex items-center text-purple-300 hover:text-white font-semibold underline text-xs pt-1 cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" /> Baca Panduan Instalasi
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Export Card */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-emerald-600 text-white">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="w-5 h-5" />
                Ekspor Data (Backup)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Unduh seluruh data (Pengaturan, Kurikulum, Bank Soal, Artikel, dan Data Pendaftar) dalam format JSON.
              </p>
              <div className="p-4 bg-gray-50 rounded-xl border border-dashed space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Data site_settings (Lengkap)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Data Pendaftaran SPMB</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>File Gambar (Storage) tidak ikut terunduh</span>
                </div>
              </div>
              <Button 
                onClick={handleExport} 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileJson className="w-4 h-4 mr-2" />}
                Unduh Backup Sekarang
              </Button>
            </CardContent>
          </Card>

          {/* Import Card */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="w-5 h-5" />
                Impor Data (Restore)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Pulihkan data dari file backup sebelumnya. Gunakan fitur ini hanya saat migrasi atau pemulihan darurat.
              </p>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport}
                  disabled={restoring}
                  className="hidden" 
                  id="import-file" 
                />
                <label 
                  htmlFor="import-file"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                    restoring ? 'bg-gray-100 border-gray-300' : 'hover:border-blue-400 hover:bg-blue-50 border-gray-200'
                  }`}
                >
                  {restoring ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="text-xs font-bold text-blue-600">Memproses Data...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Database className="w-8 h-8 text-gray-300" />
                      <span className="text-xs text-gray-500">Klik untuk pilih file .json</span>
                    </div>
                  )}
                </label>
              </div>
              <p className="text-[10px] text-red-500 font-medium italic text-center">
                * Perhatian: Data lama akan ditimpa oleh data dari file backup.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Google Sheets Live Sync Hub */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white overflow-hidden relative rounded-3xl border border-emerald-500/20">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold uppercase border border-emerald-500/30">
                <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Google Sheets Synchronization
              </div>
              <h3 className="text-xl font-black text-white">Sinkronisasi Online Spreadsheet</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                Hubungkan sistem langsung dengan link Google Spreadsheet (Online). Data Guru, GTK, atau Siswa dapat diperbarui secara kolaboratif di cloud dan ditarik ke SIAKAD hanya dengan 1 kali klik.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 z-10 shrink-0">
              <Button
                onClick={() => {
                  setSyncTarget('teachers');
                  setGsheetSyncOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl h-11 px-4 shadow-lg text-xs gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" /> Sync Data GTK / Guru
              </Button>
            </div>
            <FileSpreadsheet className="absolute -right-4 -bottom-4 w-36 h-36 text-emerald-500/5 pointer-events-none" />
          </CardContent>
        </Card>

        {/* Arsip Data Akademik Banner */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-800 to-teal-700 text-white overflow-hidden relative rounded-3xl">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 text-emerald-200 text-xs font-bold uppercase">
                <Archive className="w-3.5 h-3.5 text-emerald-300" /> Arsip Akademik Per Tahun & Semester
              </div>
              <h3 className="text-xl font-black">Arsip Data Terstruktur & Siap Cetak</h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-xl">
                Simpan snapshot lengkap data siswa, kelas, jadwal, nilai, SPMB, dan keuangan per tahun pelajaran & semester. Siap dipratinjau, dipulihkan, atau dicetak sebagai dokumen resmi A4 kapan saja.
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/arsip-akademik')}
              className="bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold rounded-2xl h-12 px-6 shadow-lg border-0 shrink-0 flex items-center gap-2 z-10"
            >
              <Printer className="w-4 h-4 text-emerald-600" /> Kelola & Cetak Arsip <ArrowRight className="w-4 h-4" />
            </Button>
            <Archive className="absolute -right-4 -bottom-4 w-36 h-36 text-white/5 pointer-events-none" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-emerald-50 border-emerald-100">
          <CardContent className="p-6 flex gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-900">Tips Keamanan</h4>
              <p className="text-xs text-emerald-700 leading-relaxed mt-1">
                Lakukan backup setidaknya sebulan sekali. Simpan file backup di media penyimpanan offline (Flashdisk/Harddisk) dan online (Cloud). 
                Untuk file gambar di menu Galeri atau Berita, Anda dapat mem-backup folder media secara berkala.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets Modal */}
        <GoogleSheetsSyncModal
          isOpen={gsheetSyncOpen}
          onClose={() => setGsheetSyncOpen(false)}
          targetType={syncTarget}
          currentData={[]}
          madrasahName={activeMadrasah.nama_madrasah || 'Madrasah'}
          onSyncComplete={async (syncedData) => {
            const key = syncTarget === 'teachers' ? 'data_guru' : 'data_siswa';
            const now = new Date().toISOString();
            try {
              localStorage.setItem(`siakad_${key}`, JSON.stringify(syncedData));
              localStorage.setItem(key, JSON.stringify(syncedData));
              await supabase.from('site_settings').upsert({ id: key, value: syncedData, updated_at: now });
              window.dispatchEvent(new CustomEvent('siakad_teachers_updated'));
              showSuccess(`Data ${syncTarget === 'teachers' ? 'Guru' : 'Siswa'} berhasil disinkronkan!`);
            } catch (err: any) {
              console.error('Save sync error:', err);
            }
          }}
        />
      </div>
    </AdminLayout>
  );
};

export default BackupAdmin;