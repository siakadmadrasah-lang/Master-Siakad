/**
 * Generator Cerdas 1-Klik RPP Karakter Resmi (PPK & P5-PPRA Kemenag RI)
 * Menghasilkan seluruh field RPP Karakter secara otomatis dan mendalam
 * berdasarkan materi pokok, mata pelajaran, dan jenjang/fase.
 */

export interface GeneratedRPPFields {
  tema_bab: string;
  karakter_utama: string[];
  karakter_kemenag_ppra: string[];
  pembiasaan_harian: string;
  tujuan_spiritual: string;
  tujuan_sosial: string;
  tujuan_pengetahuan: string;
  tujuan_keterampilan: string;
  uraian_materi: string;
  internalisasi_nilai: string;
  pendekatan: string;
  model_pembelajaran: string;
  metode: string;
  media_alat: string;
  sumber_belajar: string;
  pendahuluan_kegiatan: string;
  pendahuluan_waktu: string;
  inti_kegiatan: string;
  inti_waktu: string;
  penutup_kegiatan: string;
  penutup_waktu: string;
  teknik_penilaian_sikap: string;
  teknik_penilaian_pengetahuan: string;
  teknik_penilaian_keterampilan: string;
  rubrik_karakter_catatan: string;
}

export function generateRPPKarakterCerdas(
  materiPokok: string,
  mataPelajaran: string = 'Fikih',
  kelas: string = 'IV',
  fase: string = 'Fase B'
): GeneratedRPPFields {
  const materiClean = (materiPokok || 'Pembelajaran Karakter Mulia').trim();
  const mapelLower = (mataPelajaran || '').toLowerCase();
  const materiLower = materiClean.toLowerCase();

  // Deteksi Domain Mata Pelajaran & Karakter
  const isAgama = mapelLower.includes('fikih') || 
                  mapelLower.includes('fiqih') || 
                  mapelLower.includes('qur') || 
                  mapelLower.includes('hadits') || 
                  mapelLower.includes('akidah') || 
                  mapelLower.includes('akhlak') || 
                  mapelLower.includes('pai') || 
                  mapelLower.includes('arab') || 
                  mapelLower.includes('ski');

  const isSains = mapelLower.includes('ipas') || 
                  mapelLower.includes('ipa') || 
                  mapelLower.includes('matematika') || 
                  mapelLower.includes('pjok') ||
                  mapelLower.includes('olahraga');

  const isSosialBahasa = mapelLower.includes('indonesia') || 
                         mapelLower.includes('pancasila') || 
                         mapelLower.includes('pkn') || 
                         mapelLower.includes('inggris') || 
                         mapelLower.includes('seni') || 
                         mapelLower.includes('ips');

  // Seleksi Nilai Karakter Utama (PPK)
  let karakterUtama: string[] = [];
  let karakterPPRA: string[] = [];
  let pembiasaan: string = '';
  let modelPembelajaran: string = '';
  let pendekatan: string = '';

  if (isAgama) {
    karakterUtama = [
      'Religius & Ketaatan Beribadah',
      'Integritas & Kejujuran (Shiddiq)',
      'Santun, Adab, & Budi Pekerti (Ta\'addub)',
      'Tanggung Jawab & Disiplin (Amanah)'
    ];
    karakterPPRA = [
      'Berkeadaban (Ta\'addub)',
      'Keteladanan (Qudwah)',
      'Berimbang (Tawazun)',
      'Lurus dan Tegas (I\'tidal)'
    ];
    pembiasaan = 'Shalat berjamaah tepat waktu, membaca doa sebelum & sesudah belajar, tadarus Al-Qur\'an/Asmaul Husna, serta menjaga wudhu dan kesucian diri.';
    modelPembelajaran = 'Demonstrasi, Simulasi Peran, & Cooperative Learning Berkarakter Islami';
    pendekatan = 'Saintifik & Kontekstual Berbasis Habituasi Akhlak Mulia';
  } else if (isSains) {
    karakterUtama = [
      'Bernalar Kritis & Tanggap Masalah',
      'Peduli Lingkungan & Kebersihan',
      'Gotong Royong & Kerja Sama (Ta\'awun)',
      'Kreatif & Inovatif'
    ];
    karakterPPRA = [
      'Keteladanan (Qudwah)',
      'Dinamis & Inovatif (Tatawwur wa Ibtikar)',
      'Berimbang (Tawazun)',
      'Mengambil Jalan Tengah (Tawassut)'
    ];
    pembiasaan = 'Gerakan LiSA (Lihat Sampah Ambil), menjaga kebersihan dan kerapian meja/laboratorium, hemat air & energi listrik, serta mengamati keteraturan ciptaan Allah SWT.';
    modelPembelajaran = 'Problem Based Learning (PBL) & Eksplorasi Saintifik Kontekstual';
    pendekatan = 'Saintifik Inkuiri Berorientasi Konservasi & Karakter Tanggung Jawab';
  } else if (isSosialBahasa) {
    karakterUtama = [
      'Santun, Adab, & Budi Pekerti (Ta\'addub)',
      'Integritas & Kejujuran (Shiddiq)',
      'Gotong Royong & Kerja Sama (Ta\'awun)',
      'Cinta Tanah Air & Kebangsaan (Muwathanah)'
    ];
    karakterPPRA = [
      'Toleransi (Tasamuh)',
      'Kewarganegaraan & Kebangsaan (Muwatanah)',
      'Musyawarah (Syura)',
      'Kesetaraan (Musawah)'
    ];
    pembiasaan = 'Budaya 5S (Senyum, Salam, Sapa, Sopan, Santun), penerapan 4 kata ajaib (Tolong, Maaf, Terima Kasih, Permisi), serta menyanyikan lagu nasional/daerah.';
    modelPembelajaran = 'Role Playing, Diskusi Terbimbing, & Refleksi Budi Pekerti Terpadu';
    pendekatan = 'Kontekstual Humanistik Berorientasi Penguatan Karakter Sosial';
  } else {
    karakterUtama = [
      'Religius & Ketaatan Beribadah',
      'Integritas & Kejujuran (Shiddiq)',
      'Gotong Royong & Kerja Sama (Ta\'awun)',
      'Bernalar Kritis & Tanggap Masalah'
    ];
    karakterPPRA = [
      'Berkeadaban (Ta\'addub)',
      'Keteladanan (Qudwah)',
      'Toleransi (Tasamuh)'
    ];
    pembiasaan = 'Membiasakan doa bersama, disiplin hadir tepat waktu, saling menghormati antarteman, dan menjaga ketertiban kelas.';
    modelPembelajaran = 'Discovery Learning & Pembiasaan Keteladanan Positif';
    pendekatan = 'Saintifik & Kontekstual Berbasis Habituasi Karakter';
  }

  // Generate Tema / Bab
  const temaBab = `Bab: Penguasaan Konsep ${materiClean} dan Pembiasaan Karakter Mulia`;

  // Generate 4 Dimensi Tujuan Pembelajaran Berbasis Karakter
  const tujuanSpiritual = `Peserta didik terbiasa mengawali dan mengakhiri kegiatan dengan doa, meyakini kebesaran Allah SWT dalam materi ${materiClean}, serta menunjukkan rasa syukur dan ketaatan dalam beribadah.`;
  
  const tujuanSosial = `Peserta didik terbiasa menunjukkan sikap santun dalam bertutur kata, disiplin mengelola waktu, jujur, serta mampu bergotong royong secara harmonis saat mempelajari ${materiClean}.`;

  const tujuanPengetahuan = `Peserta didik mampu memahami, menganalisis, dan menjelaskan konsep-konsep esensial serta hikmah yang terkandung dalam ${materiClean} secara tepat, runut, dan mendalam.`;

  const tujuanKeterampilan = `Peserta didik terampil mempraktikkan, menyajikan, dan mendemonstrasikan hasil pemahaman tentang ${materiClean} dalam bentuk tindakan nyata, karya kreatif, atau simulasi peran dengan penuh percaya diri dan tanggung jawab.`;

  // Uraian Materi & Internalisasi Nilai
  const uraianMateri = `Ruang lingkup konsep esensial materi ${materiClean}, mencakup pengertian, dasar/landasan keilmuan atau dalil naqli/aqli, tahapan pelaksanaan atau prosedur yang benar, serta contoh pengamalannya dalam situasi nyata di madrasah dan rumah.`;

  const internalisasiNilai = `Menanamkan nilai kejujuran (shiddiq) dalam setiap tindakan, keteladanan (qudwah) dalam perkataan, kedisiplinan (amanah) menunaikan kewajiban, serta kepekaan empati (ta'awun) untuk saling membantu antarsesama rekan belajar.`;

  // Metodologi
  const metode = 'Keteladanan Guru, Tanya Jawab Dialogis, Diskusi Kelompok, Praktik Langsung / Role Playing, Refleksi Nilai';
  const mediaAlat = 'LCD Proyektor / Gambar Ilustratif, Lembar Kerja Peserta Didik (LKPD) Berkarakter, Kartu Skenario / Benda Konkret';
  const sumberBelajar = `Buku Guru & Siswa ${mataPelajaran} ${fase} (${kelas}) Kemenag RI / Kemendikbudristek, Al-Qur'an dan Terjemahannya, Lingkungan Madrasah & Masyarakat Sekitar`;

  // Langkah Pembelajaran Terstruktur (Lengkap dengan Insersi Karakter)
  const pendahuluanKegiatan = 
`1. Guru membuka pembelajaran dengan mengucapkan salam hangat penuh kasih sayang, dilanjutkan dengan doa bersama dan pembacaan ayat suci Al-Qur'an/Asmaul Husna (Karakter Religius).
2. Guru memeriksa kebersihan meja, laci, dan lantai kelas serta memeriksa kehadiran dan kerapian seragam peserta didik (Karakter Disiplin & Peduli Lingkungan).
3. Apersepsi: Guru mengaitkan materi "${materiClean}" dengan pengalaman nyata siswa dan nilai keteladanan sehari-hari.
4. Guru menyampaikan tujuan pembelajaran, indikator pencapaian, serta nilai-nilai karakter mulia yang akan dinilai dan dibiasakan selama proses belajar mengajar berlangsung.`;

  const intiKegiatan = 
`1. Orientasi & Stimulus: Peserta didik mengamati tayangan/peragaan/bacaan tentang "${materiClean}" dengan penuh konsentrasi dan rasa ingin tahu yang mendalam (Literasi & Khusyuk).
2. Menanya & Menalar: Guru memfasilitasi peserta didik untuk aktif mengajukan pertanyaan kritis dan mengaitkan konsep materi dengan adab dan akhlak terpuji (Bernalar Kritis & Adab Bertanya Santun).
3. Eksplorasi & Kolaborasi: Dalam kelompok kecil yang inklusif, peserta didik bekerja sama menyelesaikan tugas lembar kerja terkait "${materiClean}" dengan saling bertukar ide dan menghormati pendapat teman (Gotong Royong, Ta'awun, & Musyawarah).
4. Unjuk Karya & Presentasi: Setiap kelompok menyajikan/mendemonstrasikan hasil telaah konsep "${materiClean}" di depan kelas secara santun, percaya diri, dan terbuka menerima masukan (Integritas & Percaya Diri).
5. Penguatan Karakter oleh Guru: Guru memberikan apresiasi atas kerja sama siswa, meluruskan pemahaman materi esensial, serta menegaskan kembali hikmah moral dari "${materiClean}".`;

  const penutupKegiatan = 
`1. Refleksi Karakter: Guru dan peserta didik bersama-sama merumuskan kesimpulan dan hikmah pelajaran: "Kebaikan dan budi pekerti apa yang dapat kita amalkan setelah mempelajari ${materiClean} hari ini?"
2. Tindak Lanjut: Guru memberikan tugas pembiasaan di rumah berupa pengamalan nilai positif bersama keluarga yang dicatat pada buku catatan karakter.
3. Penutup: Pembelajaran diakhiri dengan doa kafaratul majelis bersama, saling berterima kasih, dan berjabatan tangan dengan santun (Karakter Religius, Syukur, & Ta'addub).`;

  // Asesmen & Rubrik
  const teknikSikap = `Jurnal Catatan Observasi Sikap Spiritual (Khusyuk beribadah, berdoa) dan Sikap Sosial (Disiplin, jujur, santun, gotong royong, tanggung jawab).`;
  const teknikPengetahuan = `Tes tertulis (pilihan ganda dan uraian pemahaman konsep) serta tanya jawab reflektif mengenai ${materiClean}.`;
  const teknikKeterampilan = `Penilaian unjuk kerja (rubrik kinerja praktik/demonstrasi, kerapian lembar kerja, dan artikulasi presentasi bertutur kata santun).`;
  const rubrikCatatan = `Skala Capaian Karakter: BT (Belum Terlihat), MT (Mulai Terlihat), MB (Mulai Berkembang), MK (Membudaya Konsisten).`;

  return {
    tema_bab: temaBab,
    karakter_utama: karakterUtama,
    karakter_kemenag_ppra: karakterPPRA,
    pembiasaan_harian: pembiasaan,
    tujuan_spiritual: tujuanSpiritual,
    tujuan_sosial: tujuanSosial,
    tujuan_pengetahuan: tujuanPengetahuan,
    tujuan_keterampilan: tujuanKeterampilan,
    uraian_materi: uraianMateri,
    internalisasi_nilai: internalisasiNilai,
    pendekatan: pendekatan,
    model_pembelajaran: modelPembelajaran,
    metode: metode,
    media_alat: mediaAlat,
    sumber_belajar: sumberBelajar,
    pendahuluan_kegiatan: pendahuluanKegiatan,
    pendahuluan_waktu: '10 Menit',
    inti_kegiatan: intiKegiatan,
    inti_waktu: '50 Menit',
    penutup_kegiatan: penutupKegiatan,
    penutup_waktu: '10 Menit',
    teknik_penilaian_sikap: teknikSikap,
    teknik_penilaian_pengetahuan: teknikPengetahuan,
    teknik_penilaian_keterampilan: teknikKeterampilan,
    rubrik_karakter_catatan: rubrikCatatan
  };
}
