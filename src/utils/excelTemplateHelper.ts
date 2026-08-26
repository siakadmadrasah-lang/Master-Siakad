import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

// Dropdown options matching the "Tambah Guru / GTK Baru" module
export const GTK_DROPDOWN_OPTIONS = {
  gender: ['Laki-laki', 'Perempuan'],
  status_kepegawaian: [
    'PNS',
    'PPPK',
    'GTY / Guru Tetap Yayasan',
    'GTT / Honorer',
    'Staf / Tenaga Kependidikan'
  ],
  pendidikan: [
    'S1 Pendidikan Agama Islam',
    'S1 PGMI / PGSD',
    'S1 Pendidikan Bahasa Arab',
    'S1 Pendidikan Bahasa Inggris',
    'S1 Pendidikan Matematika',
    'S1 Pendidikan Jasmani (PJOK)',
    'S1 Teknik Informatika',
    'S2 Pendidikan Agama Islam',
    'S2 Manajemen Pendidikan',
    'S2 Pendidikan',
    'S3',
    'D3 / Sederajat',
    'SMA / MA / SMK'
  ],
  sertifikasi: [
    'Sudah Sertifikasi',
    'Dalam Proses',
    'Belum Sertifikasi'
  ],
  status_keaktifan: [
    'Aktif',
    'Cuti',
    'Tugas Belajar',
    'Pindah Tugas',
    'Non-Aktif'
  ],
  mengajar_kelas: [
    'Kelas 1',
    'Kelas 2',
    'Kelas 3',
    'Kelas 4',
    'Kelas 5',
    'Kelas 6',
    'Kelas 1-3',
    'Kelas 4-6',
    'Semua Kelas (1-6)'
  ],
  jabatan: [
    'Kepala Madrasah',
    'Wakil Kepala Madrasah',
    'Guru Kelas I',
    'Guru Kelas II',
    'Guru Kelas III',
    'Guru Kelas IV',
    'Guru Kelas V',
    'Guru Kelas VI',
    'Guru Mapel PAI',
    'Guru Mapel Bahasa Arab',
    'Guru Mapel Bahasa Inggris',
    'Guru Mapel PJOK',
    'Guru Mapel SBdP',
    'Guru Mapel IPAS',
    'Guru Mapel Matematika',
    'Guru BK / Konselor',
    'Kepala Tata Usaha',
    'Staf Tata Usaha / Admin',
    'Operator Simpatika & EMIS',
    'Pustakawan',
    'Laboran',
    'Bendahara Madrasah',
    'Petugas Keamanan / Satpam',
    'Petugas Kebersihan'
  ]
};

export interface TeacherTemplateItem {
  'Nama Lengkap': string;
  'Gelar': string;
  'NIK': string;
  'NIP': string;
  'NUPTK': string;
  'NPK Kemenag': string;
  'Peg ID Simpatika': string;
  'NRG': string;
  'Tempat Lahir': string;
  'Tanggal Lahir (YYYY-MM-DD)': string;
  'Alamat Rumah': string;
  'Jabatan': string;
  'Status Kepegawaian': string;
  'Jenis Kelamin': string;
  'No WhatsApp': string;
  'Email': string;
  'Pendidikan Terakhir': string;
  'Status Sertifikasi': string;
  'No Sertifikat Pendidik': string;
  'Mapel Diampu': string;
  'Mengajar Kelas': string;
  'Status Keaktifan': string;
  'TMT Pendidik': string;
  'TMT Madrasah': string;
}

/**
 * Builds the official GTK template data with example rows OR from existing GTK records
 */
