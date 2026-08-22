export interface PrintSecuritySettings {
  is_enabled: boolean;          // Status proteksi password cetak (true = aktif, false = bebas)
  password: string;            // Kata sandi proteksi universal untuk seluruh dokumen
  custom_title?: string;       // Judul dialog proteksi
  custom_message?: string;     // Pesan petunjuk untuk pengunjung
  allow_session_cache?: boolean; // Sekali input password benar berlaku selama sesi browser aktif
  exempt_admin?: boolean;      // Admin/guru yang login otomatis bebas password
  updated_at?: string;
  updated_by?: string;
}

export const DEFAULT_PRINT_SECURITY: PrintSecuritySettings = {
  is_enabled: true,
  password: 'madrasah123',
  custom_title: 'Proteksi Akses Cetak Dokumen Resmi',
  custom_message: 'Dokumen ini dilindungi demi menjaga keabsahan arsip resmi madrasah. Masukkan kode sandi cetak untuk melanjutkan.',
  allow_session_cache: true,
  exempt_admin: true,
};
