"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Settings, Globe, User, Sparkles, BookOpen, Plus, Trash2, Palette, Music, Calculator, Heart, Upload, X, ImageIcon, Loader2, UserCircle, Share2, Search, LayoutGrid, Smartphone, KeyRound, AlertCircle, Megaphone, ExternalLink, Copy, History, Check, Clock, Bookmark, Play, MapPin, RotateCcw, Zap, RefreshCw, CheckCircle2, AlertTriangle, Code, Edit, Pencil, Award, GraduationCap, School, Eye, EyeOff, Layers, Sparkle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { compressImage, uploadImageToStorage, convertBase64ToPublicUrl, formatImageUrl } from '@/utils/imageCompression';
import { UpdatePasswordCard } from '@/components/admin/UpdatePasswordCard';
import PrintSecurityManager from '@/components/admin/PrintSecurityManager';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import { PageLoaderPreviewModal } from '@/components/PageLoaderPreviewModal';
import { AnnouncementIcon, ANNOUNCEMENT_ICONS } from '@/components/AnnouncementIcon';
import { appendVersionToAssetUrl, DEFAULT_OG_IMAGE_PATH, DEFAULT_SITE_URL, DEFAULT_SITE_URL_WITH_SLASH, normalizeSiteUrl, SEO_SHARE_IMAGE_STORAGE_PATH, stripVersionFromAssetUrl } from '@/config/site';
import { getGoogleMapEmbedUrl } from '@/components/Contact';
import HeroTypewriterTitle from '@/components/HeroTypewriterTitle';
import HeaderTitleAnimation, { FONT_STYLE_OPTIONS } from '@/components/HeaderTitleAnimation';
import { formatFullNameWithTitles } from '@/utils/formatGelar';

const availableIcons = [
  { value: 'Home', label: 'Beranda (Home)' },
  { value: 'Brain', label: 'Modul Ajar KBC (Brain)' },
  { value: 'Link', label: 'Tautan (Link)' },
  { value: 'Users', label: 'SPMB / Pengguna (Users)' },
  { value: 'UserCircle', label: 'Admin / Profil (UserCircle)' },
  { value: 'BookOpen', label: 'Buku / Program (BookOpen)' },
  { value: 'Sparkles', label: 'Fitur / Kilau (Sparkles)' },
  { value: 'Calendar', label: 'Jadwal (Calendar)' },
  { value: 'Phone', label: 'Telepon (Phone)' },
  { value: 'Mail', label: 'Email / Pesan (Mail)' },
  { value: 'Info', label: 'Informasi (Info)' },
  { value: 'FileText', label: 'Dokumen (FileText)' },
  { value: 'Award', label: 'Prestasi (Award)' },
  { value: 'Image', label: 'Galeri (Image)' },
  { value: 'Compass', label: 'Jelajah (Compass)' },
  { value: 'Heart', label: 'Favorit (Heart)' },
  { value: 'Globe', label: 'Situs / Publik (Globe)' },
  { value: 'ShoppingBag', label: 'Toko (ShoppingBag)' },
  { value: 'HelpCircle', label: 'Bantuan (HelpCircle)' },
  { value: 'MessageSquare', label: 'Obrolan (MessageSquare)' },
  { value: 'Star', label: 'Bintang (Star)' },
  { value: 'Shield', label: 'Keamanan (Shield)' },
];

interface TitleGroup {
  title: string;
  subtitle: string;
  urls: string[];
}

interface SlideListEditorProps {
  label: string;
  description: string;
  rawImages: any[];
  defaultTitle: string;
  defaultSubtitle: string;
  uploadType: 'hero_gallery' | 'about';
  onUpdate: (newItems: TitleGroup[]) => void;
}

const detectImageMimeType = (value?: string, fallback = 'image/jpeg') => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('.png')) return 'image/png';
  if (normalized.includes('.webp')) return 'image/webp';
  if (normalized.includes('.gif')) return 'image/gif';
  if (normalized.includes('.svg')) return 'image/svg+xml';
  return fallback;
};

