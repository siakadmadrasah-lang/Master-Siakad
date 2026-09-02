"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, Maximize2, Camera, ChevronDown, ChevronUp, Play, Video, 
  Image as ImageIcon, Film, Printer, BookOpen, Calendar, 
  FileText, Check, Copy, ExternalLink, ArrowLeft, ArrowRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ImageSlideshow from './ImageSlideshow';
import { getYouTubeEmbedUrl, getYouTubeThumbnail, isVideoUrl } from '@/utils/imageCompression';
import HeroTypewriterTitle from './HeroTypewriterTitle';
import KopSurat from './KopSurat';
import CetakPengumumanBerita from './CetakPengumumanBerita';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { showSuccess, showError } from '@/utils/toast';

const Gallery = () => {
  const { settings } = useSiteSettings();
  const printConfig = settings?.print_settings || { show_kop: true, show_signature: true };
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'fullread'>('preview');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'gallery_data_list').maybeSingle();
        if (res?.value) setGallery(res.value as any[]);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchGallery();
  }, []);

  // Handle URL deep-linking on mount & data fetch
  useEffect(() => {
    if (gallery.length === 0) return;
    const checkUrlAndOpen = () => {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;
      const idFromUrl = params.get('id') || params.get('galeri') || (path.startsWith('/galeri/') ? path.split('/galeri/')[1] : null);

      if (idFromUrl) {
        const found = gallery.find(item => String(item.id) === String(idFromUrl) || item.title?.toLowerCase().replace(/\s+/g, '-') === idFromUrl);
        if (found) {
          setSelectedItem(found);
          setViewMode('preview');
          setActivePhotoIndex(0);
          setTimeout(() => {
            const el = document.getElementById('gallery');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 300);
        }
      } else if (path === '/galeri') {
        setTimeout(() => {
          const el = document.getElementById('gallery');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    };

    checkUrlAndOpen();

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const idFromUrl = params.get('id') || params.get('galeri');
      if (idFromUrl) {
        const found = gallery.find(item => String(item.id) === String(idFromUrl));
        if (found) setSelectedItem(found);
        else setSelectedItem(null);
      } else {
        setSelectedItem(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [gallery]);

  const openItem = (item: any, mode: 'preview' | 'fullread' = 'preview') => {
    setSelectedItem(item);
    setViewMode(mode);
    setActivePhotoIndex(0);
    setCopied(false);

    if (item && item.id) {
      const targetUrl = `/galeri?id=${encodeURIComponent(item.id)}`;
      window.history.pushState({ galleryId: item.id }, '', targetUrl);
    }
  };

  const closeItem = () => {
    setSelectedItem(null);
    setViewMode('preview');
    setActivePhotoIndex(0);

    if (window.location.pathname.startsWith('/galeri') || window.location.search.includes('id=')) {
      window.history.pushState(null, '', '/#gallery');
    }
  };

  const handlePrint = (item?: any) => {
    const targetItem = item || selectedItem;
    if (!targetItem) return;
    setPrintItem(targetItem);
    setPrintModalOpen(true);
  };

  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Teks deskripsi berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredGallery = gallery.filter(item => {
    if (filterType === 'image') return item.media_type === 'image' || (!item.media_type && !item.video_url);
    if (filterType === 'video') return item.media_type === 'video' || Boolean(item.video_url);
    return true;
  });

  const initialLimit = isMobile ? 2 : 4;
  const displayedGallery = showAll ? filteredGallery : filteredGallery.slice(0, initialLimit);

  const photoCount = gallery.filter(i => i.media_type !== 'video' && !i.video_url).length;
  const videoCount = gallery.filter(i => i.media_type === 'video' || Boolean(i.video_url)).length;

  const selectedVideoSrc = selectedItem ? (selectedItem.video_url || (isVideoUrl(selectedItem.image_url) ? selectedItem.image_url : '') || (isVideoUrl(selectedItem.images?.[0]) ? selectedItem.images[0] : '')) : '';
  const selectedIsVideo = selectedItem ? (selectedItem.media_type === 'video' || Boolean(selectedVideoSrc) || isVideoUrl(selectedItem.video_url)) : false;
  const selectedEmbedUrl = selectedVideoSrc ? getYouTubeEmbedUrl(selectedVideoSrc) : null;

  return (
    <section id="gallery" className="py-16 bg-slate-50 relative">
      <div className="container mx-auto px-6 print:hidden">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Camera className="w-3.5 h-3.5" /> Momen & Dokumentasi
          </div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 flex items-center justify-center gap-3">
            <div className="w-5 h-5 bg-emerald-600 rounded-sm rotate-45 flex-shrink-0"></div>
            <span>
              Galeri <span className="text-emerald-600 font-serif-premium italic">Kegiatan & Video</span>
            </span>
          </h2>
        </div>

        {/* Filter Tabs */}
        {gallery.length > 0 && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  filterType === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Semua ({gallery.length})
              </button>
              {photoCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType('image')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-1.5 ${
                    filterType === 'image'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Foto ({photoCount})
                </button>
              )}
              {videoCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType('video')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-1.5 ${
                    filterType === 'video'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> Video ({videoCount})
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {loading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/2] rounded-2xl" />) : 
            displayedGallery.map((item) => {
              const videoSrc = item.video_url || (isVideoUrl(item.image_url) ? item.image_url : '') || (isVideoUrl(item.images?.[0]) ? item.images[0] : '');
              const isVideo = item.media_type === 'video' || Boolean(videoSrc) || isVideoUrl(item.video_url);
              const thumbImage = item.thumbnail_url || (item.images?.[0] && !isVideoUrl(item.images[0]) ? item.images[0] : undefined) || (item.image_url && !isVideoUrl(item.image_url) ? item.image_url : undefined) || getYouTubeThumbnail(videoSrc) || '/placeholder.svg';

              return (
                <div 
                  key={item.id} 
                  className="flex flex-col gap-3 group bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 cursor-pointer"
                  onClick={() => openItem(item, 'preview')}
                >
                  <div className="relative rounded-xl overflow-hidden aspect-[3/2] bg-slate-900">
                    {isVideo ? (
                      <div className="relative w-full h-full">
                        <img src={thumbImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        
                        {/* Play Badge Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors z-10">
                          <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-white ml-0.5" />
                          </div>
                        </div>

                        <div className="absolute top-2.5 left-2.5 bg-rose-600/95 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-sm z-20 flex items-center gap-1 shadow-xs">
                          <Play className="w-2.5 h-2.5 fill-white" /> VIDEO
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageSlideshow 
                          images={item.images || (item.image_url ? [item.image_url] : [])} 
                          className="w-full h-full" 
                          alt={item.title}
                          overlayTitle={item.title}
                          overlaySubtitle={item.description}
                          overlayBadge="DOKUMENTASI"
                        />
                        <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] z-20">
                          <Maximize2 className="text-white w-5 h-5" />
                        </div>
                        {item.images && item.images.length > 1 && (
                          <div className="absolute top-2.5 right-2.5 bg-black/60 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-sm z-20">
                            {item.images.length} Foto
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="px-1 min-w-0 overflow-hidden flex-1 flex flex-col justify-between">
                    <div>
                      <div className="overflow-hidden py-0.5 min-h-[1.6em] flex items-center">
                        <HeroTypewriterTitle
                          title={item.title}
                          size="sm"
                        />
                      </div>
                      {item.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{item.description}</p>}
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>

        {!loading && filteredGallery.length > initialLimit && (
          <div className="mt-12 text-center">
            <Button 
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold px-8 shadow-xs"
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4 mr-2" /> Tampilkan Lebih Sedikit</>
              ) : (
                <><ChevronDown className="w-4 h-4 mr-2" /> Lihat Semua ({filteredGallery.length})</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Modal Lightbox & Full Reader Popup */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print print:hidden" onClick={closeItem}>
          <div className="relative max-w-4xl w-full my-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
              
              {/* Header Control Tabs */}
              <div className="bg-slate-900 text-white p-3 px-6 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === 'preview' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Slide Media
                  </button>
                  <button 
                    onClick={() => setViewMode('fullread')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === 'fullread' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Baca Full (Artikel)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => handlePrint()}
                    className="h-8 px-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" /> Cetak
                  </Button>
                  <button 
                    className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors" 
                    onClick={closeItem}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* MODE 1: PREVIEW / LIGHTBOX SLIDESHOW */}
              {viewMode === 'preview' && (
                <div className="overflow-y-auto">
                  {selectedIsVideo ? (
                    <div className="w-full aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                      {selectedEmbedUrl ? (
                        <iframe
                          src={selectedEmbedUrl}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      ) : selectedVideoSrc ? (
                        <video
                          src={selectedVideoSrc}
                          controls
                          playsInline
                          autoPlay
                          poster={selectedItem.thumbnail_url || (selectedItem.images?.[0] && !isVideoUrl(selectedItem.images[0]) ? selectedItem.images[0] : undefined)}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageSlideshow 
                          images={selectedItem.images || [selectedItem.image_url]} 
                          className="w-full aspect-video" 
                          alt={selectedItem.title}
                        />
                      )}
                    </div>
                  ) : (
                    <ImageSlideshow 
                      images={selectedItem.images || [selectedItem.image_url]} 
                      className="w-full aspect-video" 
                      alt={selectedItem.title}
                      overlayTitle={selectedItem.title}
                      overlaySubtitle={selectedItem.description}
                      overlayBadge="GALERI MADRASAH"
                    />
                  )}

                  <div className="p-6">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {selectedIsVideo ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Play className="w-3 h-3 fill-rose-800" /> VIDEO MADRASAH
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Camera className="w-3 h-3" /> FOTO GALERI ({selectedItem.images?.length || 1} Foto)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setViewMode('fullread')} 
                          className="rounded-xl text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1" /> Tampilan Artikel Full
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-hidden py-1 min-h-[2em] flex items-center">
                      <HeroTypewriterTitle
                        title={selectedItem.title}
                        size="lg"
                      />
                    </div>
                    {selectedItem.description && (
                      <p className="text-slate-600 text-sm mt-2 leading-relaxed whitespace-pre-line">{selectedItem.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: BACA SECARA FULL (FULL READER ARTICLE VIEW) */}
              {viewMode === 'fullread' && (
                <div className="overflow-y-auto p-6 sm:p-8 bg-slate-50 flex-1 space-y-6">
                    {/* Kop Surat Header */}
                    {printConfig.show_kop !== false && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <KopSurat />
                        <div className="text-center mt-4">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                            <FileText className="w-3 h-3" /> DOKUMENTASI & GALERI KEGIATAN MADRASAH
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Title & Metadata */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                        {selectedItem.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Dokumentasi Madrasah'}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-semibold">
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          {selectedItem.images?.length || 1} File Media
                        </span>
                      </div>
                    </div>

                    {/* Featured Media / Video */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      {selectedIsVideo ? (
                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                          {selectedEmbedUrl ? (
                            <iframe
                              src={selectedEmbedUrl}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          ) : selectedVideoSrc ? (
                            <video
                              src={selectedVideoSrc}
                              controls
                              playsInline
                              autoPlay
                              poster={selectedItem.thumbnail_url || (selectedItem.images?.[0] && !isVideoUrl(selectedItem.images[0]) ? selectedItem.images[0] : undefined)}
                              className="w-full h-full object-contain"
                            />
                          ) : null}
                        </div>
                      ) : (
                      <div>
                        <div className="rounded-xl overflow-hidden bg-slate-900 max-h-[480px] flex items-center justify-center">
                          <img 
                            src={selectedItem.images?.[activePhotoIndex] || selectedItem.images?.[0] || selectedItem.image_url} 
                            alt={selectedItem.title} 
                            className="w-full h-full max-h-[480px] object-contain"
                          />
                        </div>

                        {/* Thumbnail Selector if Multiple Images */}
                        {selectedItem.images && selectedItem.images.length > 1 && (
                          <div className="mt-4 border-t pt-3">
                            <p className="text-xs font-extrabold text-slate-700 mb-2">Pilih Foto Galeri ({selectedItem.images.length}):</p>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {selectedItem.images.map((img: string, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setActivePhotoIndex(idx)}
                                  className={`relative rounded-lg overflow-hidden border-2 flex-shrink-0 w-20 h-16 transition-all ${
                                    activePhotoIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-600/30 scale-105' : 'border-slate-200 opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  <img src={img} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Full Description / Article Text */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" /> Narasi / Deskripsi Dokumentasi
                      </h3>
                      {selectedItem.description && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleCopyText(selectedItem.description)}
                          className="h-7 text-xs text-slate-600 hover:text-emerald-700"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                          {copied ? 'Tersalin' : 'Salin Teks'}
                        </Button>
                      )}
                    </div>

                    <div className="text-slate-700 text-sm md:text-base leading-relaxed space-y-3 whitespace-pre-line font-normal">
                      {selectedItem.description ? (
                        selectedItem.description.split('\n\n').map((paragraph: string, pIdx: number) => (
                          <p key={pIdx} className="text-justify">{paragraph}</p>
                        ))
                      ) : (
                        <p className="text-slate-400 italic text-xs">Tidak ada keterangan tertulis tambahan untuk galeri ini.</p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" onClick={closeItem} className="rounded-xl text-xs font-bold">
                      Tutup
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handlePrint()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm">
                        <Printer className="w-4 h-4 mr-1.5" /> Cetak Dokumen
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

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
    </section>
  );
};

export default Gallery;