-- ========================================================================
-- SKEMA DATABASE MYSQL / MARIADB SIAKAD MADRASAH
-- ========================================================================
-- Petunjuk Import:
-- 1. Buka phpMyAdmin di Plesk / cPanel / DirectAdmin hosting Anda.
-- 2. Pilih nama database yang telah Anda buat di menu Database hosting.
-- 3. Klik tab "Import" di bagian atas phpMyAdmin.
-- 4. Pilih file `database-mysql.sql` ini dan klik tombol "Go" / "Kirim".
-- ========================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. Tabel Utama `site_settings`
-- Menyimpan seluruh konfigurasi, siswa, guru, artikel, & data siakad (Format JSON)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` VARCHAR(191) NOT NULL,
  `value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Tabel `users` (Opsional / Data Pengguna Administrator)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'admin',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Konfigurasi Default Si@Kad
INSERT IGNORE INTO `site_settings` (`id`, `value`) VALUES 
('general', '{"school_name":"Si@Kad","tagline":"Sistem Informasi Akademik Modern","address":"","phone":"","email":"","operational_hours":"Senin - Sabtu: 07:00 - 14:00 WIB","headmaster_name":"","headmaster_title":"Kepala Madrasah","maps_latitude":"-7.517606","maps_longitude":"109.132984","maps_zoom":"16"}'),
('hero', '{"badge_text":"Eksklusif & Modern","heading_line1":"Si@Kad","heading_line2":"Madrasah","description":"Selamat datang di institusi pendidikan yang memadukan kemuliaan akhlakul karimah dengan keunggulan akademik berbasis digital.","cta_primary":"Daftar Sekarang","cta_secondary":"Lihat Profil","stats_students":"150+","stats_achievements":"25+","stats_teachers":"15+","stats_years":"10+","background_image":"/og-cover.jpg","right_image":"/og-cover.jpg","images":[{"url":"/og-cover.jpg","title":"Pembiasaan","subtitle":"Terakreditasi & Berprestasi"}],"right_image_title":"Pembiasaan","right_image_subtitle":"Terakreditasi & Berprestasi"}'),
('running_text', '{"enabled":true,"text":"Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.","direction":"right_to_left","speed":"normal","badge":"INFORMASI MADRASAH","bg_color":"emerald","link_url":"/spmb","link_label":"Lihat SPMB","show_close_button":true,"archive":[{"id":"1","text":"Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.","badge":"INFORMASI MADRASAH","direction":"right_to_left","speed":"normal","bg_color":"emerald","link_url":"/spmb","link_label":"Lihat SPMB","created_at":"2026-01-01 00:00:00","is_active":true}]}'),
('seo', '{"title":"Si@Kad - Sistem Informasi Akademik Modern","description":"Aplikasi Sistem Informasi Akademik Madrasah Modern untuk kelola data siswa, guru, jadwal KBM, nilai, dan SPMB secara digital.","image_url":"/og-cover.jpg","og_image_url":"/og-cover.jpg"}'),
('tahun_pelajaran', '{"active_year":"2026/2027","available_years":["2026/2027","2025/2026","2024/2025","2023/2024"],"spmb_year":"2026/2027","semester":"Ganjil"}'),
('sticky_footer', '{"items":[{"icon_name":"Home","label":"Beranda","path":"/"},{"icon_name":"Brain","label":"Modul Ajar KBC","path":"/ai-teaching"},{"icon_name":"Link","label":"Tautan","path":"/links"},{"icon_name":"Users","label":"SPMB","path":"/spmb"},{"icon_name":"UserCircle","label":"Admin","path":"/login"}]}');

-- Insert Admin Default
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password`, `role`) 
VALUES (1, 'admin', 'admin@madrasah.sch.id', '$2y$10$4qK1nZ94f1O1wUfB1y5lce0Yl9e4k1w8m9Z1x2y3z4a5b6c7d8e9f', 'admin');

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
