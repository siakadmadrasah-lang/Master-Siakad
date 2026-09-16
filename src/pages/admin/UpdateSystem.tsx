import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  GitPullRequest, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ExternalLink, 
  Clock, 
  Terminal, 
  Sparkles, 
  Server, 
  ShieldCheck, 
  Layers, 
  Globe, 
  Zap, 
  Calendar,
  User,
  ArrowUpRight,
  Sliders,
  Bell
} from 'lucide-react';
import { getMysqlApiUrl } from '@/integrations/supabase/client';

interface GitCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author?: {
    avatar_url: string;
    login: string;
  };
  html_url: string;
}

interface ServerVersionInfo {
  has_git: boolean;
  current_commit: string;
  php_version: string;
  server_software: string;
  app_version: string;
}

const CURRENT_VERSION = "2.5.0";
const REPO_OWNER = "siakadmadrasah-lang";
const REPO_NAME = "Master-Siakad";
const DEFAULT_REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

export default function UpdateSystem() {
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [latestCommit, setLatestCommit] = useState<GitCommit | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerVersionInfo | null>(null);
  const [pullOutput, setPullOutput] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [autoCheck, setAutoCheck] = useState<boolean>(() => {
    return localStorage.getItem('siakad_auto_check_update') !== 'false';
  });
  const [savedLastCheck, setSavedLastCheck] = useState<string | null>(() => {
    return localStorage.getItem('siakad_last_update_check');
  });

  const fetchServerInfo = async () => {
    try {
      const apiUrl = getMysqlApiUrl();
      const res = await fetch(`${apiUrl}?action=system_version`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          setServerInfo(json);
        }
      }
    } catch {
      // Offline / client-only mode
    }
  };

  const checkGitHubUpdates = async (showNotice = true) => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=8`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Batas akses publik GitHub tercapai (Rate limit). Mohon tunggu beberapa saat.');
        }
        throw new Error(`Gagal menghubungi server GitHub (HTTP ${res.status})`);
      }

      const data: GitCommit[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCommits(data);
        setLatestCommit(data[0]);
        const nowStr = new Date().toLocaleString('id-ID');
        setSavedLastCheck(nowStr);
        localStorage.setItem('siakad_last_update_check', nowStr);

        if (showNotice) {
          setNotification({
            type: 'success',
            message: `Pengecekan selesai! Ditemukan pembaruan komit terkini: ${data[0].sha.substring(0, 7)}.`
          });
        }
      }
    } catch (err: any) {
      console.warn('Gagal cek update dari GitHub:', err);
      if (showNotice) {
        setNotification({
          type: 'error',
          message: err.message || 'Tidak dapat memuat data dari repositori GitHub.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerInfo();
    checkGitHubUpdates(false);
  }, []);

  const handleGitPull = async () => {
    const confirm = window.confirm(
      "PERINGATAN SINKRONISASI SERVER:\n\nApakah Anda yakin ingin menjalankan 'git pull' otomatis di server hosting Anda?\n\nBerkas aplikasi akan diperbarui langsung dengan branch 'main' terbaru dari GitHub."
    );
    if (!confirm) return;

    setPulling(true);
    setPullOutput(null);
    try {
      const apiUrl = getMysqlApiUrl();
      const res = await fetch(`${apiUrl}?action=git_pull`, { method: 'POST' });
      const json = await res.json();
      setPullOutput(json.output || json.message || JSON.stringify(json));
      
      if (json.status === 'success') {
        setNotification({
          type: 'success',
          message: json.message || 'Sinkronisasi Git Pull berhasil!'
        });
        fetchServerInfo();
      } else {
        setNotification({
          type: 'info',
          message: json.message || json.error || 'Perintah Git selesai dieksekusi.'
        });
      }
    } catch (err: any) {
      setPullOutput("Error koneksi: " + err.message);
      setNotification({
        type: 'error',
        message: 'Gagal menjalankan Git Pull: ' + err.message
      });
    } finally {
      setPulling(false);
    }
  };

  const handleClearCache = () => {
    try {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      localStorage.removeItem('siakad_version_cache');
      alert("Cache aset browser dan service worker telah dibersihkan! Halaman akan dimuat ulang...");
      window.location.reload();
    } catch (e: any) {
      alert("Pembersihan cache: " + e.message);
    }
  };

  const toggleAutoCheck = (enabled: boolean) => {
    setAutoCheck(enabled);
    localStorage.setItem('siakad_auto_check_update', enabled ? 'true' : 'false');
  };

  return (
    <AdminLayout title="Pembaruan & Sinkronisasi Sistem">
      <div className="max-w-6xl space-y-6 pb-12">

        {/* Hero Card Status Sistem */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Terhubung ke GitHub: {REPO_OWNER}/{REPO_NAME}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                Pusat Pembaruan Sistem
                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                  v{CURRENT_VERSION}
                </Badge>
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Fitur pembaruan otomatis yang menghubungkan instalasi Si@Kad Madrasah Anda dengan proyek master di GitHub. Anda dapat memeriksa perubahan fitur baru, menarik kode langsung (Git Pull), atau mengunduh paket siap pasang.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                onClick={() => checkGitHubUpdates(true)}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl px-5 h-12 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Memeriksa...' : 'Cek Pembaruan'}
              </Button>
              <Button
                onClick={handleClearCache}
                variant="outline"
                className="border-white/20 text-slate-200 hover:bg-white/10 font-semibold rounded-2xl h-12 px-4"
              >
                <Zap className="w-4 h-4 mr-1.5 text-amber-400" />
                Segarkan Cache
              </Button>
            </div>
          </div>

          {/* Mini Status Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-slate-400 block mb-0.5">Versi Rilis Aplikasi</span>
              <span className="font-bold text-white text-sm">v{CURRENT_VERSION} Stable</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-slate-400 block mb-0.5">Cabang Repositori</span>
              <span className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" /> origin/main
              </span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-slate-400 block mb-0.5">Pemeriksaan Terakhir</span>
              <span className="font-bold text-slate-200 text-xs">
                {savedLastCheck || 'Baru saja'}
              </span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-slate-400 block mb-0.5">Status Git Server</span>
              <span className="font-bold text-indigo-300 text-xs flex items-center gap-1">
                <Server className="w-3.5 h-3.5" />
                {serverInfo?.has_git ? 'Git Terpasang' : 'Web Deployment'}
              </span>
            </div>
          </div>
        </div>

        {/* Notifikasi feedback */}
        {notification && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-xs opacity-60 hover:opacity-100 font-bold px-2 py-1"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Highlight Komit Terkini di GitHub */}
        {latestCommit && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 rounded-3xl border border-indigo-100 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Komit Terakhir di GitHub
                    </span>
                    <span className="font-mono text-xs text-indigo-950 font-bold bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                      SHA: {latestCommit.sha.substring(0, 7)}
                    </span>
                  </div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                    {latestCommit.commit.message}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      {latestCommit.commit.author.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(latestCommit.commit.author.date).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={latestCommit.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-sm"
                  >
                    Lihat di GitHub
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4 Opsi Pembaruan & Sinkronisasi */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Card 1: 1-Click Server Git Pull */}
          <Card className="rounded-3xl border border-slate-200 shadow-md bg-white overflow-hidden flex flex-col justify-between">
            <CardHeader className="bg-slate-50/80 p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600" />
                  Metode 1: Tarik Otomatis (Git Pull)
                </CardTitle>
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[11px] font-semibold">
                  1-Click Sync
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 flex-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Jika aplikasi Anda dihosting pada cPanel, Plesk, atau VPS dengan fitur Git Version Control aktif, Anda dapat memperbarui seluruh file aplikasi secara langsung dari tombol ini tanpa perlu login ke cPanel.
              </p>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 border-b border-slate-200">
                  <span>Perintah yang dijalankan:</span>
                  <span className="text-emerald-600 font-bold">git pull origin main</span>
                </div>
                <div>Target Remote: {DEFAULT_REPO_URL}</div>
              </div>

              {pullOutput && (
                <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {pullOutput}
                </div>
              )}

              <Button
                onClick={handleGitPull}
                disabled={pulling}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl h-11 transition-all shadow"
              >
                <GitPullRequest className={`w-4 h-4 mr-2 ${pulling ? 'animate-spin' : ''}`} />
                {pulling ? 'Menjalankan Git Pull...' : 'Jalankan Sinkronisasi Git Pull'}
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Unduh Paket ZIP Pembaruan Hosting */}
          <Card className="rounded-3xl border border-slate-200 shadow-md bg-white overflow-hidden flex flex-col justify-between">
            <CardHeader className="bg-slate-50/80 p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-600" />
                  Metode 2: Unduh Paket Master ZIP
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-semibold">
                  Aman Hosting
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 flex-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Unduh salinan berkas proyek terbaru langsung dari GitHub. Ekstrak file zip ini langsung ke folder <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">public_html</code> (cPanel) atau <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">httpdocs</code> (Plesk).
              </p>

              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Proteksi Aman:</strong> Folder foto/lampiran (<code className="font-mono">uploads/</code>) dan database Anda (<code className="font-mono">db_config.local.php</code>) otomatis dipertahankan dan tidak akan terhapus.
                </div>
              </div>

              <a
                href={`${DEFAULT_REPO_URL}/archive/refs/heads/main.zip`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl h-11 transition-all shadow"
              >
                <Download className="w-4 h-4 mr-2" />
                Unduh Master ZIP Terbaru (.zip)
              </a>
            </CardContent>
          </Card>

          {/* Card 3: Otomatisasi GitHub Webhook & CI/CD */}
          <Card className="rounded-3xl border border-slate-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Metode 3: Otomatisasi CI/CD & Webhook
                </CardTitle>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[11px] font-semibold">
                  Otomatis Penuh
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingin setiap kali Anda melakukan push ke repositori GitHub, aplikasi di hosting langsung ter-update otomatis? Anda dapat memanfaatkan GitHub Actions atau Webhook cPanel:
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">1. Webhook URL cPanel / Plesk:</span>
                  <span className="text-[11px] text-slate-500">
                    Buka menu Git Version Control di cPanel &rarr; Masukkan URL Webhook ke GitHub Repo Settings &rarr; Webhooks.
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">2. GitHub Actions Deploy Workflow:</span>
                  <span className="text-[11px] text-slate-500">
                    Gunakan berkas <code className="font-mono text-indigo-600">.github/workflows/deploy.yml</code> yang sudah disertakan dalam repositori ini untuk auto-deploy via FTP / SSH.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Pengaturan Preferensi Pembaruan */}
          <Card className="rounded-3xl border border-slate-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-600" />
                  Pengaturan Pembaruan
                </CardTitle>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[11px] font-semibold">
                  Preferensi
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-purple-600" /> Cek Pembaruan Otomatis
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Memeriksa ketersediaan komit baru di GitHub saat membuka dashboard admin.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoCheck}
                  onChange={(e) => toggleAutoCheck(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">Repositori Terhubung:</span>
                <a
                  href={DEFAULT_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 font-mono text-[11px] flex items-center gap-1 break-all"
                >
                  {DEFAULT_REPO_URL}
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Riwayat Komit Terbaru (Changelog) */}
        <Card className="rounded-3xl border border-slate-200 shadow-md bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/80 p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Riwayat Log Pembaruan & Komit (Changelog)
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Daftar komit dan fitur terbaru yang dipublikasikan ke branch utama (main)
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200">
                {commits.length} Komit Terakhir
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {commits.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                {loading ? 'Memuat riwayat komit dari GitHub...' : 'Belum ada data komit yang dimuat. Klik tombol "Cek Pembaruan" di atas.'}
              </div>
            ) : (
              <div className="space-y-3">
                {commits.map((c, idx) => (
                  <div 
                    key={c.sha} 
                    className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {c.sha.substring(0, 7)}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase rounded-full border border-emerald-200">
                            Terbaru
                          </span>
                        )}
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(c.commit.author.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {c.commit.message}
                      </p>
                      <div className="text-[11px] text-slate-500">
                        Oleh: <span className="font-medium text-slate-700">{c.commit.author.name}</span>
                      </div>
                    </div>

                    <a
                      href={c.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 self-start sm:self-center"
                    >
                      Buka Komit <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}