export function generateGtkTemplateRows(existingTeachers?: any[]): TeacherTemplateItem[] {
  if (existingTeachers && existingTeachers.length > 0) {
    return existingTeachers.map((t) => {
      // Resolve gender
      const gender = t.gender || (t.jenis_kelamin === 'P' || t.jk === 'P' ? 'Perempuan' : 'Laki-laki');
      
      // Resolve status kepegawaian
      let statusPeg = t.status_kepegawaian || t.status || 'GTY / Guru Tetap Yayasan';
      if (statusPeg.includes('GTY')) statusPeg = 'GTY / Guru Tetap Yayasan';
      else if (statusPeg.includes('PNS')) statusPeg = 'PNS';
      else if (statusPeg.includes('PPPK')) statusPeg = 'PPPK';
      else if (statusPeg.includes('GTT') || statusPeg.includes('Honorer')) statusPeg = 'GTT / Honorer';
      else if (statusPeg.includes('Staf') || statusPeg.includes('Tenaga Kependidikan')) statusPeg = 'Staf / Tenaga Kependidikan';

      // Resolve sertifikasi
      let sertifikasi = t.sertifikasi || t.status_sertifikasi || 'Belum Sertifikasi';
      if (sertifikasi.includes('Sudah')) sertifikasi = 'Sudah Sertifikasi';
      else if (sertifikasi.includes('Proses')) sertifikasi = 'Dalam Proses';
      else if (sertifikasi.includes('Belum')) sertifikasi = 'Belum Sertifikasi';

      // Resolve keaktifan
      let statusKeaktifan = t.status_keaktifan || 'Aktif';

      return {
        'Nama Lengkap': t.nama || t.name || '',
        'Gelar': t.gelar || '',
        'NIK': t.nik ? String(t.nik) : '',
        'NIP': t.nip ? String(t.nip) : '-',
        'NUPTK': t.nuptk ? String(t.nuptk) : '',
        'NPK Kemenag': t.npk ? String(t.npk) : '',
        'Peg ID Simpatika': t.peg_id ? String(t.peg_id) : '',
        'NRG': t.nrg ? String(t.nrg) : '',
        'Tempat Lahir': t.tempat_lahir || '',
        'Tanggal Lahir (YYYY-MM-DD)': t.tanggal_lahir || '',
        'Alamat Rumah': t.alamat_rumah || '',
        'Jabatan': t.jabatan || 'Guru Kelas',
        'Status Kepegawaian': statusPeg,
        'Jenis Kelamin': gender,
        'No WhatsApp': t.telepon ? String(t.telepon) : '',
        'Email': t.email || '',
        'Pendidikan Terakhir': t.pendidikan || t.pendidikan_terakhir || 'S1 Pendidikan Agama Islam',
        'Status Sertifikasi': sertifikasi,
        'No Sertifikat Pendidik': t.no_sertifikat_pendidik || t.nomor_sertifikasi || '',
        'Mapel Diampu': t.mapel_diampu || '',
        'Mengajar Kelas': t.mengajar_kelas || t.kelas_diampu || '',
        'Status Keaktifan': statusKeaktifan,
        'TMT Pendidik': t.tmt_pendidik || '',
        'TMT Madrasah': t.tmt_madrasah || ''
      };
    });
  }

  return [
    {
      'Nama Lengkap': 'Ahmad Fauzi',
      'Gelar': 'S.Pd.I, M.Pd',
      'NIK': '3302151234560001',
      'NIP': '198501152010011001',
      'NUPTK': '1234567890123456',
      'NPK Kemenag': '987654321012',
      'Peg ID Simpatika': '20198501150001',
      'NRG': '120984758',
      'Tempat Lahir': 'Banyumas',
      'Tanggal Lahir (YYYY-MM-DD)': '1985-01-15',
      'Alamat Rumah': 'Jl. Raya Kebasen No. 12, RT 02/03, Banyumas',
      'Jabatan': 'Guru Kelas IV',
      'Status Kepegawaian': 'PNS',
      'Jenis Kelamin': 'Laki-laki',
      'No WhatsApp': '081234567890',
      'Email': 'fauzi@madrasah.sch.id',
      'Pendidikan Terakhir': 'S2 Pendidikan Agama Islam',
      'Status Sertifikasi': 'Sudah Sertifikasi',
      'No Sertifikat Pendidik': '123456789012',
      'Mapel Diampu': 'Tematik / PAI',
      'Mengajar Kelas': 'Kelas 4',
      'Status Keaktifan': 'Aktif',
      'TMT Pendidik': '2010-01-01',
      'TMT Madrasah': '2015-07-01'
    },
    {
      'Nama Lengkap': 'Siti Maryam',
      'Gelar': 'S.Pd',
      'NIK': '3302156543210002',
      'NIP': '-',
      'NUPTK': '8765432109876543',
      'NPK Kemenag': '876543210987',
      'Peg ID Simpatika': '20199003200002',
      'NRG': '',
      'Tempat Lahir': 'Purwokerto',
      'Tanggal Lahir (YYYY-MM-DD)': '1992-05-20',
      'Alamat Rumah': 'Desa Mandirancan RT 01/RW 04, Kebasen',
      'Jabatan': 'Guru Mapel Bahasa Arab',
      'Status Kepegawaian': 'GTY / Guru Tetap Yayasan',
      'Jenis Kelamin': 'Perempuan',
      'No WhatsApp': '085712345678',
      'Email': 'maryam@madrasah.sch.id',
      'Pendidikan Terakhir': 'S1 Pendidikan Bahasa Arab',
      'Status Sertifikasi': 'Belum Sertifikasi',
      'No Sertifikat Pendidik': '',
      'Mapel Diampu': 'Bahasa Arab',
      'Mengajar Kelas': 'Semua Kelas (1-6)',
      'Status Keaktifan': 'Aktif',
      'TMT Pendidik': '2018-07-15',
      'TMT Madrasah': '2020-01-10'
    },
    {
      'Nama Lengkap': 'Ridwan Kurniawan',
      'Gelar': 'S.Pd.Jas',
      'NIK': '3302159876540003',
      'NIP': '-',
      'NUPTK': '3456789012345678',
      'NPK Kemenag': '456789012345',
      'Peg ID Simpatika': '20199508120003',
      'NRG': '',
      'Tempat Lahir': 'Banyumas',
      'Tanggal Lahir (YYYY-MM-DD)': '1995-08-12',
      'Alamat Rumah': 'Jl. Ahmad Yani No. 45, Purwokerto Timur',
      'Jabatan': 'Guru Mapel PJOK',
      'Status Kepegawaian': 'GTT / Honorer',
      'Jenis Kelamin': 'Laki-laki',
      'No WhatsApp': '081398761234',
      'Email': 'ridwan@madrasah.sch.id',
      'Pendidikan Terakhir': 'S1 Pendidikan Jasmani (PJOK)',
      'Status Sertifikasi': 'Dalam Proses',
      'No Sertifikat Pendidik': '',
      'Mapel Diampu': 'PJOK',
      'Mengajar Kelas': 'Kelas 1-3',
      'Status Keaktifan': 'Aktif',
      'TMT Pendidik': '2021-01-05',
      'TMT Madrasah': '2021-01-05'
    }
  ];
}