const uploadSeoImageToStableStorage = async (file: File) => {
  const compressedFile = await compressImage(file);
  const targetBlob: Blob = compressedFile || file;
  const targetMimeType = targetBlob.type || file.type || detectImageMimeType(file.name);

  const { error } = await supabase.storage.from('public').upload(SEO_SHARE_IMAGE_STORAGE_PATH, targetBlob, {
    cacheControl: '0',
    upsert: true,
    contentType: targetMimeType,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('public').getPublicUrl(SEO_SHARE_IMAGE_STORAGE_PATH);
  if (!data?.publicUrl) {
    throw new Error('URL publik gambar SEO tidak tersedia');
  }

  return {
    publicUrl: data.publicUrl,
    imageType: targetMimeType,
  };
};

const parseRawToGroups = (rawImages: any[], defaultTitle: string, defaultSubtitle: string): TitleGroup[] => {
  if (!Array.isArray(rawImages) || rawImages.length === 0) {
    return [{ title: defaultTitle, subtitle: defaultSubtitle, urls: [] }];
  }

  const groups: TitleGroup[] = [];

  rawImages.forEach((item) => {
    if (!item) return;

    if (typeof item === 'string') {
      if (item.trim()) {
        groups.push({
          title: defaultTitle,
          subtitle: defaultSubtitle,
          urls: [item.trim()]
        });
      }
    } else if (typeof item === 'object') {
      const title = item.title !== undefined && item.title !== null ? item.title : defaultTitle;
      const subtitle = item.subtitle !== undefined && item.subtitle !== null ? item.subtitle : defaultSubtitle;
      let urls: string[] = [];

      if (Array.isArray(item.urls)) {
        urls = item.urls.filter((u: any) => typeof u === 'string' && u.trim());
      } else if (Array.isArray(item.images)) {
        urls = item.images.filter((u: any) => typeof u === 'string' && u.trim());
      } else if (typeof item.url === 'string' && item.url.trim()) {
        urls = [item.url.trim()];
      }

      groups.push({ title, subtitle, urls });
    }
  });

  if (groups.length === 0) {
    groups.push({ title: defaultTitle, subtitle: defaultSubtitle, urls: [] });
  }

  return groups;
};

const SlideListEditor: React.FC<SlideListEditorProps> = ({
  label,
  description,
  rawImages = [],
  defaultTitle,
  defaultSubtitle,
  uploadType,
  onUpdate
}) => {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [urlInputs, setUrlInputs] = useState<{ [key: number]: string }>({});
  const [activeMediaModalGroup, setActiveMediaModalGroup] = useState<number | null>(null);

  const groups = React.useMemo(() => {
    return parseRawToGroups(rawImages, defaultTitle, defaultSubtitle);
  }, [rawImages, defaultTitle, defaultSubtitle]);

  const handleUpdateGroups = (nextGroups: TitleGroup[]) => {
    onUpdate(nextGroups);
  };

  const handleFieldChange = (idx: number, field: 'title' | 'subtitle', value: string) => {
    const next = groups.map((g, i) => i === idx ? { ...g, [field]: value } : g);
    handleUpdateGroups(next);
  };

  const handleRemoveGroup = (idx: number) => {
    const next = groups.filter((_, i) => i !== idx);
    handleUpdateGroups(next.length > 0 ? next : [{ title: defaultTitle, subtitle: defaultSubtitle, urls: [] }]);
  };

  const handleAddGroup = () => {
    const next = [...groups, { title: `${defaultTitle} #${groups.length + 1}`, subtitle: defaultSubtitle, urls: [] }];
    handleUpdateGroups(next);
  };

  const handleRemovePhoto = (groupIdx: number, photoIdx: number) => {
    const next = groups.map((g, i) => {
      if (i === groupIdx) {
        return { ...g, urls: g.urls.filter((_, p) => p !== photoIdx) };
      }
      return g;
    });
    handleUpdateGroups(next);
  };

  const handleAddPhotoUrl = (groupIdx: number, newUrl?: string) => {
    const inputUrl = (newUrl || urlInputs[groupIdx] || '').trim();
    if (!inputUrl) return;

    const next = groups.map((g, i) => {
      if (i === groupIdx) {
        return { ...g, urls: [...g.urls, inputUrl] };
      }
      return g;
    });
    handleUpdateGroups(next);
    if (!newUrl) {
      setUrlInputs({ ...urlInputs, [groupIdx]: '' });
    }
  };

  const handleFileUploadForGroup = async (e: React.ChangeEvent<HTMLInputElement>, groupIdx: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingIndex(groupIdx);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = await uploadImageToStorage(file, 'settings');
        if (imageUrl) {
          uploadedUrls.push(imageUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        const next = groups.map((g, i) => {
          if (i === groupIdx) {
            return { ...g, urls: [...g.urls, ...uploadedUrls] };
          }
          return g;
        });
        handleUpdateGroups(next);
      }
      showSuccess(`Berhasil mengunggah ${uploadedUrls.length} foto kegiatan!`);
    } catch (err) {
      console.error("Upload error:", err);
      showError("Gagal mengunggah foto. Silakan coba lagi.");
    } finally {
      setUploadingIndex(null);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <div>
        <label className="block text-sm font-bold text-slate-800">{label}</label>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <div className="space-y-4">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                Kelompok Judul #{gIdx + 1}
              </span>
              {groups.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 text-xs h-8"
                  onClick={() => handleRemoveGroup(gIdx)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Kelompok Judul
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Badge / Kegiatan</label>
                <Input
                  value={group.title}
                  onChange={(e) => handleFieldChange(gIdx, 'title', e.target.value)}
                  placeholder={`misal: ${defaultTitle}`}
                  className="bg-white rounded-xl text-xs h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subjudul / Keterangan Badge</label>
                <Input
                  value={group.subtitle}
                  onChange={(e) => handleFieldChange(gIdx, 'subtitle', e.target.value)}
                  placeholder={`misal: ${defaultSubtitle}`}
                  className="bg-white rounded-xl text-xs h-9"
                />
              </div>
            </div>

            {/* Multiple Photos Upload Section */}
            <div className="pt-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" /> Foto Kegiatan untuk "{group.title || `Judul #${gIdx + 1}`}" ({group.urls.length} foto)
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveMediaModalGroup(gIdx)}
                  className="h-8 text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Pilih dari Foto Tersimpan
                </Button>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 mb-3">
                {group.urls.map((url, pIdx) => (
                  <div key={pIdx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-300 group bg-slate-200">
                    <img 
                      src={url} 
                      alt={`Foto ${pIdx + 1}`} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/og-cover.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 w-7 p-0 rounded-full"
                        onClick={() => handleRemovePhoto(gIdx, pIdx)}
                        title="Hapus foto ini"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                      #{pIdx + 1}
                    </span>
                  </div>
                ))}

                {/* Upload Button */}
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/60 rounded-xl cursor-pointer transition-colors p-2 text-center group">
                  {uploadingIndex === gIdx ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  ) : (
                    <Plus className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] font-bold text-emerald-800 mt-1">
                    {uploadingIndex === gIdx ? 'Mengunggah...' : '+ Unggah Foto Baru'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUploadForGroup(e, gIdx)}
                    disabled={uploadingIndex !== null}
                  />
                </label>
              </div>

              {/* Paste Photo URL */}
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Atau tempel URL foto kegiatan di sini..."
                  value={urlInputs[gIdx] || ''}
                  onChange={(e) => setUrlInputs({ ...urlInputs, [gIdx]: e.target.value })}
                  className="bg-white text-xs h-8 rounded-lg flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 shrink-0 px-3"
                  onClick={() => handleAddPhotoUrl(gIdx)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah URL
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddGroup}
        className="w-full bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 rounded-xl py-2.5 text-xs font-bold transition-colors"
      >
        <Plus className="w-4 h-4 mr-1.5 text-emerald-600" /> Tambah Kelompok Judul Kegiatan Baru
      </Button>

      {/* Media Library Modal for choosing existing photo for this group */}
      <MediaLibraryModal
        isOpen={activeMediaModalGroup !== null}
        onClose={() => setActiveMediaModalGroup(null)}
        onSelectImage={(url) => {
          if (activeMediaModalGroup !== null) {
            handleAddPhotoUrl(activeMediaModalGroup, url);
          }
        }}
        title={`Pilih Foto Tersimpan untuk ${groups[activeMediaModalGroup ?? 0]?.title || 'Kegiatan'}`}
      />
    </div>
  );
};

const iconOptions = [
  { value: 'BookOpen', label: 'Buku', icon: BookOpen },
  { value: 'Palette', label: 'Seni', icon: Palette },
  { value: 'Music', label: 'Musik', icon: Music },
  { value: 'Globe', label: 'Global', icon: Globe },
  { value: 'Calculator', label: 'Matematika', icon: Calculator },
  { value: 'Heart', label: 'Karakter', icon: Heart },
];

const colorOptions = [
  { value: 'bg-emerald-500', label: 'Hijau' },
  { value: 'bg-blue-500', label: 'Biru' },
  { value: 'bg-purple-500', label: 'Ungu' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-orange-500', label: 'Oranye' },
  { value: 'bg-red-500', label: 'Merah' },
];

const SettingsAdmin = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const targetFromUrl = searchParams.get('target');
  const { settings = {}, refreshSettings } = useSiteSettings();
  const identitas = settings?.identitas_madrasah || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'general');
  const [heroBgImgError, setHeroBgImgError] = useState(false);
  const [seoImgError, setSeoImgError] = useState(false);
  const [mediaModalTarget, setMediaModalTarget] = useState<'hero_bg' | 'seo' | 'page_loader_portal_logo' | 'page_loader_rg_logo' | null>(null);
  
  // Page Loader Sub-tab: 'portal' (Si@Kad Publik) vs 'ruang_guru' (Ruang Kerja Guru)
  const [loaderSubTab, setLoaderSubTab] = useState<'portal' | 'ruang_guru'>(
    targetFromUrl === 'ruang_guru' ? 'ruang_guru' : 'portal'
  );

  // Page Loader State with separate portal & ruang_guru configurations
  const [pageLoader, setPageLoader] = useState({
    portal: {
      enabled: true,
      title: 'Si@Kad Madrasah',
      subtitle: 'Sistem Informasi Akademik Madrasah',
      tagline: 'Membangun Generasi Unggul Berkarakter Qur\'ani',
      loader_style: 'islamic_emerald', // 'islamic_emerald' | 'academic_dark' | 'glassmorphism' | 'modern_light' | 'minimalist'
      animation_type: 'bounce', // 'bounce' | 'pulse' | 'spin' | 'orbit' | 'float'
      icon_type: 'logo', // 'logo' | 'graduation' | 'book' | 'sparkles' | 'school' | 'award'
      custom_logo_url: '',
      logo_shape: 'circle', // 'circle' | 'rounded' | 'soft_vignette'
      logo_zoom: 130, // 100 to 200
      logo_fit: 'cover', // 'cover' | 'contain'
      bg_theme: 'emerald_dark', // 'emerald_dark' | 'slate_dark' | 'blue_dark' | 'gradient_mesh' | 'light'
      show_progress_bar: true,
      progress_duration: 1000,
    },
    ruang_guru: {
      enabled: true,
      title: 'Ruang Kerja Guru & Pendidik',
      subtitle: 'Menyiapkan Portal & Administrasi GTK...',
      tagline: 'Akses Mandiri Pendidik & Tenaga Kependidikan',
      loader_style: 'islamic_emerald',
      animation_type: 'bounce',
      icon_type: 'graduation',
      custom_logo_url: '',
      logo_shape: 'circle',
      logo_zoom: 130,
      logo_fit: 'cover',
      bg_theme: 'emerald_dark',
      show_progress_bar: true,
      progress_duration: 800,
    }
  });
  const [isPreviewLoaderOpen, setIsPreviewLoaderOpen] = useState(false);

  // If query param changes, sync active tab and sub-tab
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    if (targetFromUrl === 'ruang_guru' || targetFromUrl === 'portal') {
      setLoaderSubTab(targetFromUrl as 'portal' | 'ruang_guru');
    }
  }, [tabFromUrl, targetFromUrl]);
  
  const [general, setGeneral] = useState({
    app_name: 'Si@Kad Madrasah',
    school_name: 'Si@Kad',
    header_part1: 'Si@Kad',
    header_part1_color: '#0f172a',
    header_part1_font: 'sans-black',
    header_part2: 'Madrasah',
    header_part2_color: '#059669',
    header_part2_font: 'serif-bold',
    tagline: "Sistem Informasi Akademik Modern",
    address: '',
    phone: '',
    email: '',
    operational_hours: '',
    headmaster_name: '',
    headmaster_title: 'Kepala Madrasah',
    maps_latitude: '-7.517606',
    maps_longitude: '109.132984',
    maps_zoom: '16',
    maps_embed_url: ''
  });

  const [seo, setSeo] = useState({
    title: '',
    description: '',
    website_url: '',
    image_url: '',
    og_image_type: '',
    og_image_updated_at: '',
    og_title: '',
    og_description: '',
    og_image_url: '',
    twitter_title: '',
    twitter_description: '',
    twitter_site: '',
    twitter_creator: ''
  });

  const [hero, setHero] = useState({
    background_image: '',
    right_image: '',
    badge_text: 'Eksklusif & Modern',
    heading_line1: 'Si@Kad',
    heading_line1_color: '#0f172a',
    heading_line1_font: 'sans-black',
    heading_line2: 'Madrasah',
    heading_line2_color: 'gradient-emerald',
    heading_line2_font: 'serif-italic',
    description: '',
    cta_primary: 'Daftar Sekarang',
    cta_secondary: 'Lihat Profil',
    stats_students: '0',
    stats_achievements: '0',
    stats_teachers: '0',
    stats_years: '0',
  });

  const [about, setAbout] = useState({
    title: "",
    description: '',
    images: [] as string[],
    experience_years: '',
    features: [
      { title: 'Kurikulum Terintegrasi', desc: '' },
      { title: 'Pendidikan Karakter', desc: '' },
      { title: 'Guru Profesional', desc: '' }
    ]
  });

  const [programs, setPrograms] = useState({
    list: [] as any[]
  });

  const [footer, setFooter] = useState({
    quick_links: [
      { name: 'Beranda', href: '#home' },
      { name: 'Tentang Kami', href: '#about' },
      { name: 'Program', href: '#programs' },
      { name: 'Galeri', href: '#gallery' },
      { name: 'Kontak', href: '#contact' },
    ],
    programs_links: [
      { name: 'Tahfidz Al-Quran', href: '#programs' },
      { name: 'Bahasa Arab', href: '#programs' },
      { name: 'Matematika Islam', href: '#programs' },
      { name: 'Seni Kaligrafi', href: '#programs' },
    ],
    facebook: '#',
    instagram: '#',
    youtube: '#',
    twitter: '#',
    copyright_text: '',
    developer_name: 'Jaenal Maskun, S.Pd.I'
  });

  const [stickyFooter, setStickyFooter] = useState({
    items: [
      { icon_name: 'Home', label: 'Beranda', path: '/' },
      { icon_name: 'Brain', label: 'Modul Ajar KBC', path: '/ai-teaching' },
      { icon_name: 'Link', label: 'Tautan', path: '/links' },
      { icon_name: 'Users', label: 'SPMB', path: '/spmb' },
      { icon_name: 'UserCircle', label: 'Admin', path: '/login' },
    ]
  });

  const [runningText, setRunningText] = useState({
    enabled: true,
    text: 'Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Tahun Pelajaran 2025/2026 Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.',
    direction: 'right_to_left',
    speed: 'normal',
    badge: 'INFORMASI MADRASAH',
    bg_color: 'emerald',
    link_url: '',
    link_label: 'Lihat Detail',
    show_close_button: true,
    archive: [] as Array<{
      id: string;
      text: string;
      badge?: string;
      direction?: string;
      speed?: string;
      bg_color?: string;
      link_url?: string;
      link_label?: string;
      created_at: string;
    }>
  });
  const [archiveSearch, setArchiveSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isRunningTextModalOpen, setIsRunningTextModalOpen] = useState(false);
  const [editingRunningTextId, setEditingRunningTextId] = useState<string | null>(null);
  const [modalRunningTextForm, setModalRunningTextForm] = useState({
    text: '',
    badge: 'INFORMASI MADRASAH',
    icon: 'megaphone',
    direction: 'right_to_left',
    speed: 'normal',
    bg_color: 'emerald',
    link_url: '',
    link_label: 'Lihat Detail',
    setActiveNow: true
  });

  const handleOpenAddRunningTextModal = () => {
    setEditingRunningTextId(null);
    setModalRunningTextForm({
      text: '',
      badge: 'INFORMASI MADRASAH',
      icon: 'megaphone',
      direction: 'right_to_left',
      speed: 'normal',
      bg_color: 'emerald',
      link_url: '',
      link_label: 'Lihat Detail',
      setActiveNow: true
    });
    setIsRunningTextModalOpen(true);
  };

  const handleOpenEditRunningTextModal = (item: any) => {
    setEditingRunningTextId(item.id);
    setModalRunningTextForm({
      text: item.text || '',
      badge: item.badge || 'INFORMASI MADRASAH',
      icon: item.icon || 'megaphone',
      direction: item.direction || 'right_to_left',
      speed: item.speed || 'normal',
      bg_color: item.bg_color || 'emerald',
      link_url: item.link_url || '',
      link_label: item.link_label || 'Lihat Detail',
      setActiveNow: runningText.text === item.text && runningText.enabled
    });
    setIsRunningTextModalOpen(true);
  };

  const handleSaveModalRunningText = () => {
    if (!modalRunningTextForm.text.trim()) {
      showError('Teks running text wajib diisi');
      return;
    }

    const currentArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
    let updatedArchive = [...currentArchive];

    if (editingRunningTextId) {
      updatedArchive = updatedArchive.map(item => {
        if (item.id === editingRunningTextId) {
          return {
            ...item,
            text: modalRunningTextForm.text.trim(),
            badge: modalRunningTextForm.badge || 'INFORMASI MADRASAH',
            icon: modalRunningTextForm.icon || 'megaphone',
            direction: modalRunningTextForm.direction || 'right_to_left',
            speed: modalRunningTextForm.speed || 'normal',
            bg_color: modalRunningTextForm.bg_color || 'emerald',
            link_url: modalRunningTextForm.link_url || '',
            link_label: modalRunningTextForm.link_label || 'Lihat Detail',
          };
        }
        return item;
      });
    } else {
      const newItem = {
        id: Date.now().toString(),
        text: modalRunningTextForm.text.trim(),
        badge: modalRunningTextForm.badge || 'INFORMASI MADRASAH',
        icon: modalRunningTextForm.icon || 'megaphone',
        direction: modalRunningTextForm.direction || 'right_to_left',
        speed: modalRunningTextForm.speed || 'normal',
        bg_color: modalRunningTextForm.bg_color || 'emerald',
        link_url: modalRunningTextForm.link_url || '',
        link_label: modalRunningTextForm.link_label || 'Lihat Detail',
        created_at: new Date().toISOString()
      };
      updatedArchive.unshift(newItem);
    }

    let updatedRunningText = {
      ...runningText,
      archive: updatedArchive
    };

    if (modalRunningTextForm.setActiveNow) {
      updatedRunningText = {
        ...updatedRunningText,
        enabled: true,
        text: modalRunningTextForm.text.trim(),
        badge: modalRunningTextForm.badge || 'INFORMASI MADRASAH',
        icon: modalRunningTextForm.icon || 'megaphone',
        direction: modalRunningTextForm.direction || 'right_to_left',
        speed: modalRunningTextForm.speed || 'normal',
        bg_color: modalRunningTextForm.bg_color || 'emerald',
        link_url: modalRunningTextForm.link_url || '',
        link_label: modalRunningTextForm.link_label || 'Lihat Detail'
      };
    }

    setRunningText(updatedRunningText);
    handleSave('running_text', updatedRunningText);
    setIsRunningTextModalOpen(false);
    showSuccess(editingRunningTextId ? 'Running text berhasil diperbarui!' : 'Running text baru berhasil ditambahkan!');
  };

  const handleToggleActivateItem = (item: any) => {
    const currentArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
    
    const isCurrentlyActive = typeof item.is_active === 'boolean' 
      ? item.is_active 
      : (runningText.text === item.text && runningText.enabled);

    const updatedArchive = currentArchive.map(arch => {
      const isTarget = arch.id === item.id || (arch.text === item.text && arch.created_at === item.created_at);
      if (isTarget) {
        return {
          ...arch,
          is_active: !isCurrentlyActive
        };
      }
      return arch;
    });

    const activeCount = updatedArchive.filter(arch => arch.is_active === true).length;
    const firstActive = updatedArchive.find(arch => arch.is_active === true) || item;

    const updatedRunningText = {
      ...runningText,
      enabled: activeCount > 0 ? true : runningText.enabled,
      archive: updatedArchive,
      text: firstActive.text,
      badge: firstActive.badge || 'INFORMASI MADRASAH',
      icon: firstActive.icon || 'megaphone',
      direction: firstActive.direction || 'right_to_left',
      speed: firstActive.speed || 'normal',
      bg_color: firstActive.bg_color || 'emerald',
      link_url: firstActive.link_url || '',
      link_label: firstActive.link_label || 'Lihat Detail'
    };

    setRunningText(updatedRunningText);
    handleSave('running_text', updatedRunningText);
    showSuccess(!isCurrentlyActive ? 'Running text berhasil diaktifkan!' : 'Running text berhasil dinonaktifkan.');
  };

  const handleActivateAllRunningTexts = () => {
    const currentArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
    if (currentArchive.length === 0) return;

    const updatedArchive = currentArchive.map(item => ({ ...item, is_active: true }));
    const firstActive = updatedArchive[0];

    const updatedRunningText = {
      ...runningText,
      enabled: true,
      archive: updatedArchive,
      text: firstActive.text,
      badge: firstActive.badge || 'INFORMASI MADRASAH'
    };

    setRunningText(updatedRunningText);
    handleSave('running_text', updatedRunningText);
    showSuccess('Semua running text berhasil diaktifkan!');
  };

  const handleDeactivateAllRunningTexts = () => {
    const currentArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
    if (currentArchive.length === 0) return;

    const updatedArchive = currentArchive.map(item => ({ ...item, is_active: false }));

    const updatedRunningText = {
      ...runningText,
      enabled: false,
      archive: updatedArchive
    };

    setRunningText(updatedRunningText);
    handleSave('running_text', updatedRunningText);
    showSuccess('Semua running text berhasil dinonaktifkan.');
  };

  const handleApplyArchiveItem = (item: any) => {
    setRunningText(prev => ({
      ...prev,
      text: item.text || prev.text,
      badge: item.badge || prev.badge,
      direction: item.direction || prev.direction,
      speed: item.speed || prev.speed,
      bg_color: item.bg_color || prev.bg_color,
      link_url: item.link_url || '',
      link_label: item.link_label || 'Lihat Detail',
    }));
    showSuccess('Pesan dari arsip berhasil diterapkan ke form!');
  };

  const handleAddCurrentToArchive = () => {
    if (!runningText.text?.trim()) {
      showError('Teks pengumuman tidak boleh kosong');
      return;
    }
    const currentArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
    const newItem = {
      id: Date.now().toString(),
      text: runningText.text.trim(),
      badge: runningText.badge || 'INFORMASI MADRASAH',
      direction: runningText.direction || 'right_to_left',
      speed: runningText.speed || 'normal',
      bg_color: runningText.bg_color || 'emerald',
      link_url: runningText.link_url || '',
      link_label: runningText.link_label || 'Lihat Detail',
      created_at: new Date().toISOString()
    };
    const updatedArchive = [newItem, ...currentArchive.filter(i => i.text.trim() !== newItem.text.trim())];
    const updated = { ...runningText, archive: updatedArchive };
    setRunningText(updated);
    handleSave('running_text', updated);
    showSuccess('Running text berhasil ditambahkan ke arsip!');
  };

  const handleDeleteArchiveItem = (id: string) => {
    const currentArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
    const updatedArchive = currentArchive.filter(item => item.id !== id);
    const updated = { ...runningText, archive: updatedArchive };
    setRunningText(updated);
    handleSave('running_text', updated);
    showSuccess('Item berhasil dihapus dari arsip!');
  };

  const handleCopyArchiveText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showSuccess('Teks berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [showHtaccessHelp, setShowHtaccessHelp] = useState(false);

  const handleAutoFixOpenGraph = async () => {
    setSaving(true);
    try {
      const currentOrigin = typeof window !== 'undefined' && window.location?.origin 
        ? window.location.origin.replace(/\/+$/, '') 
        : DEFAULT_SITE_URL;
      
      const activeSiteUrl = (seo.website_url && !seo.website_url.includes('edgeone.dev'))
        ? normalizeSiteUrl(seo.website_url)
        : currentOrigin;

      const timestamp = Date.now().toString();

      let cleanImage = seo.image_url || seo.og_image_url || '';
      const cleanLower = cleanImage.toLowerCase();
      if (!cleanImage || 
          cleanLower.includes('catbox.moe') || 
          cleanLower.includes('tmpfiles.org') || 
          cleanLower.includes('litter.catbox')) {
        cleanImage = DEFAULT_OG_IMAGE_PATH;
      }

      const cleanTitle = seo.title?.trim() || general.school_name || 'Si@Kad Madrasah';
      const cleanDesc = (seo.description || general.tagline || "Sistem Informasi Akademik Modern Membangun Generasi Qur'ani").replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();

      const updatedSeo = {
        ...seo,
        title: cleanTitle,
        description: cleanDesc,
        website_url: activeSiteUrl,
        image_url: cleanImage,
        og_title: seo.og_title?.trim() || cleanTitle,
        og_description: (seo.og_description || cleanDesc).replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim(),
        og_image_url: cleanImage,
        og_image_type: cleanImage.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        og_image_updated_at: timestamp,
      };

      setSeo(updatedSeo);
      await handleSave('seo', updatedSeo);

      const testUrl = `${activeSiteUrl}/?v=${timestamp.slice(-5)}`;
      try {
        await navigator.clipboard.writeText(testUrl);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }

      showSuccess(`⚡ FITUR PAMUNGKAS BERHASIL!\nMeta tag OpenGraph telah diperbarui & di-reset.\nLink Pengujian WA disalin ke clipboard:\n${testUrl}`);
    } catch (err: any) {
      showError('Gagal perbaikan OpenGraph: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (settings.general) setGeneral(prev => ({ ...prev, ...settings.general }));
      if (settings.seo) {
        const s = { ...settings.seo };
        let img = s.image_url || s.og_image_url || '';
        if (img.includes('tmpfiles.org')) {
          img = '';
        }
        s.image_url = img;
        s.og_image_url = img;
        s.og_image_type = s.og_image_type || detectImageMimeType(img, '');
        s.og_image_updated_at = s.og_image_updated_at || '';
        setSeo(prev => ({ ...prev, ...s }));
      }
      if (settings.hero) {
        const h = { ...settings.hero };
        if (!h.heading_line1 || h.heading_line1.includes('Membangun Generasi')) {
          h.heading_line1 = 'Si@Kad';
        }
        if (!h.heading_line2 || h.heading_line2.includes("Qur'ani")) {
          h.heading_line2 = 'Madrasah';
        }
        setHero(prev => ({ ...prev, ...h }));
      }
      if (settings.about) {
        const val = settings.about;
        setAbout(prev => ({ 
          ...prev, 
          ...val, 
          images: val.images || (val.image_url ? [val.image_url] : []) 
        }));
      }
      if (settings.programs) setPrograms(prev => ({ ...prev, ...settings.programs }));
      if (settings.footer) setFooter(prev => ({ ...prev, ...settings.footer }));
      if (settings.sticky_footer) {
        const sf = { ...settings.sticky_footer };
        if (Array.isArray(sf.items)) {
          sf.items = sf.items.map((it: any) => {
            if (it.label === 'AI Teach' || it.label === 'AI Teaching') {
              return { ...it, label: 'Modul Ajar KBC' };
            }
            return it;
          });
        }
        setStickyFooter(sf);
      }
      if (settings.running_text) {
        setRunningText(prev => ({
          ...prev,
          ...settings.running_text,
          archive: Array.isArray(settings.running_text.archive) 
            ? settings.running_text.archive 
            : (prev.archive || [])
        }));
      }
      if (settings.page_loader) {
        setPageLoader(prev => {
          const raw = settings.page_loader;
          if (raw.portal || raw.ruang_guru) {
            return {
              portal: { ...prev.portal, ...(raw.portal || {}) },
              ruang_guru: { ...prev.ruang_guru, ...(raw.ruang_guru || {}) },
            };
          }
          return {
            portal: {
              ...prev.portal,
              enabled: raw.show_for_portal !== false && raw.enabled !== false,
              title: raw.title || prev.portal.title,
              subtitle: raw.subtitle || prev.portal.subtitle,
              tagline: raw.tagline || prev.portal.tagline,
              loader_style: raw.loader_style || prev.portal.loader_style,
              animation_type: raw.animation_type || prev.portal.animation_type,
              icon_type: raw.icon_type || prev.portal.icon_type,
              custom_logo_url: raw.custom_logo_url || '',
              bg_theme: raw.bg_theme || prev.portal.bg_theme,
              show_progress_bar: raw.show_progress_bar !== false,
              progress_duration: raw.progress_duration || 1000,
            },
            ruang_guru: {
              ...prev.ruang_guru,
              enabled: raw.show_for_ruang_guru !== false && raw.enabled !== false,
              title: 'Ruang Kerja Guru & Pendidik',
              subtitle: 'Menyiapkan Portal & Administrasi GTK...',
              tagline: 'Akses Mandiri Pendidik & Tenaga Kependidikan',
              loader_style: raw.loader_style || 'islamic_emerald',
              animation_type: raw.animation_type || 'bounce',
              icon_type: 'graduation',
              custom_logo_url: raw.custom_logo_url || '',
              bg_theme: raw.bg_theme || 'emerald_dark',
              show_progress_bar: raw.show_progress_bar !== false,
              progress_duration: 800,
            }
          };
        });
      }
      setLoading(false);
    }
  }, [settings]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'hero_bg' | 'hero_right' | 'hero_gallery' | 'about' | 'seo') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(type);
    try {
      if (type === 'about') {
        const rawExisting = (Array.isArray(about.images) && about.images.length > 0)
          ? about.images.filter((item: any) => {
              const u = typeof item === 'string' ? item : item?.url;
              return u && !u.includes('unsplash.com');
            })
          : [];
        
        const existingFormatted = rawExisting.map((item: any) => 
          typeof item === 'string' 
            ? { url: item, title: about.image_title || 'Mengenal Madrasah', subtitle: about.image_subtitle || 'Unggul & Berakhlak' } 
            : item
        );

        const uploadedItems: any[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const finalUrl = await uploadImageToStorage(file, 'settings');
          uploadedItems.push({
            url: finalUrl,
            title: about.image_title || 'Mengenal Madrasah',
            subtitle: about.image_subtitle || 'Unggul & Berakhlak'
          });
        }

        const newImages = [...uploadedItems, ...existingFormatted];
        const updated = { ...about, images: newImages, image_url: uploadedItems[0]?.url || newImages[0]?.url || '' };
        setAbout(updated);
        await handleSave('about', updated);
      } else if (type === 'hero_gallery') {
        const rawExisting = (Array.isArray(hero.images) && hero.images.length > 0)
          ? hero.images.filter((item: any) => {
              const u = typeof item === 'string' ? item : item?.url;
              return u && !u.includes('unsplash.com');
            })
          : [];
        
        const existingFormatted = rawExisting.map((item: any) => 
          typeof item === 'string' 
            ? { url: item, title: hero.right_image_title || 'Pendidikan Berkarakter', subtitle: hero.right_image_subtitle || 'Terakreditasi & Berprestasi' } 
            : item
        );

        const uploadedItems: any[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const finalUrl = await uploadImageToStorage(file, 'settings');
          uploadedItems.push({
            url: finalUrl,
            title: hero.right_image_title || 'Pendidikan Berkarakter',
            subtitle: hero.right_image_subtitle || 'Terakreditasi & Berprestasi'
          });
        }

        const currentImages = [...uploadedItems, ...existingFormatted];
        const updated = { 
          ...hero, 
          images: currentImages, 
          right_image: uploadedItems[0]?.url || currentImages[0]?.url || '' 
        };
        setHero(updated);
        await handleSave('hero', updated);
      } else {
        const file = files[0];
        
        if (type === 'hero_bg') {
          const finalUrl = await uploadImageToStorage(file, 'settings');
          const updated = { ...hero, background_image: finalUrl };
          setHero(updated);
          await handleSave('hero', updated);
        } else if (type === 'hero_right') {
          const finalUrl = await uploadImageToStorage(file, 'settings');
          const rawExisting = (Array.isArray(hero.images) && hero.images.length > 0)
            ? hero.images.filter((item: any) => {
                const u = typeof item === 'string' ? item : item?.url;
                return u && !u.includes('unsplash.com');
              })
            : [];
          const newRightItem = {
            url: finalUrl,
            title: hero.right_image_title || 'Pendidikan Berkarakter',
            subtitle: hero.right_image_subtitle || 'Terakreditasi & Berprestasi'
          };
          const updated = { 
            ...hero, 
            right_image: finalUrl,
            images: [newRightItem, ...rawExisting]
          };
          setHero(updated);
          await handleSave('hero', updated);
        } else if (type === 'seo') {
          let publicUrl = '';
          let imageType = file.type || detectImageMimeType(file.name);

          try {
            const uploaded = await uploadSeoImageToStableStorage(file);
            publicUrl = uploaded.publicUrl;
            imageType = uploaded.imageType;
          } catch (stableUploadError) {
            console.warn('Stable SEO image upload gagal, fallback ke upload umum:', stableUploadError);
            publicUrl = await uploadImageToStorage(file, 'settings');
            if (publicUrl.startsWith('data:')) {
              publicUrl = await convertBase64ToPublicUrl(publicUrl);
            }
            imageType = detectImageMimeType(publicUrl, imageType);
          }

          const updatedAt = new Date().toISOString();
          setSeoImgError(false);
          const updated = {
            ...seo,
            image_url: stripVersionFromAssetUrl(publicUrl),
            og_image_url: stripVersionFromAssetUrl(publicUrl),
            og_image_type: imageType,
            og_image_updated_at: updatedAt,
          };
          setSeo(updated);
          await handleSave('seo', updated);
        }
      }

      showSuccess('Gambar berhasil diunggah!');
    } catch (error: any) {
      showError('Gagal mengunggah gambar.');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handlePageLoaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'portal' | 'ruang_guru') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const uploadKey = target === 'portal' ? 'page_loader_portal_logo' : 'page_loader_rg_logo';
    setUploading(uploadKey);
    try {
      const finalUrl = await uploadImageToStorage(file, 'settings');
      if (!finalUrl) throw new Error('Gagal mengunggah file gambar logo.');

      const updated = {
        ...pageLoader,
        [target]: {
          ...pageLoader[target],
          custom_logo_url: finalUrl,
          icon_type: 'logo' as const,
          logo_shape: (pageLoader[target] as any)?.logo_shape || 'circle',
          logo_zoom: (pageLoader[target] as any)?.logo_zoom || 130,
          logo_fit: (pageLoader[target] as any)?.logo_fit || 'cover',
        },
      };
      setPageLoader(updated);
      await handleSave('page_loader', updated);
      showSuccess(`Logo khusus untuk ${target === 'portal' ? 'Portal Si@Kad' : 'Ruang Kerja Guru'} berhasil diunggah!`);
    } catch (err: any) {
      console.error('Upload logo error:', err);
      showError('Gagal mengunggah logo khusus. Silakan coba lagi.');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const removeAboutImage = async (index: number) => {
    const newImages = (about.images || []).filter((_, i) => i !== index);
    const updated = { ...about, images: newImages };
    setAbout(updated);
    await handleSave('about', updated);
  };

  const removeHeroImage = async (index: number) => {
    const currentImages = (Array.isArray(hero.images) && hero.images.length > 0)
      ? [...hero.images]
      : (hero.right_image ? [hero.right_image] : []);
    const newImages = currentImages.filter((_, i) => i !== index);
    const updated = { ...hero, images: newImages, right_image: newImages[0] || '' };
    setHero(updated);
    await handleSave('hero', updated);
  };

  const handleSyncMetadata = async () => {
    setSaving(true);
    try {
      let imgUrl = seo?.image_url || seo?.og_image_url || identitas?.logo_url || '';
      if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:')) {
        imgUrl = await convertBase64ToPublicUrl(imgUrl);
      }
      imgUrl = stripVersionFromAssetUrl(imgUrl);
      const cleanDesc = (seo?.description || general?.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
      const updatedSeo = { 
        ...seo, 
        image_url: imgUrl, 
        og_image_url: imgUrl,
        og_image_type: seo?.og_image_type || detectImageMimeType(imgUrl, ''),
        og_image_updated_at: seo?.og_image_updated_at || (imgUrl ? new Date().toISOString() : ''),
        title: seo?.title || general?.school_name || 'Si@Kad Madrasah',
        description: cleanDesc || general?.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah',
        og_title: seo?.og_title || seo?.title || general?.school_name || 'Si@Kad Madrasah',
        og_description: (seo?.og_description || cleanDesc || general?.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah'),
        twitter_title: seo?.twitter_title || seo?.og_title || seo?.title || general?.school_name || 'Si@Kad Madrasah',
        twitter_description: (seo?.twitter_description || seo?.og_description || cleanDesc || general?.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah')
      };
      setSeo(updatedSeo);
      await handleSave('seo', updatedSeo);
    } catch (e) {
      showError('Gagal sinkronisasi metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (key: string, value: any) => {
    setSaving(true);
    try {
      let finalValue = value;
      if (key === 'general' && finalValue?.headmaster_name) {
        finalValue = {
          ...finalValue,
          headmaster_name: formatFullNameWithTitles(finalValue.headmaster_name)
        };
      }
      if (key === 'seo') {
        let imgUrl = finalValue?.image_url || finalValue?.og_image_url || '';
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:')) {
          const converted = await convertBase64ToPublicUrl(imgUrl);
          if (converted) imgUrl = converted;
        }
        if (imgUrl && typeof imgUrl === 'string' && !imgUrl.startsWith('data:')) {
          imgUrl = stripVersionFromAssetUrl(imgUrl);
        }

        const lowerImg = (imgUrl || '').toLowerCase();
        if (!imgUrl || lowerImg.includes('catbox.moe') || lowerImg.includes('tmpfiles.org') || lowerImg.includes('litter.catbox')) {
          imgUrl = DEFAULT_OG_IMAGE_PATH;
        }
        const cleanDesc = (finalValue?.description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
        const cleanOgDesc = (finalValue?.og_description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
        const cleanTwDesc = (finalValue?.twitter_description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
        const currentStoredImage = seo?.image_url || seo?.og_image_url || '';
        const nextImageVersion = imgUrl
          ? (finalValue?.og_image_updated_at || (imgUrl !== currentStoredImage ? new Date().toISOString() : seo?.og_image_updated_at || new Date().toISOString()))
          : '';
        const nextImageType = imgUrl ? (finalValue?.og_image_type || detectImageMimeType(imgUrl, 'image/jpeg')) : '';
        const versionedImgUrl = appendVersionToAssetUrl(imgUrl, nextImageVersion);

        finalValue = {
          ...finalValue,
          image_url: imgUrl,
          og_image_url: imgUrl,
          og_image_type: nextImageType,
          og_image_updated_at: nextImageVersion,
          description: cleanDesc,
          og_description: cleanOgDesc,
          twitter_description: cleanTwDesc
        };
        if (versionedImgUrl && typeof versionedImgUrl === 'string') {
          try {
            localStorage.setItem('siakad_og_image', versionedImgUrl);
          } catch (e) {
            console.warn('Unable to save siakad_og_image to localStorage:', e);
          }
        }

        // Real-time DOM Meta Sync for Social Media Crawlers
        try {
          const title = finalValue.title || general.school_name || 'Si@Kad Madrasah';
          const desc = finalValue.description || general.tagline || 'Sistem Informasi Akademik Modern';
          const ogTitle = finalValue.og_title || title;
          const ogDesc = finalValue.og_description || desc;
          const twitterTitle = finalValue.twitter_title || ogTitle || title;
          const twitterDesc = finalValue.twitter_description || ogDesc || desc;
          document.title = `${title} - ${desc}`;

          const updateMeta = (attr: string, keyName: string, val: string) => {
            let el = document.querySelector(`meta[${attr}="${keyName}"]`);
            if (!el) {
              el = document.createElement('meta');
              el.setAttribute(attr, keyName);
              document.head.appendChild(el);
            }
            el.setAttribute('content', val);
          };

          const updateLink = (rel: string, href: string) => {
            let el = document.querySelector(`link[rel="${rel}"]`);
            if (!el) {
              el = document.createElement('link');
              el.setAttribute('rel', rel);
              document.head.appendChild(el);
            }
            el.setAttribute('href', href);
          };

          updateMeta('property', 'og:title', ogTitle);
          updateMeta('property', 'og:description', ogDesc);
          updateMeta('property', 'og:site_name', title);
          updateMeta('name', 'twitter:title', twitterTitle);
          updateMeta('name', 'twitter:description', twitterDesc);
          updateMeta('name', 'description', desc);
          updateMeta('name', 'twitter:card', 'summary_large_image');
          if (finalValue.twitter_site) updateMeta('name', 'twitter:site', finalValue.twitter_site);
          if (finalValue.twitter_creator) updateMeta('name', 'twitter:creator', finalValue.twitter_creator);

          const canonicalBase = (finalValue.website_url && typeof finalValue.website_url === 'string')
            ? finalValue.website_url.trim().replace(/\/?$/, '/')
            : (typeof window !== 'undefined' ? `${window.location.origin.replace(/\/+$/, '')}/` : DEFAULT_SITE_URL_WITH_SLASH);
          updateMeta('property', 'og:url', canonicalBase);
          updateMeta('name', 'twitter:url', canonicalBase);
          updateLink('canonical', canonicalBase);

          if (versionedImgUrl && !versionedImgUrl.startsWith('data:')) {
            updateMeta('property', 'og:image', versionedImgUrl);
            updateMeta('property', 'og:image:url', versionedImgUrl);
            updateMeta('property', 'og:image:secure_url', versionedImgUrl);
            updateMeta('property', 'og:image:type', nextImageType || 'image/jpeg');
            updateMeta('name', 'twitter:image', versionedImgUrl);
            updateMeta('name', 'twitter:image:src', versionedImgUrl);
            updateMeta('name', 'image', versionedImgUrl);
            updateLink('image_src', versionedImgUrl);
          }
        } catch (err) {
          console.warn('DOM Meta sync warning:', err);
        }
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: key, value: finalValue, updated_at: new Date().toISOString() });

      if (error) throw error;
      
      await refreshSettings();
      
      if (key === 'general') setGeneral(finalValue);
      if (key === 'hero') setHero(finalValue);
      if (key === 'about') setAbout(finalValue);
      if (key === 'programs') setPrograms(finalValue);
      if (key === 'seo') setSeo(finalValue);
      if (key === 'footer') setFooter(finalValue);
      if (key === 'sticky_footer') setStickyFooter(finalValue);
      if (key === 'running_text') setRunningText(finalValue);
      if (key === 'page_loader') setPageLoader(finalValue);

      if (key === 'seo') {
        showSuccess('Metadata OpenGraph & WhatsApp Berhasil Disinkronkan!');
      } else {
        showSuccess(`Pengaturan ${key} berhasil disimpan!`);
      }
    } catch (error: any) {
      showError('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const addStickyItem = () => {
    setStickyFooter(prev => ({
      ...prev,
      items: [...(prev.items || []), { icon_name: 'Home', label: 'Menu Baru', path: '/' }]
    }));
  };

  const removeStickyItem = (index: number) => {
    setStickyFooter(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateStickyItem = (index: number, field: string, value: string) => {
    setStickyFooter(prev => {
      const updated = [...(prev.items || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const syncStickyFromWebFooter = () => {
    if (footer?.quick_links && footer.quick_links.length > 0) {
      const itemsFromFooter = footer.quick_links.map((link: any) => {
        let icon_name = 'Globe';
        const nameLower = (link.name || '').toLowerCase();
        if (nameLower.includes('beranda') || link.href === '/') icon_name = 'Home';
        else if (nameLower.includes('tentang')) icon_name = 'Info';
        else if (nameLower.includes('program')) icon_name = 'BookOpen';
        else if (nameLower.includes('galeri')) icon_name = 'Image';
        else if (nameLower.includes('kontak')) icon_name = 'Phone';
        else if (nameLower.includes('spmb')) icon_name = 'Users';
        else if (nameLower.includes('ai') || nameLower.includes('teach')) icon_name = 'Brain';
        return {
          icon_name,
          label: link.name || 'Menu',
          path: link.href?.startsWith('#') ? `/${link.href}` : (link.href || '/')
        };
      });
      setStickyFooter({ items: itemsFromFooter });
      showSuccess('Menu sticky footer disamakan dengan Menu Quick Links Footer!');
    } else {
      showError('Menu Quick Links Web belum disetting.');
    }
  };

  const addQuickLink = () => {
    setFooter(prev => ({
      ...prev,
      quick_links: [...(prev.quick_links || []), { name: 'Menu Baru', href: '#' }]
    }));
  };

  const removeQuickLink = (index: number) => {
    setFooter(prev => ({
      ...prev,
      quick_links: prev.quick_links.filter((_, i) => i !== index)
    }));
  };

  const updateQuickLink = (index: number, field: string, value: string) => {
    setFooter(prev => {
      const updated = [...prev.quick_links];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, quick_links: updated };
    });
  };

  const addProgramLink = () => {
    setFooter(prev => ({
      ...prev,
      programs_links: [...(prev.programs_links || []), { name: 'Program Baru', href: '#programs' }]
    }));
  };

  const removeProgramLink = (index: number) => {
    setFooter(prev => ({
      ...prev,
      programs_links: prev.programs_links.filter((_, i) => i !== index)
    }));
  };

  const updateProgramLink = (index: number, field: string, value: string) => {
    setFooter(prev => {
      const updated = [...prev.programs_links];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, programs_links: updated };
    });
  };

  const addProgram = () => {
    setPrograms({
      ...programs,
      list: [...programs.list, { icon: 'BookOpen', title: 'Program Baru', description: 'Deskripsi program...', color: 'bg-emerald-500' }]
    });
  };

  const removeProgram = (index: number) => {
    const newList = [...programs.list];
    newList.splice(index, 1);
    setPrograms({ ...programs, list: newList });
  };

  const updateProgram = (index: number, field: string, value: string) => {
    const newList = [...programs.list];
    newList[index] = { ...newList[index], [field]: value };
    setPrograms({ ...programs, list: newList });
  };

  const seoImagePreviewUrl = appendVersionToAssetUrl(seo.image_url || seo.og_image_url, seo.og_image_updated_at);
  const socialPreviewImageUrl = appendVersionToAssetUrl(seo.image_url || seo.og_image_url || identitas.logo_url, seo.og_image_updated_at);

  return (
    <AdminLayout title="Pengaturan Website">
      <div className="max-w-5xl mx-auto space-y-6 w-full min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full min-w-0">
          {/* Iconic Modern Navigation Bar for Web Configuration */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/30">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">Konfigurasi Website</h2>
                  <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Pilih menu di bawah ini untuk mengelola tampilan dan informasi website</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                <span className="text-[10px] sm:text-[11px] bg-white text-emerald-700 font-bold px-3 py-1 rounded-lg border border-slate-200/60 uppercase tracking-wider shadow-2xs">
                  {activeTab}
                </span>
              </div>
            </div>

            {/* Icon Navigation Grid Strip */}
            <div className="w-full overflow-x-auto pb-1 no-scrollbar">
              <TabsList className="bg-slate-100/60 p-1.5 rounded-xl h-auto flex flex-nowrap w-max sm:w-full sm:grid sm:grid-cols-5 md:grid-cols-10 gap-1 sm:gap-1.5 border border-slate-200/50 min-w-full">
                {[
                  { id: 'general', label: 'Umum', icon: Globe },
                  { id: 'seo', label: 'SEO & Sosmed', icon: Share2 },
                  { id: 'hero', label: 'Hero', icon: Sparkles },
                  { id: 'about', label: 'Tentang', icon: User },
                  { id: 'programs', label: 'Program', icon: BookOpen },
                  { id: 'footer', label: 'Footer', icon: LayoutGrid },
                  { id: 'sticky_footer', label: 'Sticky HP', icon: Smartphone },
                  { id: 'running_text', label: 'Running', icon: Megaphone },
                  { id: 'page_loader', label: 'Page Loader', icon: Loader2 },
                  { id: 'account', label: 'Keamanan', icon: KeyRound },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className={`flex flex-col items-center justify-center gap-1 py-2 sm:py-2.5 px-3 sm:px-1 rounded-lg transition-all duration-200 group relative shrink-0 sm:shrink min-w-[70px] sm:min-w-0 ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm font-bold scale-[1.02]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600'}`} />
                      <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight text-center whitespace-nowrap sm:whitespace-normal leading-tight break-words max-w-full">{item.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

        <TabsContent value="general">
          <Card className="border-0 shadow-lg w-full max-w-full overflow-hidden">
            <CardHeader className="p-4 sm:p-6"><CardTitle className="text-lg sm:text-xl font-bold">Informasi Kontak & Sekolah</CardTitle></CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
              <div className="grid md:grid-cols-2 gap-6 min-w-0">
                <div className="space-y-4 min-w-0">
                  <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                    <Globe className="w-4 h-4 shrink-0" /> Identitas Website & Nama Aplikasi
                  </h3>

                  {/* Banner Info Pemisahan Nama Aplikasi vs Nama Madrasah */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-emerald-950 space-y-2 text-xs w-full min-w-0">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="break-words">Pemisahan Nama Aplikasi & Nama Resmi Madrasah</span>
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed break-words">
                      • <b>Nama Aplikasi / Judul Header:</b> Tampil pada bilah navigasi atas (Navbar) dan Footer (Contoh: <i>Si@Kad</i> + <i>Madrasah</i>).<br />
                      • <b>Nama Resmi Madrasah:</b> Digunakan untuk KOP surat, dokumen resmi, Ijazah, dan Profil EMIS. Dikelola di menu <b>[Profil Madrasah / Identitas]</b>.
                    </p>
                    {identitas?.nama_madrasah && (
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-emerald-200/60">
                        <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium truncate">
                          Nama Resmi EMIS: <b className="text-slate-800">{identitas.nama_madrasah}</b>
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGeneral({
                              ...general,
                              header_part1: identitas.nama_madrasah,
                              header_part2: '',
                              app_name: identitas.nama_madrasah,
                              school_name: identitas.nama_madrasah
                            });
                            showSuccess(`Nama Aplikasi disamakan dengan Nama Resmi Madrasah (${identitas.nama_madrasah})!`);
                          }}
                          className="h-7 text-[10px] font-bold bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100 rounded-lg shrink-0 gap-1 self-start sm:self-auto"
                        >
                          <Zap className="w-3 h-3 text-emerald-600" /> Samakan
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Pengaturan 2 Field Nama Judul Header Navbar */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs space-y-4 w-full min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <Pencil className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="break-words">2 Field Nama Judul Header Navbar (Warna & Font Berbeda)</span>
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 self-start sm:self-auto">
                        Si@Kad + Madrasah
                      </span>
                    </div>

                    {/* Kata / Bagian 1 */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          1. Kata / Nama Bagian Pertama <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-500">Contoh: <b>Si@Kad</b></span>
                      </div>
                      <Input 
                        placeholder="Contoh: Si@Kad" 
                        value={general.header_part1 ?? 'Si@Kad'}
                        onChange={(e) => {
                          const p1 = e.target.value;
                          setGeneral({
                            ...general,
                            header_part1: p1,
                            app_name: `${p1} ${general.header_part2 ?? 'Madrasah'}`.trim()
                          });
                        }}
                        className="rounded-xl font-bold text-slate-900 h-10 border-slate-300 bg-white"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Jenis Huruf (Font Style) 1
                          </label>
                          <select 
                            value={general.header_part1_font || 'sans-black'}
                            onChange={(e) => setGeneral({ ...general, header_part1_font: e.target.value })}
                            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
                          >
                            {FONT_STYLE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Warna Teks Bagian 1
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={general.header_part1_color?.startsWith('#') ? general.header_part1_color : '#0f172a'}
                              onChange={(e) => setGeneral({ ...general, header_part1_color: e.target.value })}
                              className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer bg-white"
                            />
                            <Input 
                              value={general.header_part1_color || '#0f172a'}
                              onChange={(e) => setGeneral({ ...general, header_part1_color: e.target.value })}
                              placeholder="#0f172a atau text-slate-900"
                              className="h-9 text-xs rounded-lg font-mono bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Kata / Bagian 2 */}
                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-900">
                          2. Kata / Nama Bagian Kedua
                        </label>
                        <span className="text-[10px] text-slate-500">Contoh: <b>Madrasah</b></span>
                      </div>
                      <Input 
                        placeholder="Contoh: Madrasah" 
                        value={general.header_part2 ?? 'Madrasah'}
                        onChange={(e) => {
                          const p2 = e.target.value;
                          setGeneral({
                            ...general,
                            header_part2: p2,
                            app_name: `${general.header_part1 ?? 'Si@Kad'} ${p2}`.trim()
                          });
                        }}
                        className="rounded-xl font-bold text-slate-900 h-10 border-emerald-300 bg-white"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Jenis Huruf (Font Style) 2
                          </label>
                          <select 
                            value={general.header_part2_font || 'serif-bold'}
                            onChange={(e) => setGeneral({ ...general, header_part2_font: e.target.value })}
                            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
                          >
                            {FONT_STYLE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Warna Teks Bagian 2
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={general.header_part2_color?.startsWith('#') ? general.header_part2_color : '#059669'}
                              onChange={(e) => setGeneral({ ...general, header_part2_color: e.target.value })}
                              className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer bg-white"
                            />
                            <Input 
                              value={general.header_part2_color || '#059669'}
                              onChange={(e) => setGeneral({ ...general, header_part2_color: e.target.value })}
                              placeholder="#059669 atau text-emerald-600"
                              className="h-9 text-xs rounded-lg font-mono bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pratinjau Header Title Navbar */}
                    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 text-white space-y-1.5 border border-slate-800 w-full min-w-0">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1">
                        <span>Pratinjau Hasil Judul Header Navbar</span>
                        <span className="text-emerald-400">{general.title_animation_type || 'static'}</span>
                      </div>
                      <div className="py-2.5 flex items-center gap-3 bg-slate-950/80 px-3 rounded-lg border border-slate-800/80 overflow-x-auto">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-white" />
                        </div>
                        <HeaderTitleAnimation 
                          part1={general.header_part1 ?? 'Si@Kad'}
                          part1Color={general.header_part1_color || '#0f172a'}
                          part1Font={general.header_part1_font || 'sans-black'}
                          part2={general.header_part2 ?? 'Madrasah'}
                          part2Color={general.header_part2_color || '#059669'}
                          part2Font={general.header_part2_font || 'serif-bold'}
                          animationType={general.title_animation_type || 'static'}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Tagline / Sub-judul Header</label>
                    <Input 
                      placeholder="Muncul di bawah judul header (Contoh: Sistem Informasi Akademik Modern)"
                      value={general.tagline} 
                      onChange={(e) => setGeneral({...general, tagline: e.target.value})} 
                      className="rounded-xl" 
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" /> Jenis Teks Berjalan / Animasi Judul Header (Navbar)
                    </label>
                    <select 
                      value={general.title_animation_type || 'static'} 
                      onChange={(e) => setGeneral({ ...general, title_animation_type: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="static">Diam / Statis (Standar tanpa animasi)</option>
                      <option value="typewriter">Ketik Karakter (Typewriter efek mengetik)</option>
                      <option value="marquee">Teks Berjalan (Marquee mengalir dari kanan ke kiri)</option>
                      <option value="bounce">Teks Mengambang / Glow (Bounce berdenyut)</option>
                      <option value="slide">Slide & Fade In (Meluncur dari samping)</option>
                    </select>
                    <p className="text-[11px] text-slate-500 italic">
                      * Menentukan gaya animasi teks nama aplikasi pada bilah navigasi utama (Header Navbar).
                    </p>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Alamat</label><Textarea value={general.address} onChange={(e) => setGeneral({...general, address: e.target.value})} className="rounded-xl" /></div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2">
                    <UserCircle className="w-4 h-4" /> Pimpinan Madrasah
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Kepala Madrasah</label>
                    <Input 
                      placeholder="Contoh: Jaenal Maskun, S.Pd.I" 
                      value={general.headmaster_name}
                      onChange={(e) => setGeneral({...general, headmaster_name: e.target.value})}
                      onBlur={(e) => setGeneral({...general, headmaster_name: formatFullNameWithTitles(e.target.value)})}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Gelar / Jabatan</label>
                    <Input 
                      placeholder="Contoh: Kepala Madrasah" 
                      value={general.headmaster_title}
                      onChange={(e) => setGeneral({...general, headmaster_title: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Kontak & Operasional</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Telepon</label><Input value={general.phone} onChange={(e) => setGeneral({...general, phone: e.target.value})} className="rounded-xl" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label><Input value={general.email} onChange={(e) => setGeneral({...general, email: e.target.value})} className="rounded-xl" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Jam Kerja</label><Input value={general.operational_hours} onChange={(e) => setGeneral({...general, operational_hours: e.target.value})} className="rounded-xl" /></div>
                </div>
              </div>

              {/* Lokasi Peta Google Maps Section */}
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Lokasi & Peta Google Maps Beranda
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGeneral({
                        ...general,
                        maps_latitude: '-7.517606',
                        maps_longitude: '109.132984',
                        maps_zoom: '16',
                        maps_embed_url: ''
                      });
                      showSuccess('Koordinat diatur ke default (-7.517606, 109.132984)!');
                    }}
                    className="h-8 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Set Koordinat Default
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Latitude (Lintang)</label>
                    <Input
                      value={general.maps_latitude || '-7.517606'}
                      onChange={(e) => setGeneral({ ...general, maps_latitude: e.target.value })}
                      placeholder="-7.517606"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Longitude (Bujur)</label>
                    <Input
                      value={general.maps_longitude || '109.132984'}
                      onChange={(e) => setGeneral({ ...general, maps_longitude: e.target.value })}
                      placeholder="109.132984"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Zoom Level (1 - 20)</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={general.maps_zoom || '16'}
                      onChange={(e) => setGeneral({ ...general, maps_zoom: e.target.value })}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">URL Embed Custom / Kode iFrame Google Maps (Opsional)</label>
                  <Input
                    value={general.maps_embed_url || ''}
                    onChange={(e) => setGeneral({ ...general, maps_embed_url: e.target.value })}
                    placeholder="Kosongkan untuk menggunakan Latitude & Longitude"
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-gray-700">Pratinjau Peta Beranda</label>
                  <div className="h-52 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                    <iframe
                      title="Pratinjau Peta Settings"
                      src={getGoogleMapEmbedUrl(general.maps_latitude, general.maps_longitude, general.maps_zoom, general.maps_embed_url, "MI Ma'arif NU 2 Sanggreman")}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave('general', general)} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-8 font-bold">
                <Save className="w-4 h-4 mr-2" /> Simpan Perubahan Umum
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="w-full max-w-full min-w-0">
          {/* Fitur Pamungkas Banner Header */}
          <div className="mb-6 p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white shadow-2xl border-2 border-emerald-500/40 relative overflow-hidden w-full max-w-full">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-5 relative z-10 w-full min-w-0">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0 w-full">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                  <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-white animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-white break-words">FITUR PAMUNGKAS: SOLUSI OPENGRAPH & THUMBNAIL MEDSOS</h3>
                    <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/50 text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Otomatis & Presisi
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 mt-1.5 leading-relaxed break-words">
                    Aplikasi mendeteksi dan memperbaiki secara otomatis masalah link WhatsApp / Facebook yang blank, thumbnail tidak muncul, atau gambar lama yang tersangkut cache. Klik tombol <b>"Reset & Perbaiki OpenGraph"</b> untuk menyegarkan metadata dan menyalin link bypass cache.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full lg:w-auto">
                <Button
                  type="button"
                  onClick={handleAutoFixOpenGraph}
                  disabled={saving}
                  className="bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 hover:from-amber-500 hover:to-emerald-600 text-slate-950 font-black rounded-2xl text-xs h-11 sm:h-12 px-4 sm:px-5 shadow-xl shadow-emerald-500/20 gap-2 border border-amber-300/60 w-full sm:w-auto"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />}
                  <span className="truncate">PERBAIKI & RESET OPENGRAPH</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleSyncMetadata}
                  disabled={saving}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs h-11 sm:h-12 px-4 gap-2 border-white/20 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-300" /> Sinkronkan Metadata
                </Button>
              </div>
            </div>

            {/* Diagnostic Metrics Bar */}
            <div className="mt-5 pt-4 border-t border-emerald-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10">
                <span className="text-emerald-300/80 block text-[10px] font-bold uppercase">Status Domain Link</span>
                <span className="font-extrabold text-white truncate block mt-0.5">
                  {seo.website_url ? (seo.website_url.startsWith('https://') ? '🟢 HTTPS Aman' : '⚠️ HTTP Standard') : '🟢 Active Domain'}
                </span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10">
                <span className="text-emerald-300/80 block text-[10px] font-bold uppercase">Thumbnail Status</span>
                <span className="font-extrabold text-white truncate block mt-0.5">
                  {seo.image_url ? (seo.image_url.includes('catbox') ? '⚠️ Temp Host' : '🟢 Gambar Standar OK') : '🟢 Default Banner'}
                </span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10">
                <span className="text-emerald-300/80 block text-[10px] font-bold uppercase">Rasio Resolusi</span>
                <span className="font-extrabold text-white truncate block mt-0.5">
                  1200 x 630 px (1.91:1)
                </span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10">
                <span className="text-emerald-300/80 block text-[10px] font-bold uppercase">Bypass Cache WA</span>
                <span className="font-extrabold text-emerald-300 truncate block mt-0.5">
                  {seo.og_image_updated_at ? `🟢 Timestamp Aktif` : '⚡ Siap Diperbarui'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 w-full min-w-0">
            <Card className="border-0 shadow-lg w-full overflow-hidden">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-600 shrink-0" /> Form Meta Tag & Gambar OpenGraph
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Judul Share (Meta Title)</label>
                    <Input 
                      placeholder="Kosongkan untuk menggunakan Nama Sekolah" 
                      value={seo.title || ''}
                      onChange={(e) => setSeo({...seo, title: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi Share (Meta Description)</label>
                    <Textarea 
                      placeholder="Kosongkan untuk menggunakan Tagline" 
                      value={seo.description || ''}
                      onChange={(e) => setSeo({...seo, description: e.target.value})}
                      className="rounded-xl min-h-[90px]"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Judul Open Graph (WhatsApp/Facebook)</label>
                      <Input
                        placeholder="Opsional (default: Meta Title)"
                        value={seo.og_title || ''}
                        onChange={(e) => setSeo({ ...seo, og_title: e.target.value })}
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Jika dikosongkan, sistem memakai Judul Share.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi Open Graph</label>
                      <Textarea
                        placeholder="Opsional (default: Meta Description)"
                        value={seo.og_description || ''}
                        onChange={(e) => setSeo({ ...seo, og_description: e.target.value })}
                        className="rounded-xl min-h-[90px]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Twitter Site (opsional)</label>
                      <Input
                        placeholder="@akunresmi"
                        value={seo.twitter_site || ''}
                        onChange={(e) => setSeo({ ...seo, twitter_site: e.target.value })}
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Contoh: <code className="bg-slate-100 px-1 rounded">@siakad</code></p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Twitter Creator (opsional)</label>
                      <Input
                        placeholder="@pembuatkonten"
                        value={seo.twitter_creator || ''}
                        onChange={(e) => setSeo({ ...seo, twitter_creator: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Judul Twitter (opsional)</label>
                      <Input
                        placeholder="Opsional (default: Judul Open Graph)"
                        value={seo.twitter_title || ''}
                        onChange={(e) => setSeo({ ...seo, twitter_title: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi Twitter (opsional)</label>
                      <Textarea
                        placeholder="Opsional (default: Deskripsi Open Graph)"
                        value={seo.twitter_description || ''}
                        onChange={(e) => setSeo({ ...seo, twitter_description: e.target.value })}
                        className="rounded-xl min-h-[90px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Domain / Link Utama Berbagi (Canonical Share Domain)</label>
                    <Input 
                      type="url"
                      placeholder={DEFAULT_SITE_URL}
                      value={seo.website_url || ''}
                      onChange={(e) => setSeo({...seo, website_url: e.target.value})}
                      className="rounded-xl"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">{`Domain ini (Default: ${DEFAULT_SITE_URL}) yang akan dipakai ketika menyebarkan link ke WhatsApp & Medsos.`}</p>
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Gambar Share (Open Graph Image)</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMediaModalTarget('seo')}
                        className="h-7 text-[11px] rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold gap-1 self-start sm:self-auto shrink-0"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Pilih dari Galeri
                      </Button>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 aspect-video flex items-center justify-center bg-gray-50 group mb-2 max-w-full">
                      {seo.image_url ? (
                        <>
                          <img 
                            key={seoImagePreviewUrl || seo.image_url}
                            src={seoImagePreviewUrl || seo.image_url} 
                            referrerPolicy="no-referrer"
                            onError={() => setSeoImgError(true)}
                            onLoad={() => setSeoImgError(false)}
                            className="w-full h-full object-cover" 
                            alt="Preview OpenGraph" 
                          />

                          {seoImgError && (
                            <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center gap-2 z-10 text-white">
                              <AlertCircle className="w-8 h-8 text-amber-400 animate-bounce" />
                              <div>
                                <p className="text-xs font-bold text-slate-100">Gambar SEO Gagal Dimuat</p>
                                <p className="text-[10px] text-slate-300 mt-0.5">Silakan unggah ulang gambar atau pilih dari galeri.</p>
                              </div>
                              <label className="cursor-pointer mt-1">
                                <span className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow">
                                  <Upload className="w-3.5 h-3.5" /> Unggah Ulang
                                </span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => { 
                                    setSeoImgError(false); 
                                    handleImageUpload(e, 'seo'); 
                                  }} 
                                />
                              </label>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap p-2 z-20">
                            <label className="cursor-pointer">
                              <Button size="sm" variant="secondary" className="rounded-xl font-bold" asChild>
                                <span>Ganti Foto</span>
                              </Button>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { setSeoImgError(false); handleImageUpload(e, 'seo'); }} />
                            </label>
                            <Button size="sm" variant="outline" className="rounded-xl font-bold bg-white/90 text-slate-800" onClick={() => setMediaModalTarget('seo')}>
                              Galeri
                            </Button>
                            <Button size="sm" variant="destructive" className="rounded-xl font-bold" onClick={() => { const u = {...seo, image_url: DEFAULT_OG_IMAGE_PATH, og_image_url: DEFAULT_OG_IMAGE_PATH, og_image_type: 'image/jpeg', og_image_updated_at: Date.now().toString()}; setSeo(u); setSeoImgError(false); handleSave('seo', u); showSuccess('Gambar OpenGraph di-reset ke Banner Standar Resmi!'); }}>
                              Hapus & Reset Banner
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-3 text-center max-w-full">
                          {uploading === 'seo' ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                              <span className="text-xs text-emerald-700 font-bold">Mengunggah Gambar SEO...</span>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300" />
                              <span className="text-[11px] sm:text-xs text-gray-500 font-semibold px-2">Upload Gambar Khusus Share (1200x630px)</span>
                              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                                <label className="cursor-pointer">
                                  <span className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm inline-block">
                                    Upload File Gambar
                                  </span>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { setSeoImgError(false); handleImageUpload(e, 'seo'); }} />
                                </label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setMediaModalTarget('seo')}
                                  className="h-8 rounded-xl text-xs font-bold border-slate-300"
                                >
                                  Pilih dari Galeri
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        URL Direct / Link Gambar Share (Open Graph)
                      </label>
                      <Input
                        type="text"
                        placeholder="https://... atau data:image/..."
                        value={seo.image_url || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSeoImgError(false);
                          setSeo({
                            ...seo,
                            image_url: val,
                            og_image_url: val,
                            og_image_updated_at: new Date().toISOString()
                          });
                        }}
                        className="rounded-xl text-xs font-mono bg-white border-slate-200"
                      />
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-[11px] text-emerald-900 leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Banner Standar Resmi Aktif (1200x630px)
                        </p>
                        <p className="text-slate-600 text-[10px] mt-1">
                          Sistem otomatis memakai banner HD resmi yang telah dioptimalkan khusus untuk WhatsApp & Facebook. Jika terjadi kendala pada gambar kustom, klik tombol di bawah ini.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const timestamp = Date.now().toString();
                          const updated = {
                            ...seo,
                            image_url: DEFAULT_OG_IMAGE_PATH,
                            og_image_url: DEFAULT_OG_IMAGE_PATH,
                            og_image_type: 'image/jpeg',
                            og_image_updated_at: timestamp
                          };
                          setSeo(updated);
                          setSeoImgError(false);
                          handleSave('seo', updated);
                          showSuccess('Berhasil di-reset ke Banner Standar Resmi Si@Kad!');
                        }}
                        className="rounded-xl border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 font-bold text-xs h-9 w-full gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                        Reset ke Banner Standar Resmi (1200x630px)
                      </Button>
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleSave('seo', seo)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl w-full h-11 font-bold shadow-md">
                  <Save className="w-4 h-4 mr-2" /> Simpan Pengaturan SEO
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6 w-full min-w-0">
              {/* Google Preview */}
              <Card className="border-0 shadow-md overflow-hidden w-full">
                <CardHeader className="bg-gray-50 py-3 px-4 sm:px-6 border-b">
                  <CardTitle className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Google Search Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 bg-white overflow-hidden">
                  <div className="w-full max-w-full overflow-hidden space-y-1">
                    <p className="text-[#1a0dab] text-base sm:text-lg font-semibold hover:underline cursor-pointer truncate">{seo.title || general.school_name || 'Si@Kad Madrasah'}</p>
                    <p className="text-[#006621] text-xs sm:text-sm truncate mb-1">{seo.website_url || DEFAULT_SITE_URL}</p>
                    <p className="text-[#545454] text-xs sm:text-sm line-clamp-2 leading-relaxed break-words">{seo.description || general.tagline || 'Sistem Informasi Akademik'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp/Social Preview & Sharing Tools */}
              <Card className="border-0 shadow-md overflow-hidden w-full">
                <CardHeader className="bg-slate-900 text-white py-3.5 px-4 sm:px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-400 shrink-0" /> Pratinjau Kartu Berbagi WhatsApp & Medsos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 bg-white flex flex-col items-center overflow-hidden">
                  <div className="w-full max-w-sm border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-[#f0f2f5]">
                    <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden relative">
                      {(seo.image_url || identitas.logo_url) ? (
                        <img 
                          src={socialPreviewImageUrl || seo.image_url || identitas.logo_url} 
                          className="w-full h-full object-cover" 
                          alt="Social Media Preview" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_OG_IMAGE_PATH;
                          }}
                        />
                      ) : (
                        <img 
                          src={DEFAULT_OG_IMAGE_PATH}
                          className="w-full h-full object-cover" 
                          alt="Default OG Preview" 
                        />
                      )}
                      <span className="absolute top-2 right-2 bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {seo.image_url ? 'Gambar Custom' : identitas.logo_url ? 'Logo' : 'Default OG'}
                      </span>
                    </div>
                    <div className="p-3 bg-white border-t border-slate-200">
                      <p className="text-[10px] text-emerald-800 uppercase font-bold truncate tracking-wider">{(seo.website_url || DEFAULT_SITE_URL).replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{seo.og_title || seo.title || general.school_name || 'Si@Kad Madrasah'}</p>
                      <p className="text-[11px] sm:text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">{seo.og_description || seo.description || general.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah'}</p>
                    </div>
                  </div>

                  {/* WhatsApp Sharing & Testing Action Buttons */}
                  <div className="w-full mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-700 text-center mb-1">
                      Aksi Bagikan & Pengujian Tautan WhatsApp:
                    </p>
                    
                    <div className="flex flex-col gap-2 w-full">
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-10 gap-2 shadow-sm w-full"
                        onClick={() => {
                          const domain = normalizeSiteUrl(seo.website_url);
                          const testUrl = `${domain}/?v=${Date.now().toString().slice(-5)}`;
                          const text = `*${seo.title || general.school_name || 'Si@Kad Madrasah'}*\n${seo.description || general.tagline || 'Sistem Informasi Akademik'}\n\nKunjungi website resmi kami:\n${testUrl}`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                      >
                        <Share2 className="w-4 h-4 shrink-0" /> Bagikan ke WhatsApp (Bypass Cache)
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="border-emerald-600 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold h-auto py-2.5 px-3 gap-2 w-full whitespace-normal leading-tight text-center"
                        onClick={() => {
                          const domain = normalizeSiteUrl(seo.website_url);
                          const testUrl = `${domain}/?v=${Date.now().toString().slice(-5)}`;
                          navigator.clipboard.writeText(testUrl);
                          showSuccess(`Link Pengujian berhasil disalin (${testUrl}). Tempelkan di WhatsApp!`);
                        }}
                      >
                        <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Salin Link Pengujian (Bypass Cache WhatsApp)</span>
                      </Button>
                    </div>

                    <div className="pt-2 flex flex-col gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-[11px] text-slate-600 hover:text-emerald-700 font-semibold h-auto py-1.5 text-center flex items-center justify-center gap-1.5"
                        onClick={() => {
                          const domain = normalizeSiteUrl(seo.website_url);
                          window.open(`https://www.opengraph.xyz/url/${encodeURIComponent(domain)}`, '_blank');
                        }}
                      >
                        <Search className="w-3.5 h-3.5 text-emerald-600" /> Uji Status Meta Tag di OpenGraph Inspector
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-[11px] text-slate-600 hover:text-emerald-700 font-semibold h-auto py-1.5 text-center flex items-center justify-center gap-1.5"
                        onClick={() => {
                          const domain = normalizeSiteUrl(seo.website_url);
                          window.open(`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(domain + '/')}`, '_blank');
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" /> Paksa Rescan Meta Tag via Facebook Sharing Debugger
                      </Button>
                    </div>
                  </div>

                  {/* Informative Guidance & Plesk / cPanel Solution */}
                  <div className="w-full mt-4 bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-slate-800 text-[11px] space-y-2 overflow-hidden">
                    <p className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      📌 Mengapa Rescan Berulang Kali Hasilnya Masih Blank?
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 text-[10px] sm:text-[11px] leading-normal break-words">
                      <li><b>Sistem Cache WhatsApp Agresif:</b> Bot WhatsApp menyimpan cache tautan lama hingga 30 hari. Gunakan tombol <b>"Salin Link Pengujian"</b> dengan parameter <code>?v=...</code> untuk memikat bot WhatsApp mengambil data baru.</li>
                      <li><b>Status Server Hosting (Plesk/cPanel):</b> Pastikan file <code>index.php</code> di root hosting aktif membaca database.</li>
                    </ul>

                    <div className="pt-2 border-t border-amber-200/60">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowHtaccessHelp(!showHtaccessHelp)}
                        className="w-full text-xs font-black text-amber-900 hover:text-amber-950 p-0 h-auto flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-amber-700" />
                          {showHtaccessHelp ? 'Sembunyikan Solusi Server .htaccess' : 'Lihat Solusi Kustom Server Hosting (.htaccess)'}
                        </span>
                        <span>{showHtaccessHelp ? '▲' : '▼'}</span>
                      </Button>

                      {showHtaccessHelp && (
                        <div className="mt-2 p-2.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 text-[10px] font-mono leading-relaxed">
                          <p className="text-amber-300 font-sans font-bold">Copy kode .htaccess berikut ke file .htaccess di Hosting Plesk/cPanel Anda:</p>
                          <pre className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-emerald-400 overflow-x-auto whitespace-pre">
{`# Solusi OpenGraph & Bot WhatsApp/Facebook
<IfModule mod_rewrite.c>
  RewriteEngine On
  # Izinkan Bot Medsos Membaca index.php
  RewriteCond %{HTTP_USER_AGENT} (facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot) [NC]
  RewriteRule ^$ index.php [L]
</IfModule>`}
                          </pre>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 font-sans font-bold rounded-lg w-full"
                            onClick={() => {
                              const snippet = `# Solusi OpenGraph & Bot WhatsApp/Facebook\n<IfModule mod_rewrite.c>\n  RewriteEngine On\n  # Izinkan Bot Medsos Membaca index.php\n  RewriteCond %{HTTP_USER_AGENT} (facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot) [NC]\n  RewriteRule ^$ index.php [L]\n</IfModule>`;
                              navigator.clipboard.writeText(snippet);
                              showSuccess('Kode .htaccess berhasil disalin ke clipboard!');
                            }}
                          >
                            <Copy className="w-3 h-3 mr-1" /> Salin Kode .htaccess
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hero">
          <Card className="border-0 shadow-lg">
            <CardHeader><CardTitle>Tampilan Utama (Hero)</CardTitle></CardHeader>
            <CardContent className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Background Image */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-gray-700">Gambar Background Hero</label>
                    {heroBgImgError && (
                      <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Gambar Tidak Dapat Dimuat
                      </span>
                    )}
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-emerald-200 hover:border-emerald-400 transition-colors aspect-video flex items-center justify-center bg-slate-50 group">
                    {hero.background_image ? (
                      <>
                        <img 
                          key={hero.background_image}
                          src={formatImageUrl(hero.background_image)} 
                          onError={() => setHeroBgImgError(true)}
                          onLoad={() => setHeroBgImgError(false)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                          alt="Preview Background Hero" 
                        />

                        {heroBgImgError && (
                          <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center gap-2.5 z-10 text-white">
                            <AlertCircle className="w-8 h-8 text-amber-400 animate-bounce" />
                            <div>
                              <p className="text-xs font-bold text-slate-100">Foto Tidak Dapat Ditampilkan</p>
                              <p className="text-[10px] text-slate-300 mt-1">Silakan unggah ulang foto dari galeri/HP Anda.</p>
                            </div>
                            <label className="cursor-pointer mt-1">
                              <span className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md">
                                <Upload className="w-3.5 h-3.5" /> Unggah Ulang Foto
                              </span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => { 
                                  setHeroBgImgError(false); 
                                  handleImageUpload(e, 'hero_bg'); 
                                }} 
                              />
                            </label>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => setMediaModalTarget('hero_bg')} 
                            className="rounded-xl font-semibold shadow gap-1"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Pilih Tersimpan
                          </Button>
                          <label className="cursor-pointer">
                            <Button type="button" size="sm" variant="secondary" asChild className="rounded-xl font-semibold shadow">
                              <span className="flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5" /> Unggah Baru
                              </span>
                            </Button>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => { 
                                setHeroBgImgError(false); 
                                handleImageUpload(e, 'hero_bg'); 
                              }} 
                            />
                          </label>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="destructive" 
                            className="rounded-xl font-semibold shadow"
                            onClick={() => { 
                              const u = {...hero, background_image: ''}; 
                              setHero(u); 
                              setHeroBgImgError(false); 
                              handleSave('hero', u); 
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                          </Button>
                        </div>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-2.5 p-6 text-center w-full h-full hover:bg-emerald-50/50 transition-colors">
                        {uploading === 'hero_bg' ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">Mengunggah Foto...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-slate-800">Klik untuk Unggah Foto Background Hero</span>
                              <span className="block text-[11px] text-slate-500 mt-0.5">Pilih foto lanskap (JPG, PNG, WEBP) dari perangkat Anda</span>
                            </div>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => { 
                            setHeroBgImgError(false); 
                            handleImageUpload(e, 'hero_bg'); 
                          }} 
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Right Side Image / Multiple Hero Gallery */}
                <div className="space-y-3 md:col-span-2">
                  <SlideListEditor
                    label="Gambar Visual Hero / Slideshow (Dapat Unggah Foto Kegiatan Lebih Dari Satu Per Judul)"
                    description="Unggah foto-foto kegiatan untuk tiap judul. Anda dapat mengunggah beberapa foto sekaligus per judul kegiatan."
                    rawImages={hero.images || (hero.right_image ? [hero.right_image] : [])}
                    defaultTitle={hero.right_image_title || 'Pendidikan Berkarakter'}
                    defaultSubtitle={hero.right_image_subtitle || 'Terakreditasi & Berprestasi'}
                    uploadType="hero_gallery"
                    onUpdate={(newItems) => {
                      const firstUrl = newItems[0]?.urls[0] || '';
                      const updated = { ...hero, images: newItems, right_image: firstUrl };
                      setHero(updated);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fitur Auto-Fill Judul Hero</h3>
                    <p className="text-[11px] text-slate-500">Pilih opsi berikut untuk mengisi otomatis judul hero:</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold h-8 gap-1.5 shadow-2xs"
                      onClick={() => {
                        const appName = general.app_name || general.school_name || 'Si@Kad';
                        setHero({ ...hero, heading_line1: appName, heading_line2: 'Madrasah Digital' });
                        showSuccess(`Judul Hero diisi dengan Nama Aplikasi (${appName})!`);
                      }}
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      Isi dari Nama Aplikasi ({general.app_name || general.school_name || 'Si@Kad'})
                    </Button>
                    {identitas?.nama_madrasah && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="bg-white hover:bg-blue-50 border-blue-300 text-blue-800 rounded-xl text-xs font-bold h-8 gap-1.5 shadow-2xs"
                        onClick={() => {
                          setHero({ ...hero, heading_line1: identitas.nama_madrasah, heading_line2: 'Unggul & Berakhlak' });
                          showSuccess(`Judul Hero diisi dengan Nama Resmi Madrasah (${identitas.nama_madrasah})!`);
                        }}
                      >
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        Isi dari Nama EMIS ({identitas.nama_madrasah})
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-emerald-700 block mb-1">Teks Badge (Slogan di atas Judul Utama)</label>
                  <Input 
                    value={hero.badge_text} 
                    onChange={(e) => setHero({...hero, badge_text: e.target.value})} 
                    placeholder="Contoh: Eksklusif & Modern" 
                    className="rounded-xl h-11 border-emerald-200"
                  />
                </div>
                {/* 2 Field Judul Utama Hero dengan Font & Warna Terpisah */}
                <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                      2 Field Judul Utama Hero (Warna & Jenis Huruf Berbeda)
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      Si@Kad + Madrasah
                    </span>
                  </div>

                  {/* Baris / Kata 1 Hero */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        1. Judul Hero Baris 1 (Bagian Pertama) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500">Contoh: <b>Si@Kad</b></span>
                    </div>
                    <Input 
                      value={hero.heading_line1 ?? 'Si@Kad'} 
                      onChange={(e) => setHero({...hero, heading_line1: e.target.value})} 
                      placeholder="Contoh: Si@Kad" 
                      className="rounded-xl h-10 font-bold bg-white"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Jenis Huruf (Font Style) Baris 1
                        </label>
                        <select 
                          value={hero.heading_line1_font || 'sans-black'}
                          onChange={(e) => setHero({ ...hero, heading_line1_font: e.target.value })}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
                        >
                          {FONT_STYLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Warna Teks Baris 1
                        </label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={hero.heading_line1_color?.startsWith('#') ? hero.heading_line1_color : '#0f172a'}
                            onChange={(e) => setHero({ ...hero, heading_line1_color: e.target.value })}
                            className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer bg-white"
                          />
                          <Input 
                            value={hero.heading_line1_color || '#0f172a'}
                            onChange={(e) => setHero({ ...hero, heading_line1_color: e.target.value })}
                            placeholder="#0f172a atau text-slate-900"
                            className="h-9 text-xs rounded-lg font-mono bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Baris / Kata 2 Hero */}
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-900">
                        2. Judul Hero Baris 2 (Bagian Kedua / Highlight)
                      </label>
                      <span className="text-[10px] text-slate-500">Contoh: <b>Madrasah</b></span>
                    </div>
                    <Input 
                      value={hero.heading_line2 ?? 'Madrasah'} 
                      onChange={(e) => setHero({...hero, heading_line2: e.target.value})} 
                      placeholder="Contoh: Madrasah Digital" 
                      className="rounded-xl h-10 border-emerald-300 font-bold text-emerald-800 bg-white"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Jenis Huruf (Font Style) Baris 2
                        </label>
                        <select 
                          value={hero.heading_line2_font || 'serif-italic'}
                          onChange={(e) => setHero({ ...hero, heading_line2_font: e.target.value })}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
                        >
                          {FONT_STYLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Warna Teks Baris 2 (Gradient / Color)
                        </label>
                        <div className="space-y-1.5">
                          <select 
                            value={hero.heading_line2_color || 'gradient-emerald'}
                            onChange={(e) => setHero({ ...hero, heading_line2_color: e.target.value })}
                            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
                          >
                            <option value="gradient-emerald">✨ Gradient Emerald Emerald-Teal (Bawaan)</option>
                            <option value="gradient-amber">✨ Gradient Amber Gold (Emas / Mewah)</option>
                            <option value="gradient-cyan">✨ Gradient Cyan Blue (Biru Modern)</option>
                            <option value="gradient-purple">✨ Gradient Purple Rose (Ungu / Merah)</option>
                            <option value="#059669">Hijau Solid (#059669)</option>
                            <option value="#2563eb">Biru Solid (#2563eb)</option>
                            <option value="#d97706">Kuning/Emas Solid (#d97706)</option>
                            <option value="#ffffff">Putih Solid (#ffffff)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview Box Judul Hero */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Pratinjau Langsung Tampilan Judul Hero
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                      {hero.title_animation_type || 'typewriter'}
                    </span>
                  </div>
                  <div className="py-3 px-3 overflow-hidden min-h-[90px] flex flex-col justify-center bg-slate-950/60 rounded-xl border border-slate-800/80">
                    <HeroTypewriterTitle 
                      line1={hero.heading_line1 || 'Si@Kad'} 
                      line1Color={hero.heading_line1_color || '#ffffff'}
                      line1Font={hero.heading_line1_font || 'sans-black'}
                      line2={hero.heading_line2 || 'Madrasah'} 
                      line2Color={hero.heading_line2_color || 'gradient-emerald'}
                      line2Font={hero.heading_line2_font || 'serif-italic'}
                      size="md"
                      dark={true}
                      isVisible={true} 
                      animationType={hero.title_animation_type || 'typewriter'}
                    />
                  </div>
                </div>

                {/* Fitur Pilihan Jenis Teks Berjalan / Animasi Judul Hero */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                  <label className="block text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" /> Jenis Teks Berjalan / Animasi Judul Hero
                  </label>
                  <select 
                    value={hero.title_animation_type || 'typewriter'} 
                    onChange={(e) => setHero({ ...hero, title_animation_type: e.target.value })}
                    className="w-full h-11 rounded-xl border border-emerald-300 bg-white px-3 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="typewriter">Ketik Karakter (Typewriter per huruf dengan kursor)</option>
                    <option value="marquee">Teks Berjalan Kanan ke Kiri (Marquee kontinyu dari samping kiri hero)</option>
                    <option value="marquee-bounce">Teks Berjalan Bolak-Balik (Bounce mengayun dari samping kiri hero)</option>
                    <option value="slide">Slide & Fade In (Meluncur dari samping kiri hero)</option>
                    <option value="static">Diam / Statis (Tampil penuh tanpa animasi gerakan)</option>
                  </select>
                  <p className="text-[11px] text-emerald-800/90 font-medium">
                    * Saat mode <b>Teks Berjalan (Marquee)</b> dipilih, teks berjalan otomatis dimulai bersih dari <b>samping kiri hero</b> (di bawah teks badge, bukan dari samping kanan badge).
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic -mt-2">* Gabungan kedua baris ini akan membentuk judul besar di halaman depan.</p>
              
              <div><label className="text-sm font-medium">Deskripsi Singkat</label><Textarea value={hero.description} onChange={(e) => setHero({...hero, description: e.target.value})} className="rounded-xl" /></div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-xs font-bold text-gray-400 uppercase">Siswa</label><Input value={hero.stats_students} onChange={(e) => setHero({...hero, stats_students: e.target.value})} className="rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Prestasi</label><Input value={hero.stats_achievements} onChange={(e) => setHero({...hero, stats_achievements: e.target.value})} className="rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Guru</label><Input value={hero.stats_teachers} onChange={(e) => setHero({...hero, stats_teachers: e.target.value})} className="rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Tahun</label><Input value={hero.stats_years} onChange={(e) => setHero({...hero, stats_years: e.target.value})} className="rounded-xl" /></div>
              </div>
              
              <Button onClick={() => handleSave('hero', hero)} disabled={saving || !!uploading} className="bg-emerald-500 text-white w-full h-14 rounded-xl font-bold shadow-lg">
                <Save className="w-4 h-4 mr-2" /> Simpan Perubahan Hero
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card className="border-0 shadow-lg">
            <CardHeader><CardTitle>Pengaturan Bagian "Tentang / Mengenal Kami"</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <SlideListEditor
                label="Gambar Tentang Kami / Slideshow (Dapat Unggah Foto Kegiatan Lebih Dari Satu Per Judul)"
                description="Unggah foto-foto kegiatan untuk tiap judul tentang kami. Anda dapat mengunggah beberapa foto sekaligus per judul kegiatan."
                rawImages={about.images || (about.image_url ? [about.image_url] : [])}
                defaultTitle={about.image_title || 'Mengenal Madrasah'}
                defaultSubtitle={about.image_subtitle || 'Unggul & Berakhlak'}
                uploadType="about"
                onUpdate={(newItems) => {
                  const firstUrl = newItems[0]?.urls[0] || '';
                  const updated = { ...about, images: newItems, image_url: firstUrl };
                  setAbout(updated);
                }}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Judul Bagian</label><Input value={about.title || ''} onChange={(e) => setAbout({...about, title: e.target.value})} placeholder="Mengenal Kami" className="rounded-xl" /></div>
                <div><label className="text-sm font-medium">Tahun Pengalaman / Tag</label><Input value={about.experience_years || ''} onChange={(e) => setAbout({...about, experience_years: e.target.value})} placeholder="Unggul & Berkarakter" className="rounded-xl" /></div>
              </div>
              <div><label className="text-sm font-medium">Deskripsi Pengantar</label><Textarea value={about.description || ''} onChange={(e) => setAbout({...about, description: e.target.value})} rows={3} placeholder="Komitmen kami menghadirkan pendidikan Islam berstandar unggul..." className="rounded-xl" /></div>

              {/* Tombol Aksi Cepat */}
              <div className="space-y-3 border-t pt-4">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Tombol Aksi Cepat (CTA)
                </label>
                <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">Tombol Utama (Gelap)</label>
                    <Input 
                      value={about.cta_primary_label ?? 'Lihat Program Unggulan'} 
                      onChange={(e) => setAbout({...about, cta_primary_label: e.target.value})} 
                      placeholder="Label Tombol 1" 
                      className="rounded-lg bg-white" 
                    />
                    <Input 
                      value={about.cta_primary_link ?? '#programs'} 
                      onChange={(e) => setAbout({...about, cta_primary_link: e.target.value})} 
                      placeholder="Link/Target (contoh: #programs)" 
                      className="rounded-lg bg-white text-xs" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">Tombol Kedua (Hijau Muda)</label>
                    <Input 
                      value={about.cta_secondary_label ?? 'Pendaftaran SPMB Online'} 
                      onChange={(e) => setAbout({...about, cta_secondary_label: e.target.value})} 
                      placeholder="Label Tombol 2" 
                      className="rounded-lg bg-white" 
                    />
                    <Input 
                      value={about.cta_secondary_link ?? '/spmb'} 
                      onChange={(e) => setAbout({...about, cta_secondary_link: e.target.value})} 
                      placeholder="Link/Target (contoh: /spmb)" 
                      className="rounded-lg bg-white text-xs" 
                    />
                  </div>
                </div>
              </div>

              {/* 4 Kartu Sorotan Bawah (Highlights) */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> 4 Kartu Sorotan Unggulan (Baris Bawah)
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAbout({
                        ...about,
                        highlights: [
                          { label: 'Terakreditasi A', sub: 'Unggul & Berkualitas' },
                          { label: 'Pembelajaran Digital', sub: 'Si@Kad Integrated' },
                          { label: 'Tahfidz & Tartil', sub: 'Bimbingan Rutin' },
                          { label: 'Ekstrakurikuler', sub: 'Bakat & Minat' },
                        ]
                      });
                      showSuccess('4 Kartu Sorotan diatur ke standar!');
                    }}
                    className="h-7 text-xs"
                  >
                    Reset Standar
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Kartu-kartu kecil yang tampil di bawah bagian "Tentang" pada halaman depan.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(about.highlights && about.highlights.length === 4
                    ? about.highlights
                    : [
                        { label: 'Terakreditasi A', sub: 'Unggul & Berkualitas' },
                        { label: 'Pembelajaran Digital', sub: 'Si@Kad Integrated' },
                        { label: 'Tahfidz & Tartil', sub: 'Bimbingan Rutin' },
                        { label: 'Ekstrakurikuler', sub: 'Bakat & Minat' },
                      ]
                  ).map((h: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>Kartu #{idx + 1}</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Judul Kartu</label>
                        <Input
                          value={h.label}
                          onChange={(e) => {
                            const current = about.highlights && about.highlights.length === 4
                              ? [...about.highlights]
                              : [
                                  { label: 'Terakreditasi A', sub: 'Unggul & Berkualitas' },
                                  { label: 'Pembelajaran Digital', sub: 'Si@Kad Integrated' },
                                  { label: 'Tahfidz & Tartil', sub: 'Bimbingan Rutin' },
                                  { label: 'Ekstrakurikuler', sub: 'Bakat & Minat' },
                                ];
                            current[idx] = { ...current[idx], label: e.target.value };
                            setAbout({ ...about, highlights: current });
                          }}
                          placeholder={`Judul #${idx + 1}`}
                          className="bg-white text-xs rounded-lg h-9 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Sub-teks (Hijau)</label>
                        <Input
                          value={h.sub}
                          onChange={(e) => {
                            const current = about.highlights && about.highlights.length === 4
                              ? [...about.highlights]
                              : [
                                  { label: 'Terakreditasi A', sub: 'Unggul & Berkualitas' },
                                  { label: 'Pembelajaran Digital', sub: 'Si@Kad Integrated' },
                                  { label: 'Tahfidz & Tartil', sub: 'Bimbingan Rutin' },
                                  { label: 'Ekstrakurikuler', sub: 'Bakat & Minat' },
                                ];
                            current[idx] = { ...current[idx], sub: e.target.value };
                            setAbout({ ...about, highlights: current });
                          }}
                          placeholder={`Sub #${idx + 1}`}
                          className="bg-white text-xs rounded-lg h-9 text-emerald-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visi & Misi */}
              <div className="space-y-3 border-t pt-4">
                <label className="text-sm font-bold text-slate-800">Visi Madrasah</label>
                <Textarea 
                  value={about.vision || ''} 
                  onChange={(e) => setAbout({...about, vision: e.target.value})} 
                  rows={2} 
                  placeholder="Terwujudnya Generasi Islam yang Unggul dalam Prestasi..." 
                  className="rounded-xl" 
                />
              </div>

              <Button onClick={() => handleSave('about', about)} disabled={saving || !!uploading} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-8 font-bold"><Save className="w-4 h-4 mr-2" />Simpan Perubahan Tentang</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Program Unggulan</CardTitle>
              <Button onClick={addProgram} size="sm" className="bg-emerald-500 text-white rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Tambah Program
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {programs.list.map((prog, index) => (
                  <div key={index} className="p-4 border rounded-xl bg-gray-50 relative group">
                    <button 
                      onClick={() => removeProgram(index)}
                      className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Judul Program</label>
                          <Input value={prog.title} onChange={(e) => updateProgram(index, 'title', e.target.value)} className="rounded-lg" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Deskripsi</label>
                          <Textarea value={prog.description} onChange={(e) => updateProgram(index, 'description', e.target.value)} rows={2} className="rounded-lg" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Ikon</label>
                          <select 
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={prog.icon}
                            onChange={(e) => updateProgram(index, 'icon', e.target.value)}
                          >
                            {iconOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Warna</label>
                          <select 
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={prog.color}
                            onChange={(e) => updateProgram(index, 'color', e.target.value)}
                          >
                            {colorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => handleSave('programs', programs)} disabled={saving} className="bg-emerald-500 text-white rounded-xl h-12 px-8 font-bold">
                <Save className="w-4 h-4 mr-2" /> Simpan Semua Program
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Pengaturan Menu & Tampilan Footer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Running Text Footer Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white shadow-md border border-emerald-800/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                      <Megaphone className="w-5 h-5 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        Running Text Footer (Tulisan Berjalan)
                      </h3>
                      <p className="text-xs text-emerald-300/80">
                        Papan berita pengumuman berjalan yang tampil pada bagian atas Footer & Sticky Ticker.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleOpenAddRunningTextModal}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl h-9 px-3.5 shadow-md"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Tambah Running Text Baru
                    </Button>

                    {/* Switch Aktif / Non-Aktif */}
                    <div className="flex items-center gap-2 bg-slate-950/80 border border-emerald-700/50 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                      <span className="text-xs font-bold text-slate-300">Status:</span>
                      <Switch
                        checked={runningText.enabled}
                        onCheckedChange={(checked) => {
                          const updated = { ...runningText, enabled: checked };
                          setRunningText(updated);
                          handleSave('running_text', updated);
                        }}
                      />
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                        runningText.enabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {runningText.enabled ? 'AKTIF' : 'NON-AKTIF'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Textarea & Fast Presets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-200">
                      Teks Pengumuman Running Text Footer:
                    </label>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      {runningText.enabled ? '🟢 Ditampilkan di Footer' : '🔴 Sedang Dinonaktifkan'}
                    </span>
                  </div>

                  <Textarea
                    rows={3}
                    placeholder="Tuliskan pesan / pengumuman running text footer di sini..."
                    value={runningText.text}
                    onChange={(e) => setRunningText({ ...runningText, text: e.target.value })}
                    className="rounded-xl bg-slate-950 border-emerald-700/60 text-emerald-100 placeholder:text-slate-500 font-medium text-sm focus:ring-emerald-500"
                  />

                  {/* Fast Presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400">Pilih Preset Cepat:</span>
                    <button
                      type="button"
                      onClick={() => setRunningText({ ...runningText, text: 'Selamat Datang di Si@Kad Madrasah! SPMB Tahun Pelajaran 2026/2027 Telah Resmi Dibuka.' })}
                      className="text-[10px] bg-slate-800 hover:bg-emerald-900 border border-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg transition-colors font-medium"
                    >
                      + SPMB Opened
                    </button>
                    <button
                      type="button"
                      onClick={() => setRunningText({ ...runningText, text: 'Pengumuman: Penilaian Akhir Semester (PAS) dilaksanakan mulai tanggal 15 Desember. Harap persiapkan diri!' })}
                      className="text-[10px] bg-slate-800 hover:bg-emerald-900 border border-slate-700 text-amber-300 px-2.5 py-1 rounded-lg transition-colors font-medium"
                    >
                      + Ujian PAS
                    </button>
                    <button
                      type="button"
                      onClick={() => setRunningText({ ...runningText, text: 'Selamat dan Sukses atas Prestasi Para Siswa dalam Lomba AKSIOMA & Kompetensi Sains Madrasah (KSM).' })}
                      className="text-[10px] bg-slate-800 hover:bg-emerald-900 border border-slate-700 text-teal-300 px-2.5 py-1 rounded-lg transition-colors font-medium"
                    >
                      + Ucapan Prestasi
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                        Judul Badge Label (Kiri)
                      </label>
                      <Input
                        placeholder="INFORMASI FOOTER"
                        value={runningText.badge}
                        onChange={(e) => setRunningText({ ...runningText, badge: e.target.value })}
                        className="rounded-xl bg-slate-950 border-emerald-800 text-white text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                        Arah & Kecepatan Berjalan
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="w-full h-9 rounded-xl border border-emerald-800 bg-slate-950 text-white px-2 text-xs font-semibold"
                          value={runningText.direction}
                          onChange={(e) => setRunningText({ ...runningText, direction: e.target.value })}
                        >
                          <option value="right_to_left">➡️ Kanan ke Kiri</option>
                          <option value="left_to_right">⬅️ Kiri ke Kanan</option>
                        </select>
                        <select
                          className="w-full h-9 rounded-xl border border-emerald-800 bg-slate-950 text-white px-2 text-xs font-semibold"
                          value={runningText.speed}
                          onChange={(e) => setRunningText({ ...runningText, speed: e.target.value })}
                        >
                          <option value="slow">🐢 Lambat</option>
                          <option value="normal">⚡ Sedang</option>
                          <option value="fast">🚀 Cepat</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-emerald-800/40">
                    <p className="text-[11px] text-slate-400 italic">
                      * Perubahan Teks Running Text Footer akan langsung tersimpan & tayang di bagian bawah halaman.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        handleSave('running_text', runningText);
                        showSuccess('Running text footer berhasil disimpan & diperbarui!');
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl h-9 px-4 text-xs shadow-md"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Simpan Running Text
                    </Button>
                  </div>
                </div>
              </div>

              {/* Menu Cepat (Quick Links) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Menu Cepat (Quick Links)
                  </h3>
                  <Button onClick={addQuickLink} size="sm" variant="outline" className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Menu
                  </Button>
                </div>
                <div className="grid gap-3">
                  {footer.quick_links?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50/50">
                      <div className="flex-1 grid md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Nama Menu"
                          value={item.name}
                          onChange={(e) => updateQuickLink(idx, 'name', e.target.value)}
                          className="rounded-lg bg-white"
                        />
                        <Input
                          placeholder="Link Target (e.g. #about atau /spmb)"
                          value={item.href}
                          onChange={(e) => updateQuickLink(idx, 'href', e.target.value)}
                          className="rounded-lg bg-white"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeQuickLink(idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Program Kami Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Program Kami (Footer Links)
                  </h3>
                  <Button onClick={addProgramLink} size="sm" variant="outline" className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Program
                  </Button>
                </div>
                <div className="grid gap-3">
                  {footer.programs_links?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50/50">
                      <div className="flex-1 grid md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Nama Program"
                          value={item.name}
                          onChange={(e) => updateProgramLink(idx, 'name', e.target.value)}
                          className="rounded-lg bg-white"
                        />
                        <Input
                          placeholder="Link Target (e.g. #programs)"
                          value={item.href}
                          onChange={(e) => updateProgramLink(idx, 'href', e.target.value)}
                          className="rounded-lg bg-white"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeProgramLink(idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-bold text-gray-700">Link Media Sosial</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Facebook URL</label>
                    <Input
                      placeholder="https://facebook.com/..."
                      value={footer.facebook || ''}
                      onChange={(e) => setFooter({ ...footer, facebook: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Instagram URL</label>
                    <Input
                      placeholder="https://instagram.com/..."
                      value={footer.instagram || ''}
                      onChange={(e) => setFooter({ ...footer, instagram: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">YouTube URL</label>
                    <Input
                      placeholder="https://youtube.com/..."
                      value={footer.youtube || ''}
                      onChange={(e) => setFooter({ ...footer, youtube: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Twitter / X URL</label>
                    <Input
                      placeholder="https://twitter.com/..."
                      value={footer.twitter || ''}
                      onChange={(e) => setFooter({ ...footer, twitter: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Bar Info */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-bold text-gray-700">Teks Hak Cipta & Pengembang</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Teks Hak Cipta (Kiri)</label>
                    <Input
                      placeholder="Kosongkan untuk otomatis © 2025 Nama Sekolah"
                      value={footer.copyright_text || ''}
                      onChange={(e) => setFooter({ ...footer, copyright_text: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Pengembang (Developed By)</label>
                    <Input
                      placeholder="Jaenal Maskun, S.Pd.I"
                      value={footer.developer_name || ''}
                      onChange={(e) => setFooter({ ...footer, developer_name: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave('footer', footer)} disabled={saving} className="bg-emerald-500 text-white rounded-xl h-12 px-8 font-bold w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" /> Simpan Pengaturan Footer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sticky_footer">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-lg font-bold">Pengaturan Menu Sticky Footer (Navigasi Bawah Mobile)</span>
                  <p className="text-xs font-normal text-gray-500 mt-1">
                    Atur menu navigasi melayang yang muncul di bagian bawah layar ponsel/HP. Anda dapat menambah, mengubah nama, ikon, dan link tujuan.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button onClick={syncStickyFromWebFooter} size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl">
                    <Share2 className="w-4 h-4 mr-1" /> Samakan dengan Menu Footer Web
                  </Button>
                  <Button onClick={addStickyItem} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                    <Plus className="w-4 h-4 mr-1" /> Tambah Menu
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {stickyFooter.items?.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all space-y-3">
                    <div className="flex items-center justify-between gap-3 border-b pb-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                        Item Menu #{idx + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStickyItem(idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs h-8 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Label Menu</label>
                        <Input
                          placeholder="misal: Beranda, SPMB"
                          value={item.label || ''}
                          onChange={(e) => updateStickyItem(idx, 'label', e.target.value)}
                          className="rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Link Target / Halaman</label>
                        <Input
                          placeholder="misal: / atau /spmb atau /ai-teaching"
                          value={item.path || ''}
                          onChange={(e) => updateStickyItem(idx, 'path', e.target.value)}
                          className="rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ikon Menu</label>
                        <select
                          className="w-full h-10 rounded-xl border border-input bg-white px-3 py-2 text-sm"
                          value={item.icon_name || 'Home'}
                          onChange={(e) => updateStickyItem(idx, 'icon_name', e.target.value)}
                        >
                          {availableIcons.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(!stickyFooter.items || stickyFooter.items.length === 0) && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Belum ada menu sticky footer. Klik "Tambah Menu" di atas untuk menambahkan.
                </div>
              )}

              <Button 
                onClick={() => handleSave('sticky_footer', stickyFooter)} 
                disabled={saving} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-8 font-bold w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" /> Simpan Menu Sticky Footer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="running_text">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-lg font-bold flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-emerald-600" /> Pengaturan Papan Informasi & Running Text (Tulisan Berjalan)
                  </span>
                  <p className="text-xs font-normal text-gray-500 mt-1">
                    Atur papan berita / teks pengumuman melayang yang berjalan secara terus-menerus tepat di atas Sticky Footer.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleOpenAddRunningTextModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl h-10 px-4 shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Tambah Running Text Baru
                  </Button>

                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
                    <span className="text-xs font-bold text-emerald-800">Status Utama:</span>
                    <Switch
                      checked={runningText.enabled}
                      onCheckedChange={(checked) => {
                        const updated = { ...runningText, enabled: checked };
                        setRunningText(updated);
                        handleSave('running_text', updated);
                      }}
                    />
                    <span className={`text-xs font-extrabold ${runningText.enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {runningText.enabled ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Live Preview Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Pratinjau Tampilan Papan Informasi (Live Preview):
                </label>
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-900 text-white space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-white/10 p-1.5 bg-slate-950 flex items-center gap-2">
                    <div className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold tracking-wide uppercase text-white ${
                      runningText.bg_color === 'emerald' ? 'bg-emerald-600' :
                      runningText.bg_color === 'dark' ? 'bg-amber-500 text-slate-950' :
                      runningText.bg_color === 'indigo' ? 'bg-indigo-600' :
                      runningText.bg_color === 'amber' ? 'bg-amber-500 text-slate-950' : 'bg-rose-600'
                    }`}>
                      {(() => {
                        const activeList = (Array.isArray(runningText.archive) ? runningText.archive : []).filter((i: any) => i.is_active === true || (typeof i.is_active !== 'boolean' && i.text === runningText.text));
                        return activeList.length > 1 ? `${activeList.length} PENGUMUMAN` : (runningText.badge || 'INFORMASI');
                      })()}
                    </div>
                    <div className="flex-1 overflow-hidden relative select-none">
                      <div 
                        className={`whitespace-nowrap animate-marquee-pause ${runningText.direction === 'right_to_left' ? 'animate-marquee-rtl' : 'animate-marquee-ltr'}`}
                        style={{ animationDuration: runningText.speed === 'slow' ? '35s' : runningText.speed === 'fast' ? '12s' : '20s' }}
                      >
                        {(() => {
                          const rawList = Array.isArray(runningText.archive) ? runningText.archive : [];
                          const activeList = rawList.filter((i: any) => i.is_active === true || (typeof i.is_active !== 'boolean' && i.text === runningText.text));
                          const itemsToRender = activeList.length > 0 ? activeList : [{ badge: runningText.badge || 'INFORMASI', text: runningText.text || 'Tulis pesan pengumuman di bawah...' }];
                          
                          return (
                            <span className="inline-flex items-center">
                              {itemsToRender.map((item: any, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-2 mr-6 text-[11px] sm:text-xs font-semibold">
                                  <span className="bg-amber-400 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                                    {item.badge || 'INFO'}
                                  </span>
                                  <span>{item.text}</span>
                                  <span className="opacity-40 font-bold ml-2">•</span>
                                </span>
                              ))}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    {runningText.link_url && (
                      <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded font-bold shrink-0">
                        {runningText.link_label || 'Detail'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    * Papan informasi di atas otomatis akan tampil melayang persis di atas Sticky Footer di seluruh halaman publik website. Jika ada beberapa running text diaktifkan, semuanya akan berjalan bersamaan.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Teks Pesan / Informasi */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Teks Pengumuman Running Text <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Masukkan kalimat pengumuman running text yang ingin ditampilkan..."
                    value={runningText.text}
                    onChange={(e) => setRunningText({ ...runningText, text: e.target.value })}
                    className="rounded-xl bg-white border-slate-300 font-medium text-sm"
                  />
                  <p className="text-[11px] text-gray-500">
                    Tips: Buat kalimat ringkas, padat, dan jelas agar mudah dibaca saat tulisan berjalan.
                  </p>
                </div>

                {/* Badge Label */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Judul Badge Papan Informasi (Kiri)
                  </label>
                  <Input
                    placeholder="misal: INFORMASI, PENGUMUMAN, SPMB 2025"
                    value={runningText.badge}
                    onChange={(e) => setRunningText({ ...runningText, badge: e.target.value })}
                    className="rounded-xl bg-white"
                  />
                </div>

                {/* Arah Gerak Tulisan */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Arah Berjalan Tulisan
                  </label>
                  <select
                    className="w-full h-10 rounded-xl border border-input bg-white px-3 py-2 text-sm font-semibold"
                    value={runningText.direction}
                    onChange={(e) => setRunningText({ ...runningText, direction: e.target.value })}
                  >
                    <option value="left_to_right">⬅️ Dari Kiri ke Kanan (Left to Right)</option>
                    <option value="right_to_left">➡️ Dari Kanan ke Kiri (Right to Left)</option>
                  </select>
                </div>

                {/* Kecepatan Gerak */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Kecepatan Alur Berjalan
                  </label>
                  <select
                    className="w-full h-10 rounded-xl border border-input bg-white px-3 py-2 text-sm font-semibold"
                    value={runningText.speed}
                    onChange={(e) => setRunningText({ ...runningText, speed: e.target.value })}
                  >
                    <option value="slow">🐢 Lambat (35 detik - Mudah Dibaca)</option>
                    <option value="normal">⚡ Sedang (20 detik - Standar)</option>
                    <option value="fast">🚀 Cepat (12 detik)</option>
                  </select>
                </div>

                {/* Tema Warna */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tema Warna Papan Informasi
                  </label>
                  <select
                    className="w-full h-10 rounded-xl border border-input bg-white px-3 py-2 text-sm font-semibold"
                    value={runningText.bg_color}
                    onChange={(e) => setRunningText({ ...runningText, bg_color: e.target.value })}
                  >
                    <option value="emerald">🟢 Emerald Kemenag (Hijau Tua Nuansa Islami)</option>
                    <option value="dark">⚫ Dark Slate (Hitam Elegan Accent Gold)</option>
                    <option value="indigo">🔵 Indigo Premium (Biru Gelap Modern)</option>
                    <option value="amber">🟡 Amber Gold (Emas Mewah)</option>
                    <option value="rose">🔴 Rose Marun (Merah Mewah)</option>
                  </select>
                </div>

                {/* URL Link Tambahan */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tautan/URL Tombol Tambahan (Opsional)
                  </label>
                  <Input
                    placeholder="misal: /spmb atau /calendar atau https://..."
                    value={runningText.link_url}
                    onChange={(e) => setRunningText({ ...runningText, link_url: e.target.value })}
                    className="rounded-xl bg-white"
                  />
                </div>

                {/* Label Tombol Tautan */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Label Teks Tombol Tautan
                  </label>
                  <Input
                    placeholder="misal: Daftar Sekarang, Lihat Jadwal"
                    value={runningText.link_label}
                    onChange={(e) => setRunningText({ ...runningText, link_label: e.target.value })}
                    className="rounded-xl bg-white"
                  />
                </div>

                {/* Option: Close Button */}
                <div className="md:col-span-2 flex items-center gap-3 p-3 bg-slate-50 border rounded-xl">
                  <input
                    type="checkbox"
                    id="showCloseBtn"
                    checked={runningText.show_close_button}
                    onChange={(e) => setRunningText({ ...runningText, show_close_button: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="showCloseBtn" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Tampilkan tombol silang tutup (X) agar pengunjung bisa menutup papan informasi jika mengganggu
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button 
                  onClick={() => {
                    const textToArchive = runningText.text?.trim();
                    const updatedArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
                    if (textToArchive) {
                      const exists = updatedArchive.some(item => item.text?.trim() === textToArchive);
                      if (!exists) {
                        updatedArchive.unshift({
                          id: Date.now().toString(),
                          text: textToArchive,
                          badge: runningText.badge || 'INFORMASI MADRASAH',
                          direction: runningText.direction || 'right_to_left',
                          speed: runningText.speed || 'normal',
                          bg_color: runningText.bg_color || 'emerald',
                          link_url: runningText.link_url || '',
                          link_label: runningText.link_label || 'Lihat Detail',
                          created_at: new Date().toISOString()
                        });
                      }
                    }
                    const finalData = { ...runningText, archive: updatedArchive };
                    setRunningText(finalData);
                    handleSave('running_text', finalData);
                  }} 
                  disabled={saving} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8 font-bold w-full sm:w-auto shadow-md"
                >
                  <Save className="w-4 h-4 mr-2" /> Simpan Pengaturan Running Text
                </Button>

                <Button
                  type="button"
                  onClick={handleAddCurrentToArchive}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl h-12 px-5 font-bold w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2 text-emerald-600" /> Simpan Teks Ini Ke Arsip Saja
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card Arsip Running Text */}
          <Card className="border-0 shadow-lg mt-6 bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                    <History className="w-5 h-5 text-emerald-600" /> Arsip Running Text (Riwayat Pengumuman)
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Seluruh teks running text yang pernah dibuat tersimpan secara otomatis di sini. Anda dapat memilih dan menerapkan kembali pesan ke website kapan saja.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-emerald-600" />
                    {(runningText.archive || []).length} Tersimpan
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {/* Active Counter & Batch Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/80 border border-emerald-200/80 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    {(Array.isArray(runningText.archive) ? runningText.archive : []).filter(i => i.is_active === true || (typeof i.is_active !== 'boolean' && i.text === runningText.text)).length}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-emerald-950">
                      Multi-Running Text Aktif
                    </p>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      {(Array.isArray(runningText.archive) ? runningText.archive : []).filter(i => i.is_active === true || (typeof i.is_active !== 'boolean' && i.text === runningText.text)).length} dari {(Array.isArray(runningText.archive) ? runningText.archive : []).length} pengumuman dapat berjalan bersamaan di website.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleActivateAllRunningTexts}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl h-8 px-3 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aktifkan Semua
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDeactivateAllRunningTexts}
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl h-8 px-3"
                  >
                    <X className="w-3.5 h-3.5 mr-1 text-slate-500" /> Nonaktifkan Semua
                  </Button>
                </div>
              </div>

              {/* Filter Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Cari teks running text atau badge di arsip..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="pl-9 pr-9 bg-white border-slate-300 rounded-xl text-xs h-10"
                />
                {archiveSearch && (
                  <button 
                    onClick={() => setArchiveSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Archive Item List */}
              {(() => {
                const rawArchive = Array.isArray(runningText.archive) ? runningText.archive : [];
                const filteredArchive = rawArchive.filter(item => {
                  if (!archiveSearch.trim()) return true;
                  const query = archiveSearch.toLowerCase();
                  return (
                    item.text?.toLowerCase().includes(query) ||
                    item.badge?.toLowerCase().includes(query)
                  );
                });

                if (rawArchive.length === 0) {
                  return (
                    <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">Belum Ada Arsip Running Text</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Setiap kali Anda menyimpan running text baru di atas, pesannya akan tersimpan secara otomatis di daftar arsip ini.
                      </p>
                    </div>
                  );
                }

                if (filteredArchive.length === 0) {
                  return (
                    <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500">Tidak ada arsip yang cocok dengan pencarian "{archiveSearch}".</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredArchive.map((item, idx) => {
                      const itemIsActive = typeof item.is_active === 'boolean'
                        ? item.is_active
                        : (runningText.text === item.text && runningText.enabled);
                      const isCurrentlyActiveInApp = itemIsActive && runningText.enabled;
                      const themeKey = item.bg_color || 'emerald';

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-4 rounded-2xl border transition-all duration-200 ${
                            isCurrentlyActiveInApp
                              ? 'bg-emerald-50/70 border-emerald-400 shadow-xs ring-1 ring-emerald-400/30'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex flex-col gap-3">
                            {/* Top info row */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Badge Theme Tag */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide text-white inline-flex items-center gap-1.5 ${
                                  themeKey === 'emerald' ? 'bg-emerald-600' :
                                  themeKey === 'dark' ? 'bg-slate-900 text-amber-400' :
                                  themeKey === 'indigo' ? 'bg-indigo-600' :
                                  themeKey === 'amber' ? 'bg-amber-500 text-slate-950' : 'bg-rose-600'
                                }`}>
                                  <AnnouncementIcon iconId={item.icon} className="w-3.5 h-3.5" />
                                  <span>{item.badge || 'INFORMASI'}</span>
                                </span>

                                {/* Active status tag */}
                                {isCurrentlyActiveInApp ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                    AKTIF DI WEBSITE
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                    NON-AKTIF
                                  </span>
                                )}

                                {/* Direction & Speed tags */}
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  {item.direction === 'left_to_right' ? '⬅️ Kiri ke Kanan' : '➡️ Kanan ke Kiri'} • {
                                    item.speed === 'slow' ? '🐢 Lambat' :
                                    item.speed === 'fast' ? '🚀 Cepat' : '⚡ Sedang'
                                  }
                                </span>
                              </div>

                              {/* Toggle Switch & Timestamp */}
                              <div className="flex items-center gap-3">
                                {item.created_at && (
                                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {new Date(item.created_at).toLocaleString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}

                                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-600">Status:</span>
                                  <Switch
                                    checked={itemIsActive}
                                    onCheckedChange={() => handleToggleActivateItem(item)}
                                  />
                                  <span className={`text-[10px] font-extrabold ${itemIsActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                                    {itemIsActive ? 'Aktif' : 'Off'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Text message box */}
                            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 font-medium text-xs sm:text-sm leading-relaxed">
                              {item.text}
                            </div>

                            {/* Link detail if present */}
                            {item.link_url && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-fit">
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-semibold">{item.link_label || 'Tautan'}:</span>
                                <span className="text-slate-500 underline font-mono text-[11px]">{item.link_url}</span>
                              </div>
                            )}

                            {/* Actions bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  onClick={() => handleToggleActivateItem(item)}
                                  size="sm"
                                  className={`text-xs font-bold rounded-xl h-8 px-3 ${
                                    itemIsActive
                                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-xs'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  }`}
                                >
                                  {itemIsActive ? (
                                    <>
                                      <X className="w-3.5 h-3.5 mr-1" /> Non-Aktifkan
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1" /> Aktifkan Teks Ini
                                    </>
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  onClick={() => handleOpenEditRunningTextModal(item)}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl h-8 px-3 border-slate-300"
                                >
                                  <Pencil className="w-3.5 h-3.5 mr-1 text-slate-600" /> Edit
                                </Button>

                                <Button
                                  type="button"
                                  onClick={() => handleCopyArchiveText(item.text, item.id || idx.toString())}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl h-8 px-3"
                                >
                                  {copiedId === (item.id || idx.toString()) ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Tersalin!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" /> Salin Teks
                                    </>
                                  )}
                                </Button>
                              </div>

                              <Button
                                type="button"
                                onClick={() => handleDeleteArchiveItem(item.id)}
                                variant="ghost"
                                size="sm"
                                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-8 px-2.5"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="page_loader" className="space-y-6">
          {/* Sub-tab Switcher: Si@Kad Publik vs Ruang Kerja Guru */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 text-white shadow-xl">
            <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setLoaderSubTab('portal')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  loaderSubTab === 'portal'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 ring-2 ring-emerald-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-300" />
                <span>🏛️ Loader Aplikasi Si@Kad (Beranda & Publik)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                  pageLoader.portal.enabled ? 'bg-emerald-400/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                }`}>
                  {pageLoader.portal.enabled ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLoaderSubTab('ruang_guru')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  loaderSubTab === 'ruang_guru'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-950/50 ring-2 ring-teal-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-teal-300" />
                <span>🎓 Loader Ruang Kerja Guru (/ruang-guru)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                  pageLoader.ruang_guru.enabled ? 'bg-teal-400/20 text-teal-300' : 'bg-slate-700 text-slate-400'
                }`}>
                  {pageLoader.ruang_guru.enabled ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </button>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 px-2">
              <Button
                type="button"
                onClick={() => setIsPreviewLoaderOpen(true)}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl text-xs font-bold h-10 px-4 flex items-center gap-1.5 shrink-0"
              >
                <Eye className="w-4 h-4 text-emerald-300" /> Uji Coba {loaderSubTab === 'portal' ? 'Portal' : 'Ruang Guru'}
              </Button>
              <Button
                type="button"
                onClick={() => handleSave('page_loader', pageLoader)}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 shrink-0"
              >
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Semua'}
              </Button>
            </div>
          </div>

          {/* Banner Active Target */}
          <Card className={`border-0 shadow-lg text-white rounded-3xl overflow-hidden relative transition-all ${
            loaderSubTab === 'portal'
              ? 'bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950'
              : 'bg-gradient-to-r from-slate-900 via-teal-950 to-cyan-950'
          }`}>
            <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <CardContent className="p-6 sm:p-7 relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                    {loaderSubTab === 'portal' ? (
                      <>
                        <Globe className="w-3.5 h-3.5" /> Mengatur Loader: Beranda & Publik Si@Kad
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-3.5 h-3.5" /> Mengatur Loader: Ruang Kerja Guru & GTK
                      </>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    {loaderSubTab === 'portal' ? 'Page Loader Aplikasi Si@Kad (Publik)' : 'Page Loader Ruang Kerja Guru GTK'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    {loaderSubTab === 'portal'
                      ? 'Konfigurasi animasi pembuka saat pengunjung, wali siswa, atau umum membuka portal utama dan beranda Si@Kad.'
                      : 'Konfigurasi animasi sapaan eksklusif saat bapak/ibu guru membuka portal mandiri Ruang Kerja Guru (/ruang-guru).'}
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons for Selected Sub-Tab */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Pilihan Cepat / Preset 1-Klik ({loaderSubTab === 'portal' ? 'Portal Si@Kad' : 'Ruang Guru'}):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {loaderSubTab === 'portal' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPageLoader(prev => ({
                            ...prev,
                            portal: {
                              ...prev.portal,
                              enabled: true,
                              loader_style: 'islamic_emerald',
                              bg_theme: 'emerald_dark',
                              icon_type: 'logo',
                              animation_type: 'bounce',
                              title: general.school_name || 'Si@Kad Madrasah',
                              subtitle: 'Sistem Informasi Akademik Madrasah',
                              tagline: "Membangun Generasi Unggul Berkarakter Qur'ani",
                              show_progress_bar: true,
                              progress_duration: 1000,
                            }
                          }));
                          showSuccess('Preset "Si@Kad Madrasah Official" diterapkan ke Loader Portal!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="font-bold text-white block">🏛️ Madrasah Official</span>
                        <span className="text-[10px] text-emerald-300">Logo Madrasah + Slogan EMIS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageLoader(prev => ({
                            ...prev,
                            portal: {
                              ...prev.portal,
                              enabled: true,
                              loader_style: 'islamic_emerald',
                              bg_theme: 'gradient_mesh',
                              icon_type: 'book',
                              animation_type: 'pulse',
                              title: 'Si@Kad Digital Portal',
                              subtitle: 'Menyiapkan Data & Informasi Akademik...',
                              tagline: 'Sistem Terintegrasi & Modern',
                              show_progress_bar: true,
                              progress_duration: 900,
                            }
                          }));
                          showSuccess('Preset "Islamic Modern" diterapkan ke Loader Portal!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="font-bold text-white block">📖 Islamic Modern</span>
                        <span className="text-[10px] text-teal-300">Al-Quran + Mesh + Pulse</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageLoader(prev => ({
                            ...prev,
                            portal: {
                              ...prev.portal,
                              enabled: true,
                              loader_style: 'glassmorphism',
                              bg_theme: 'blue_dark',
                              icon_type: 'school',
                              animation_type: 'float',
                              title: general.school_name || 'Madrasah Hebat Bermartabat',
                              subtitle: 'Pusat Keunggulan Pendidikan Islam',
                              tagline: 'Amanah, Unggul & Berkarakter',
                              show_progress_bar: true,
                              progress_duration: 1000,
                            }
                          }));
                          showSuccess('Preset "Glassmorphism Campus" diterapkan ke Loader Portal!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="font-bold text-white block">🏫 Glassmorphism Campus</span>
                        <span className="text-[10px] text-sky-300">Gedung + Frosted Blur</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageLoader(prev => ({
                            ...prev,
                            portal: {
                              ...prev.portal,
                              enabled: true,
                              loader_style: 'minimalist',
                              bg_theme: 'slate_dark',
                              icon_type: 'sparkles',
                              animation_type: 'orbit',
                              title: 'Si@Kad Fast Portal',
                              subtitle: 'Sinkronisasi Cepat...',
                              tagline: 'Akses Real-time 24/7',
                              show_progress_bar: true,
                              progress_duration: 600,
                            }
                          }));
                          showSuccess('Preset "Minimalist Fast" diterapkan ke Loader Portal!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="font-bold text-white block">⚡ Minimalist Fast</span>
                        <span className="text-[10px] text-cyan-300">Cincin Spin + Kilau Bersih (0.6s)</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPageLoader(prev => ({
                            ...prev,
                            ruang_guru: {
                              ...prev.ruang_guru,
                              enabled: true,
                              loader_style: 'islamic_emerald',
                              bg_theme: 'emerald_dark',
                              icon_type: 'graduation',
                              animation_type: 'bounce',
                              title: 'Ruang Kerja Guru & Pendidik',
                              subtitle: 'Menyiapkan Portal & Administrasi GTK...',
                              tagline: 'Akses Mandiri Pendidik & Tenaga Kependidikan',
                              show_progress_bar: true,
                              progress_duration: 800,
                            }
                          }));
                          showSuccess('Preset "Ruang Guru Eksklusif" diterapkan!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="font-bold text-white block">🎓 Ruang Guru Eksklusif</span>
                        <span className="text-[10px] text-emerald-300">Toga + Emerald Dark + GTK</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageLoader(prev => ({
                            ...prev,
                            ruang_guru: {
                              ...prev.ruang_guru,
                              enabled: true,
                              loader_style: 'academic_dark',
                              bg_theme: 'slate_dark',
                              icon_type: 'book',
                              animation_type: 'spin',
                              title: 'Portal Guru & Modul Ajar',
                              subtitle: 'Memuat RPP, Silabus & Administrasi GTK...',
                              tagline: 'Mendidik dengan Hati, Membangun Generasi',
                              show_progress_bar: true,
                              progress_duration: 800,
                            }
                          }));
                          showSuccess('Preset "Academic Dark GTK" diterapkan!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="font-bold text-white block">🌙 Academic Dark GTK</span>
                        <span className="text-[10px] text-amber-300">Buku + Dark Slate + Gold</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageLoader(prev => ({
                            ...prev,
                            ruang_guru: {
                              ...prev.ruang_guru,
                              enabled: true,
                              loader_style: 'glassmorphism',
                              bg_theme: 'blue_dark',
                              icon_type: 'award',
                              animation_type: 'pulse',
                              title: 'Ruang Guru Digital GTK',
                              subtitle: 'Membuka Bank Soal & Penilaian...',
                              tagline: 'Kinerja Pendidik Profesional & Akuntabel',
                              show_progress_bar: true,
                              progress_duration: 700,
                            }
                          }));
                          showSuccess('Preset "GTK Prestasi" diterapkan!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="font-bold text-white block">🏆 GTK Prestasi</span>
                        <span className="text-[10px] text-teal-300">Medali + Frosted Blur</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageLoader(prev => ({
                            ...prev,
                            ruang_guru: {
                              ...prev.ruang_guru,
                              enabled: true,
                              loader_style: 'minimalist',
                              bg_theme: 'emerald_dark',
                              icon_type: 'graduation',
                              animation_type: 'float',
                              title: 'Ruang Kerja Guru',
                              subtitle: 'Pemuatan Singkat GTK...',
                              tagline: 'Siap Mengajar & Berbagi',
                              show_progress_bar: true,
                              progress_duration: 500,
                            }
                          }));
                          showSuccess('Preset "GTK Ultra Fast" diterapkan!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="font-bold text-white block">⚡ GTK Ultra Fast</span>
                        <span className="text-[10px] text-emerald-300">Responsif Kilat (0.5s)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setting Grid for Current Sub-Tab */}
          {(() => {
            const currentCfg = pageLoader[loaderSubTab];
            const updateCurrent = (patch: Partial<typeof currentCfg>) => {
              setPageLoader(prev => ({
                ...prev,
                [loaderSubTab]: {
                  ...prev[loaderSubTab],
                  ...patch
                }
              }));
            };

            return (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Card 1: Status Aktivasi & Garis Progres */}
                <Card className="border-0 shadow-lg bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Status Aktivasi & Opsi Tampilan ({loaderSubTab === 'portal' ? 'Portal Si@Kad' : 'Ruang Guru'})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Aktifkan atau nonaktifkan pemuatan animasi khusus untuk {loaderSubTab === 'portal' ? 'halaman publik' : 'ruang kerja guru'}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      currentCfg.enabled ? 'bg-emerald-50/80 border-emerald-300/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <p className={`text-xs font-bold ${currentCfg.enabled ? 'text-emerald-950' : 'text-slate-800'}`}>
                          Aktifkan Page Loader ({loaderSubTab === 'portal' ? 'Portal Si@Kad' : 'Ruang Guru'})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {loaderSubTab === 'portal'
                            ? 'Menampilkan transisi animasi saat membuka beranda Si@Kad'
                            : 'Menampilkan transisi sapaan saat guru mengakses /ruang-guru'}
                        </p>
                      </div>
                      <Switch
                        checked={currentCfg.enabled}
                        onCheckedChange={(checked) => updateCurrent({ enabled: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Tampilkan Garis Progres Dinamis (Progress Bar)</p>
                        <p className="text-[11px] text-slate-500">Garis gradien bercahaya yang bergerak di bagian bawah loader</p>
                      </div>
                      <Switch
                        checked={currentCfg.show_progress_bar !== false}
                        onCheckedChange={(checked) => updateCurrent({ show_progress_bar: checked })}
                      />
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Durasi Transisi Minimum</label>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg">
                          {currentCfg.progress_duration || 800} ms ({(Number(currentCfg.progress_duration || 800) / 1000).toFixed(1)}s)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="400"
                        max="3000"
                        step="100"
                        value={currentCfg.progress_duration || 800}
                        onChange={(e) => updateCurrent({ progress_duration: Number(e.target.value) })}
                        className="w-full accent-emerald-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>⚡ Cepat (0.4s)</span>
                        <span>⚡ Standar (0.8s - 1.0s)</span>
                        <span>🐢 Santai (3.0s)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Gaya Visual & Tema Warna */}
                <Card className="border-0 shadow-lg bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-emerald-600" />
                      Gaya Desain & Tema Latar
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Pilih nuansa estetika khusus untuk {loaderSubTab === 'portal' ? 'Portal Si@Kad' : 'Ruang Guru'}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {/* Style Variant */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Varian Gaya Desain (Loader Style)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'islamic_emerald', label: 'Islamic Emerald Glow', desc: 'Ring Hijau Khas Madrasah' },
                          { id: 'academic_dark', label: 'Academic Dark Luxury', desc: 'Elegan Gelap & Aksen Emas' },
                          { id: 'glassmorphism', label: 'Glassmorphism Frosted', desc: 'Transparan Kaca Blur' },
                          { id: 'minimalist', label: 'Minimalist Ring', desc: 'Cincin Putaran Bersih' },
                          { id: 'modern_light', label: 'Modern Light Card', desc: 'Nuansa Putih Bersih' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => updateCurrent({ loader_style: st.id as any })}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              currentCfg.loader_style === st.id
                                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 font-bold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xs block">{st.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{st.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background Theme */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Tema Warna Latar (Background Theme)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'emerald_dark', label: 'Emerald Night', color: 'bg-emerald-950 text-white' },
                          { id: 'slate_dark', label: 'Slate Obsidian', color: 'bg-slate-900 text-white' },
                          { id: 'blue_dark', label: 'Deep Indigo', color: 'bg-blue-950 text-white' },
                          { id: 'gradient_mesh', label: 'Gradient Mesh', color: 'bg-teal-900 text-white' },
                          { id: 'light', label: 'Soft Light', color: 'bg-slate-100 text-slate-900' },
                        ].map((bg) => (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => updateCurrent({ bg_theme: bg.id as any })}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                              currentCfg.bg_theme === bg.id
                                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xs">{bg.label}</span>
                            <span className={`w-3.5 h-3.5 rounded-full ${bg.color} border border-white/30`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Ikon Logo & Animasi Gerak */}
                <Card className="border-0 shadow-lg bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Pilihan Ikon & Jenis Animasi Gerakan
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Pilih ikon pusat dan tipe animasi transisi pemuatan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {/* Icon selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Pilihan Ikon / Logo Pusat</label>
                      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'logo', label: currentCfg.custom_logo_url ? 'Foto / Logo Khusus' : 'Logo Madrasah', icon: Globe },
                          { id: 'graduation', label: 'Topi Sarjana GTK', icon: GraduationCap },
                          { id: 'book', label: 'Buku / Al-Quran', icon: BookOpen },
                          { id: 'school', label: 'Gedung Madrasah', icon: School },
                          { id: 'sparkles', label: 'Kilau Prestasi', icon: Sparkles },
                          { id: 'award', label: 'Medali Prestasi', icon: Award },
                        ].map((ic) => {
                          const IconComp = ic.icon;
                          return (
                            <button
                              key={ic.id}
                              type="button"
                              onClick={() => updateCurrent({ icon_type: ic.id as any })}
                              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                                currentCfg.icon_type === ic.id
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <IconComp className="w-5 h-5 text-emerald-600" />
                              <span className="text-[11px] text-center">{ic.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Logo Upload / URL / Media Selector */}
                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">
                            Logo Khusus Loader {loaderSubTab === 'portal' ? 'Portal' : 'Ruang Guru'} (Opsional)
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Unggah logo khusus secara manual dari perangkat, pilih dari media library, atau tempel URL.
                          </p>
                        </div>
                        {currentCfg.custom_logo_url && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center gap-1 border border-emerald-300 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Logo Aktif
                          </span>
                        )}
                      </div>

                      {/* Action Bar: Upload File Manual & Media Library */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Manual Upload Button */}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            className="hidden"
                            disabled={uploading === (loaderSubTab === 'portal' ? 'page_loader_portal_logo' : 'page_loader_rg_logo')}
                            onChange={(e) => handlePageLoaderLogoUpload(e, loaderSubTab)}
                          />
                          <span className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            uploading === (loaderSubTab === 'portal' ? 'page_loader_portal_logo' : 'page_loader_rg_logo')
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-md'
                          }`}>
                            {uploading === (loaderSubTab === 'portal' ? 'page_loader_portal_logo' : 'page_loader_rg_logo') ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengunggah...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" /> Upload File Logo Manual
                              </>
                            )}
                          </span>
                        </label>

                        {/* Media Library Button */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMediaModalTarget(loaderSubTab === 'portal' ? 'page_loader_portal_logo' : 'page_loader_rg_logo')}
                          className="h-9 rounded-xl text-xs font-bold border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shrink-0"
                        >
                          <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Pilih dari Media Library
                        </Button>
                      </div>

                      {/* URL Input */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Atau Masukkan / Tempel URL Gambar Logo:
                        </label>
                        <Input
                          placeholder="https://... URL logo kustom atau gunakan logo madrasah"
                          value={currentCfg.custom_logo_url || ''}
                          onChange={(e) => updateCurrent({ custom_logo_url: e.target.value, icon_type: 'logo' })}
                          className="rounded-xl text-xs h-9 bg-white"
                        />
                      </div>

                      {/* Preview Box & Advanced Custom Styling Controls */}
                      {currentCfg.custom_logo_url ? (
                        <div className="p-4 bg-white rounded-2xl border border-emerald-200/90 space-y-4 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              {/* Live Mini Preview with Shape & Zoom */}
                              <div className={`w-16 h-16 ${
                                (currentCfg.logo_shape || 'circle') === 'circle' 
                                  ? 'rounded-full' 
                                  : 'rounded-2xl'
                              } border-2 border-emerald-500/50 relative overflow-hidden flex items-center justify-center bg-slate-900/60 backdrop-blur-md shrink-0 shadow-md`}>
                                {/* Disguised blurred background */}
                                <img
                                  src={formatImageUrl(currentCfg.custom_logo_url)}
                                  alt=""
                                  aria-hidden="true"
                                  referrerPolicy="no-referrer"
                                  className="absolute inset-0 w-full h-full object-cover blur-md scale-125 opacity-25 select-none pointer-events-none"
                                />
                                {/* Foreground Logo with Zoom */}
                                <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden p-0.5">
                                  <img
                                    src={formatImageUrl(currentCfg.custom_logo_url)}
                                    alt="Logo Loader"
                                    referrerPolicy="no-referrer"
                                    loading="eager"
                                    style={{
                                      transform: `scale(${((currentCfg.logo_zoom || 130) / 100)})`,
                                    }}
                                    className={`w-full h-full ${(currentCfg.logo_fit || 'cover') === 'contain' ? 'object-contain' : 'object-cover'} drop-shadow-md transition-transform duration-200`}
                                  />
                                </div>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-sm flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Logo Kustom Terpasang
                                </p>
                                <p className="text-[10px] text-slate-500 truncate max-w-xs sm:max-w-sm">
                                  {currentCfg.custom_logo_url}
                                </p>
                                <p className="text-[11px] text-emerald-700 font-semibold">
                                  Mode: {(currentCfg.logo_shape || 'circle') === 'circle' ? 'Bulat Presisi' : (currentCfg.logo_shape === 'soft_vignette' ? 'Pudar Lembut' : 'Kotak Membulat')} | Zoom: {currentCfg.logo_zoom || 130}%
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                  className="hidden"
                                  onChange={(e) => handlePageLoaderLogoUpload(e, loaderSubTab)}
                                />
                                <span className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer">
                                  <Upload className="w-3 h-3" /> Ganti File
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => updateCurrent({ custom_logo_url: '' })}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Hapus
                              </button>
                            </div>
                          </div>

                          {/* Shape & Masking Options */}
                          <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Bentuk Bingkai / Masking Logo (Memotong Background Bawaan):
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { id: 'circle', label: 'Bulat / Lingkaran', desc: 'Rekomendasi logo foto', icon: '⚪' },
                                { id: 'rounded', label: 'Kotak Membulat', desc: 'Sudut melengkung', icon: '🔲' },
                                { id: 'soft_vignette', label: 'Pudar Lembut', desc: 'Radial blend halus', icon: '🌫️' },
                              ].map((sh) => (
                                <button
                                  key={sh.id}
                                  type="button"
                                  onClick={() => updateCurrent({ logo_shape: sh.id as any })}
                                  className={`p-2 rounded-xl border text-left transition-all ${
                                    (currentCfg.logo_shape || 'circle') === sh.id
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <span className="text-xs block font-bold">{sh.icon} {sh.label}</span>
                                  <span className="text-[10px] text-slate-500 block">{sh.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Zoom Scale Slider (To remove outer photo background) */}
                          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                            <div className="flex items-center justify-between text-xs">
                              <label className="font-bold text-slate-700 flex items-center gap-1">
                                🔍 Skala Perbesaran / Zoom Foto:
                              </label>
                              <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                {currentCfg.logo_zoom || 130}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Geser slider ke kanan untuk memperbesar foto agar latar belakang dinding/meja bawaan foto terpotong habis.
                            </p>
                            <input
                              type="range"
                              min="100"
                              max="200"
                              step="5"
                              value={currentCfg.logo_zoom || 130}
                              onChange={(e) => updateCurrent({ logo_zoom: Number(e.target.value) })}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                              <span>100% (Asli)</span>
                              <div className="flex gap-1">
                                {[100, 120, 130, 145, 160].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => updateCurrent({ logo_zoom: val })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      (currentCfg.logo_zoom || 130) === val
                                        ? 'bg-emerald-600 text-white font-bold'
                                        : 'bg-white border text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {val}%
                                  </button>
                                ))}
                              </div>
                              <span>200% (Maksimal)</span>
                            </div>
                          </div>

                          {/* Fit Mode */}
                          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                            <span className="font-semibold text-slate-700">Mode Tampilan Ruang:</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateCurrent({ logo_fit: 'cover' })}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  (currentCfg.logo_fit || 'cover') === 'cover'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Full Frame (Cover)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCurrent({ logo_fit: 'contain' })}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  currentCfg.logo_fit === 'contain'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Utuh Proporsional (Contain)
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          ℹ️ Jika logo khusus tidak diisi, loader akan menggunakan Logo Madrasah default dari menu Profil Madrasah / Identitas.
                        </p>
                      )}
                    </div>

                    {/* Animation Type */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Jenis Gerakan Animasi Logo</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'bounce', label: 'Bounce (Memantul Halus)', icon: '⬆️⬇️' },
                          { id: 'pulse', label: 'Pulse (Denyut Cahaya)', icon: '✨' },
                          { id: 'spin', label: 'Spin (Putaran 360°)', icon: '🔄' },
                          { id: 'orbit', label: 'Orbit (Partikel Mengorbit)', icon: '🪐' },
                          { id: 'float', label: 'Float (Mengapung Santai)', icon: '🌊' },
                        ].map((an) => (
                          <button
                            key={an.id}
                            type="button"
                            onClick={() => updateCurrent({ animation_type: an.id as any })}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              currentCfg.animation_type === an.id
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xs block font-bold">{an.icon} {an.label.split(' ')[0]}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{an.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 4: Kustomisasi Teks & Slogan */}
                <Card className="border-0 shadow-lg bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Edit className="w-4 h-4 text-emerald-600" />
                      Kustomisasi Teks & Slogan ({loaderSubTab === 'portal' ? 'Portal Si@Kad' : 'Ruang Guru'})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Ubah kata sapaan dan pesan status pemuatan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Judul Utama Loader <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        placeholder={loaderSubTab === 'portal' ? 'Si@Kad Madrasah' : 'Ruang Kerja Guru & Pendidik'}
                        value={currentCfg.title || ''}
                        onChange={(e) => updateCurrent({ title: e.target.value })}
                        className="rounded-xl text-xs h-10 font-bold"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Teks judul besar di tengah layar loader.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Sub-judul / Pesan Status Pemuatan
                      </label>
                      <Input
                        placeholder={loaderSubTab === 'portal' ? 'Sistem Informasi Akademik Madrasah' : 'Menyiapkan Portal & Administrasi GTK...'}
                        value={currentCfg.subtitle || ''}
                        onChange={(e) => updateCurrent({ subtitle: e.target.value })}
                        className="rounded-xl text-xs h-10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tagline / Slogan Motivasi
                      </label>
                      <Input
                        placeholder={loaderSubTab === 'portal' ? "Membangun Generasi Unggul Berkarakter Qur'ani" : 'Akses Mandiri Pendidik & Tenaga Kependidikan'}
                        value={currentCfg.tagline || ''}
                        onChange={(e) => updateCurrent({ tagline: e.target.value })}
                        className="rounded-xl text-xs h-10"
                      />
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={() => handleSave('page_loader', pageLoader)}
                        disabled={saving}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 text-xs font-bold shadow-md flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : `Simpan Pengaturan Page Loader`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <PrintSecurityManager />
          <UpdatePasswordCard />
        </TabsContent>
      </Tabs>
    </div>

      {/* Main Media Library Modal for Hero Background, SEO Image, or Page Loader Logo */}
      <MediaLibraryModal
        isOpen={mediaModalTarget !== null}
        onClose={() => setMediaModalTarget(null)}
        onSelectImage={async (url) => {
          if (mediaModalTarget === 'hero_bg') {
            const updated = { ...hero, background_image: url };
            setHero(updated);
            setHeroBgImgError(false);
            handleSave('hero', updated);
          } else if (mediaModalTarget === 'seo') {
            let publicUrl = url;
            if (publicUrl.startsWith('data:')) {
              publicUrl = await convertBase64ToPublicUrl(publicUrl);
            }
            const updated = {
              ...seo,
              image_url: stripVersionFromAssetUrl(publicUrl),
              og_image_url: stripVersionFromAssetUrl(publicUrl),
              og_image_type: detectImageMimeType(publicUrl, seo.og_image_type || 'image/jpeg'),
              og_image_updated_at: new Date().toISOString(),
            };
            setSeo(updated);
            handleSave('seo', updated);
          } else if (mediaModalTarget === 'page_loader_portal_logo') {
            const updated = {
              ...pageLoader,
              portal: {
                ...pageLoader.portal,
                custom_logo_url: url,
                icon_type: 'logo' as const,
                logo_shape: (pageLoader.portal as any)?.logo_shape || 'circle',
                logo_zoom: (pageLoader.portal as any)?.logo_zoom || 130,
                logo_fit: (pageLoader.portal as any)?.logo_fit || 'cover',
              }
            };
            setPageLoader(updated);
            handleSave('page_loader', updated);
          } else if (mediaModalTarget === 'page_loader_rg_logo') {
            const updated = {
              ...pageLoader,
              ruang_guru: {
                ...pageLoader.ruang_guru,
                custom_logo_url: url,
                icon_type: 'logo' as const,
                logo_shape: (pageLoader.ruang_guru as any)?.logo_shape || 'circle',
                logo_zoom: (pageLoader.ruang_guru as any)?.logo_zoom || 130,
                logo_fit: (pageLoader.ruang_guru as any)?.logo_fit || 'cover',
              }
            };
            setPageLoader(updated);
            handleSave('page_loader', updated);
          }
          setMediaModalTarget(null);
        }}
        title={`Pilih Foto Tersimpan untuk ${
          mediaModalTarget === 'hero_bg'
            ? 'Background Hero'
            : mediaModalTarget === 'seo'
            ? 'Gambar SEO'
            : mediaModalTarget === 'page_loader_portal_logo'
            ? 'Logo Page Loader Portal'
            : 'Logo Page Loader Ruang Guru'
        }`}
      />

      {/* Page Loader Live Preview Modal */}
      <PageLoaderPreviewModal
        isOpen={isPreviewLoaderOpen}
        onClose={() => setIsPreviewLoaderOpen(false)}
        settings={pageLoader[loaderSubTab]}
        isRuangGuru={loaderSubTab === 'ruang_guru'}
      />

      {/* Modal Tambah / Edit Running Text */}
      {isRunningTextModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingRunningTextId ? 'Edit Running Text' : 'Tambah Running Text Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Isi pengumuman running text yang akan tampil melayang di website.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRunningTextModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teks Running Text Pengumuman <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  rows={3}
                  placeholder="Contoh: Penerimaan Peserta Didik Baru (SPMB) Tahun Pelajaran 2026/2027 Telah Resmi Dibuka!"
                  value={modalRunningTextForm.text}
                  onChange={(e) => setModalRunningTextForm({ ...modalRunningTextForm, text: e.target.value })}
                  className="rounded-xl border-slate-300 text-xs font-medium focus:ring-emerald-500"
                />
              </div>

              {/* Logo / Ikon & Badge Label */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Logo / Ikon Pengumuman</span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <AnnouncementIcon iconId={modalRunningTextForm.icon} className="w-3.5 h-3.5" />
                    Logo Terpilih
                  </span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-28 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                  {ANNOUNCEMENT_ICONS.map((opt) => {
                    const isSelected = modalRunningTextForm.icon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setModalRunningTextForm({ ...modalRunningTextForm, icon: opt.id })}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all text-center ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-500 shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                      >
                        <AnnouncementIcon iconId={opt.id} className="w-4 h-4 mb-0.5" />
                        <span className="text-[9px] line-clamp-1 truncate w-full">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Badge (Kiri)
                  </label>
                  <Input
                    placeholder="INFORMASI MADRASAH"
                    value={modalRunningTextForm.badge}
                    onChange={(e) => setModalRunningTextForm({ ...modalRunningTextForm, badge: e.target.value })}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tema Warna
                  </label>
                  <select
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    value={modalRunningTextForm.bg_color}
                    onChange={(e) => setModalRunningTextForm({ ...modalRunningTextForm, bg_color: e.target.value })}
                  >
                    <option value="emerald">🟢 Hijau Emerald</option>
                    <option value="dark">⚫ Hitam Dark</option>
                    <option value="indigo">🔵 Biru Indigo</option>
                    <option value="amber">🟡 Emas Amber</option>
                    <option value="rose">🔴 Merah Rose</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Arah Berjalan
                  </label>
                  <select
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    value={modalRunningTextForm.direction}
                    onChange={(e) => setModalRunningTextForm({ ...modalRunningTextForm, direction: e.target.value })}
                  >
                    <option value="right_to_left">➡️ Kanan ke Kiri</option>
                    <option value="left_to_right">⬅️ Kiri ke Kanan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kecepatan
                  </label>
                  <select
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    value={modalRunningTextForm.speed}
                    onChange={(e) => setModalRunningTextForm({ ...modalRunningTextForm, speed: e.target.value })}
                  >
                    <option value="slow">🐢 Lambat</option>
                    <option value="normal">⚡ Sedang</option>
                    <option value="fast">🚀 Cepat</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL Tautan (Opsional)
                  </label>
                  <Input
                    placeholder="/spmb atau https://..."
                    value={modalRunningTextForm.link_url}
                    onChange={(e) => setModalRunningTextForm({ ...modalRunningTextForm, link_url: e.target.value })}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Tombol Tautan
                  </label>
                  <Input
                    placeholder="Lihat Detail"
                    value={modalRunningTextForm.link_label}
                    onChange={(e) => setModalRunningTextForm({ ...modalRunningTextForm, link_label: e.target.value })}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              </div>

              {/* Toggle Aktifkan Langsung */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div>
                  <p className="text-xs font-extrabold text-emerald-900">
                    Aktifkan Langsung di Website
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Tampilkan running text ini sebagai papan pengumuman utama saat ini.
                  </p>
                </div>
                <Switch
                  checked={modalRunningTextForm.setActiveNow}
                  onCheckedChange={(checked) => setModalRunningTextForm({ ...modalRunningTextForm, setActiveNow: checked })}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRunningTextModalOpen(false)}
                className="rounded-xl h-10 text-xs font-bold px-4"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSaveModalRunningText}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-xs font-extrabold px-5 shadow-md"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {editingRunningTextId ? 'Simpan Perubahan' : 'Tambah Running Text'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default SettingsAdmin;
