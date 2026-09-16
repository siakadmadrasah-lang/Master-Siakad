import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Search,
  Sparkles,
  HelpCircle,
  Database,
  ArrowDownUp,
  ListFilter,
  Code2,
  CheckSquare,
  Copy,
  Check,
  Zap,
  Clock,
  ExternalLink,
  Share2,
  Send,
  Image as ImageIcon,
  Upload,
  Layers,
  School,
  Trash2,
  Info
} from 'lucide-react';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { showSuccess, showError, showInfo } from '@/utils/toast';
import { uploadImageToStorage } from '@/utils/imageCompression';
import { Teacher } from '@/types';
import {
  downloadExcelWithDropdowns,
  generateAppsScriptDropdownCode,
  GTK_DROPDOWN_OPTIONS
} from '@/utils/excelTemplateHelper';
import {
  fetchGoogleSheetRows,
  parseTeacherRow,
  ParsedTeacherRow,
  normalizeDateToYMD,
  cleanNipField,
  cleanNumberField,
  extractGoogleSheetInfo
} from '@/utils/gsheetParserHelper';

export interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'teachers' | 'students';
  currentData: Teacher[] | any[];
  onSyncComplete: (syncedData: any[], mode: 'upsert' | 'replace' | 'insert_only') => void;
  madrasahName?: string;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  targetType,
  currentData,
  onSyncComplete,
  madrasahName = 'Madrasah'
}) => {
  const storageKey = `siakad_gsheet_url_${targetType}`;
  const sheetNameKey = `siakad_gsheet_sheetname_${targetType}`;
  const autoSyncKey = `siakad_gsheet_autosync_${targetType}`;

  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Data_GTK');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'dropdowns' | 'guide' | 'apps_script'>('sync');
  const [syncMode, setSyncMode] = useState<'upsert' | 'replace' | 'insert_only'>('upsert');
  
  const [previewRows, setPreviewRows] = useState<ParsedTeacherRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'update' | 'identical'>('all');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isCopiedShareLink, setIsCopiedShareLink] = useState(false);
  const [isCopiedWaTemplate, setIsCopiedWaTemplate] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [shareLinkType, setShareLinkType] = useState<'portal' | 'direct'>('portal');

  // Thumbnail customization state
  const { activeMadrasah } = useMadrasah();
  const thumbnailModeKey = `siakad_gsheet_thumb_mode_${targetType}`;
  const customThumbUrlKey = `siakad_gsheet_thumb_custom_${targetType}`;
  const [thumbnailMode, setThumbnailMode] = useState<'live' | 'logo' | 'custom'>('live');
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [showThumbCustomizer, setShowThumbCustomizer] = useState(false);

  // Extract sheet id and default live thumbnail URL
  const { sheetId } = extractGoogleSheetInfo(sheetUrl, sheetName);
  const liveThumbnailUrl = sheetId ? `https://drive.google.com/thumbnail?id=${sheetId}&sz=w800` : '';

  // Determine active display thumbnail
  const activeThumbnailUrl = useMemo(() => {
    if (thumbnailMode === 'logo') {
      return activeMadrasah?.logo_url || '/logo.png';
    }
    if (thumbnailMode === 'custom' && customImageUrl.trim()) {
      return customImageUrl.trim();
    }
    return liveThumbnailUrl;
  }, [thumbnailMode, customImageUrl, liveThumbnailUrl, activeMadrasah]);

  // Compute actual share URL
  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/portal-pengisian-gtk` : '/portal-pengisian-gtk';
  const effectiveShareUrl = shareLinkType === 'portal' ? portalUrl : sheetUrl.trim();

  const handleSelectThumbnailMode = (mode: 'live' | 'logo' | 'custom') => {
    setThumbnailMode(mode);
    localStorage.setItem(thumbnailModeKey, mode);
    setImgError(false);
    showSuccess(`Thumbnail dialihkan ke mode: ${mode === 'live' ? 'Live GSheet' : mode === 'logo' ? 'Logo Madrasah' : 'Kustom / Unggahan'}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('Ukuran file maksimal 5MB!');
      return;
    }

    try {
      showInfo('Sedang mengunggah gambar banner...');
      // Upload ke backend storage agar memiliki URL publik HTTP/HTTPS yang bisa diakses WhatsApp / Social Media
      const uploadedUrl = await uploadImageToStorage(file, 'banners');
      const finalUrl = uploadedUrl || '';

      if (finalUrl) {
        setCustomImageUrl(finalUrl);
        setThumbnailMode('custom');
        localStorage.setItem(customThumbUrlKey, finalUrl);
        localStorage.setItem(thumbnailModeKey, 'custom');
        setImgError(false);
        showSuccess('Gambar banner kustom berhasil diunggah dan disimpan!');
      } else {
        // Fallback ke FileReader Data URL jika upload gagal
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            setCustomImageUrl(base64);
            setThumbnailMode('custom');
            localStorage.setItem(customThumbUrlKey, base64);
            localStorage.setItem(thumbnailModeKey, 'custom');
            setImgError(false);
            showSuccess('Gambar thumbnail kustom berhasil diterapkan!');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn("Upload error, fallback to base64:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setCustomImageUrl(base64);
          setThumbnailMode('custom');
          localStorage.setItem(customThumbUrlKey, base64);
          localStorage.setItem(thumbnailModeKey, 'custom');
          setImgError(false);
          showSuccess('Gambar thumbnail kustom berhasil diterapkan!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCustomUrl = (url: string) => {
    setCustomImageUrl(url);
    localStorage.setItem(customThumbUrlKey, url);
    if (url.trim()) {
      setThumbnailMode('custom');
      localStorage.setItem(thumbnailModeKey, 'custom');
    }
    setImgError(false);
  };

  const handleClearCustomImage = () => {
    setCustomImageUrl('');
    localStorage.removeItem(customThumbUrlKey);
    setThumbnailMode('live');
    localStorage.setItem(thumbnailModeKey, 'live');
    setImgError(false);
    showInfo('Thumbnail dikembalikan ke mode Live Sheet.');
  };

  const handleDownloadBanner = () => {
    if (!activeThumbnailUrl) {
      showError('Tidak ada gambar banner yang tersedia!');
      return;
    }
    const a = document.createElement('a');
    a.href = activeThumbnailUrl;
    a.download = `banner-pengisian-gtk-${madrasahName.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showSuccess('Gambar banner berhasil diunduh! Anda bisa melampirkannya langsung sebagai foto di WhatsApp.');
  };

  const handleCopyShareLink = () => {
    if (!effectiveShareUrl) return;
    navigator.clipboard.writeText(effectiveShareUrl);
    setIsCopiedShareLink(true);
    showSuccess(`Tautan ${shareLinkType === 'portal' ? 'Portal Resmi SIAKAD' : 'Google Spreadsheet'} berhasil disalin!`);
    setTimeout(() => setIsCopiedShareLink(false), 2500);
  };

  const generateWaText = () => {
    const isPortal = shareLinkType === 'portal';
    return `*PEMBERITAHUAN PEMUTAKHIRAN DATA GTK / GURU*\n${madrasahName}\n\nBapak/Ibu Guru & Tenaga Kependidikan yang terhormat,\nMohon untuk memeriksa dan mengisi/memperbarui data identitas pribadi (seperti NIP, NIK, Tempat/Tgl Lahir, TMT, No HP, dll) secara mandiri melalui tautan berikut:\n\n🔗 *Link Pengisian Guru:* \n${effectiveShareUrl}\n\n${isPortal ? '_(Melalui Portal SIAKAD Resmi: Tersedia petunjuk pengisian & lembar kerja interaktif)_\n\n' : ''}_Catatan: Harap periksa kembali penulisan 18 digit NIP dan data penting lainnya agar sinkronisasi ke sistem SIAKAD berjalan akurat. Terima kasih._`;
  };

  const handleCopyWaMessage = () => {
    if (!effectiveShareUrl) return;
    const message = generateWaText();
    navigator.clipboard.writeText(message);
    setIsCopiedWaTemplate(true);
    showSuccess('Format pesan WhatsApp untuk dibagikan ke Guru berhasil disalin!');
    setTimeout(() => setIsCopiedWaTemplate(false), 2500);
  };

  const handleShareToWhatsApp = () => {
    if (!effectiveShareUrl) return;
    const message = generateWaText();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Load saved settings
  useEffect(() => {
    if (isOpen) {
      const savedUrl = localStorage.getItem(storageKey) || '';
      const savedSheet = localStorage.getItem(sheetNameKey) || (targetType === 'teachers' ? 'Data_GTK' : 'Data_Siswa');
      const savedTime = localStorage.getItem(`siakad_gsheet_last_sync_${targetType}`);
      const savedAutoSync = localStorage.getItem(autoSyncKey) === 'true';
      const savedThumbMode = (localStorage.getItem(thumbnailModeKey) as 'live' | 'logo' | 'custom') || 'live';
      const savedCustomThumb = localStorage.getItem(customThumbUrlKey) || '';

      setSheetUrl(savedUrl);
      setSheetName(savedSheet);
      setLastSyncTime(savedTime);
      setAutoSyncEnabled(savedAutoSync);
      setThumbnailMode(savedThumbMode);
      setCustomImageUrl(savedCustomThumb);
    }
  }, [isOpen, targetType, storageKey, sheetNameKey, autoSyncKey, thumbnailModeKey, customThumbUrlKey]);

  // Toggle Auto-Sync
  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem(autoSyncKey, String(enabled));
    if (enabled) {
      showSuccess('⚡ Fitur Auto-Sync Latar Belakang diaktifkan! Data GTK akan otomatis disinkronkan secara berkala.');
    } else {
      showInfo('Auto-Sync Latar Belakang dinonaktifkan.');
    }
  };

  // Fetch & Parse data from Google Sheets Online
  const handleFetchFromGoogleSheets = useCallback(async () => {
    if (!sheetUrl.trim()) {
      showError('Harap masukkan URL Google Spreadsheet terlebih dahulu!');
      return;
    }

    setIsLoading(true);
    try {
      // Save sheet configuration
      localStorage.setItem(storageKey, sheetUrl.trim());
      localStorage.setItem(sheetNameKey, sheetName.trim());

      const rawRows = await fetchGoogleSheetRows(sheetUrl, sheetName);

      if (!rawRows || rawRows.length === 0) {
        showError('Data di Google Spreadsheet kosong atau baris judul tidak terdeteksi!');
        setIsLoading(false);
        return;
      }

      // Map rows using robust parser
      const parsedList: ParsedTeacherRow[] = rawRows
        .map((row, idx) => parseTeacherRow(row, idx, currentData as Teacher[]))
        .filter((row): row is ParsedTeacherRow => row !== null);

      if (parsedList.length === 0) {
        showError('Tidak ada baris data GTK yang valid ditemukan dalam spreadsheet.');
        setIsLoading(false);
        return;
      }

      setPreviewRows(parsedList);
      
      const updateCount = parsedList.filter(r => r.statusType === 'update').length;
      const newCount = parsedList.filter(r => r.statusType === 'new').length;
      
      showSuccess(`Berhasil mengambil ${parsedList.length} data (${newCount} baru, ${updateCount} pembaruan terdeteksi).`);
    } catch (err: any) {
      console.error('Google Sheets Sync Error:', err);
      showError(`Gagal membaca Google Spreadsheet: ${err.message || 'Periksa izin berbagi atau koneksi internet Anda.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [sheetUrl, sheetName, storageKey, sheetNameKey, currentData]);

  // Apply Sync to Database
  const handleApplySync = () => {
    if (previewRows.length === 0) {
      showError('Tidak ada data yang dapat disinkronkan!');
      return;
    }

    const nowStr = new Date().toLocaleString('id-ID');
    localStorage.setItem(`siakad_gsheet_last_sync_${targetType}`, nowStr);
    setLastSyncTime(nowStr);

    let finalDataToSave: Teacher[] = [];

    if (syncMode === 'replace') {
      // Total replace with sheet data
      finalDataToSave = previewRows.map(r => ({
        id: r.id,
        nama: r.nama,
        gelar: r.gelar || r.matchedWith?.gelar || '',
        gender: r.gender,
        jenis_kelamin: r.jk,
        nik: r.nik || '',
        nip: r.nip || '-',
        npk: r.npk || '',
        nuptk: r.nuptk || '',
        nrg: r.nrg || '',
        peg_id: r.peg_id || '',
        tempat_lahir: r.tempat_lahir || '',
        tanggal_lahir: r.tanggal_lahir || '',
        alamat_rumah: r.alamat_rumah || r.matchedWith?.alamat_rumah || '',
        tmt_pendidik: r.tmt_pendidik || '',
        tmt_madrasah: r.tmt_madrasah || '',
        pendidikan: r.pendidikan || 'S1 Pendidikan Agama Islam',
        pendidikan_terakhir: r.pendidikan_terakhir || 'S1 Pendidikan Agama Islam',
        sertifikasi: r.sertifikasi,
        status_sertifikasi: r.status_sertifikasi,
        no_sertifikat_pendidik: r.no_sertifikat_pendidik || '',
        nomor_sertifikasi: r.nomor_sertifikasi || '',
        status_kepegawaian: r.status_kepegawaian || 'GTY / Guru Tetap Yayasan',
        status: r.status || 'GTY / Guru Tetap Yayasan',
        jabatan: r.jabatan || 'Guru Kelas',
        mapel_diampu: r.mapel_diampu || '-',
        mengajar_kelas: r.mengajar_kelas || '',
        kelas_diampu: r.kelas_diampu || '',
        telepon: r.telepon || '',
        email: r.email || '',
        status_keaktifan: r.status_keaktifan || 'Aktif',
        foto_url: r.matchedWith?.foto_url || '',
        foto: r.matchedWith?.foto || '',
        created_at: r.matchedWith?.created_at || new Date().toISOString()
      }));
    } else if (syncMode === 'insert_only') {
      // Keep existing and only append truly new items
      const newItems: Teacher[] = previewRows.filter(r => r.statusType === 'new').map(r => ({
        id: r.id,
        nama: r.nama,
        gelar: r.gelar || '',
        gender: r.gender,
        jenis_kelamin: r.jk,
        nik: r.nik || '',
        nip: r.nip || '-',
        npk: r.npk || '',
        nuptk: r.nuptk || '',
        nrg: r.nrg || '',
        peg_id: r.peg_id || '',
        tempat_lahir: r.tempat_lahir || '',
        tanggal_lahir: r.tanggal_lahir || '',
        alamat_rumah: r.alamat_rumah || '',
        tmt_pendidik: r.tmt_pendidik || '',
        tmt_madrasah: r.tmt_madrasah || '',
        pendidikan: r.pendidikan || 'S1 Pendidikan Agama Islam',
        pendidikan_terakhir: r.pendidikan_terakhir || 'S1 Pendidikan Agama Islam',
        sertifikasi: r.sertifikasi,
        status_sertifikasi: r.status_sertifikasi,
        no_sertifikat_pendidik: r.no_sertifikat_pendidik || '',
        nomor_sertifikasi: r.nomor_sertifikasi || '',
        status_kepegawaian: r.status_kepegawaian || 'GTY / Guru Tetap Yayasan',
        status: r.status || 'GTY / Guru Tetap Yayasan',
        jabatan: r.jabatan || 'Guru Kelas',
        mapel_diampu: r.mapel_diampu || '-',
        mengajar_kelas: r.mengajar_kelas || '',
        kelas_diampu: r.kelas_diampu || '',
        telepon: r.telepon || '',
        email: r.email || '',
        status_keaktifan: r.status_keaktifan || 'Aktif',
        foto_url: '',
        foto: '',
        created_at: new Date().toISOString()
      }));
      finalDataToSave = [...(currentData as Teacher[]), ...newItems];
    } else {
      // UPSERT (Default): update matching, append new, keep untouched
      const currentListMap = new Map<string, Teacher>();
      (currentData as Teacher[]).forEach(item => {
        currentListMap.set(item.id, { ...item });
      });

      previewRows.forEach(r => {
        if (r.matchedWith && currentListMap.has(r.matchedWith.id)) {
          const existingItem = currentListMap.get(r.matchedWith.id)!;
          
          // Use updated field or fallback
          const resolvedNip = r.nip !== undefined && r.nip !== '' ? r.nip : (existingItem.nip || '-');
          const resolvedTglLahir = r.tanggal_lahir ? r.tanggal_lahir : (existingItem.tanggal_lahir || '');
          const resolvedTmtPendidik = r.tmt_pendidik ? r.tmt_pendidik : (existingItem.tmt_pendidik || '');
          const resolvedTmtMadrasah = r.tmt_madrasah ? r.tmt_madrasah : (existingItem.tmt_madrasah || '');

          currentListMap.set(r.matchedWith.id, {
            ...existingItem,
            nama: r.nama || existingItem.nama,
            gelar: r.gelar || existingItem.gelar || '',
            nik: r.nik || existingItem.nik,
            nip: resolvedNip,
            npk: r.npk || existingItem.npk,
            nuptk: r.nuptk || existingItem.nuptk,
            nrg: r.nrg || existingItem.nrg,
            peg_id: r.peg_id || existingItem.peg_id,
            tempat_lahir: r.tempat_lahir || existingItem.tempat_lahir,
            tanggal_lahir: resolvedTglLahir,
            alamat_rumah: r.alamat_rumah || existingItem.alamat_rumah || '',
            gender: r.gender || existingItem.gender,
            jenis_kelamin: r.jk || existingItem.jenis_kelamin,
            jabatan: r.jabatan || existingItem.jabatan,
            status_kepegawaian: r.status_kepegawaian || existingItem.status_kepegawaian,
            status: r.status || existingItem.status,
            mapel_diampu: r.mapel_diampu || existingItem.mapel_diampu,
            mengajar_kelas: r.mengajar_kelas || existingItem.mengajar_kelas,
            kelas_diampu: r.kelas_diampu || existingItem.kelas_diampu,
            telepon: r.telepon || existingItem.telepon,
            email: r.email || existingItem.email,
            status_keaktifan: r.status_keaktifan || existingItem.status_keaktifan || 'Aktif',
            pendidikan: r.pendidikan || existingItem.pendidikan,
            pendidikan_terakhir: r.pendidikan_terakhir || existingItem.pendidikan_terakhir,
            sertifikasi: r.sertifikasi || existingItem.sertifikasi,
            status_sertifikasi: r.status_sertifikasi || existingItem.status_sertifikasi,
            no_sertifikat_pendidik: r.no_sertifikat_pendidik || existingItem.no_sertifikat_pendidik,
            nomor_sertifikasi: r.nomor_sertifikasi || existingItem.nomor_sertifikasi,
            tmt_pendidik: resolvedTmtPendidik,
            tmt_madrasah: resolvedTmtMadrasah,
            foto_url: r.foto_url || existingItem.foto_url || existingItem.foto || '',
            foto: r.foto || r.foto_url || existingItem.foto || existingItem.foto_url || '',
          });
        } else {
          currentListMap.set(r.id, {
            id: r.id,
            nama: r.nama,
            gelar: r.gelar || '',
            gender: r.gender,
            jenis_kelamin: r.jk,
            nik: r.nik || '',
            nip: r.nip || '-',
            npk: r.npk || '',
            nuptk: r.nuptk || '',
            nrg: r.nrg || '',
            peg_id: r.peg_id || '',
            tempat_lahir: r.tempat_lahir || '',
            tanggal_lahir: r.tanggal_lahir || '',
            alamat_rumah: r.alamat_rumah || '',
            tmt_pendidik: r.tmt_pendidik || '',
            tmt_madrasah: r.tmt_madrasah || '',
            pendidikan: r.pendidikan || 'S1 Pendidikan Agama Islam',
            pendidikan_terakhir: r.pendidikan_terakhir || 'S1 Pendidikan Agama Islam',
            sertifikasi: r.sertifikasi,
            status_sertifikasi: r.status_sertifikasi,
            no_sertifikat_pendidik: r.no_sertifikat_pendidik || '',
            nomor_sertifikasi: r.nomor_sertifikasi || '',
            status_kepegawaian: r.status_kepegawaian || 'GTY / Guru Tetap Yayasan',
            status: r.status || 'GTY / Guru Tetap Yayasan',
            jabatan: r.jabatan || 'Guru Kelas',
            mapel_diampu: r.mapel_diampu || '-',
            mengajar_kelas: r.mengajar_kelas || '',
            kelas_diampu: r.kelas_diampu || '',
            telepon: r.telepon || '',
            email: r.email || '',
            status_keaktifan: r.status_keaktifan || 'Aktif',
            foto_url: r.foto_url || '',
            foto: r.foto || r.foto_url || '',
            created_at: new Date().toISOString()
          });
        }
      });

      finalDataToSave = Array.from(currentListMap.values());
    }

    onSyncComplete(finalDataToSave, syncMode);
    showSuccess(`✅ Sinkronisasi Google Sheets Berhasil! Total ${finalDataToSave.length} data GTK tersimpan.`);
    onClose();
  };

  // Generate & Download Template with Native Dropdowns
  const handleDownloadSheetTemplate = async (useExistingData: boolean = false) => {
    try {
      const teachersToExport = useExistingData && currentData && currentData.length > 0 ? currentData : undefined;
      const fileName = useExistingData && currentData && currentData.length > 0
        ? `Data_GTK_Aktif_${madrasahName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Template_Google_Sheets_GTK_${madrasahName.replace(/\s+/g, '_')}.xlsx`;

      await downloadExcelWithDropdowns(
        fileName,
        sheetName || 'Data_GTK',
        teachersToExport
      );
      
      if (useExistingData && currentData && currentData.length > 0) {
        showSuccess(`Berhasil mengunduh template berisi ${currentData.length} data GTK saat ini dengan validasi dropdown!`);
      } else {
        showSuccess('Template spreadsheet resmi berhasil diunduh!');
      }
    } catch (err: any) {
      console.error('Download error:', err);
      showError('Gagal mengunduh template spreadsheet');
    }
  };

  // Filtered rows for table view
  const filteredRows = previewRows.filter(row => {
    if (filterStatus !== 'all' && row.statusType !== filterStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.nama.toLowerCase().includes(q) ||
      (row.nik && row.nik.includes(q)) ||
      (row.nip && row.nip.toLowerCase().includes(q)) ||
      (row.npk && row.npk.includes(q)) ||
      (row.nrg && row.nrg.includes(q)) ||
      (row.tanggal_lahir && row.tanggal_lahir.includes(q)) ||
      (row.tmt_pendidik && row.tmt_pendidik.includes(q)) ||
      (row.jabatan && row.jabatan.toLowerCase().includes(q))
    );
  });

  const stats = {
    total: previewRows.length,
    new: previewRows.filter(r => r.statusType === 'new').length,
    update: previewRows.filter(r => r.statusType === 'update').length,
    identical: previewRows.filter(r => r.statusType === 'identical').length,
  };

  const appsScriptCode = generateAppsScriptDropdownCode(sheetName || 'Data_GTK');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl rounded-2xl sm:rounded-3xl">
        {/* Header - Sleek, Responsive, and Crisp */}
        <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-b border-slate-800/80 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <Globe className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Pusat Sinkronisasi Google Spreadsheet
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Sync
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Sinkronisasi dua arah data {targetType === 'teachers' ? 'Guru & GTK' : 'Siswa'} dengan validasi tanggal, NIP, dan TMT otomatis.
                </DialogDescription>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {currentData && currentData.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSheetTemplate(true)}
                  className="bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border-emerald-500/30 text-xs font-semibold rounded-xl gap-1.5 h-8.5"
                  title="Unduh template terisi data GTK saat ini lengkap dengan Dropdown"
                >
                  <Download className="w-3.5 h-3.5" /> Ekspor GTK ({currentData.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadSheetTemplate(false)}
                className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700 text-xs font-medium rounded-xl gap-1.5 h-8.5"
              >
                <Download className="w-3.5 h-3.5" /> Template Kosong
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/70 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'sync'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Live Sync Data
            </button>
            <button
              onClick={() => setActiveTab('dropdowns')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'dropdowns'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Pilihan Dropdown Form
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> Panduan Penggunaan
            </button>
            <button
              onClick={() => setActiveTab('apps_script')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'apps_script'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" /> Webhook / Script
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* URL & Configuration Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" /> Masukkan Link / URL Google Spreadsheet
                  </label>
                  {lastSyncTime && (
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Terakhir sinkron: <strong className="text-emerald-300 font-semibold">{lastSyncTime}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-2.5">
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs h-10 rounded-xl focus:border-emerald-500"
                  />
                  <Input
                    placeholder="Nama Tab (Data_GTK)"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    title="Nama Sheet / Tab di Google Spreadsheet Anda"
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs h-10 rounded-xl focus:border-emerald-500"
                  />
                  <Button
                    onClick={handleFetchFromGoogleSheets}
                    disabled={isLoading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 px-4.5 rounded-xl gap-2 shadow-sm transition-all"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Membaca...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" /> Tarik Data GSheet
                      </>
                    )}
                  </Button>
                </div>

                {/* Auto-Sync Background Switch & Privacy Notice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center justify-between gap-3 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${autoSyncEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
                      <div>
                        <span className="font-semibold text-slate-200 block text-xs">Auto-Sync Latar Belakang</span>
                        <span className="text-[10px] text-slate-400">Otomatis sinkronkan saat halaman dibuka</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoSync(!autoSyncEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                    <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Pastikan sharing link Spreadsheet diatur: <strong>"Siapa saja yang memiliki link"</strong> &rarr; <strong>"Pelihat (Viewer)"</strong> (atau <strong>"Editor"</strong> agar guru bisa mengisi mandiri).
                    </span>
                  </div>
                </div>

                {/* Google Sheet Live Thumbnail & Teacher Self-Fill Sharing Card */}
                {sheetId && (
                  <div className="bg-slate-950/90 border border-emerald-500/20 rounded-xl p-3.5 sm:p-4 space-y-3.5 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Share2 className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            Pratinjau Lembar & Tautan Pengisian Mandiri Guru
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                              {thumbnailMode === 'live' ? 'Live GSheet' : thumbnailMode === 'logo' ? 'Logo Madrasah' : 'Gambar Kustom'}
                            </Badge>
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Bagikan tautan portal resmi atau buka lembar kerja untuk diisi oleh Bapak/Ibu Guru.
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(effectiveShareUrl, '_blank')}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 text-[11px] h-8 rounded-lg gap-1.5"
                          title="Buka tautan yang dipilih di tab baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> Buka {shareLinkType === 'portal' ? 'Portal' : 'Sheet'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyShareLink}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 text-[11px] h-8 rounded-lg gap-1.5"
                          title="Salin tautan ke clipboard"
                        >
                          {isCopiedShareLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {isCopiedShareLink ? 'Tersalin' : 'Salin Link'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleShareToWhatsApp}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold h-8 rounded-lg gap-1.5 shadow-sm"
                          title="Kirim pemberitahuan dan link pengisian ke grup WhatsApp Guru"
                        >
                          <Send className="w-3.5 h-3.5" /> Kirim ke WA Guru
                        </Button>
                      </div>
                    </div>

                    {/* Destination Link Choice Radio Bar */}
                    <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-slate-300 text-[11px] font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Format Tautan yang Dibagikan:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShareLinkType('portal')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                            shareLinkType === 'portal'
                              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/50'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          <School className="w-3 h-3" />
                          <span>Portal SIAKAD (Gambar Banner Tampil di WA)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShareLinkType('direct')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                            shareLinkType === 'direct'
                              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/50'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>Link Langsung GSheet</span>
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail Image + Info Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 items-center">
                      <div className="relative aspect-[16/10] sm:aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group shadow-inner">
                        {!imgError && activeThumbnailUrl ? (
                          <img
                            src={activeThumbnailUrl}
                            alt="Pratinjau Thumbnail"
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-3 text-center text-slate-500">
                            <FileSpreadsheet className="w-8 h-8 mb-1 text-emerald-500/40" />
                            <span className="text-[10px] text-slate-400 font-medium">Google Spreadsheet</span>
                          </div>
                        )}
                        <a
                          href={effectiveShareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] font-bold text-white backdrop-blur-[1px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> Klik untuk Buka
                        </a>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Target Tab:</span>
                            <span className="font-semibold text-slate-200">{sheetName || 'Data_GTK'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Link Aktif:</span>
                            <span className="font-mono text-emerald-400 text-[10px] truncate max-w-[200px]" title={effectiveShareUrl}>
                              {effectiveShareUrl}
                            </span>
                          </div>

                          {/* Thumbnail Mode Switcher & Customizer Toggle */}
                          <div className="pt-1.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-emerald-400" /> Sumber Thumbnail:
                            </span>
                            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleSelectThumbnailMode('live')}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  thumbnailMode === 'live'
                                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Gunakan screenshot otomatis lembar spreadsheet dari Google Drive"
                              >
                                Live Sheet
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectThumbnailMode('logo')}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  thumbnailMode === 'logo'
                                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Gunakan logo resmi madrasah"
                              >
                                Logo Madrasah
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectThumbnailMode('custom');
                                  setShowThumbCustomizer(true);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  thumbnailMode === 'custom'
                                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Unggah gambar sendiri atau masukkan URL gambar kustom"
                              >
                                Kustom...
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Custom Image Upload / URL Input Drawer */}
                        {showThumbCustomizer && (
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2 animate-in fade-in">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-300 flex items-center gap-1">
                                <Upload className="w-3 h-3 text-emerald-400" /> Kustomisasi Gambar Thumbnail
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowThumbCustomizer(false)}
                                className="text-slate-400 hover:text-white text-[10px]"
                              >
                                Tutup
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-1.5 items-center">
                              <Input
                                type="text"
                                placeholder="Masukkan URL Gambar (https://...)"
                                value={customImageUrl}
                                onChange={(e) => handleSaveCustomUrl(e.target.value)}
                                className="h-7 text-[11px] bg-slate-900 border-slate-800 text-slate-200"
                              />
                              <label className="cursor-pointer inline-flex items-center justify-center h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium border border-slate-700 gap-1 shrink-0">
                                <Upload className="w-3 h-3 text-emerald-400" /> Unggah
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileUpload}
                                  className="hidden"
                                />
                              </label>
                              {customImageUrl && (
                                <button
                                  type="button"
                                  onClick={handleClearCustomImage}
                                  className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-md border border-rose-900/40 flex items-center justify-center shrink-0"
                                  title="Hapus gambar kustom"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Format didukung: JPG, PNG, WebP (Maks. 2MB) atau URL gambar online.
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={handleDownloadBanner}
                            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 hover:underline"
                            title="Unduh file gambar banner untuk dilampirkan sebagai foto di WhatsApp"
                          >
                            <Download className="w-3 h-3 text-emerald-400" /> Unduh Gambar Banner
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyWaMessage}
                            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline"
                          >
                            {isCopiedWaTemplate ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {isCopiedWaTemplate ? 'Pesan Tersalin' : 'Salin Draf Pesan WA'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp link preview explanation note */}
                    <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-slate-300">
                      <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong className="text-emerald-300">Tips Gambar Preview WhatsApp:</strong> WhatsApp secara otomatis menampilkan gambar banner/logo kustom Anda jika membagikan <strong>Link Portal SIAKAD</strong>. Jika membagikan link langsung <em>docs.google.com</em>, WhatsApp akan mengambil gambar bawaan Google. Anda juga bisa mengunduh banner via tombol <em>"Unduh Gambar Banner"</em> di atas untuk dilampirkan langsung sebagai foto di chat WhatsApp.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview & Compare Section */}
              {previewRows.length > 0 && (
                <div className="space-y-3.5">
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total di Sheet</div>
                      <div className="text-lg font-black text-white mt-0.5">{stats.total}</div>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl text-center">
                      <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" /> Data Baru
                      </div>
                      <div className="text-lg font-black text-emerald-300 mt-0.5">+{stats.new}</div>
                    </div>
                    <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl text-center">
                      <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
                        <ArrowDownUp className="w-3 h-3" /> Diperbarui
                      </div>
                      <div className="text-lg font-black text-blue-300 mt-0.5">{stats.update}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800/60 p-3 rounded-xl text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-500" /> Sudah Sama
                      </div>
                      <div className="text-lg font-black text-slate-400 mt-0.5">{stats.identical}</div>
                    </div>
                  </div>

                  {/* Sync Mode Selection */}
                  <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Metode Penerapan Sinkronisasi:</span>
                      <span className="text-[10px] text-slate-400">Pilih bagaimana pembaruan diterapkan ke database</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSyncMode('upsert')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          syncMode === 'upsert'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        ⚡ Gabung & Update (Rekomendasi)
                      </button>
                      <button
                        onClick={() => setSyncMode('replace')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          syncMode === 'replace'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        ⚠️ Timpa Total
                      </button>
                      <button
                        onClick={() => setSyncMode('insert_only')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          syncMode === 'insert_only'
                            ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        ➕ Tambah Baru Saja
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Cari guru, NIP, TTL, TMT..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white pl-8 h-8 text-xs rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                      <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          filterStatus === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        Semua ({previewRows.length})
                      </button>
                      <button
                        onClick={() => setFilterStatus('new')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          filterStatus === 'new' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400 hover:bg-slate-900'
                        }`}
                      >
                        Baru ({stats.new})
                      </button>
                      <button
                        onClick={() => setFilterStatus('update')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          filterStatus === 'update' ? 'bg-blue-600 text-white font-bold' : 'text-blue-400 hover:bg-slate-900'
                        }`}
                      >
                        Diperbarui ({stats.update})
                      </button>
                      <button
                        onClick={() => setFilterStatus('identical')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          filterStatus === 'identical' ? 'bg-slate-800 text-slate-300 font-bold' : 'text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        Sama ({stats.identical})
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 text-slate-300 font-bold sticky top-0 border-b border-slate-800 text-[11px]">
                        <tr>
                          <th className="p-2.5 text-center w-8">No</th>
                          <th className="p-2.5 w-24">Status</th>
                          <th className="p-2.5">Nama & Jabatan</th>
                          <th className="p-2.5">NIP</th>
                          <th className="p-2.5">Tanggal Lahir</th>
                          <th className="p-2.5">TMT Pendidik / Madrasah</th>
                          <th className="p-2.5">Perubahan Field</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-200">
                        {filteredRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-2.5 text-center text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                            <td className="p-2.5">
                              {row.statusType === 'new' && (
                                <span className="inline-block bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  Baru
                                </span>
                              )}
                              {row.statusType === 'update' && (
                                <span className="inline-block bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  Diperbarui
                                </span>
                              )}
                              {row.statusType === 'identical' && (
                                <span className="inline-block bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-md">
                                  Sama
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-2.5">
                                {row.foto_url ? (
                                  <img
                                    src={row.foto_url}
                                    alt={row.nama}
                                    className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shrink-0 bg-slate-900"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                    {(row.nama || 'G').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-1.5">
                                    {row.nama}{row.gelar ? `, ${row.gelar}` : ''}
                                    {row.foto_url && (
                                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-normal">
                                        Foto
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{row.jabatan} • {row.status_kepegawaian}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-emerald-300">
                              {row.nip && row.nip !== '-' ? row.nip : <span className="text-slate-500">-</span>}
                            </td>
                            <td className="p-2.5 text-[11px]">
                              {row.tanggal_lahir ? (
                                <span className="font-mono text-slate-200 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  {row.tanggal_lahir}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">Belum diisi</span>
                              )}
                              {row.tempat_lahir && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">({row.tempat_lahir})</span>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px]">
                              <div className="text-slate-200">
                                Pendidik: {row.tmt_pendidik ? <span className="font-mono text-emerald-300">{row.tmt_pendidik}</span> : <span className="text-slate-500">-</span>}
                              </div>
                              {row.tmt_madrasah && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Madrasah: <span className="font-mono text-slate-300">{row.tmt_madrasah}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-[10px]">
                              {row.diffFields && row.diffFields.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.diffFields.map((field, fIdx) => (
                                    <span
                                      key={fIdx}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        field === 'Tanggal Lahir' || field === 'TMT Pendidik' || field === 'TMT Madrasah' || field === 'NIP'
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                                      }`}
                                    >
                                      {field}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[10px]">Data identik</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dropdowns' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                      Validasi Dropdown Pilihan Form GTK
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Daftar pilihan dropdown di bawah ini 100% selaras dengan sistem SIAKAD.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownloadSheetTemplate(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-8 text-xs rounded-xl gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh Template + Dropdown
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* 1. Jabatan */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <span className="font-bold text-white text-xs block">Jabatan GTK</span>
                    <div className="flex flex-wrap gap-1">
                      {GTK_DROPDOWN_OPTIONS.jabatan.map(opt => (
                        <span key={opt} className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 2. Status Kepegawaian */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <span className="font-bold text-white text-xs block">Status Kepegawaian</span>
                    <div className="flex flex-wrap gap-1">
                      {GTK_DROPDOWN_OPTIONS.status_kepegawaian.map(opt => (
                        <span key={opt} className="bg-slate-900 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[10px]">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 3. Pendidikan */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <span className="font-bold text-white text-xs block">Pendidikan Terakhir</span>
                    <div className="flex flex-wrap gap-1">
                      {GTK_DROPDOWN_OPTIONS.pendidikan.map(opt => (
                        <span key={opt} className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 4. Sertifikasi */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <span className="font-bold text-white text-xs block">Status Sertifikasi</span>
                    <div className="flex flex-wrap gap-1">
                      {GTK_DROPDOWN_OPTIONS.status_sertifikasi.map(opt => (
                        <span key={opt} className="bg-slate-900 text-amber-300 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Petunjuk Penggunaan & Format Tanggal / NIP
                </h4>
                <ol className="list-decimal list-inside space-y-2.5 text-slate-300 pl-1">
                  <li>
                    <strong>Format Tanggal Lahir & TMT:</strong> Sistem secara otomatis mendukung berbagai format input (misal: <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-300">1985-01-15</code>, <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-300">15/01/1985</code>, <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-300">15 Januari 1985</code>, atau format Tanggal Excel asli).
                  </li>
                  <li>
                    <strong>Format NIP & NIK:</strong> NIP 18 digit dan NIK 16 digit diproses aman tanpa terpotong format notasi ilmiah (<code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-300">1.985E+17</code>).
                  </li>
                  <li>
                    <strong>Link / Foto Profil GTK:</strong> Anda dapat memasukkan link foto profil pada kolom <strong>Link Foto Profil (URL / Drive)</strong>. Sistem otomatis mengubah tautan Google Drive (share view) menjadi gambar profil yang langsung tampil di SIAKAD. Guru juga dapat mengunggah foto langsung dari halaman Portal GTK.
                  </li>
                  <li>
                    <strong>Izin Akses Google Sheet:</strong> Buka Google Sheet &rarr; klik tombol <strong>Bagikan (Share)</strong> &rarr; pilih <strong>"Siapa saja yang memiliki link"</strong> dengan peran <strong>Pelihat (Viewer)</strong>.
                  </li>
                  <li>
                    <strong>Pembaruan Instan:</strong> Setelah mengubah data di Google Sheets, cukup klik <strong>"Tarik Data GSheet"</strong> lalu klik <strong>"Terapkan Sinkronisasi"</strong>.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'apps_script' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Google Apps Script Otomatisasi (Opsional)
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(appsScriptCode);
                      setIsCopiedScript(true);
                      setTimeout(() => setIsCopiedScript(false), 2000);
                      showSuccess('Kode Apps Script berhasil disalin!');
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border-slate-700 h-7 text-[11px] rounded-lg gap-1"
                  >
                    {isCopiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopiedScript ? 'Tersalin' : 'Salin Skrip'}
                  </Button>
                </div>
                <p className="text-slate-400">
                  Pasang skrip ini di menu <strong>Ekstensi &gt; Apps Script</strong> di Google Sheets untuk membuat aturan validasi otomatis.
                </p>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-44">
                  {appsScriptCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target: <strong>{targetType === 'teachers' ? 'Data Guru & GTK' : 'Data Siswa'}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 text-xs rounded-xl h-9"
            >
              Tutup
            </Button>
            {previewRows.length > 0 && activeTab === 'sync' && (
              <Button
                size="sm"
                onClick={handleApplySync}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl px-5 h-9 gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Terapkan Sinkronisasi ({previewRows.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSheetsSyncModal;
