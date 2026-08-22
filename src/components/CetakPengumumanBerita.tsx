"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Calendar, Tag, FileText, Video } from 'lucide-react';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import { getYouTubeThumbnail } from '@/utils/imageCompression';

export interface PrintableItem {
  id: string;
  title: string;
  content?: string;
  description?: string;
  images?: string[];
  image_url?: string;
  thumbnail_url?: string;
  video_url?: string;
  media_type?: string;
  category?: string;
  event_date?: string;
  event_location?: string;
  event_time?: string;
  created_at?: string;
  author?: string;
}

interface CetakPengumumanBeritaProps {
  item: PrintableItem;
  type: 'pengumuman' | 'berita' | 'artikel' | 'galeri';
  onClose: () => void;
}

export const CetakPengumumanBerita: React.FC<CetakPengumumanBeritaProps> = ({
  item,
  type,
  onClose
}) => {
  const { settings } = useSiteSettings();
  const { requirePrintAuth } = usePrintSecurity();
  const [showKop, setShowKop] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Add/remove class on body when print overlay is mounted
  useEffect(() => {
    document.body.classList.add('portal-print-active');
    return () => {
      document.body.classList.remove('portal-print-active');
    };
  }, []);

  const printConfig = settings.pengaturan_cetak || {
    margin_top: 1,
    margin_right: 1,
    margin_bottom: 1,
    margin_left: 1,
  };

  // Build list of valid image URLs
  let imagesList: string[] = [];
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    imagesList = item.images.filter(img => typeof img === 'string' && img.trim().length > 0);
  } else if (item.image_url) {
    imagesList = [item.image_url];
  } else if (item.thumbnail_url) {
    imagesList = [item.thumbnail_url];
  }

  // Fallback YouTube thumbnail if it's a video and no image found
  if (imagesList.length === 0 && item.video_url) {
    const ytThumb = getYouTubeThumbnail(item.video_url);
    if (ytThumb) imagesList = [ytThumb];
  }

  const mainContent = item.content || item.description || '';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const createdDateStr = formatDate(item.created_at || new Date().toISOString());
  const eventDateStr = item.event_date ? formatDate(item.event_date) : '';

  const isAnnouncement = type === 'pengumuman';
  const isGallery = type === 'galeri';
  const docRefNo = `${(item.id || '101').substring(0, 8).toUpperCase()}/MAD/${isAnnouncement ? 'PENG' : isGallery ? 'GAL' : 'ART'}/${new Date().getFullYear()}`;

  const portalContent = (
    <div 
      id="printable-portal-root" 
      className="fixed inset-0 z-[9999] bg-slate-900/90 overflow-y-auto font-serif print:static print:bg-white print:overflow-visible"
    >
      {/* Top Navigation & Settings Bar - Hidden on Print */}
      <div className="sticky top-0 z-[10000] bg-white/95 backdrop-blur-md border-b border-slate-200 p-3 sm:p-4 flex justify-between items-center print:hidden shadow-md gap-3">
        <Button variant="outline" size="sm" onClick={onClose} className="font-bold text-slate-700 hover:bg-slate-100 rounded-xl h-9">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
        </Button>

        <div className="flex items-center gap-2">
          <Button 
            size="sm"
            onClick={() => {
              const docTypeLabel = isAnnouncement ? 'Pengumuman Resmi' : isGallery ? 'Dokumentasi Galeri' : 'Berita / Artikel';
              requirePrintAuth(() => {
                window.print();
              }, `${docTypeLabel}: ${item.title || 'Dokumen'}`);
            }} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 font-bold h-9 rounded-xl shadow-md flex items-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" /> <span>Cetak Dokumen</span>
          </Button>
        </div>
      </div>

      {/* Sheet Wrapper for Preview & Print */}
      <div className="p-4 md:p-8 flex justify-center print:p-0 print:m-0 print:block">
        <div 
          id="printable-paper"
          className="bg-white shadow-2xl print:shadow-none print:w-full flex flex-col justify-between my-2 print:my-0 text-slate-900 border border-slate-200 print:border-none"
          style={{ 
            width: orientation === 'landscape' ? '297mm' : '210mm', 
            minHeight: orientation === 'landscape' ? '210mm' : '297mm',
            padding: `${printConfig.margin_top || 1}cm ${printConfig.margin_right || 1}cm ${printConfig.margin_bottom || 1}cm ${printConfig.margin_left || 1}cm`,
            boxSizing: 'border-box'
          }}
        >
          <div>
            {/* Kop Surat */}
            {showKop && <KopSurat />}

            {/* Document Official Title Header */}
            <div className="text-center my-4 font-serif border-b-2 border-slate-900 pb-3">
              <span className="inline-block bg-slate-100 text-slate-800 text-[9.5pt] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-slate-300 print:border-slate-400">
                {isAnnouncement 
                  ? 'PENGUMUMAN RESMI MADRASAH' 
                  : isGallery 
                  ? 'DOKUMENTASI & GALERI KEGIATAN MADRASAH' 
                  : 'BERITA & ARTIKEL RESMI MADRASAH'}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-1.5 uppercase tracking-tight font-serif leading-snug">
                {item.title}
              </h1>
              <p className="text-[9pt] text-slate-600 italic font-sans">
                Kategori: {item.category || (item.video_url || item.media_type === 'video' ? 'Video Dokumentasi' : 'Foto Galeri Kegiatan')} 
                {item.created_at ? ` • Tanggal Publikasi: ${createdDateStr}` : ''}
                {item.author ? ` • Oleh: ${item.author}` : ''}
              </p>
            </div>

            {/* Official Table for Event Details (if Announcement has date/time/location) */}
            {isAnnouncement && (item.event_date || item.event_location || item.event_time) && (
              <div className="mb-6 border-2 border-slate-800 p-4 font-serif text-[10pt] bg-slate-50/50 print:bg-transparent">
                <p className="font-bold text-slate-900 mb-2 border-b border-slate-400 pb-1 uppercase tracking-wide text-xs">
                  📌 RINCIAN PELAKSANAAN / KEGIATAN:
                </p>
                <table className="w-full text-left font-serif border-collapse">
                  <tbody>
                    {item.event_date && (
                      <tr>
                        <td className="py-1 w-36 font-bold text-slate-900">Hari, Tanggal</td>
                        <td className="py-1 w-4 text-center">:</td>
                        <td className="py-1 text-slate-900">{eventDateStr}</td>
                      </tr>
                    )}
                    {item.event_time && (
                      <tr>
                        <td className="py-1 w-36 font-bold text-slate-900">Waktu / Jam</td>
                        <td className="py-1 w-4 text-center">:</td>
                        <td className="py-1 text-slate-900">{item.event_time} WIB</td>
                      </tr>
                    )}
                    {item.event_location && (
                      <tr>
                        <td className="py-1 w-36 font-bold text-slate-900">Tempat / Lokasi</td>
                        <td className="py-1 w-4 text-center">:</td>
                        <td className="py-1 text-slate-900">{item.event_location}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Video link box for gallery items with video */}
            {isGallery && item.video_url && (
              <div className="mb-6 p-3 bg-slate-50 border border-slate-300 rounded font-sans text-xs">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-rose-600" /> Link Video Dokumentasi:
                </p>
                <p className="text-emerald-700 font-mono underline break-all mt-0.5">{item.video_url}</p>
              </div>
            )}

            {/* Content / Description Body */}
            {mainContent && (
              <div className="text-[11pt] leading-relaxed text-slate-900 whitespace-pre-wrap text-justify mb-6 font-serif">
                {mainContent}
              </div>
            )}

            {/* Featured Images / Gallery Attachment */}
            {showImages && imagesList.length > 0 && (
              <div className="mb-6">
                {isGallery && (
                  <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-300 font-sans text-xs font-bold text-slate-800">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span>DOKUMENTASI FOTO KEGIATAN ({imagesList.length} Foto)</span>
                  </div>
                )}

                {imagesList.length === 1 ? (
                  <div className="relative aspect-[16/9] max-h-[350px] w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-100 print:bg-white my-2 shadow-sm print:shadow-none break-inside-avoid print:break-inside-avoid">
                    <img 
                      src={imagesList[0]} 
                      alt={item.title} 
                      className="w-full h-full object-cover gallery-img"
                    />
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[8pt] px-2 py-0.5 rounded font-sans font-medium print:border print:border-slate-400 print:bg-slate-800">
                      Foto Dokumentasi
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5 my-2">
                    {imagesList.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        className="relative aspect-[4/3] w-full rounded-lg border border-slate-300 overflow-hidden bg-slate-100 print:bg-white shadow-sm print:shadow-none break-inside-avoid print:break-inside-avoid"
                      >
                        <img 
                          src={imgUrl} 
                          alt={`${item.title} ${idx + 1}`} 
                          className="w-full h-full object-cover gallery-img"
                        />
                        <span className="absolute bottom-1.5 left-1.5 bg-slate-900/75 text-white text-[7.5pt] px-1.5 py-0.5 rounded font-sans font-medium print:bg-slate-800 print:border print:border-slate-500">
                          Foto {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Section: Signature & Document Footer */}
          <div>
            {showSignature && (
              <div className="mt-8 break-inside-avoid">
                <PenandatanganDokumen showGuru={false} />
              </div>
            )}

            {/* Footer Metadata */}
            <div className="mt-8 pt-2 border-t border-slate-400 text-[8pt] text-slate-600 flex justify-between items-center font-sans">
              <p>
                Dokumen Resmi Madrasah ({isGallery ? 'Dokumentasi Galeri' : isAnnouncement ? 'Pengumuman' : 'Artikel'}) | Dicetak pada: {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="font-semibold">Si@Kad Madrasah</p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Print Rules */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { 
          /* Completely hide main app container #root and all non-printable elements */
          #root,
          body > *:not(#printable-portal-root),
          .print\\:hidden,
          [class*="print:hidden"] { 
            display: none !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
            opacity: 0 !important;
            position: absolute !important;
            top: -99999px !important;
            left: -99999px !important;
          }

          @page { 
            size: A4 ${orientation}; 
            margin: 8mm 10mm; 
          } 

          html, body { 
            background: #ffffff !important; 
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          } 

          #printable-portal-root,
          div#printable-portal-root,
          body > #printable-portal-root { 
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            visibility: visible !important;
            float: none !important;
          } 

          #printable-portal-root * {
            visibility: visible !important;
          }

          #printable-paper { 
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          } 

          #printable-portal-root img.gallery-img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #printable-portal-root img:not(.gallery-img) {
            max-width: 100% !important;
            max-height: 10cm !important;
            object-fit: contain !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .break-inside-avoid,
          [class*="break-inside-avoid"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      ` }} />
    </div>
  );

  return createPortal(portalContent, document.body);
};

export default CetakPengumumanBerita;

