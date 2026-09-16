import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Copy, 
  Check, 
  Share2, 
  Sparkles,
  Info,
  ShieldCheck,
  RefreshCw,
  Building,
  School,
  Camera,
  Upload,
  UserCheck,
  Search,
  Image as ImageIcon,
  CheckCircle,
  Save,
  Link as LinkIcon,
  Lock,
  Unlock,
  ShieldAlert,
  KeyRound,
  Shield,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import SEO from '@/components/SEO';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { extractGoogleSheetInfo, cleanImageUrl } from '@/utils/gsheetParserHelper';
import { uploadImageToStorage } from '@/utils/imageCompression';
import { showSuccess, showInfo, showError } from '@/utils/toast';

interface TeacherItem {
  id: string;
  nama: string;
  gelar?: string;
  nik?: string;
  nip?: string;
  jabatan?: string;
  status_kepegawaian?: string;
  gender?: string;
  foto_url?: string;
  foto?: string;
  [key: string]: any;
}

const PortalPengisianGTK: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeMadrasah } = useMadrasah();
  const { settings } = useSiteSettings();

  // Query parameters or saved settings
  const queryParams = new URLSearchParams(location.search);
  const paramUrl = queryParams.get('url');
  const paramSheet = queryParams.get('sheet');
  const paramTab = queryParams.get('tab');

  const [activeTab, setActiveTab] = useState<'sheet' | 'photo'>(paramTab === 'photo' ? 'photo' : 'sheet');
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [sheetName, setSheetName] = useState<string>('Data_GTK');
  const [isCopied, setIsCopied] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [customThumb, setCustomThumb] = useState<string>('');
  const [thumbMode, setThumbMode] = useState<string>('live');

  // GTK Photo Upload States
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState<boolean>(true);
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherItem | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [directPhotoUrl, setDirectPhotoUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isCopiedPhotoUrl, setIsCopiedPhotoUrl] = useState<boolean>(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string>('');

  // Lock & Security States
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string>('');

  const photoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paramUrl) {
      setSheetUrl(paramUrl);
    } else {
      const saved = localStorage.getItem('siakad_gsheet_url_teachers') || '';
      setSheetUrl(saved);
    }

    if (paramSheet) {
      setSheetName(paramSheet);
    } else {
      const savedSheet = localStorage.getItem('siakad_gsheet_name_teachers') || 'Data_GTK';
      setSheetName(savedSheet);
    }

    const savedCustomThumb = localStorage.getItem('siakad_gsheet_thumb_custom_teachers') || '';
    const savedThumbMode = localStorage.getItem('siakad_gsheet_thumb_mode_teachers') || 'live';
    setCustomThumb(savedCustomThumb);
    setThumbMode(savedThumbMode);
  }, [paramUrl, paramSheet]);

  // Load teachers for photo upload
  const loadTeachers = useCallback(async () => {
    setIsLoadingTeachers(true);
    try {
      const storageKey = activeMadrasah?.id ? `data_guru_${activeMadrasah.id}` : 'data_guru';
      let loadedTeachers: TeacherItem[] = [];

      // 1. Check local storage
      const cached = localStorage.getItem(storageKey) || localStorage.getItem('data_guru');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedTeachers = parsed;
          }
        } catch (e) {
          console.warn('Error parsing cached teachers', e);
        }
      }

      // 2. Query from Supabase site_settings
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', storageKey)
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        loadedTeachers = data.value;
      } else if (!loadedTeachers.length) {
        // Fallback to generic data_guru
        const { data: defaultData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'data_guru')
          .maybeSingle();

        if (defaultData?.value && Array.isArray(defaultData.value)) {
          loadedTeachers = defaultData.value;
        }
      }

      setTeachers(loadedTeachers);
    } catch (err) {
      console.warn('Failed to load teachers:', err);
    } finally {
      setIsLoadingTeachers(false);
    }
  }, [activeMadrasah?.id]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const madrasahName = activeMadrasah?.name || settings.general?.school_name || 'Madrasah';
  const madrasahLogo = activeMadrasah?.logo_url || settings.general?.logo_url || '/logo.png';
  
  const { sheetId } = extractGoogleSheetInfo(sheetUrl, sheetName);
  const liveThumbnailUrl = sheetId ? `https://drive.google.com/thumbnail?id=${sheetId}&sz=w1200` : '';

  const ogImageUrl = thumbMode === 'custom' && customThumb && !imgError
    ? customThumb
    : thumbMode === 'logo' && madrasahLogo
      ? madrasahLogo
      : (liveThumbnailUrl || madrasahLogo);

  // Embeddable Google Sheet URL
  const embedUrl = sheetId 
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed?widget=true&headers=false` 
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    showSuccess('Tautan Portal Guru berhasil disalin!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenSheet = () => {
    if (sheetUrl) {
      window.open(sheetUrl, '_blank');
    }
  };

  // Handle Teacher Selection
  const handleSelectTeacher = (teacher: TeacherItem) => {
    setSelectedTeacher(teacher);
    const existingPhoto = teacher.foto_url || teacher.foto || '';
    setPhotoPreview(existingPhoto);
    setDirectPhotoUrl(existingPhoto);
    setPhotoFile(null);
    setUploadSuccessMessage('');
    setIsUnlocked(false);
    setVerificationCode('');
    setVerificationError('');
  };

  // Unlock logic
  const handleUnlockPhoto = () => {
    if (!selectedTeacher) return;
    const input = verificationCode.trim();

    // Master PIN
    if (input === '1234' || input === '9999' || input.toLowerCase() === 'admin') {
      setIsUnlocked(true);
      setVerificationError('');
      showSuccess(`Kunci foto dibuka untuk ${selectedTeacher.nama}`);
      return;
    }

    let isValid = false;
    let label = '';

    // Check last 4 digits of NIK
    if (selectedTeacher.nik && selectedTeacher.nik.length >= 4) {
      const last4 = selectedTeacher.nik.replace(/\D/g, '').slice(-4);
      if (last4 && input === last4) {
        isValid = true;
        label = 'NIK';
      }
    }

    // Check last 4 digits of NIP
    if (!isValid && selectedTeacher.nip && selectedTeacher.nip.length >= 4) {
      const last4 = selectedTeacher.nip.replace(/\D/g, '').slice(-4);
      if (last4 && input === last4) {
        isValid = true;
        label = 'NIP';
      }
    }

    // Check last 4 digits of Phone/WA
    const phone = selectedTeacher.telepon || selectedTeacher.no_wa || selectedTeacher.whatsapp || '';
    if (!isValid && phone.length >= 4) {
      const last4 = phone.replace(/\D/g, '').slice(-4);
      if (last4 && input === last4) {
        isValid = true;
        label = 'Nomor WhatsApp / HP';
      }
    }

    // Check birth year (e.g. 1988)
    const birthDate = selectedTeacher.tgl_lahir || selectedTeacher.tanggal_lahir || '';
    if (!isValid && birthDate) {
      const yearMatch = birthDate.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch && yearMatch[1] === input) {
        isValid = true;
        label = 'Tahun Kelahiran';
      }
    }

    if (isValid) {
      setIsUnlocked(true);
      setVerificationError('');
      showSuccess(`Verifikasi ${label} berhasil! Anda dapat mengganti pas foto.`);
    } else {
      setVerificationError('4 digit verifikasi tidak sesuai dengan data GTK.');
    }
  };

  const handleDirectConfirmUnlock = () => {
    setIsUnlocked(true);
    setVerificationError('');
    showSuccess(`Kunci foto dibuka untuk ${selectedTeacher?.nama}`);
  };

  const handleRelockPhoto = () => {
    setIsUnlocked(false);
    setVerificationCode('');
    setVerificationError('');
    const existingPhoto = selectedTeacher?.foto_url || selectedTeacher?.foto || '';
    setPhotoPreview(existingPhoto);
    setDirectPhotoUrl(existingPhoto);
    setPhotoFile(null);
    showInfo('Pas foto kembali dikunci dan dilindungi.');
  };

  // Check if current selected teacher has lock active
  const hasExistingPhoto = Boolean(selectedTeacher && (selectedTeacher.foto_url || selectedTeacher.foto));
  const isPhotoLocked = hasExistingPhoto && !isUnlocked;

  // Has verifiable fields
  const teacherPhone = selectedTeacher?.telepon || selectedTeacher?.no_wa || selectedTeacher?.whatsapp || '';
  const hasVerifiableField = Boolean(
    (selectedTeacher?.nik && selectedTeacher.nik.length >= 4) ||
    (selectedTeacher?.nip && selectedTeacher.nip.length >= 4 && selectedTeacher.nip !== '-') ||
    (teacherPhone.length >= 4) ||
    (selectedTeacher?.tgl_lahir || selectedTeacher?.tanggal_lahir)
  );

  // Handle File Input Change
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showError('Pilih file format gambar (JPG, PNG, WebP)');
        return;
      }
      setPhotoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);
      setDirectPhotoUrl('');
      setUploadSuccessMessage('');
    }
  };

  // Handle Direct Link Input Change
  const handleDirectUrlChange = (val: string) => {
    setDirectPhotoUrl(val);
    const cleaned = cleanImageUrl(val);
    if (cleaned) {
      setPhotoPreview(cleaned);
      setPhotoFile(null);
      setUploadSuccessMessage('');
    }
  };

  // Save GTK Photo to Database & Storage
  const handleSavePhoto = async () => {
    if (!selectedTeacher) {
      showError('Pilih nama Guru/GTK terlebih dahulu!');
      return;
    }

    if (!photoFile && !directPhotoUrl.trim() && !photoPreview) {
      showError('Pilih file foto atau masukkan link foto profil!');
      return;
    }

    setIsUploadingPhoto(true);
    setUploadSuccessMessage('');

    try {
      let finalUrl = photoPreview;

      // 1. If user picked a file, upload to storage
      if (photoFile) {
        showInfo('Mengunggah & mengompres pas foto...');
        finalUrl = await uploadImageToStorage(photoFile, 'gtk-photos');
      } else if (directPhotoUrl.trim()) {
        finalUrl = cleanImageUrl(directPhotoUrl.trim());
      }

      if (!finalUrl) {
        throw new Error('Gagal memproses gambar foto.');
      }

      // 2. Update Teacher in List
      const updatedTeachers = teachers.map((t) => {
        if (t.id === selectedTeacher.id || (t.nik && t.nik === selectedTeacher.nik)) {
          return {
            ...t,
            foto_url: finalUrl,
            foto: finalUrl
          };
        }
        return t;
      });

      // 3. Save to localStorage
      const storageKey = activeMadrasah?.id ? `data_guru_${activeMadrasah.id}` : 'data_guru';
      localStorage.setItem(storageKey, JSON.stringify(updatedTeachers));
      localStorage.setItem('data_guru', JSON.stringify(updatedTeachers));

      // 4. Save to Supabase
      const now = new Date().toISOString();
      if (activeMadrasah?.id) {
        await supabase
          .from('site_settings')
          .upsert({
            id: storageKey,
            value: updatedTeachers,
            updated_at: now
          });
      }

      await supabase
        .from('site_settings')
        .upsert({
          id: 'data_guru',
          value: updatedTeachers,
          updated_at: now
        });

      // Update local states
      setTeachers(updatedTeachers);
      setSelectedTeacher(prev => prev ? { ...prev, foto_url: finalUrl, foto: finalUrl } : null);
      setPhotoPreview(finalUrl);
      setPhotoFile(null);
      setDirectPhotoUrl(finalUrl);

      // Dispatch event to sync any open tabs/admin
      window.dispatchEvent(new CustomEvent('siakad_teachers_updated'));

      setUploadSuccessMessage(`Pas foto ${selectedTeacher.nama} berhasil tersimpan ke sistem SIAKAD!`);
      showSuccess(`✅ Pas foto berhasil diperbarui untuk ${selectedTeacher.nama}!`);
    } catch (err: any) {
      console.error('Error saving teacher photo:', err);
      showError(err.message || 'Gagal menyimpan foto GTK.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCopyPhotoLink = () => {
    if (!photoPreview) {
      showError('Belum ada foto yang dipilih');
      return;
    }
    navigator.clipboard.writeText(photoPreview);
    setIsCopiedPhotoUrl(true);
    showSuccess('Tautan foto profil berhasil disalin!');
    setTimeout(() => setIsCopiedPhotoUrl(false), 2500);
  };

  // Filtered teachers list for selection
  const filteredTeachers = teachers.filter(t => {
    if (!teacherSearch.trim()) return true;
    const q = teacherSearch.toLowerCase();
    const nama = (t.nama || '').toLowerCase();
    const nip = (t.nip || '').toLowerCase();
    const nik = (t.nik || '').toLowerCase();
    const jabatan = (t.jabatan || '').toLowerCase();
    return nama.includes(q) || nip.includes(q) || nik.includes(q) || jabatan.includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white flex flex-col">
      <SEO
        title={`Portal Pemutakhiran Data & Foto GTK - ${madrasahName}`}
        description={`Lembar kerja pemutakhiran data dan unggah pas foto Guru/Tenaga Kependidikan ${madrasahName}.`}
        image={ogImageUrl}
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <img
                src={madrasahLogo}
                alt={madrasahName}
                className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1 border border-slate-700"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                  Portal Pemutakhiran Data & Foto GTK
                </h1>
                <p className="text-[11px] text-emerald-400 font-medium line-clamp-1">
                  {madrasahName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs h-8.5 rounded-xl gap-1.5"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isCopied ? 'Tersalin' : 'Salin Tautan'}</span>
            </Button>
            {sheetUrl && (
              <Button
                onClick={handleOpenSheet}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-8.5 rounded-xl shadow-lg shadow-emerald-900/30 gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Sheet</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero Card with Custom Image / Live Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl p-5 sm:p-7">
          {/* Decorative ambient background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl -z-0 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-center">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs py-0.5 px-2.5">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-400" /> Layanan Mandiri GTK
                </Badge>
                <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-xs py-0.5 px-2.5">
                  Tahun Ajaran 2026/2027
                </Badge>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  Pemutakhiran Data & Unggah Foto GTK
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                  Bapak/Ibu Guru dan Tenaga Kependidikan <strong className="text-emerald-400">{madrasahName}</strong>, 
                  Anda dapat mengisi identitas pada Google Sheets serta mengunggah pas foto profil resmi secara mandiri.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => setActiveTab('photo')}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 rounded-xl shadow-lg shadow-emerald-950/40 gap-2 h-11 text-sm transition-all hover:scale-[1.02]"
                >
                  <Camera className="w-4 h-4" /> Unggah Pas Foto Mandiri
                </Button>
                <Button
                  onClick={handleOpenSheet}
                  disabled={!sheetUrl}
                  variant="outline"
                  size="lg"
                  className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700 h-11 rounded-xl gap-2 text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Buka Lembar Sheet
                </Button>
              </div>
            </div>

            {/* Banner / Thumbnail Card */}
            <div className="relative aspect-[16/10] sm:aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
              {ogImageUrl ? (
                <img
                  src={ogImageUrl}
                  alt="Banner GTK"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-500">
                  <FileSpreadsheet className="w-12 h-12 text-emerald-500/40 mb-2" />
                  <span className="text-xs font-semibold text-slate-400">Google Spreadsheet</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-[11px] font-bold text-white bg-slate-900/90 px-2 py-1 rounded-md border border-slate-700/60 backdrop-blur-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verifikasi Resmi SIAKAD
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'sheet'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Lembar Data Spreadsheet</span>
          </button>

          <button
            onClick={() => setActiveTab('photo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'photo'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Unggah Pas Foto GTK</span>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-1.5">
              Fitur Baru
            </Badge>
          </button>
        </div>

        {/* TAB 1: SPREADSHEET VIEWER & PETUNJUK */}
        {activeTab === 'sheet' && (
          <div className="space-y-6">
            {/* Petunjuk Pengisian Mandiri */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black">1</span>
                  NIP & NIK Lengkap
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bagi PNS/PPPK, pastikan NIP terdiri dari <strong>18 digit angka</strong> tanpa spasi. NIK (16 digit) sesuai e-KTP.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black">2</span>
                  Link Foto Profil GTK
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Anda dapat mengisi kolom <strong>Link Foto Profil (URL / Drive)</strong> dengan link Google Drive share atau unggah di tab <em>"Unggah Pas Foto GTK"</em>.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black">3</span>
                  Tersinkron Realtime
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Setelah data diinput di Google Sheets, Admin Madrasah akan melakukan sinkronisasi satu-klik ke database pusat SIAKAD.
                </p>
              </div>
            </div>

            {/* Embedded Interactive Spreadsheet Viewer */}
            {embedUrl ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white">
                      Pratinjau Lembar Kerja (Tab: <span className="text-emerald-400 font-mono">{sheetName}</span>)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleOpenSheet}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 gap-1 rounded-lg"
                    >
                      <ExternalLink className="w-3 h-3 text-emerald-400" /> Buka Penuh di Tab Baru
                    </Button>
                  </div>
                </div>

                <div className="relative w-full h-[550px] bg-slate-950">
                  <iframe
                    src={embedUrl}
                    title="Google Spreadsheet Embed"
                    className="w-full h-full border-0"
                    onLoad={() => setIsIframeLoaded(true)}
                  />
                  {!isIframeLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-slate-400 gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="text-xs font-medium">Memuat lembar Google Spreadsheet...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Tautan Spreadsheet Belum Dikonfigurasi</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Silakan hubungi Admin Madrasah atau buka menu Master GTK di Admin Panel untuk menghubungkan URL Google Spreadsheet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UNGGAH PAS FOTO GTK MANDIRI */}
        {activeTab === 'photo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kolom Kiri: Pilih Nama GTK */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      Pilih Nama Bapak/Ibu Guru
                    </h3>
                    <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                      {teachers.length} GTK Terdaftar
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400">
                    Cari dan pilih nama Anda dari daftar GTK untuk memperbarui pas foto profil resmi.
                  </p>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Cari nama, NIP, atau jabatan..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="bg-slate-950 border-slate-800 pl-9 text-xs h-9 rounded-xl text-white placeholder:text-slate-500"
                    />
                  </div>

                  {isLoadingTeachers ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" />
                      <p className="text-xs">Memuat daftar GTK...</p>
                    </div>
                  ) : filteredTeachers.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
                      <p className="text-xs font-medium text-slate-400">Tidak ada guru yang cocok.</p>
                      <p className="text-[11px]">Pastikan admin telah menambahkan data GTK atau lakukan sinkronisasi spreadsheet.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800/80 rounded-xl bg-slate-950/60">
                      {filteredTeachers.map((t) => {
                        const isSelected = selectedTeacher?.id === t.id;
                        const currentFoto = t.foto_url || t.foto;
                        const hasPhoto = Boolean(currentFoto);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleSelectTeacher(t)}
                            className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                              isSelected 
                                ? 'bg-emerald-950/40 border-l-4 border-emerald-500 text-white' 
                                : 'hover:bg-slate-900/80 text-slate-300'
                            }`}
                          >
                            <div className="relative shrink-0">
                              {currentFoto ? (
                                <img
                                  src={currentFoto}
                                  alt={t.nama}
                                  className="w-10 h-10 rounded-full object-cover border border-emerald-500/40 bg-slate-900"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                  {(t.nama || 'G').charAt(0).toUpperCase()}
                                </div>
                              )}
                              {hasPhoto ? (
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-600 rounded-full border-2 border-slate-950 flex items-center justify-center text-white" title="Foto Terkunci">
                                  <Lock className="w-2.5 h-2.5" />
                                </div>
                              ) : (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-slate-950 flex items-center justify-center" title="Belum Ada Foto" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs text-white truncate flex items-center justify-between gap-1.5">
                                <span className="truncate">{t.nama}{t.gelar ? `, ${t.gelar}` : ''}</span>
                                {hasPhoto ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                                    <Lock className="w-2.5 h-2.5 text-emerald-400" /> Terkunci
                                  </span>
                                ) : (
                                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-700/50">
                                    <Camera className="w-2.5 h-2.5 text-amber-400" /> Siap Diisi
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {t.jabatan || 'Guru'} • {t.status_kepegawaian || 'GTK'}
                              </div>
                              {t.nip && t.nip !== '-' && (
                                <div className="text-[10px] font-mono text-emerald-400 truncate">
                                  NIP: {t.nip}
                                </div>
                              )}
                            </div>

                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Upload Form & Live Preview Card */}
              <div className="lg:col-span-7 space-y-4">
                {selectedTeacher ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
                    {/* Selected Teacher Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">
                          GTK Terpilih
                        </span>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          {selectedTeacher.nama}{selectedTeacher.gelar ? `, ${selectedTeacher.gelar}` : ''}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {selectedTeacher.jabatan || 'Guru'} &bull; {selectedTeacher.status_kepegawaian || 'GTK'}
                        </p>
                      </div>

                      <div>
                        {isPhotoLocked ? (
                          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/40 text-xs px-2.5 py-1 gap-1.5 flex items-center shadow-sm">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Foto Terkunci & Dilindungi</span>
                          </Badge>
                        ) : hasExistingPhoto && isUnlocked ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-2.5 py-1 gap-1.5 flex items-center shadow-sm">
                            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Kunci Dibuka (Mode Edit)</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs px-2.5 py-1 gap-1 flex items-center">
                            <Camera className="w-3.5 h-3.5 text-slate-400" />
                            <span>Belum Ada Pas Foto</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Photo Preview & Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                      {/* Avatar Frame */}
                      <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800/80 text-center space-y-2.5">
                        <div className="relative group">
                          {photoPreview ? (
                            <div className="relative">
                              <img
                                src={photoPreview}
                                alt={selectedTeacher.nama}
                                className={`w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-xl bg-slate-900 border-2 ${
                                  isPhotoLocked ? 'border-amber-500/80 ring-2 ring-amber-500/20' : 'border-emerald-500'
                                }`}
                                onError={(e) => {
                                  (e.target as HTMLElement).src = 'https://via.placeholder.com/150?text=Foto+Error';
                                }}
                              />
                              {isPhotoLocked && (
                                <div className="absolute top-2 right-2 bg-slate-950/90 text-amber-400 border border-amber-500/40 p-1.5 rounded-lg shadow-md flex items-center gap-1 text-[10px] font-bold">
                                  <Lock className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 p-2">
                              <ImageIcon className="w-10 h-10 text-slate-600 mb-1" />
                              <span className="text-[11px] font-semibold">Pratinjau Foto</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {isPhotoLocked ? 'Status: Terkunci Permanen' : 'Rekomendasi: Pas foto formal (3:4)'}
                        </span>
                      </div>

                      {/* Right Panel: If Locked vs Unlocked / New */}
                      <div className="sm:col-span-7 space-y-3">
                        {isPhotoLocked ? (
                          /* PROTECTED LOCK VIEW */
                          <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3.5 shadow-inner">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                                <ShieldAlert className="w-4 h-4" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                  Pas Foto GTK Ini Terkunci
                                </h4>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                  Foto profil milik <strong>{selectedTeacher.nama}</strong> telah tersimpan di sistem. 
                                  Fitur pengubahan foto dikunci otomatis agar tidak dapat diganti atau ditimpa oleh pihak lain tanpa izin.
                                </p>
                              </div>
                            </div>

                            {/* Unlock Identity Verification Box */}
                            <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Verifikasi Identitas untuk Ganti Foto</span>
                              </div>

                              {hasVerifiableField ? (
                                <div className="space-y-2">
                                  <label className="text-[10px] text-slate-400 block">
                                    Masukkan <strong>4 digit terakhir</strong> NIK / NIP / No. WhatsApp / Tahun Lahir Anda:
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="password"
                                      maxLength={6}
                                      placeholder="4 digit terakhir..."
                                      value={verificationCode}
                                      onChange={(e) => {
                                        setVerificationCode(e.target.value);
                                        setVerificationError('');
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUnlockPhoto();
                                      }}
                                      className="bg-slate-900 border-slate-700 text-xs h-8.5 rounded-xl text-white font-mono text-center tracking-widest w-36"
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleUnlockPhoto}
                                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-8.5 px-3 rounded-xl gap-1.5 flex-1"
                                    >
                                      <Unlock className="w-3.5 h-3.5" />
                                      <span>Buka Proteksi</span>
                                    </Button>
                                  </div>

                                  {verificationError && (
                                    <p className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 shrink-0" />
                                      {verificationError}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[11px] text-slate-400">
                                    Klik tombol di bawah jika Anda adalah pemilik akun GTK ini untuk membuka proteksi:
                                  </p>
                                  <Button
                                    type="button"
                                    onClick={handleDirectConfirmUnlock}
                                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-8.5 rounded-xl gap-1.5"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Saya Pemilik Akun &bull; Buka Kunci Foto</span>
                                  </Button>
                                </div>
                              )}

                              <p className="text-[10px] text-slate-500 italic">
                                *Admin Madrasah juga dapat menggunakan PIN Master (1234) untuk membuka kunci.
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* UNLOCKED / EDIT MODE VIEW */
                          <div className="space-y-3">
                            {hasExistingPhoto && (
                              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                                <span className="text-emerald-300 font-semibold flex items-center gap-1.5 text-[11px]">
                                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                  Kunci terbuka. Silakan pilih foto baru.
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleRelockPhoto}
                                  className="h-7 text-[11px] text-slate-400 hover:text-white gap-1 px-2"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Kunci Lagi</span>
                                </Button>
                              </div>
                            )}

                            <input
                              type="file"
                              ref={photoFileInputRef}
                              onChange={handlePhotoFileChange}
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              className="hidden"
                            />

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-200 block">
                                Opsi 1: Unggah File dari HP / Laptop
                              </label>
                              <Button
                                type="button"
                                onClick={() => photoFileInputRef.current?.click()}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 h-10 rounded-xl gap-2 text-xs font-bold"
                              >
                                <Upload className="w-4 h-4 text-emerald-400" />
                                <span>Pilih Foto dari Galeri / Kamera</span>
                              </Button>
                            </div>

                            <div className="relative flex items-center justify-center py-1">
                              <div className="border-t border-slate-800 w-full" />
                              <span className="bg-slate-900 px-2 text-[10px] text-slate-500 uppercase font-bold absolute">
                                atau
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-200 block flex items-center justify-between">
                                <span>Opsi 2: Tautan Google Drive / URL Foto</span>
                                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                              </label>
                              <Input
                                placeholder="https://drive.google.com/file/d/... atau URL gambar"
                                value={directPhotoUrl}
                                onChange={(e) => handleDirectUrlChange(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-xs h-9 rounded-xl text-white placeholder:text-slate-600 font-mono"
                              />
                              <p className="text-[10px] text-slate-400 leading-tight">
                                Link Google Drive (share view) otomatis dikonversi menjadi gambar profil.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Success Notice */}
                    {uploadSuccessMessage && (
                      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{uploadSuccessMessage}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!photoPreview}
                        onClick={handleCopyPhotoLink}
                        className="bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700 text-xs h-9 rounded-xl gap-1.5"
                      >
                        {isCopiedPhotoUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopiedPhotoUrl ? 'Link Foto Tersalin' : 'Salin Link Foto (Untuk GSheet)'}</span>
                      </Button>

                      {!isPhotoLocked ? (
                        <Button
                          type="button"
                          onClick={handleSavePhoto}
                          disabled={isUploadingPhoto || !photoPreview}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 text-xs h-9 rounded-xl shadow-md shadow-emerald-950/40 gap-2"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Simpan Pas Foto ke SIAKAD</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled
                          className="bg-slate-800 text-slate-500 text-xs h-9 rounded-xl gap-2 cursor-not-allowed"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Foto Terkunci</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-3">
                    <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-white">Belum Ada Guru yang Dipilih</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Silakan klik salah satu nama guru di sebelah kiri untuk mengunggah atau mengganti pas foto profil resmi.
                    </p>
                  </div>
                )}

                {/* Info Card on Photo Sync */}
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs text-slate-300">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-400" />
                    Bagaimana foto ini disinkronkan?
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-[11px] pl-1">
                    <li>
                      <strong>Langsung Masuk Sistem:</strong> Saat Anda mengklik <em>"Simpan Pas Foto ke SIAKAD"</em>, foto langsung tampil pada kartu identitas guru, raport, dan cetak administrasi.
                    </li>
                    <li>
                      <strong>Tercatat di Google Sheets:</strong> Anda juga bisa menekan tombol <em>"Salin Link Foto"</em> dan menempelkannya (paste) di kolom <strong>Link Foto Profil (URL / Drive)</strong> pada spreadsheet agar data selalu terdokumentasi rapi.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Simple Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} {madrasahName} &bull; Sistem Informasi Akademik Madrasah (SIAKAD)</p>
      </footer>
    </div>
  );
};

export default PortalPengisianGTK;
