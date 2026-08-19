"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  HeartHandshake, Search, Calendar, Clock, MapPin, Users,
  Printer, ArrowLeft, Image as ImageIcon, Eye, CheckCircle2,
  Sparkles, Filter, FileSpreadsheet, Layers, ShieldCheck, ChevronRight,
  ArrowUp, ChevronUp
} from 'lucide-react';
import CetakLaporanPembiasaan, { PembiasaanItem } from '@/components/CetakLaporanPembiasaan';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import { formatImageUrl } from '@/utils/imageCompression';

const KATEGORI_LIST = [
  'Semua',
  'Ibadah & Spiritual',
  'Karakter & Akhlak',
  'Kesehatan & Lingkungan',
  'Literasi & Bahasa',
  'Kedisiplinan & 5S',
  'Sosial & Kepedulian',
  'Nasionalisme & Karakter'
];

export const PembiasaanPublic: React.FC = () => {
  const navigate = useNavigate();
  const { activeMadrasah, activeMadrasahId } = useMadrasah();
  const { settings } = useSiteSettings();

  const [items, setItems] = useState<PembiasaanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedBulan, setSelectedBulan] = useState('Semua');

  // Preview & Print State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState<PembiasaanItem | null>(null);
  const [printMode, setPrintMode] = useState<'single' | 'rekap'>('single');
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  // Scroll to top button visibility state
  const [showScrollTop, setShowScrollTop] = useState(false);

  const storageKey = `laporan_pembiasaan_list_${activeMadrasahId || 'default'}`;

  // Pastikan posisi scroll langsung ke atas saat halaman dimuat
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  // Deteksi event scroll untuk menampilkan tombol scroll ke atas
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper to filter out legacy mock IDs
  const cleanMockItems = (rawList: PembiasaanItem[]): PembiasaanItem[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.filter(item => !['pemb-001', 'pemb-002', 'pemb-003'].includes(item.id));
  };

  const fetchPublicItems = async () => {
    setLoading(true);
    try {
      // 1. Try Supabase
      const { data: res } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', storageKey)
        .maybeSingle();

      if (res?.value && Array.isArray(res.value)) {
        const cleaned = cleanMockItems(res.value);
        setItems(cleaned);
        localStorage.setItem(storageKey, JSON.stringify(cleaned));
      } else {
        // 2. Try LocalStorage
        const local = localStorage.getItem(storageKey);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) {
              setItems(cleanMockItems(parsed));
              return;
            }
          } catch (e) {
            console.error('Error parsing local storage:', e);
          }
        }
        setItems([]);
      }
    } catch (err) {
      console.warn('Gagal memuat pembiasaan publik:', err);
      const local = localStorage.getItem(storageKey);
      if (local) {
        try {
          setItems(cleanMockItems(JSON.parse(local)));
        } catch {
          setItems([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicItems();
  }, [activeMadrasahId]);

  // Extract unique months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    items.forEach(item => {
      if (item.tanggal) {
        const d = new Date(item.tanggal);
        const monthYear = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        months.add(monthYear);
      }
    });
    return Array.from(months);
  }, [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || 
        item.nama_kegiatan.toLowerCase().includes(q) ||
        item.guru_pendamping?.toLowerCase().includes(q) ||
        item.lokasi?.toLowerCase().includes(q) ||
        item.sasaran_kelas?.toLowerCase().includes(q) ||
        item.tujuan?.toLowerCase().includes(q);

      // Kategori
      const matchKategori = selectedKategori === 'Semua' || item.kategori === selectedKategori;

      // Bulan
      let matchBulan = true;
      if (selectedBulan !== 'Semua' && item.tanggal) {
        const itemMonthYear = new Date(item.tanggal).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        matchBulan = itemMonthYear === selectedBulan;
      }

      return matchQuery && matchKategori && matchBulan;
    });
  }, [items, searchQuery, selectedKategori, selectedBulan]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative">
      <SEO />
      <Navbar />

      {/* Header Banner with top padding for fixed Navbar */}
      <div className="pt-24 sm:pt-28 md:pt-32 pb-6 md:pb-8 bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-100 hover:text-white bg-emerald-700/60 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Beranda</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <HeartHandshake className="w-6 h-6 md:w-7 md:h-7 text-emerald-300" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white">
                    Laporan Pembiasaan Santri
                  </h1>
                  <p className="text-xs md:text-sm text-emerald-100 mt-0.5">
                    {activeMadrasah?.nama || 'Madrasah Ibtidaiyah'} — Jurnal Penguatan Karakter & Ibadah Harian
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Button & Security Indicator */}
            <div className="flex flex-wrap items-center gap-2.5">
              <PrintSecurityIndicator documentTitle="Jurnal & Laporan Pembiasaan Santri" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrintItem(null);
                  setPrintMode('rekap');
                  setPrintModalOpen(true);
                }}
                className="text-xs h-9 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                <span>Cetak Rekap Jurnal</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area with generous bottom padding for sticky bar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1 w-full pb-32 lg:pb-24">
        {/* Search & Filter Toolbar */}
        <Card className="bg-white border border-slate-200 shadow-sm mb-6 rounded-xl overflow-hidden">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama kegiatan, guru pendamping, lokasi, rombel..."
                  className="pl-9 text-xs md:text-sm h-10 border-slate-200 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Month Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedBulan}
                  onChange={(e) => setSelectedBulan(e.target.value)}
                  className="w-full h-10 text-xs md:text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Semua">Semua Periode / Bulan</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedKategori}
                  onChange={(e) => setSelectedKategori(e.target.value)}
                  className="w-full h-10 text-xs md:text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {KATEGORI_LIST.map((k) => (
                    <option key={k} value={k}>{k === 'Semua' ? 'Semua Kategori' : k}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Kategori:
              </span>
              {KATEGORI_LIST.map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKategori(k)}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all text-xs whitespace-nowrap cursor-pointer ${
                    selectedKategori === k
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs md:text-sm font-semibold text-slate-700">
            Menampilkan <span className="text-emerald-700 font-bold">{filteredItems.length}</span> kegiatan pembiasaan
          </p>
          {(searchQuery || selectedKategori !== 'Semua' || selectedBulan !== 'Semua') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedKategori('Semua');
                setSelectedBulan('Semua');
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Memuat jurnal pembiasaan santri...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Belum Ada Laporan Pembiasaan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Data kegiatan pembiasaan dan penguatan karakter santri akan tampil di halaman ini setelah diinputkan oleh ustadz/ustadzah.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const coverImage = item.images && item.images.length > 0 ? item.images[0] : null;
              
              return (
                <Card 
                  key={item.id}
                  className="bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all rounded-xl overflow-hidden flex flex-col group"
                >
                  {/* Photo Documentation Header */}
                  {coverImage ? (
                    <div className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer">
                      <img
                        src={formatImageUrl(coverImage)}
                        alt={item.nama_kegiatan}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onClick={() => setSelectedImageModal(coverImage)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-700/90 text-white rounded-md backdrop-blur-xs shadow-xs">
                          {item.kategori}
                        </span>
                        {item.images && item.images.length > 1 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-black/60 text-white rounded-md backdrop-blur-xs flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            +{item.images.length - 1} Foto
                          </span>
                        )}
                      </div>

                      {/* Bottom Date in Image */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
                        <span className="flex items-center gap-1 font-medium text-[11px] drop-shadow-xs">
                          <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                          {formatDate(item.tanggal)}
                        </span>
                        <span className="text-[11px] text-emerald-200 font-medium">
                          {item.waktu || 'Pagi'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                        {item.kategori}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        {formatDate(item.tanggal)}
                      </span>
                    </div>
                  )}

                  {/* Card Content */}
                  <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {item.nama_kegiatan}
                      </h3>

                      {/* Info Badges & Metadata */}
                      <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{item.lokasi || 'Madrasah'}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="font-medium text-slate-800 line-clamp-1">
                            Guru Pendamping: <strong className="text-emerald-800">{item.guru_pendamping || 'Tim Guru Piket'}</strong>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="text-slate-600">Sasaran: {item.sasaran_kelas || 'Semua Siswa'}</span>
                        </div>
                      </div>

                      {/* Tujuan / Uraian Ringkas */}
                      {(item.tujuan || item.uraian_kegiatan) && (
                        <p className="mt-3 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {item.tujuan || item.uraian_kegiatan}
                        </p>
                      )}
                    </div>

                    {/* Footer Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {item.status_keterlaksanaan || 'Terlaksana'}
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPrintItem(item);
                          setPrintMode('single');
                          setPrintModalOpen(true);
                        }}
                        className="text-xs h-7 px-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Lihat & Cetak</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          aria-label="Scroll ke Atas"
          className="fixed bottom-24 lg:bottom-12 right-4 sm:right-6 z-50 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center cursor-pointer border-2 border-white/50 backdrop-blur-xs group"
        >
          <ChevronUp className="w-5 h-5 group-hover:animate-bounce" />
          <span className="sr-only">Scroll ke Atas</span>
        </button>
      )}

      {/* Image Preview Lightbox */}
      {selectedImageModal && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-lg overflow-hidden flex flex-col items-center">
            <img
              src={formatImageUrl(selectedImageModal)}
              alt="Preview Dokumentasi"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-3 right-3 text-white bg-black/60 hover:bg-black/90 p-2 rounded-full text-xs font-bold cursor-pointer"
            >
              ✕ Tutup
            </button>
          </div>
        </div>
      )}

      {/* Cetak Modal Portal */}
      {printModalOpen && (
        <CetakLaporanPembiasaan
          item={printItem || undefined}
          itemsList={items}
          mode={printMode}
          onClose={() => {
            setPrintModalOpen(false);
            setPrintItem(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default PembiasaanPublic;