/**
 * Generates and downloads a clean, 100% standard Excel (.xlsx) file with real native Dropdown validations
 * using ExcelJS. Opens seamlessly in Microsoft Excel, Google Sheets, LibreOffice, and WPS without any unreadable warnings.
 */
export async function downloadExcelWithDropdowns(
  filename: string,
  sheetTitle: string = 'Data_GTK',
  existingTeachers?: any[]
) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIAKAD Madrasah';
    workbook.lastModifiedBy = 'SIAKAD Madrasah';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. Primary Worksheet
    const worksheet = workbook.addWorksheet(sheetTitle, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // 2. Reference Worksheet for Dropdowns
    const refSheet = workbook.addWorksheet('REFERENSI_DROPDOWN');

    refSheet.columns = [
      { header: 'Jabatan', key: 'jabatan', width: 32 },
      { header: 'Status Kepegawaian', key: 'status_kepegawaian', width: 28 },
      { header: 'Jenis Kelamin', key: 'gender', width: 16 },
      { header: 'Pendidikan Terakhir', key: 'pendidikan', width: 32 },
      { header: 'Status Sertifikasi', key: 'sertifikasi', width: 22 },
      { header: 'Mengajar Kelas', key: 'mengajar_kelas', width: 22 },
      { header: 'Status Keaktifan', key: 'status_keaktifan', width: 18 }
    ];

    const refHeaderRow = refSheet.getRow(1);
    refHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    refHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' } // slate-700
    };
    refHeaderRow.height = 24;

    const maxOptions = Math.max(
      GTK_DROPDOWN_OPTIONS.jabatan.length,
      GTK_DROPDOWN_OPTIONS.status_kepegawaian.length,
      GTK_DROPDOWN_OPTIONS.gender.length,
      GTK_DROPDOWN_OPTIONS.pendidikan.length,
      GTK_DROPDOWN_OPTIONS.sertifikasi.length,
      GTK_DROPDOWN_OPTIONS.mengajar_kelas.length,
      GTK_DROPDOWN_OPTIONS.status_keaktifan.length
    );

    for (let i = 0; i < maxOptions; i++) {
      refSheet.addRow({
        jabatan: GTK_DROPDOWN_OPTIONS.jabatan[i] || '',
        status_kepegawaian: GTK_DROPDOWN_OPTIONS.status_kepegawaian[i] || '',
        gender: GTK_DROPDOWN_OPTIONS.gender[i] || '',
        pendidikan: GTK_DROPDOWN_OPTIONS.pendidikan[i] || '',
        sertifikasi: GTK_DROPDOWN_OPTIONS.sertifikasi[i] || '',
        mengajar_kelas: GTK_DROPDOWN_OPTIONS.mengajar_kelas[i] || '',
        status_keaktifan: GTK_DROPDOWN_OPTIONS.status_keaktifan[i] || ''
      });
    }

    // Configure Data_GTK Columns
    worksheet.columns = [
      { header: 'Nama Lengkap', key: 'nama', width: 26 },
      { header: 'Gelar', key: 'gelar', width: 14 },
      { header: 'NIK', key: 'nik', width: 22, style: { numFmt: '@' } },
      { header: 'NIP', key: 'nip', width: 24, style: { numFmt: '@' } },
      { header: 'NUPTK', key: 'nuptk', width: 22, style: { numFmt: '@' } },
      { header: 'NPK Kemenag', key: 'npk', width: 18, style: { numFmt: '@' } },
      { header: 'Peg ID Simpatika', key: 'peg_id', width: 20, style: { numFmt: '@' } },
      { header: 'NRG', key: 'nrg', width: 18, style: { numFmt: '@' } },
      { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
      { header: 'Tanggal Lahir (YYYY-MM-DD)', key: 'tanggal_lahir', width: 24, style: { numFmt: '@' } },
      { header: 'Alamat Rumah', key: 'alamat_rumah', width: 36 },
      { header: 'Jabatan', key: 'jabatan', width: 28 }, // Col L (12)
      { header: 'Status Kepegawaian', key: 'status_kepegawaian', width: 28 }, // Col M (13)
      { header: 'Jenis Kelamin', key: 'gender', width: 16 }, // Col N (14)
      { header: 'No WhatsApp', key: 'telepon', width: 18, style: { numFmt: '@' } },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Pendidikan Terakhir', key: 'pendidikan', width: 30 }, // Col Q (17)
      { header: 'Status Sertifikasi', key: 'sertifikasi', width: 22 }, // Col R (18)
      { header: 'No Sertifikat Pendidik', key: 'no_sertifikat_pendidik', width: 24, style: { numFmt: '@' } },
      { header: 'Mapel Diampu', key: 'mapel_diampu', width: 24 },
      { header: 'Mengajar Kelas', key: 'mengajar_kelas', width: 22 }, // Col U (21)
      { header: 'Status Keaktifan', key: 'status_keaktifan', width: 18 }, // Col V (22)
      { header: 'TMT Pendidik', key: 'tmt_pendidik', width: 18, style: { numFmt: '@' } },
      { header: 'TMT Madrasah', key: 'tmt_madrasah', width: 18, style: { numFmt: '@' } }
    ];

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' } // Emerald 600
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add Data Rows
    const templateData = generateGtkTemplateRows(existingTeachers);
    templateData.forEach((item) => {
      worksheet.addRow({
        nama: item['Nama Lengkap'],
        gelar: item['Gelar'],
        nik: item['NIK'],
        nip: item['NIP'],
        nuptk: item['NUPTK'],
        npk: item['NPK Kemenag'],
        peg_id: item['Peg ID Simpatika'],
        nrg: item['NRG'],
        tempat_lahir: item['Tempat Lahir'],
        tanggal_lahir: item['Tanggal Lahir (YYYY-MM-DD)'],
        alamat_rumah: item['Alamat Rumah'],
        jabatan: item['Jabatan'],
        status_kepegawaian: item['Status Kepegawaian'],
        gender: item['Jenis Kelamin'],
        telepon: item['No WhatsApp'],
        email: item['Email'],
        pendidikan: item['Pendidikan Terakhir'],
        sertifikasi: item['Status Sertifikasi'],
        no_sertifikat_pendidik: item['No Sertifikat Pendidik'],
        mapel_diampu: item['Mapel Diampu'],
        mengajar_kelas: item['Mengajar Kelas'],
        status_keaktifan: item['Status Keaktifan'],
        tmt_pendidik: item['TMT Pendidik'],
        tmt_madrasah: item['TMT Madrasah']
      });
    });

    // Apply Dropdown Data Validations and Plain Text Number Formats to rows 2 to totalRows
    const totalRows = Math.max(200, templateData.length + 50);

    // Columns that MUST remain strict Plain Text (@) to prevent 16-18 digit truncation to 00
    const textColumnIndices = [3, 4, 5, 6, 7, 8, 10, 15, 19, 23, 24]; // NIK, NIP, NUPTK, NPK, Peg ID, NRG, Tgl Lahir, WA, No Sertifikat, TMT Pendidik, TMT Madrasah

    for (let r = 2; r <= totalRows; r++) {
      // Force text formatting on all ID/number columns
      textColumnIndices.forEach(colIdx => {
        const cell = worksheet.getCell(r, colIdx);
        cell.numFmt = '@';
        if (cell.value !== undefined && cell.value !== null && cell.value !== '') {
          cell.value = String(cell.value);
        }
      });

      // Jabatan (Column 12 / L)
      worksheet.getCell(r, 12).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`REFERENSI_DROPDOWN!$A$2:$A$${GTK_DROPDOWN_OPTIONS.jabatan.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Pilihan Tidak Sesuai',
        error: 'Silakan pilih jabatan dari daftar dropdown yang tersedia'
      };

      // Status Kepegawaian (Column 13 / M)
      worksheet.getCell(r, 13).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`REFERENSI_DROPDOWN!$B$2:$B$${GTK_DROPDOWN_OPTIONS.status_kepegawaian.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Pilihan Tidak Sesuai',
        error: 'Silakan pilih status kepegawaian dari dropdown'
      };

      // Jenis Kelamin (Column 14 / N)
      worksheet.getCell(r, 14).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"Laki-laki,Perempuan"`],
        showErrorMessage: true,
        errorTitle: 'Pilihan Tidak Sesuai',
        error: 'Pilih Laki-laki atau Perempuan'
      };

      // Pendidikan Terakhir (Column 17 / Q)
      worksheet.getCell(r, 17).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`REFERENSI_DROPDOWN!$D$2:$D$${GTK_DROPDOWN_OPTIONS.pendidikan.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Pilihan Tidak Sesuai',
        error: 'Pilih jenjang pendidikan dari dropdown'
      };

      // Status Sertifikasi (Column 18 / R)
      worksheet.getCell(r, 18).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"Sudah Sertifikasi,Dalam Proses,Belum Sertifikasi"`],
        showErrorMessage: true,
        errorTitle: 'Pilihan Tidak Sesuai',
        error: 'Pilih status sertifikasi dari dropdown'
      };

      // Mengajar Kelas (Column 21 / U)
      worksheet.getCell(r, 21).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`REFERENSI_DROPDOWN!$F$2:$F$${GTK_DROPDOWN_OPTIONS.mengajar_kelas.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Pilihan Tidak Sesuai',
        error: 'Pilih kelas yang diampu dari dropdown'
      };

      // Status Keaktifan (Column 22 / V)
      worksheet.getCell(r, 22).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"Aktif,Cuti,Tugas Belajar,Pindah Tugas,Non-Aktif"`],
        showErrorMessage: true,
        errorTitle: 'Pilihan Tidak Sesuai',
        error: 'Pilih status keaktifan dari dropdown'
      };
    }

    // Generate buffer & trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = finalFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.warn('ExcelJS export encountered an error, using XLSX fallback:', error);
    // Fallback to SheetJS if browser buffer fails
    const templateData = generateGtkTemplateRows(existingTeachers);
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
    XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }
}

/**
 * Generates the Google Apps Script for automated dropdowns & live sync
 */
export function generateAppsScriptDropdownCode(sheetName: string = 'Data_GTK'): string {
  return `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: AUTO-SETUP DROPDOWN & LIVE SYNC SIAKAD MADRASAH
 * =========================================================================
 * 
 * CARA MENGGUNAKAN:
 * 1. Di Google Sheets Anda, buka menu: Ekstensi > Apps Script.
 * 2. Hapus semua kode yang ada, lalu TEMPELKAN seluruh skrip ini.
 * 3. Klik menu dropdown fungsi di atas (pilih 'pasangDropdownOtomatis') lalu klik tombol 'Jalankan' (Run).
 * 4. Berikan izin saat diminta (Review Permissions > Akun Anda > Lanjutan/Advanced > Buka/Allow).
 * 5. Google Sheets Anda seketika memiliki DROPDOWN INTERAKTIF LENGKAP bergradasi warna pada semua kolom!
 * 6. Untuk Live API Sync, klik Deploy > New Deployment > Web app > Anyone can access > Deploy.
 */

// 1. Fungsi Otomatis Memasang Dropdown & Validasi Data di Google Sheets
function pasangDropdownOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("${sheetName}") || ss.getActiveSheet();
  
  // Format Header Tebal & Warna Hijau Toska Elegan
  var headerRange = sheet.getRange(1, 1, 1, 24);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#0f766e");
  headerRange.setFontColor("#ffffff");
  sheet.setFrozenRows(1);

  // DAFTAR PILIHAN DROPDOWN (SAMA PERSIS DENGAN MODUL TAMBAH GURU SIAKAD)
  var listJabatan = [
    "Kepala Madrasah", "Wakil Kepala Madrasah", 
    "Guru Kelas I", "Guru Kelas II", "Guru Kelas III", "Guru Kelas IV", "Guru Kelas V", "Guru Kelas VI",
    "Guru Mapel PAI", "Guru Mapel Bahasa Arab", "Guru Mapel Bahasa Inggris", "Guru Mapel PJOK", "Guru Mapel SBdP", "Guru Mapel IPAS", "Guru Mapel Matematika",
    "Guru BK / Konselor", "Kepala Tata Usaha", "Staf Tata Usaha / Admin", "Operator Simpatika & EMIS", "Pustakawan", "Laboran", "Bendahara Madrasah", "Petugas Keamanan / Satpam", "Petugas Kebersihan"
  ];
  
  var listStatusPeg = [
    "PNS", "PPPK", "GTY / Guru Tetap Yayasan", "GTT / Honorer", "Staf / Tenaga Kependidikan"
  ];
  
  var listGender = [
    "Laki-laki", "Perempuan"
  ];
  
  var listPendidikan = [
    "S1 Pendidikan Agama Islam", "S1 PGMI / PGSD", "S1 Pendidikan Bahasa Arab", "S1 Pendidikan Bahasa Inggris", "S1 Pendidikan Matematika", "S1 Pendidikan Jasmani (PJOK)", "S1 Teknik Informatika",
    "S2 Pendidikan Agama Islam", "S2 Manajemen Pendidikan", "S2 Pendidikan", "S3", "D3 / Sederajat", "SMA / MA / SMK"
  ];
  
  var listSertifikasi = [
    "Sudah Sertifikasi", "Dalam Proses", "Belum Sertifikasi"
  ];
  
  var listKelas = [
    "Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6", "Kelas 1-3", "Kelas 4-6", "Semua Kelas (1-6)"
  ];
  
  var listKeaktifan = [
    "Aktif", "Cuti", "Tugas Belajar", "Pindah Tugas", "Non-Aktif"
  ];

  var maxRows = 500; // Menerapkan dropdown dari baris 2 sampai 500

  // Kolom L: Jabatan (Kolom ke-12)
  var ruleJabatan = SpreadsheetApp.newDataValidation().requireValueInList(listJabatan, true).setAllowInvalid(false).build();
  sheet.getRange(2, 12, maxRows, 1).setDataValidation(ruleJabatan);

  // Kolom M: Status Kepegawaian (Kolom ke-13)
  var ruleStatusPeg = SpreadsheetApp.newDataValidation().requireValueInList(listStatusPeg, true).setAllowInvalid(false).build();
  sheet.getRange(2, 13, maxRows, 1).setDataValidation(ruleStatusPeg);

  // Kolom N: Jenis Kelamin (Kolom ke-14)
  var ruleGender = SpreadsheetApp.newDataValidation().requireValueInList(listGender, true).setAllowInvalid(false).build();
  sheet.getRange(2, 14, maxRows, 1).setDataValidation(ruleGender);

  // Kolom Q: Pendidikan Terakhir (Kolom ke-17)
  var rulePendidikan = SpreadsheetApp.newDataValidation().requireValueInList(listPendidikan, true).setAllowInvalid(false).build();
  sheet.getRange(2, 17, maxRows, 1).setDataValidation(rulePendidikan);

  // Kolom R: Status Sertifikasi (Kolom ke-18)
  var ruleSertifikasi = SpreadsheetApp.newDataValidation().requireValueInList(listSertifikasi, true).setAllowInvalid(false).build();
  sheet.getRange(2, 18, maxRows, 1).setDataValidation(ruleSertifikasi);

  // Kolom U: Mengajar Kelas (Kolom ke-21)
  var ruleKelas = SpreadsheetApp.newDataValidation().requireValueInList(listKelas, true).setAllowInvalid(false).build();
  sheet.getRange(2, 21, maxRows, 1).setDataValidation(ruleKelas);

  // Kolom V: Status Keaktifan (Kolom ke-22)
  var ruleKeaktifan = SpreadsheetApp.newDataValidation().requireValueInList(listKeaktifan, true).setAllowInvalid(false).build();
  sheet.getRange(2, 22, maxRows, 1).setDataValidation(ruleKeaktifan);

  // KUNCI UTAMA: Format Kolom Nomor & ID sebagai Plain Text (@)
  // Mencegah NIK (16 digit), NIP (18 digit), NUPTK (16 digit), NPK, NRG berubah jadi notasi ilmiah atau berakhiran 00!
  var plainTextCols = [3, 4, 5, 6, 7, 8, 10, 15, 19, 23, 24];
  plainTextCols.forEach(function(col) {
    sheet.getRange(2, col, maxRows, 1).setNumberFormat("@");
  });

  SpreadsheetApp.getUi().alert("🎉 BERHASIL!\\n\\nSemua kolom dropdown & proteksi teks angka 16-digit NIK/NIP/NUPTK telah berhasil dipasang di sheet '" + sheet.getName() + "'!");
}

// 2. Fungsi Ekspor Data JSON Real-time untuk Live Sync SIAKAD
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("${sheetName}") || ss.getActiveSheet();
  // Gunakan getDisplayValues() agar angka 16-digit NIK/NIP/NUPTK dibaca utuh sebagai string (tidak terpotong jadi 00)
  var data = sheet.getDataRange().getDisplayValues();
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
`;
}
