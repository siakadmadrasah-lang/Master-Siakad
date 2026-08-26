"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Image as ImageIcon, Upload, X, Loader2, RefreshCw, Video, Play, Film, Sparkles, CheckCircle2, FileVideo, ExternalLink, Printer, Eye, BookOpen } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { compressImage, uploadImageToStorage, uploadMediaToStorage, getYouTubeEmbedUrl, getYouTubeThumbnail, generateVideoThumbnail, isVideoUrl } from '@/utils/imageCompression';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import CetakPengumumanBerita from '@/components/CetakPengumumanBerita';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const GalleryAdmin = () => {
  const { settings } = useSiteSettings();
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
  const [burnWatermark, setBurnWatermark] = useState(true);
  const [watermarkCustomText, setWatermarkCustomText] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media_type: 'image' as 'image' | 'video',
    images: [] as string[],
    video_url: '',
    thumbnail_url: ''
  });

  const handlePrintItem = (item: any) => {
    setPrintItem(item);
    setPrintModalOpen(true);
  };

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'gallery_data_list')
        .maybeSingle();
      
      if (error) throw error;
      if (res?.value) setGallery(res.value as any[]);
    } catch (error: any) {
      console.error('Gallery Fetch Error:', error);
      showError('Gagal memuat data galeri');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGallery(); }, []);

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const newImages = [...formData.images];
    let detectedType = formData.media_type;
    let autoVideoUrl = formData.video_url;
    let autoThumb = formData.thumbnail_url;

    try {
      const watermarkOpts = burnWatermark ? {
        title: watermarkCustomText.trim() || formData.title.trim() || 'DOKUMENTASI KEGIATAN',
        subtitle: 'MI MA\'ARIF NU 2 SANGGREMAN',
        badge: 'MADRASAH'
      } : undefined;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadMediaToStorage(file, 'gallery', watermarkOpts);

        if (res.type === 'video') {
          detectedType = 'video';
          autoVideoUrl = res.url;
          if (res.thumbnail) {
            autoThumb = res.thumbnail;
            if (!newImages.includes(res.thumbnail)) newImages.unshift(res.thumbnail);
          }
        } else if (res.url) {
          newImages.push(res.url);
        }
      }

      setFormData(prev => ({
        ...prev,
        media_type: detectedType,
        video_url: autoVideoUrl,
        thumbnail_url: autoThumb || prev.thumbnail_url,
        images: newImages
      }));

      showSuccess(`${files.length} media berhasil diunggah dengan kompresi otomatis!`);
    } catch (error: any) { 
      showError('Gagal upload media'); 
    } finally { 
      setUploading(false); 
      e.target.value = '';
    }
  };

  const handleYouTubeUrlChange = (url: string) => {
    const ytThumb = getYouTubeThumbnail(url);
    const updatedImages = [...formData.images];
    
    if (ytThumb && !updatedImages.includes(ytThumb)) {
      updatedImages.unshift(ytThumb);
    }

    setFormData(prev => ({
      ...prev,
      video_url: url,
      media_type: 'video',
      thumbnail_url: ytThumb || prev.thumbnail_url,
      images: updatedImages
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (formData.media_type === 'image' && formData.images.length === 0) {
      return showError('Pilih minimal 1 gambar untuk album foto!');
    }
    if (formData.media_type === 'video' && !formData.video_url && formData.images.length === 0) {
      return showError('Masukkan URL Video YouTube / MP4 atau upload file video!');
    }

    setSaving(true);
    try {
      let newList: any[];
      const payload = {
        ...formData,
        media_type: formData.media_type || (formData.video_url ? 'video' : 'image')
      };

      if (editingItem) {
        newList = gallery.map(item => 
          item.id === editingItem.id 
            ? { ...payload, id: item.id, created_at: item.created_at } 
            : item
        );
      } else {
        const newItem = { ...payload, id: Date.now().toString(), created_at: new Date().toISOString() };
        newList = [newItem, ...gallery];
      }
      
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'gallery_data_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;
      setGallery(newList);
      showSuccess('Galeri berhasil diperbarui!');
      setDialogOpen(false);
    } catch (error: any) { 
      showError('Gagal menyimpan data'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus item galeri ini?')) return;
    try {
      const newList = gallery.filter(item => item.id !== id);
      await supabase.from('site_settings').upsert({ id: 'gallery_data_list', value: newList });
      setGallery(newList);
      showSuccess('Item galeri dihapus!');
    } catch (error: any) { showError('Gagal menghapus'); }
  };

  const filteredGallery = gallery.filter(item => {
    if (activeTab === 'image') return item.media_type === 'image' || (!item.media_type && !item.video_url);
    if (activeTab === 'video') return item.media_type === 'video' || Boolean(item.video_url);
    return true;
  });

  return (
    <AdminLayout title="Kelola Galeri (Foto & Video)">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <Button
            type="button"
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className={`rounded-xl text-xs font-bold ${activeTab === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
          >
            Semua Galeri ({gallery.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'image' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('image')}
            className={`rounded-xl text-xs font-bold gap-1 ${activeTab === 'image' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Foto ({gallery.filter(i => i.media_type !== 'video' && !i.video_url).length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'video' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('video')}
            className={`rounded-xl text-xs font-bold gap-1 ${activeTab === 'video' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
          >
            <Video className="w-3.5 h-3.5 text-rose-500" /> Video ({gallery.filter(i => i.media_type === 'video' || i.video_url).length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchGallery} disabled={loading} className="rounded-xl border-slate-300">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button 
            onClick={() => { 
              setEditingItem(null); 
              setFormData({
                title: '', 
                description: '', 
                media_type: 'image',
                images: [], 
                video_url: '', 
                thumbnail_url: ''
              }); 
              setDialogOpen(true); 
            }} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Tambah Galeri Baru
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-500" /></div>
      ) : filteredGallery.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Film className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Belum ada item di galeri ini</p>
          <p className="text-xs text-slate-500 mt-1">Klik tombol "Tambah Galeri Baru" di atas untuk menambahkan foto atau video kegiatan madrasah.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredGallery.map(item => {
            const videoSrc = item.video_url || (isVideoUrl(item.image_url) ? item.image_url : '') || (isVideoUrl(item.images?.[0]) ? item.images[0] : '');
            const isVideo = item.media_type === 'video' || Boolean(videoSrc) || isVideoUrl(item.video_url);
            const thumbImage = item.thumbnail_url || (item.images?.[0] && !isVideoUrl(item.images[0]) ? item.images[0] : undefined) || (item.image_url && !isVideoUrl(item.image_url) ? item.image_url : undefined) || getYouTubeThumbnail(videoSrc) || '/placeholder.svg';

            return (
              <Card key={item.id} className="relative group overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                  <img src={thumbImage} className="aspect-square object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" alt={item.title} />
                  
                  {/* Media Type Badge */}
                  {isVideo ? (
                    <div className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1 shadow-md">
                      <Play className="w-3 h-3 fill-white" /> VIDEO
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 bg-slate-950/70 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {item.images?.length || 1} Foto
                    </div>
                  )}

                  {/* Play Overlay Icon for Videos */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white">
                  <p className="text-slate-900 font-extrabold text-xs line-clamp-1 group-hover:text-emerald-600 transition-colors">{item.title || 'Tanpa Judul'}</p>
                  <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{item.description || 'Tidak ada deskripsi'}</p>
                  
                  <div className="flex gap-1.5 mt-3 pt-2 border-t border-slate-100 justify-end">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 px-2 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                      title="Lihat Galeri Publik"
                      onClick={() => window.open('/#gallery', '_blank')}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 px-2 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                      title="Cetak Dokumentasi Galeri"
                      onClick={() => handlePrintItem(item)}
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 px-3 rounded-xl text-xs font-bold"
                      onClick={() => { 
                        setEditingItem(item); 
                        setFormData({
                          title: item.title || '', 
                          description: item.description || '', 
                          media_type: item.media_type || (item.video_url ? 'video' : 'image'),
                          images: item.images || (item.image_url ? [item.image_url] : []),
                          video_url: item.video_url || '',
                          thumbnail_url: item.thumbnail_url || ''
                        }); 
                        setDialogOpen(true); 
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-8 px-2 rounded-xl text-xs font-bold"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Form Album / Video */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Film className="w-5 h-5 text-emerald-600" />
              {editingItem ? 'Edit Item Galeri' : 'Tambah Item Galeri Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Tipe Media Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Pilih Tipe Galeri</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, media_type: 'image' })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-extrabold transition-all ${
                    formData.media_type === 'image'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/30'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>📷 Album Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, media_type: 'video' })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-extrabold transition-all ${
                    formData.media_type === 'video'
                      ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/30'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Video className="w-4 h-4 text-rose-600" />
                  <span>🎥 Galeri Video</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Judul Galeri / Album</label>
              <Input 
                placeholder="Contoh: Upacara Bendera HUT RI ke-81..." 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                className="rounded-xl text-xs" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Deskripsi Singkat</label>
              <Textarea 
                placeholder="Tuliskan deskripsi ringkas tentang dokumentasi kegiatan ini..." 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="rounded-xl text-xs min-h-[70px]" 
              />
            </div>

            {/* Jika Tipe Video */}
            {formData.media_type === 'video' && (
              <div className="space-y-3 p-4 bg-rose-50/60 rounded-2xl border border-rose-200">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-rose-950 flex items-center justify-between">
                    <span>Tautan Video YouTube atau Link MP4 Direct</span>
                    <span className="text-[10px] text-rose-600 font-semibold">Dukungan Embed Otomatis</span>
                  </label>
                  <Input 
                    placeholder="Contoh: https://www.youtube.com/watch?v=... atau https://site.com/video.mp4" 
                    value={formData.video_url} 
                    onChange={e => handleYouTubeUrlChange(e.target.value)} 
                    className="rounded-xl text-xs bg-white border-rose-300" 
                  />
                  <p className="text-[10px] text-rose-700 italic">
                    * Anda dapat menempelkan link YouTube untuk otomatis mengunggah video & sampulnya.
                  </p>
                </div>

                {formData.video_url && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-rose-300 shadow-sm bg-black">
                    {getYouTubeEmbedUrl(formData.video_url) ? (
                      <iframe
                        src={getYouTubeEmbedUrl(formData.video_url)!}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <video
                        src={formData.video_url}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Text on Photo Watermark Panel */}
            <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={burnWatermark} 
                    onChange={e => setBurnWatermark(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span>🖼️ Cetak Stempel Judul & Nama Madrasah Langsung di Foto</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  Otomatis
                </span>
              </div>
              
              {burnWatermark && (
                <div className="space-y-1.5 pt-1">
                  <Input 
                    placeholder="Judul teks pada foto (Kosongkan jika memakai Judul Album di atas)..." 
                    value={watermarkCustomText} 
                    onChange={e => setWatermarkCustomText(e.target.value)} 
                    className="rounded-xl text-xs bg-white border-emerald-300" 
                  />
                  <p className="text-[10px] text-emerald-800">
                    💡 Foto yang diunggah akan otomatis memiliki stempel judul, gradien elegan, dan watermark "MI MA'ARIF NU 2 SANGGREMAN".
                  </p>
                </div>
              )}
            </div>

            {/* Upload Section & Auto Compression Indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800">
                  {formData.media_type === 'video' ? 'Upload File Video / Gambar Sampul' : 'Foto Galeri (Bisa Pilih Banyak)'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Kompresi Otomatis Aktif
                  </span>
                  {formData.media_type === 'image' && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setMediaModalOpen(true)}
                      className="h-7 text-[11px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl gap-1"
                    >
                      <ImageIcon className="w-3 h-3" /> Foto Tersimpan
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-2">
                {formData.images.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-900 shadow-xs">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button 
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-400 transition-all text-center p-2">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-[9px] font-extrabold text-emerald-800">Mengompres...</span>
                    </div>
                  ) : (
                    <>
                      {formData.media_type === 'video' ? (
                        <FileVideo className="w-6 h-6 text-rose-500 mb-1" />
                      ) : (
                        <Plus className="w-6 h-6 text-slate-400 mb-1" />
                      )}
                      <span className="text-[10px] font-extrabold text-slate-700">
                        {formData.media_type === 'video' ? 'Upload Video/Foto' : 'Tambah Foto'}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5">Otomatis Terkompres</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept={formData.media_type === 'video' ? "video/*,image/*" : "image/*"} 
                    multiple={formData.media_type === 'image'} 
                    onChange={handleMediaFileUpload} 
                    className="hidden" 
                    disabled={uploading} 
                  />
                </label>
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving || uploading} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-extrabold shadow-md mt-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Simpan ke Galeri Madrasah
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MediaLibraryModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelectImage={(url) => {
          setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
          showSuccess('Foto ditambahkan dari galeri tersimpan');
        }}
        title="Pilih Foto Tersimpan untuk Galeri"
      />

      {printModalOpen && printItem && (
        <CetakPengumumanBerita
          item={printItem}
          type="galeri"
          onClose={() => {
            setPrintModalOpen(false);
            setPrintItem(null);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default GalleryAdmin;
