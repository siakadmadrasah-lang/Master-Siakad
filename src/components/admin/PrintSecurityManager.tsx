"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ShieldCheck, Lock, Unlock, KeyRound, Eye, EyeOff, 
  Copy, RefreshCw, Save, Sparkles, Check, AlertCircle, 
  Play, RotateCcw, FileText, UserCheck, Smartphone
} from 'lucide-react';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import { PrintSecuritySettings } from '@/types/printSecurity';
import { showSuccess, showError } from '@/utils/toast';

interface PrintSecurityManagerProps {
  className?: string;
}

export const PrintSecurityManager: React.FC<PrintSecurityManagerProps> = ({ className }) => {
  const { 
    securitySettings, 
    updateSecuritySettings, 
    clearSessionAuthorization, 
    openProtectionDialogManually 
  } = usePrintSecurity();

  const [formData, setFormData] = useState<PrintSecuritySettings>(securitySettings);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(securitySettings);
  }, [securitySettings]);

  const handleCopyPassword = () => {
    if (!formData.password) return;
    navigator.clipboard.writeText(formData.password);
    setCopied(true);
    showSuccess(`Password "${formData.password}" berhasil disalin ke clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGeneratePassword = () => {
    // Generate simple readable 6-character password (e.g. MDR782)
    const prefixes = ['MDR', 'SIK', 'ADM', 'DOC', 'KOP'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const newPass = `${randomPrefix}${randomDigits}`;
    setFormData(prev => ({ ...prev, password: newPass }));
    showSuccess(`Password baru dibuat: ${newPass}`);
  };

  const handleSave = async () => {
    if (!formData.password || formData.password.trim() === '') {
      showError('Kata sandi proteksi tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateSecuritySettings(formData);
      if (success) {
        showSuccess('Pengaturan proteksi cetak dokumen publik berhasil disimpan!');
      } else {
        showError('Gagal menyimpan pengaturan ke server.');
      }
    } catch (err: any) {
      showError(err?.message || 'Terjadi kesalahan saat menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestModal = () => {
    openProtectionDialogManually(() => {
      showSuccess('Verifikasi berhasil! Dokumen diizinkan untuk dicetak.');
    }, 'Uji Coba Dokumen Resmi Madrasah');
  };

  const handleResetSessionAuth = () => {
    clearSessionAuthorization();
    showSuccess('Status otorisasi sesi saat ini telah direset.');
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <Card className="border border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
        {/* Header with gradient badge */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldCheck className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
                    Modul Keamanan & Otorisasi
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    formData.is_enabled 
                      ? 'bg-emerald-400/20 text-emerald-100 border-emerald-300/30' 
                      : 'bg-white/10 text-white/70 border-white/20'
                  }`}>
                    {formData.is_enabled ? '● Proteksi Aktif' : '○ Proteksi Nonaktif'}
                  </span>
                </div>
                <CardTitle className="text-lg sm:text-xl font-black text-white mt-0.5">
                  Proteksi Password Cetak Dokumen Publik
                </CardTitle>
                <CardDescription className="text-emerald-100/80 text-xs mt-0.5">
                  Batasi akses pencetakan dokumen resmi di halaman publik menggunakan 1 kata sandi universal yang dapat Anda ubah kapan saja.
                </CardDescription>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl font-bold h-10 px-5 shadow-md gap-2 cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" /> : <Save className="w-4 h-4 text-emerald-700" />}
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Main Toggle Switch */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="print-protection-toggle" className="text-sm sm:text-base font-black text-emerald-950 flex items-center gap-2 cursor-pointer">
                {formData.is_enabled ? <Lock className="w-4 h-4 text-emerald-600" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                Aktifkan Proteksi Password Cetak Dokumen Publik
              </Label>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Jika diaktifkan, setiap pengunjung yang menekan tombol cetak pada dokumen publik (Laporan Pembiasaan, Berita, Pengumuman, Profil EMIS, Rekap Siswa, Kartu Ujian, dll) wajib memasukkan kata sandi sebelum dokumen dicetak.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="print-protection-toggle"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                className="data-[state=checked]:bg-emerald-600 scale-125"
              />
            </div>
          </div>

          {/* Form Settings Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column: Password Management */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  Kata Sandi Cetak Universal
                </span>
                <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                  1 Password Semua Dokumen
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">
                  Password Cetak Resmi <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Contoh: madrasah123 atau PIN678"
                    className="rounded-xl h-11 pr-24 font-mono font-bold text-slate-900 bg-white border-slate-300 focus:border-emerald-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      title={showPassword ? "Sembunyikan password" : "Lihat password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                      title="Salin password"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Gunakan kombinasi kata sandi yang mudah diingat atau dibagikan ke pihak berkepentingan.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGeneratePassword}
                    className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-bold h-7 gap-1 px-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Acak Password
                  </Button>
                </div>
              </div>

              {/* Policy Options */}
              <div className="space-y-3 pt-3 border-t border-slate-200/60">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/70">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="session-cache-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block">
                      Ingat Password Selama Sesi Browser Aktif
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Pengunjung tidak perlu mengetik ulang password saat mencetak dokumen lain di tab yang sama.
                    </p>
                  </div>
                  <Switch
                    id="session-cache-toggle"
                    checked={formData.allow_session_cache !== false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_session_cache: checked }))}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/70">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="exempt-admin-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block">
                      Bebaskan Admin / Guru yang Sedang Login
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Akun yang sudah login ke panel admin dapat langsung mencetak tanpa diminta password proteksi.
                    </p>
                  </div>
                  <Switch
                    id="exempt-admin-toggle"
                    checked={formData.exempt_admin !== false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, exempt_admin: checked }))}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Custom Title & Instructions */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Kustomisasi Tampilan Dialog Pengunjung
                </span>
                <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                  Pesan & Petunjuk
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">
                  Judul Dialog Proteksi Cetak
                </Label>
                <Input
                  value={formData.custom_title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_title: e.target.value }))}
                  placeholder="Proteksi Akses Cetak Dokumen Resmi"
                  className="rounded-xl h-10 bg-white border-slate-300 font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">
                  Petunjuk / Instruksi untuk Pengunjung
                </Label>
                <Textarea
                  rows={3}
                  value={formData.custom_message || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_message: e.target.value }))}
                  placeholder="Dokumen ini dilindungi demi menjaga keabsahan arsip resmi madrasah. Masukkan kode sandi cetak untuk melanjutkan."
                  className="rounded-xl bg-white border-slate-300 text-xs leading-relaxed"
                />
                <p className="text-[11px] text-slate-500">
                  Pesan ini akan tampil di dalam dialog saat pengunjung menekan tombol cetak.
                </p>
              </div>

              {/* Test & Simulation Card */}
              <div className="pt-3 border-t border-slate-200/60 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Uji Coba & Simulasi Dialog Pengunjung:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleTestModal}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold h-9 px-4 gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" /> Uji Coba Dialog Proteksi
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetSessionAuth}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold h-9 px-3 gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Sesi Saya
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tips and Security Information */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <p className="font-extrabold text-amber-900">
                Cara Kerja & Keamanan Proteksi Cetak:
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-900/90 leading-relaxed">
                <li>
                  <strong>1 Password Universal:</strong> Anda cukup mengelola satu kata sandi di halaman ini. Password ini otomatis berlaku untuk seluruh jenis cetak dokumen di website publik madrasah.
                </li>
                <li>
                  <strong>Perubahan Instan:</strong> Saat Anda mengubah password di sini dan menekan <em>Simpan Pengaturan</em>, password baru langsung aktif di seluruh website tanpa perlu memuat ulang server.
                </li>
                <li>
                  <strong>Otorisasi Sesi:</strong> Jika opsi <em>"Ingat Password Selama Sesi"</em> diaktifkan, pengunjung yang telah memasukkan password valid satu kali tidak perlu mengulanginya saat mencetak dokumen lainnya di sesi browser yang sama.
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Terakhir diperbarui: {formData.updated_at ? new Date(formData.updated_at).toLocaleString('id-ID') : 'Belum pernah diubah'}
            </span>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-11 px-7 shadow-lg shadow-emerald-600/20 gap-2 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintSecurityManager;
