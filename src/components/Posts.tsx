"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Sparkles, X, ChevronDown, ChevronUp, Printer, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ImageSlideshow from './ImageSlideshow';
import { CetakPengumumanBerita } from './CetakPengumumanBerita';

const Posts = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [printPost, setPrintPost] = useState<any>(null);
  const [showAll, setShowAll] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'posts_data_list').maybeSingle();
        if (res?.value) setPosts(res.value as any[]);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchPosts();
  }, []);

  // Handle URL deep-linking on mount & data fetch
  useEffect(() => {
    if (posts.length === 0) return;
    const checkUrlAndOpen = () => {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;
      const idFromUrl = params.get('id') || params.get('post') || params.get('berita') ||
        (path.startsWith('/berita/') ? path.split('/berita/')[1] : null) ||
        (path.startsWith('/posts/') ? path.split('/posts/')[1] : null);

      if (idFromUrl) {
        const found = posts.find(item => String(item.id) === String(idFromUrl) || item.title?.toLowerCase().replace(/\s+/g, '-') === idFromUrl);
        if (found) {
          setSelectedPost(found);
          setTimeout(() => {
            const el = document.getElementById('posts');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 300);
        }
      } else if (path === '/berita' || path === '/posts') {
        setTimeout(() => {
          const el = document.getElementById('posts');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    };

    checkUrlAndOpen();

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const idFromUrl = params.get('id') || params.get('post') || params.get('berita');
      if (idFromUrl) {
        const found = posts.find(item => String(item.id) === String(idFromUrl));
        if (found) setSelectedPost(found);
        else setSelectedPost(null);
      } else {
        setSelectedPost(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [posts]);

  const openPost = (item: any) => {
    setSelectedPost(item);
    if (item && item.id) {
      window.history.pushState({ postId: item.id }, '', `/berita?id=${encodeURIComponent(item.id)}`);
    }
  };

  const closePost = () => {
    setSelectedPost(null);
    if (window.location.pathname.startsWith('/berita') || window.location.pathname.startsWith('/posts') || window.location.search.includes('id=')) {
      window.history.pushState(null, '', '/#posts');
    }
  };

  if (!loading && posts.length === 0) return null;

  const initialLimit = isMobile ? 1 : 3;
  const displayedPosts = showAll ? posts : posts.slice(0, initialLimit);

  return (
    <section id="posts" className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Artikel & Wawasan
          </div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 flex items-center justify-center gap-3">
            <div className="w-5 h-5 bg-emerald-600 rounded-sm -rotate-12 flex-shrink-0"></div>
            <span>
              Berita <span className="text-emerald-600 font-serif-premium italic">Terbaru</span>
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {displayedPosts.map(post => (
            <Card 
              key={post.id} 
              className="group border-0 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer"
              onClick={() => openPost(post)}
            >
              <ImageSlideshow 
                images={post.images || (post.image_url ? [post.image_url] : ["/og-cover.jpg"])} 
                className="h-36 w-full" 
                alt={post.title}
              />
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                  <Calendar className="w-3 h-3" /> 
                  {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">{post.title}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && posts.length > initialLimit && (
          <div className="mt-12 text-center">
            <Button 
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold px-8"
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4 mr-2" /> Tampilkan Lebih Sedikit</>
              ) : (
                <><ChevronDown className="w-4 h-4 mr-2" /> Lihat Semua Berita</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Modal Popup Detail Artikel (Muncul saat diklik) */}
      {selectedPost && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={closePost}>
          <div className="relative max-w-3xl w-full my-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
              
              {/* Header Modal - Menampilkan Tombol Cetak & Informasi Artikel */}
              <div className="bg-slate-900 text-white p-3 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" /> Baca Full Artikel
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => setPrintPost(selectedPost)}
                    className="h-8 px-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" /> Cetak
                  </Button>
                  <button className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors" onClick={closePost}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto">
                <ImageSlideshow 
                  images={selectedPost.images || [selectedPost.image_url]} 
                  className="w-full aspect-video flex-shrink-0" 
                  alt={selectedPost.title}
                />
                <div className="p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedPost.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{selectedPost.title}</h3>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{selectedPost.content}</p>

                  {/* Footer Actions saat item dibuka */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
                    <Button variant="outline" onClick={closePost} className="rounded-xl text-xs font-bold">
                      Tutup
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => setPrintPost(selectedPost)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm">
                        <Printer className="w-4 h-4 mr-1.5" /> Cetak Dokumen
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Cetak Portal Modal */}
      {printPost && (
        <CetakPengumumanBerita 
          item={printPost} 
          type="berita" 
          onClose={() => setPrintPost(null)} 
        />
      )}
    </section>
  );
};

export default Posts;