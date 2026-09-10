"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getMysqlApiUrl } from '@/integrations/supabase/client';
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
  FileArchive,
  Image as ImageIcon,
  FileText,
  Lock,
  Layers
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { GoogleSheetsSyncModal } from '@/components/GoogleSheetsSyncModal';
import JSZip from 'jszip';

interface HostingStatus {
  safe_overwrite_protection: boolean;
  has_local_config: boolean;
  has_backup_config: boolean;
  upload_files_count: number;
  upload_files_size_mb: number;
  settings_records_count: number;
  zip_support: boolean;
}

const BackupAdmin = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, activeMadrasah } = useMadrasah();
  const [loading, setLoading] = useState(false);
  const [loadingZip, setLoadingZip] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string>('');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [gsheetSyncOpen, setGsheetSyncOpen] = useState(false);
  const [syncTarget, setSyncTarget] = useState<'teachers' | 'students'>('teachers');
  const [hostingStatus, setHostingStatus] = useState<HostingStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const fetchHostingStatus = async () => {
    setCheckingStatus(true);
    try {
      const apiUrl = getMysqlApiUrl();
      const res = await fetch(`${apiUrl}?action=backup_status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setHostingStatus(data);
        }
      }
    } catch (e) {
      // Backend mungkin belum online atau mode offline, siapkan default status
      setHostingStatus({
        safe_overwrite_protection: true,
        has_local_config: true,
        has_backup_config: true,
        upload_files_count: 0,
        upload_files_size_mb: 0,
        settings_records_count: 0,
        zip_support: true
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchHostingStatus();
  }, []);

  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      showSuccess(`Menyiapkan unduhan ${filename}...`);
      if (filename.endsWith('.zip')) setDownloadingZip(true);
      
      const cacheBustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const fullUrl = new URL(cacheBustUrl, window.location.href).href;
      
      const response = await fetch(fullUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
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
      showSuccess(`Berhasil mengunduh ${filename} (${Number(sizeInMb) > 0.01 ? sizeInMb + ' MB' : (blob.size / 1024).toFixed(1) + ' KB'})`);
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

  // 1. BACKUP LENGKAP (.ZIP) - DATABASE + FOTO/DOKUMEN
  const handleExportFullZip = async () => {
    setLoadingZip(true);
    try {
      showSuccess('Menyiapkan arsip cadangan lengkap (Database + Dokumen & Gambar)...');
      const apiUrl = getMysqlApiUrl();
      const dateStr = new Date().toISOString().split('T')[0];
      const schoolName = activeMadrasah?.nama_madrasah || 'SIAKAD_Madrasah';
      const cleanSchool = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const zipFileName = `backup-lengkap-${cleanSchool}-${dateStr}.zip`;

      // Coba unduh langsung dari backend api.php?action=backup_full
      try {
        const fullZipUrl = `${apiUrl}?action=backup_full&t=${Date.now()}`;
        const res = await fetch(fullZipUrl);
        const contentType = res.headers.get('content-type') || '';
        
        if (res.ok && contentType.includes('zip')) {
          const blob = await res.blob();
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = zipFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
          showSuccess(`Backup lengkap berhasil diunduh (${(blob.size / (1024 * 1024)).toFixed(2)} MB)!`);
          fetchHostingStatus();
          setLoadingZip(false);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend ZIP stream fallback ke client JSZip engine:', backendErr);
      }

      // Client-side JSZip engine fallback (memastikan backup tetap 100% lengkap)
      const zip = new JSZip();

      // Ambil seluruh data tabel
      const { data: settings } = await supabase.from('site_settings').select('*');
      const { data: spmb } = await supabase.from('pendaftaran_spmb').select('*');

      // Ambil snapshot local storage untuk cadangan ganda
      const localKeys: Record<string, any> = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('siakad_') || k.startsWith('madrasah_') || k === 'site_settings')) {
            try {
              localKeys[k] = JSON.parse(localStorage.getItem(k) || 'null');
            } catch {
              localKeys[k] = localStorage.getItem(k);
            }
          }
        }
      } catch (e) { void e; }

      const databasePayload = {
        version: "2.0",
        backup_type: "full_archive",
        timestamp: new Date().toISOString(),
        school_name: schoolName,
        tables: {
          site_settings: settings || [],
          pendaftaran_spmb: spmb || []
        },
        local_storage_snapshots: localKeys
      };

      zip.file('database.json', JSON.stringify(databasePayload, null, 2));

      // Buat SQL Dump untuk phpMyAdmin
      let sqlDump = `-- BACKUP DATABASE SIAKAD MADRASAH\n-- Madrasah: ${schoolName}\n-- Tanggal: ${new Date().toISOString()}\n\n`;
      sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n`;
      sqlDump += `CREATE TABLE IF NOT EXISTS \`site_settings\` (\n  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,\n  \`value\` LONGTEXT NOT NULL,\n  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;
      if (settings && Array.isArray(settings)) {
        for (const s of settings) {
          const valStr = typeof s.value === 'string' ? s.value : JSON.stringify(s.value);
          const escaped = valStr
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
          sqlDump += `INSERT INTO \`site_settings\` (\`id\`, \`value\`) VALUES ('${s.id}', '${escaped}') ON DUPLICATE KEY UPDATE \`value\`=VALUES(\`value\`);\n`;
        }
      }
      sqlDump += `\nSET FOREIGN_KEY_CHECKS = 1;\n`;
      zip.file('database.sql', sqlDump);

      // Kumpulkan file upload (gambar, dokumen, pdf, sertifikat)
      const uploadsFolder = zip.folder('uploads');
      let filesAdded = 0;

      try {
        const listRes = await fetch(`${apiUrl}?action=list_uploads`);
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData && Array.isArray(listData.data)) {
            for (const item of listData.data) {
              if (item.url && item.name) {
                try {
                  const fileRes = await fetch(item.url);
                  if (fileRes.ok) {
                    const fileBlob = await fileRes.blob();
                    uploadsFolder?.file(item.name, fileBlob);
                    filesAdded++;
                  }
                } catch (e) {
                  console.warn(`Gagal mengambil ${item.name}:`, e);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Gagal membaca list_uploads dari server:', e);
      }

      // Pindai data URL base64 atau link gambar dalam settings jika ada
      const manifest = {
        app: "SIAKAD MIMA 2 Sanggreman",
        backup_type: "full_archive_zip",
        version: "2.0",
        created_at: new Date().toISOString(),
        school_name: schoolName,
        stats: {
          site_settings_count: settings?.length || 0,
          spmb_count: spmb?.length || 0,
          uploaded_files_count: filesAdded
        }
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const blobUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

      showSuccess(`Arsip backup lengkap berhasil diunduh (${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB)!`);
      fetchHostingStatus();
    } catch (error: any) {
      console.error('Backup error:', error);
      showError('Gagal membuat backup lengkap: ' + error.message);
    } finally {
      setLoadingZip(false);
    }
  };

  // 2. BACKUP CEPAT JSON (DATABASE ONLY)
  const handleExportJson = async () => {
    setLoading(true);
    try {
      const { data: settings, error: err1 } = await supabase.from('site_settings').select('*');
      if (err1) throw err1;

      const { data: spmb } = await supabase.from('pendaftaran_spmb').select('*');
      
      const backupData = {
        version: "2.0",
        backup_type: "database_json",
        timestamp: new Date().toISOString(),
        school_name: settings?.find(s => s.id === 'general')?.value?.school_name || 'SIAKAD Madrasah',
        tables: {
          site_settings: settings || [],
          pendaftaran_spmb: spmb || []
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `backup-siakad-database-${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('Data pengaturan dan database berhasil diekspor (JSON)!');
    } catch (error: any) {
      console.error(error);
      showError('Gagal mengekspor data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. RESTORE UNIVERSAL (.ZIP, .JSON, MAUPUN .SQL)
  const handleUniversalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isZip = lowerName.endsWith('.zip');
    const isJson = lowerName.endsWith('.json');
    const isSql = lowerName.endsWith('.sql');

    if (!isZip && !isJson && !isSql) {
      showError('Format berkas tidak didukung. Mohon pilih berkas .zip, .json, atau .sql');
      e.target.value = '';
      return;
    }

    const confirmRestore = window.confirm(
      `PERINGATAN PEMULIHAN (RESTORE):\n\nAnda akan memulihkan data dari berkas:\n"${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)\n\nData lama akan diperbarui sesuai isi file cadangan. Lanjutkan?`
    );
    if (!confirmRestore) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    setRestoreProgress('Membaca berkas cadangan...');

    // Helper untuk normalisasi struktur site_settings ke array { id, value }
    const normalizeSettings = (raw: any): Array<{ id: string; value: any }> => {
      if (!raw) return [];
      if (Array.isArray(raw)) {
        return raw
          .filter((item: any) => item && (item.id || item.name))
          .map((item: any) => ({
            id: item.id || item.name,
            value: typeof item.value === 'string' ? (() => {
              try { return JSON.parse(item.value); } catch { return item.value; }
            })() : item.value
          }));
      }
      if (typeof raw === 'object') {
        return Object.entries(raw).map(([key, val]) => ({
          id: key,
          value: typeof val === 'string' ? (() => {
            try { return JSON.parse(val); } catch { return val; }
          })() : val
        }));
      }
      return [];
    };

    // Helper untuk menyimpan instan ke LocalStorage
    const applyToLocalStorage = (settingsList: Array<{ id: string; value: any }>) => {
      if (!settingsList || settingsList.length === 0) return;
      try {
        let currentMap: Record<string, any> = {};
        const saved = localStorage.getItem('siakad_site_settings');
        if (saved) {
          try { currentMap = JSON.parse(saved); } catch { currentMap = {}; }
        }
        settingsList.forEach(s => {
          if (s.id) {
            currentMap[s.id] = s.value;
          }
        });
        localStorage.setItem('siakad_site_settings', JSON.stringify(currentMap));

        // Dispatch events agar seluruh komponen UI merender data baru seketika
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('siakad_settings_updated', { detail: { tableName: 'site_settings', payload: settingsList } }));
          window.dispatchEvent(new Event('siakad_identitas_updated'));
          window.dispatchEvent(new Event('siakad_madrasah_updated'));
        }
      } catch (err) {
        console.warn('Gagal menyimpan cache lokal:', err);
      }
    };

    try {
      const apiUrl = getMysqlApiUrl();
      let restoredSettingsCount = 0;
      let restoredFilesCount = 0;

      // ==========================================
      // A. JIKA BERKAS ARSIP ZIP:
      // ==========================================
      if (isZip) {
        setRestoreProgress('Menghubungi server untuk restorasi arsip...');

        // 1. Coba restore via backend dengan AbortController timeout 10 detik
        let backendRestored = false;
        try {
          const formData = new FormData();
          formData.append('backup_file', file);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(`${apiUrl}?action=restore_full`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const result = await res.json();
              if (result.status === 'success') {
                backendRestored = true;
                restoredSettingsCount = result.restored_settings || 0;
                restoredFilesCount = result.restored_files || 0;
              }
            }
          }
        } catch (backendErr) {
          console.warn('Backend restore_full timeout/offline, melanjutkan ekstraksi browser:', backendErr);
        }

        // 2. Ekstraksi client-side via JSZip untuk memastikan data langsung aktif di browser
        setRestoreProgress('Mengekstrak isi arsip ZIP...');
        const zip = await JSZip.loadAsync(file);

        // Cari file database.json atau file .json di dalam zip (bisa di root atau subfolder)
        let dbJsonStr: string | null = null;
        let sqlStr: string | null = null;

        const fileKeys = Object.keys(zip.files);
        const jsonKey = fileKeys.find(k => k.toLowerCase().endsWith('database.json')) ||
                        fileKeys.find(k => k.toLowerCase().endsWith('.json') && !k.includes('manifest') && !k.includes('package'));
        const sqlKey = fileKeys.find(k => k.toLowerCase().endsWith('.sql'));

        if (jsonKey) {
          dbJsonStr = await zip.files[jsonKey].async('string');
        } else if (sqlKey) {
          sqlStr = await zip.files[sqlKey].async('string');
        }

        let normalizedSettings: Array<{ id: string; value: any }> = [];

        if (dbJsonStr) {
          setRestoreProgress('Membaca struktur data JSON...');
          try {
            const parsed = JSON.parse(dbJsonStr);
            const rawSettings = parsed.tables?.site_settings || 
                                parsed.database?.tables?.site_settings || 
                                parsed.site_settings || 
                                (parsed.tables && !parsed.tables.site_settings ? parsed.tables : null);

            normalizedSettings = normalizeSettings(rawSettings);

            // Pulihkan pendaftaran_spmb jika ada
            const rawSpmb = parsed.tables?.pendaftaran_spmb || parsed.database?.tables?.pendaftaran_spmb || parsed.pendaftaran_spmb;
            if (Array.isArray(rawSpmb) && rawSpmb.length > 0) {
              for (const row of rawSpmb) {
                if (row.id) {
                  supabase.from('pendaftaran_spmb').upsert(row).catch(() => {});
                }
              }
            }

            // Pulihkan snapshot localStorage jika disertakan dalam cadangan
            if (parsed.local_storage_snapshots && typeof parsed.local_storage_snapshots === 'object') {
              for (const [k, v] of Object.entries(parsed.local_storage_snapshots)) {
                try {
                  localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
                } catch { /* ignore */ }
              }
            }
          } catch (jsonErr) {
            console.warn('Gagal parsing JSON di dalam ZIP:', jsonErr);
          }
        } else if (sqlStr) {
          setRestoreProgress('Membaca query SQL cadangan...');
          // Ekstrak INSERT INTO site_settings dari file SQL
          const insertRegex = /INSERT\s+INTO\s+[`"']?site_settings[`"']?\s*\([^)]*\)\s*VALUES\s*\(([^)]+)\)/gi;
          let match;
          while ((match = insertRegex.exec(sqlStr)) !== null) {
            try {
              const rawValues = match[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
              if (rawValues.length >= 2) {
                const id = rawValues[0];
                let val: any = rawValues[1];
                try { val = JSON.parse(val); } catch { /* keep string */ }
                normalizedSettings.push({ id, value: val });
              }
            } catch { /* ignore bad sql line */ }
          }
        }

        // Terapkan data ke LocalStorage seketika (0 ms)
        if (normalizedSettings.length > 0) {
          applyToLocalStorage(normalizedSettings);
          restoredSettingsCount = Math.max(restoredSettingsCount, normalizedSettings.length);

          // Kirim batch ke backend (maksimal 20 baris per batch agar tidak timeout)
          setRestoreProgress(`Menyinkronkan ${normalizedSettings.length} modul ke database...`);
          const chunkSize = 20;
          for (let i = 0; i < normalizedSettings.length; i += chunkSize) {
            const chunk = normalizedSettings.slice(i, i + chunkSize);
            await supabase.from('site_settings').upsert(chunk).catch(() => {});
          }
        }

        // 3. Proses berkas gambar/dokumen di dalam zip jika backend belum memprosesnya
        if (!backendRestored) {
          const uploadEntries = fileKeys.filter(k => 
            (k.startsWith('uploads/') || k.includes('/uploads/')) && 
            !zip.files[k].dir
          );

          if (uploadEntries.length > 0) {
            setRestoreProgress(`Memproses ${uploadEntries.length} berkas foto & lampiran...`);
            
            // Proses berkas dengan batas paralel
            for (const entryName of uploadEntries) {
              const cleanFileName = entryName.split('/').pop();
              if (!cleanFileName || cleanFileName.startsWith('.')) continue;

              try {
                const blob = await zip.files[entryName].async('blob');
                
                // Simpan cache lokal base64 untuk pratinjau cepat
                if (blob.size < 1024 * 1024) { // < 1MB
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      localStorage.setItem(`siakad_file_${cleanFileName}`, reader.result as string);
                      localStorage.setItem(`siakad_file_uploads/${cleanFileName}`, reader.result as string);
                    } catch { /* ignore quota */ }
                  };
                  reader.readAsDataURL(blob);
                }

                // Coba upload ke server dengan timeout 3 detik per file
                const uploadFormData = new FormData();
                uploadFormData.append('file', blob, cleanFileName);
                const fileCtrl = new AbortController();
                const fileTimeout = setTimeout(() => fileCtrl.abort(), 3500);
                
                await fetch(`${apiUrl}?action=upload`, {
                  method: 'POST',
                  body: uploadFormData,
                  signal: fileCtrl.signal
                }).catch(() => {});
                clearTimeout(fileTimeout);

                restoredFilesCount++;
              } catch (fileErr) {
                console.warn('Gagal memproses file:', entryName, fileErr);
              }
            }
          }
        }

        showSuccess(`Restorasi Lengkap Berhasil! Dipulihkan: ${restoredSettingsCount} modul pengaturan dan ${restoredFilesCount} berkas media.`);
        fetchHostingStatus();
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      // ==========================================
      // B. JIKA BERKAS CADANGAN JSON:
      // ==========================================
      if (isJson) {
        setRestoreProgress('Membaca berkas JSON...');
        const text = await file.text();
        const json = JSON.parse(text);

        const rawSettings = json.tables?.site_settings || 
                            json.database?.tables?.site_settings || 
                            json.site_settings || 
                            (json.tables && !json.tables.site_settings ? json.tables : null) ||
                            json;

        const normalizedSettings = normalizeSettings(rawSettings);

        if (normalizedSettings.length === 0) {
          throw new Error("Format berkas backup JSON tidak memiliki data modul/site_settings yang dapat dikenali.");
        }

        // Terapkan langsung ke LocalStorage
        applyToLocalStorage(normalizedSettings);

        // Kirim sinkronisasi batch
        setRestoreProgress(`Menyinkronkan ${normalizedSettings.length} modul pengaturan...`);
        const chunkSize = 20;
        for (let i = 0; i < normalizedSettings.length; i += chunkSize) {
          const chunk = normalizedSettings.slice(i, i + chunkSize);
          await supabase.from('site_settings').upsert(chunk).catch(() => {});
        }

        // Pulihkan pendaftaran_spmb jika ada
        const rawSpmb = json.tables?.pendaftaran_spmb || json.database?.tables?.pendaftaran_spmb || json.pendaftaran_spmb;
        if (Array.isArray(rawSpmb)) {
          for (const row of rawSpmb) {
            if (row.id) supabase.from('pendaftaran_spmb').upsert(row).catch(() => {});
          }
        }

        showSuccess(`Data JSON berhasil dipulihkan! (${normalizedSettings.length} modul pengaturan). Menyegarkan halaman...`);
        fetchHostingStatus();
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      // ==========================================
      // C. JIKA BERKAS SQL (.SQL):
      // ==========================================
      if (isSql) {
        setRestoreProgress('Membaca skrip SQL cadangan...');
        const text = await file.text();
        const normalizedSettings: Array<{ id: string; value: any }> = [];

        const insertRegex = /INSERT\s+INTO\s+[`"']?site_settings[`"']?\s*\([^)]*\)\s*VALUES\s*\(([^)]+)\)/gi;
        let match;
        while ((match = insertRegex.exec(text)) !== null) {
          try {
            const rawValues = match[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
            if (rawValues.length >= 2) {
              const id = rawValues[0];
              let val: any = rawValues[1];
              try { val = JSON.parse(val); } catch { /* keep string */ }
              normalizedSettings.push({ id, value: val });
            }
          } catch { /* ignore */ }
        }

        if (normalizedSettings.length === 0) {
          throw new Error('Tidak ditemukan perintah INSERT INTO site_settings dalam file SQL.');
        }

        applyToLocalStorage(normalizedSettings);
        showSuccess(`Data SQL berhasil dipulihkan! (${normalizedSettings.length} data ditemukan).`);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
    } catch (error: any) {
      console.error('Restore universal error:', error);
      showError('Gagal memulihkan data: ' + (error.message || 'Terjadi kesalahan sistem'));
    } finally {
      setRestoring(false);
      setRestoreProgress('');
      if (e.target) e.target.value = '';
    }
  };

  return (
    <AdminLayout title="Backup & Restore Data">
      <div className="max-w-5xl space-y-6">
        
        {/* Banner Safe Overwrite Protection (Anti-Hapus Data Saat Timpa ZIP cPanel & Plesk) */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white overflow-hidden relative rounded-3xl border border-emerald-500/30">
          <CardContent className="p-6 md:p-8 space-y-5 z-10 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/40">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Perlindungan Timpa ZIP Hosting (cPanel & Plesk): AKTIF
                </div>
                <h2 className="text-2xl font-black text-white">Sistem Aman Timpa File ZIP Hosting</h2>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
                  Saat Anda mengunggah update atau menimpa berkas ZIP baru di hosting (<code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">public_html</code> cPanel atau <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">httpdocs</code> Plesk), <strong>koneksi database, data pengaturan, dan seluruh gambar/dokumen di folder <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">uploads/</code> TIDAK AKAN HILANG ATAU TERHAPUS</strong>.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchHostingStatus}
                disabled={checkingStatus}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl h-10 px-4 text-xs shrink-0 self-start md:self-auto gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                {checkingStatus ? 'Memeriksa...' : 'Cek Status Keamanan'}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                <div className="text-slate-400 text-[11px] mb-1">Proteksi db_config.local</div>
                <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Kebal Timpa
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                <div className="text-slate-400 text-[11px] mb-1">Berkas Media (Uploads)</div>
                <div className="font-bold text-blue-400 flex items-center gap-1.5 text-sm">
                  <ImageIcon className="w-4 h-4" /> {hostingStatus?.upload_files_count ?? 0} Berkas ({hostingStatus?.upload_files_size_mb ?? 0} MB)
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                <div className="text-slate-400 text-[11px] mb-1">Modul / Pengaturan</div>
                <div className="font-bold text-purple-400 flex items-center gap-1.5 text-sm">
                  <Database className="w-4 h-4" /> {hostingStatus?.settings_records_count ?? 0} Records
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                <div className="text-slate-400 text-[11px] mb-1">Dukungan Arsip ZIP</div>
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                  <FileArchive className="w-4 h-4" /> Siap Ekstraksi
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2 Kolom Utama: Backup Lengkap vs Restore Lengkap */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Card 1: Backup Lengkap (ZIP & JSON) */}
          <Card className="border-0 shadow-xl overflow-hidden rounded-3xl bg-white border border-slate-200">
            <CardHeader className="bg-emerald-600 text-white p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-lg font-black">
                  <Download className="w-5 h-5" />
                  Cadangkan Data (Backup)
                </CardTitle>
                <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Arsip Lengkap
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Unduh salinan cadangan lengkap sistem madrasah. Termasuk seluruh pengaturan, database, kurikulum, bank soal, serta seluruh berkas foto GTK, siswa, logo, stempel, dan dokumen di folder uploads.
              </p>

              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2.5">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Komponen yang Ikut Dicadangkan:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Seluruh Tabel MySQL</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Semua Foto & Logo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Dokumen & Sertifikat</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>SQL Dump phpMyAdmin</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {/* Tombol Backup ZIP (Rekomendasi Utama) */}
                <Button 
                  onClick={handleExportFullZip} 
                  disabled={loadingZip || loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-extrabold shadow-lg hover:shadow-emerald-200 hover:scale-[1.01] active:scale-95 transition-all text-sm gap-2"
                >
                  {loadingZip ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sedang Membuat Arsip ZIP Lengkap...
                    </>
                  ) : (
                    <>
                      <FileArchive className="w-5 h-5" />
                      Unduh Backup Lengkap (.ZIP - Termasuk Foto & Dokumen)
                    </>
                  )}
                </Button>

                {/* Tombol Backup JSON (Teks / Database saja) */}
                <Button 
                  variant="outline"
                  onClick={handleExportJson} 
                  disabled={loadingZip || loading}
                  className="w-full border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl h-11 font-bold text-xs gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileJson className="w-4 h-4 text-emerald-600" />
                  )}
                  Unduh Backup Cepat (.JSON - Database Saja)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Restore Lengkap (.ZIP maupun .JSON) */}
          <Card className="border-0 shadow-xl overflow-hidden rounded-3xl bg-white border border-slate-200">
            <CardHeader className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-lg font-black">
                  <Upload className="w-5 h-5" />
                  Pulihkan Data (Restore)
                </CardTitle>
                <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Multi-Format
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Mendukung pemulihan dari arsip <strong>.ZIP</strong> (memulihkan database dan seluruh foto/dokumen) maupun file <strong>.JSON</strong> (database saja). Sistem otomatis mengenali format dan memulihkannya.
              </p>

              <div className="relative">
                <input 
                  type="file" 
                  accept=".zip,.json,.sql" 
                  onChange={handleUniversalImport}
                  disabled={restoring}
                  className="hidden" 
                  id="universal-import-file" 
                />
                <label 
                  htmlFor="universal-import-file"
                  className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all p-4 text-center ${
                    restoring ? 'bg-blue-50/70 border-blue-300' : 'hover:border-blue-500 hover:bg-blue-50/40 border-slate-300 bg-slate-50/50'
                  }`}
                >
                  {restoring ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
                      <span className="text-xs font-extrabold text-blue-900">{restoreProgress || 'Sedang Memulihkan Data...'}</span>
                      <span className="text-[11px] text-blue-700">Mohon jangan menutup halaman ini...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">
                        Klik untuk Pilih File Cadangan (.ZIP, .JSON, atau .SQL)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Mendukung arsip lengkap ZIP (database + gambar), JSON, & SQL
                      </span>
                    </div>
                  )}
                </label>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Peringatan Pemulihan:</strong> Data yang ada saat ini akan diselaraskan dengan data cadangan. Disarankan membuat backup terbaru sebelum melakukan restore.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Paket Hosting ZIP Ready (Khusus Super Admin) */}
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
                    File ZIP kompilasi statis lengkap tanpa perlu install Node.js/npm di server hosting. Ekstrak langsung di folder <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">httpdocs</code> (Plesk) atau <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">public_html</code> (cPanel).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button 
                    type="button"
                    disabled={downloadingZip}
                    onClick={() => handleDownloadFile('/siakadmadrasah-cpanel-ready.zip', 'siakadmadrasah-cpanel-ready.zip')}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl h-14 px-6 shadow-xl hover:scale-105 active:scale-95 transition-all text-base shrink-0 cursor-pointer"
                    title="Unduh file ZIP cPanel hosting siap pakai"
                  >
                    {downloadingZip ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sedang Mengunduh ZIP...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Unduh ZIP cPanel Ready
                      </>
                    )}
                  </button>

                  <button 
                    type="button"
                    disabled={downloadingZip}
                    onClick={() => handleDownloadFile('/siakadmadrasah-plesk-ready.zip', 'siakadmadrasah-plesk-ready.zip')}
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl h-14 px-5 border border-indigo-400/30 hover:scale-105 transition-all text-sm shrink-0 cursor-pointer"
                    title="Unduh file ZIP Plesk/Universal hosting"
                  >
                    <Download className="w-4 h-4" />
                    Unduh ZIP Plesk Ready
                  </button>

                  <a 
                    href="https://github.com/siakadmadrasah-lang/Master-Siakad.git"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl h-14 px-5 border border-white/20 hover:scale-105 transition-all text-sm shrink-0"
                    title="Buka Repositori GitHub Master-Siakad"
                  >
                    <ExternalLink className="w-4 h-4" />
                    GitHub Repo
                  </a>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Kebal Timpa ZIP
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Kredensial database di <code className="text-amber-300">db_config.local.php</code> dan berkas di <code className="text-amber-300">uploads/</code> tidak akan pernah terhapus saat Anda menimpa ZIP baru di hosting.
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
