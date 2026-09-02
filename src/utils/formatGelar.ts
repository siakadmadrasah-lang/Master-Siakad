/**
 * Utilitas Standardisasi Penulisan Nama dan Gelar Akademik / Keagamaan / Profesi
 * Sesuai Pedoman EYD / PUEBI / Kemenag & Kemdikbudristek.
 * 
 * Fitur:
 * 1. Otomatis membetulkan typo gelar (misal: "S. PD.I" -> "S.Pd.I", "S. PD" -> "S.Pd.", "S. AG" -> "S.Ag.")
 * 2. Otomatis menambahkan koma pemisah antara nama dan gelar belakang (misal: "Siti Rochimah S.Pd.I" -> "Siti Rochimah, S.Pd.I")
 * 3. Otomatis merapikan gelar depan (Drs., Dra., Prof., Dr., dr., drg., drh., Ir., H., Hj., K.H., Ust., apt., Gr., Ns.)
 * 4. Merapikan Title Case nama orang dengan tetap menjaga partikel (bin, binti, ibnu, al-, el-, van, de)
 */

// Kamus gelar belakang (Urutan: dari yang paling panjang/spesifik ke yang pendek)
const BACK_TITLES_MAP: Array<{ regex: RegExp; canonical: string }> = [
  // 1. Gelar Profesi Spesialis Medis (harus sebelum S.P., S.S., dsb)
  { regex: /\bSp\.?\s*P[Dd]\.?\b/gi, canonical: 'Sp.PD' },
  { regex: /\bSp\.?\s*A\.?\b/gi, canonical: 'Sp.A' },
  { regex: /\bSp\.?\s*B\.?\b/gi, canonical: 'Sp.B' },
  { regex: /\bSp\.?\s*O[Gg]\.?\b/gi, canonical: 'Sp.OG' },
  { regex: /\bSp\.?\s*R[Aa][Dd]\.?\b/gi, canonical: 'Sp.Rad' },
  { regex: /\bSp\.?\s*T[Hh][Tt](?:-[Kk][Ll])?\.?\b/gi, canonical: 'Sp.THT' },
  { regex: /\bSp\.?\s*M\.?\b/gi, canonical: 'Sp.M' },
  { regex: /\bSp\.?\s*A[Nn]\.?\b/gi, canonical: 'Sp.An' },
  { regex: /\bSp\.?\s*J[Pp]\.?\b/gi, canonical: 'Sp.JP' },
  { regex: /\bSp\.?\s*S\.?\b/gi, canonical: 'Sp.S' },
  { regex: /\bSp\.?\s*K[Kk]\.?\b/gi, canonical: 'Sp.KK' },
  { regex: /\bSp\.?\s*G[Kk]\.?\b/gi, canonical: 'Sp.GK' },
  { regex: /\bSp\.?\s*P\.?\b/gi, canonical: 'Sp.P' },
  { regex: /\bSp\.?\s*N\.?\b/gi, canonical: 'Sp.N' },

  // 2. Sarjana Terapan & Vokasi Spesifik (D4 / D3 / D2)
  { regex: /\bS\.?\s*T[Rr]\.?\s*K[Oo][Mm]\.?\b/gi, canonical: 'S.Tr.Kom.' },
  { regex: /\bS\.?\s*T[Rr]\.?\s*T\.?\b/gi, canonical: 'S.Tr.T.' },
  { regex: /\bS\.?\s*T[Rr]\.?\s*P\.?\b/gi, canonical: 'S.Tr.P.' },
  { regex: /\bS\.?\s*T[Rr]\.?\s*K[Ee][Pp]\.?\b/gi, canonical: 'S.Tr.Kep.' },
  { regex: /\bS\.?\s*T[Rr]\.?\s*K[Ee][Bb]\.?\b/gi, canonical: 'S.Tr.Keb.' },
  { regex: /\bS\.?\s*T[Rr]\.?\s*G[Zz]\.?\b/gi, canonical: 'S.Tr.Gz.' },
  { regex: /\bS\.?\s*T[Rr]\.?\s*A[Kk]\.?\b/gi, canonical: 'S.Tr.Ak.' },
  { regex: /\bS\.?\s*T[Rr]\.?\s*S[Oo][Ss]\.?\b/gi, canonical: 'S.Tr.Sos.' },
  { regex: /\bS\.?\s*T[Rr]\.?\s*P[Aa][Rr]\.?\b/gi, canonical: 'S.Tr.Par.' },
  { regex: /\bS\.?\s*T[Rr]\.?\b/gi, canonical: 'S.Tr.' },
  { regex: /\bM\.?\s*T[Rr]\.?\b/gi, canonical: 'M.Tr.' },
  { regex: /\bA\.?\s*M[Dd]\.?\s*P[Dd]\.?\b/gi, canonical: 'A.Md.Pd.' },
  { regex: /\bA\.?\s*M[Dd]\.?\s*K[Oo][Mm]\.?\b/gi, canonical: 'A.Md.Kom.' },
  { regex: /\bA\.?\s*M[Dd]\.?\s*K[Ee][Bb]\.?\b/gi, canonical: 'A.Md.Keb.' },
  { regex: /\bA\.?\s*M[Dd]\.?\s*K[Ee][Pp]\.?\b/gi, canonical: 'A.Md.Kep.' },
  { regex: /\bA\.?\s*M[Dd]\.?\s*F[Aa][Rr]\.?\b/gi, canonical: 'A.Md.Far.' },
  { regex: /\bA\.?\s*M[Dd]\.?\s*G[Zz]\.?\b/gi, canonical: 'A.Md.Gz.' },
  { regex: /\bA\.?\s*M[Dd]\.?\s*R[Mm][Ii][Kk]\.?\b/gi, canonical: 'A.Md.RMIK' },
  { regex: /\bA\.?\s*M[Dd]\.?\b/gi, canonical: 'A.Md.' },
  { regex: /\bA\.?\s*M[Aa]\.?\s*P[Dd]\.?\b/gi, canonical: 'A.Ma.Pd.' },
  { regex: /\bA\.?\s*M[Aa]\.?\s*P[Uu][Ss][Tt]\.?\b/gi, canonical: 'A.Ma.Pust.' },
  { regex: /\bA\.?\s*M[Aa]\.?\b/gi, canonical: 'A.Ma.' },
  { regex: /\bA\.?\s*P\.?\b/gi, canonical: 'A.P.' },

  // 3. S.Pd & Rumpun Pendidikan (termasuk S.Pd.I, S.Pd.SD, S.Pd.AUD)
  { regex: /\bS\.?\s*P[Dd]\.?\s*I\.?(?:\b|$)/gi, canonical: 'S.Pd.I' },
  { regex: /\bS\.?\s*P[Dd]\.?\s*S[Dd]\.?\b/gi, canonical: 'S.Pd.SD' },
  { regex: /\bS\.?\s*P[Dd]\.?\s*P?AUD\.?\b/gi, canonical: 'S.Pd.AUD' },
  { regex: /\bS\.?\s*P[Dd]\.?\s*K\.?\b/gi, canonical: 'S.Pd.K' },
  { regex: /\bS\.?\s*P[Dd]\.?(?:\b|$)/gi, canonical: 'S.Pd' },
  { regex: /\bS\.?\s*PD\b/gi, canonical: 'S.Pd' },

  // 4. M.Pd & Rumpun Magister Pendidikan
  { regex: /\bM\.?\s*P[Dd]\.?\s*I\.?(?:\b|$)/gi, canonical: 'M.Pd.I' },
  { regex: /\bM\.?\s*P[Dd]\.?\s*K\.?\b/gi, canonical: 'M.Pd.K' },
  { regex: /\bM\.?\s*P[Dd]\.?(?:\b|$)/gi, canonical: 'M.Pd' },
  { regex: /\bM\.?\s*PD\b/gi, canonical: 'M.Pd' },

  // 5. Rumpun Agama & Keislaman (S.Ag, M.Ag, S.Th.I, S.Fil.I, S.E.Sy, S.H.I, S.Sos.I, Lc.)
  { regex: /\bS\.?\s*A[Gg]\.?\b/gi, canonical: 'S.Ag' },
  { regex: /\bM\.?\s*A[Gg]\.?\b/gi, canonical: 'M.Ag' },
  { regex: /\bS\.?\s*T[Hh]\.?\s*I\.?(?:\b|$)/gi, canonical: 'S.Th.I' },
  { regex: /\bM\.?\s*T[Hh]\.?\s*I\.?(?:\b|$)/gi, canonical: 'M.Th.I' },
  { regex: /\bS\.?\s*T[Hh]\.?\b/gi, canonical: 'S.Th' },
  { regex: /\bM\.?\s*T[Hh]\.?\b/gi, canonical: 'M.Th' },
  { regex: /\bS\.?\s*F[Ii][Ll]\.?\s*I\.?(?:\b|$)/gi, canonical: 'S.Fil.I' },
  { regex: /\bM\.?\s*F[Ii][Ll]\.?\s*I\.?(?:\b|$)/gi, canonical: 'M.Fil.I' },
  { regex: /\bS\.?\s*F[Ii][Ll]\.?\b/gi, canonical: 'S.Fil' },
  { regex: /\bM\.?\s*F[Ii][Ll]\.?\b/gi, canonical: 'M.Fil' },
  { regex: /\bS\.?\s*S[Yy]\.?\b/gi, canonical: 'S.Sy' },
  { regex: /\bM\.?\s*S[Yy]\.?\b/gi, canonical: 'M.Sy' },
  { regex: /\bS\.?\s*E\.?\s*S[Yy]\.?\b/gi, canonical: 'S.E.Sy' },
  { regex: /\bM\.?\s*E\.?\s*S[Yy]\.?\b/gi, canonical: 'M.E.Sy' },
  { regex: /\bS\.?\s*E\.?\s*I\.?(?:\b|$)/gi, canonical: 'S.E.I' },
  { regex: /\bM\.?\s*E\.?\s*I\.?(?:\b|$)/gi, canonical: 'M.E.I' },
  { regex: /\bS\.?\s*H\.?\s*I\.?(?:\b|$)/gi, canonical: 'S.H.I' },
  { regex: /\bM\.?\s*H\.?\s*I\.?(?:\b|$)/gi, canonical: 'M.H.I' },
  { regex: /\bS\.?\s*S[Oo][Ss]\.?\s*I\.?(?:\b|$)/gi, canonical: 'S.Sos.I' },
  { regex: /\bM\.?\s*S[Oo][Ss]\.?\s*I\.?(?:\b|$)/gi, canonical: 'M.Sos.I' },
  { regex: /\bL\.?\s*C\.?\b/gi, canonical: 'Lc' },

  // 6. Rumpun Komputer & TI
  { regex: /\bS\.?\s*K[Oo][Mm]\.?\b/gi, canonical: 'S.Kom' },
  { regex: /\bM\.?\s*K[Oo][Mm]\.?\b/gi, canonical: 'M.Kom' },
  { regex: /\bS\.?\s*S[Ii][Nn][Ff]\.?\b/gi, canonical: 'S.SIn' },
  { regex: /\bS\.?\s*I\.?\s*K[Oo][Mm]\.?\b/gi, canonical: 'S.I.Kom' },
  { regex: /\bM\.?\s*I\.?\s*K[Oo][Mm]\.?\b/gi, canonical: 'M.I.Kom' },
  { regex: /\bS\.?\s*I\.?\s*P[Uu][Ss][Tt]\.?\b/gi, canonical: 'S.I.Pust' },

  // 7. Rumpun Sains & Matematika
  { regex: /\bS\.?\s*S[Ii]\.?\b/gi, canonical: 'S.Si' },
  { regex: /\bM\.?\s*S[Ii]\.?\b/gi, canonical: 'M.Si' },
  { regex: /\bS\.?\s*S[Tt][Aa][Tt]\.?\b/gi, canonical: 'S.Stat' },
  { regex: /\bS\.?\s*M[Aa][Tt]\.?\b/gi, canonical: 'S.Mat' },

  // 8. Rumpun Ekonomi & Manajemen
  { regex: /\bM\.?\s*B\.?\s*A\.?\b/gi, canonical: 'M.B.A' },
  { regex: /\bM\.?\s*M\.?\b/gi, canonical: 'M.M' },
  { regex: /\bS\.?\s*M[Nn]\.?\b/gi, canonical: 'S.Mn' },
  { regex: /\bS\.?\s*M\.?\b/gi, canonical: 'S.M' },
  { regex: /\bS\.?\s*A[Kk]\.?\b/gi, canonical: 'S.Ak' },
  { regex: /\bM\.?\s*A[Kk]\.?\b/gi, canonical: 'M.Ak' },
  { regex: /\bS\.?\s*E\.?\b/gi, canonical: 'S.E' },
  { regex: /\bM\.?\s*E\.?\b/gi, canonical: 'M.E' },

  // 9. Rumpun Hukum, Sosial, Humaniora
  { regex: /\bM\.?\s*K[Nn]\.?\b/gi, canonical: 'M.Kn' },
  { regex: /\bS\.?\s*H\.?\b/gi, canonical: 'S.H' },
  { regex: /\bM\.?\s*H\.?\b/gi, canonical: 'M.H' },
  { regex: /\bS\.?\s*S[Oo][Ss]\.?\b/gi, canonical: 'S.Sos' },
  { regex: /\bM\.?\s*S[Oo][Ss]\.?\b/gi, canonical: 'M.Sos' },
  { regex: /\bS\.?\s*I\.?\s*P\.?\b/gi, canonical: 'S.I.P' },
  { regex: /\bS\.?\s*I[Pp]\.?\b/gi, canonical: 'S.IP' },
  { regex: /\bM\.?\s*I\.?\s*P\.?\b/gi, canonical: 'M.I.P' },
  { regex: /\bS\.?\s*A[Pp]\.?\b/gi, canonical: 'S.A.P' },
  { regex: /\bM\.?\s*A[Pp]\.?\b/gi, canonical: 'M.A.P' },
  { regex: /\bS\.?\s*H[Uu][Mm]\.?\b/gi, canonical: 'S.Hum' },
  { regex: /\bM\.?\s*H[Uu][Mm]\.?\b/gi, canonical: 'M.Hum' },
  { regex: /\bS\.?\s*S\.?\b/gi, canonical: 'S.S' },

  // 10. Rumpun Kesehatan, Kedokteran, Farmasi
  { regex: /\bS\.?\s*P[Ss][Ii]\.?\b/gi, canonical: 'S.Psi' },
  { regex: /\bM\.?\s*P[Ss][Ii]\.?\b/gi, canonical: 'M.Psi' },
  { regex: /\bS\.?\s*K[Ee][Dd][Gg]\.?\b/gi, canonical: 'S.Ked.G' },
  { regex: /\bS\.?\s*K[Ee][Dd][Hh]\.?\b/gi, canonical: 'S.Ked.H' },
  { regex: /\bS\.?\s*K[Ee][Dd]\.?\b/gi, canonical: 'S.Ked' },
  { regex: /\bS\.?\s*F[Aa][Rr][Mm]\.?\b/gi, canonical: 'S.Farm' },
  { regex: /\bM\.?\s*F[Aa][Rr][Mm]\.?\b/gi, canonical: 'M.Farm' },
  { regex: /\bS\.?\s*K\.?\s*M\.?\b/gi, canonical: 'S.K.M' },
  { regex: /\bM\.?\s*K\.?\s*M\.?\b/gi, canonical: 'M.K.M' },
  { regex: /\bM\.?\s*K[Ee][Ss]\.?\b/gi, canonical: 'M.Kes' },
  { regex: /\bS\.?\s*K[Ee][Pp]\.?\b/gi, canonical: 'S.Kep' },
  { regex: /\bM\.?\s*K[Ee][Pp]\.?\b/gi, canonical: 'M.Kep' },
  { regex: /\bS\.?\s*K[Ee][Bb]\.?\b/gi, canonical: 'S.Keb' },
  { regex: /\bM\.?\s*K[Ee][Bb]\.?\b/gi, canonical: 'M.Keb' },
  { regex: /\bS\.?\s*G[Zz]\.?\b/gi, canonical: 'S.Gz' },
  { regex: /\bM\.?\s*G[Zz]\.?\b/gi, canonical: 'M.Gz' },

  // 11. Rumpun Teknik (S.T., M.T.)
  { regex: /\bS\.?\s*T\.?\b/gi, canonical: 'S.T' },
  { regex: /\bM\.?\s*T\.?\b/gi, canonical: 'M.T' },

  // 12. Rumpun Pertanian, Peternakan, Perikanan, Kehutanan
  { regex: /\bS\.?\s*P[Tt]\.?\b/gi, canonical: 'S.Pt' },
  { regex: /\bM\.?\s*P[Tt]\.?\b/gi, canonical: 'M.Pt' },
  { regex: /\bS\.?\s*P[Ii]\.?\b/gi, canonical: 'S.Pi' },
  { regex: /\bM\.?\s*P[Ii]\.?\b/gi, canonical: 'M.Pi' },
  { regex: /\bS\.?\s*H[Uu][Tt]\.?\b/gi, canonical: 'S.Hut' },
  { regex: /\bM\.?\s*H[Uu][Tt]\.?\b/gi, canonical: 'M.Hut' },
  { regex: /\bS\.?\s*P\.?\b/gi, canonical: 'S.P' },
  { regex: /\bM\.?\s*P\.?\b/gi, canonical: 'M.P' },

  // 13. Rumpun Seni & Desain
  { regex: /\bS\.?\s*S[Nn]\.?\b/gi, canonical: 'S.Sn' },
  { regex: /\bM\.?\s*S[Nn]\.?\b/gi, canonical: 'M.Sn' },
  { regex: /\bS\.?\s*D[Ss]\.?\b/gi, canonical: 'S.Ds' },
  { regex: /\bM\.?\s*D[Ss]\.?\b/gi, canonical: 'M.Ds' },

  // 14. Gelar Internasional & Doktoral Pascasarjana
  { regex: /\bP[Hh]\.?\s*D\.?\b/gi, canonical: 'Ph.D' },
  { regex: /\bE[Dd]\.?\s*D\.?\b/gi, canonical: 'Ed.D' },
  { regex: /\bM\.?\s*S[Cc]\.?\b/gi, canonical: 'M.Sc' },
  { regex: /\bB\.?\s*S[Cc]\.?\b/gi, canonical: 'B.Sc' },
  { regex: /\bM\.?\s*A\.?\b/gi, canonical: 'M.A' },
  { regex: /\bB\.?\s*A\.?\b/gi, canonical: 'B.A' },
  { regex: /\bM\.?\s*E[Nn][Gg]\.?\b/gi, canonical: 'M.Eng' },
  { regex: /\bB\.?\s*E[Nn][Gg]\.?\b/gi, canonical: 'B.Eng' },
  { regex: /\bL[Ll]\.?\s*M\.?\b/gi, canonical: 'LL.M' },
  { regex: /\bL[Ll]\.?\s*B\.?\b/gi, canonical: 'LL.B' },
  { regex: /\bD\.?\s*B\.?\s*A\.?\b/gi, canonical: 'D.B.A' },

  // 15. Profesi & Sertifikasi
  { regex: /\bK[Oo][Nn][Ss]\.?\b/gi, canonical: 'Kons.' },
  { regex: /\bC\.?A\.?\b/g, canonical: 'CA' },
  { regex: /\bC\.?P\.?A\.?\b/g, canonical: 'CPA' },
  { regex: /\bC\.?M\.?A\.?\b/g, canonical: 'CMA' },
  { regex: /\bC\.?R\.?A\.?\b/g, canonical: 'CRA' },
  { regex: /\bQ\.?W\.?P\.?\b/g, canonical: 'QWP' },
  { regex: /\bC\.?F\.?P\.?\b/g, canonical: 'CFP' },
  { regex: /\bB\.?K\.?P\.?\b/g, canonical: 'BKP' },
  { regex: /\bA[Kk]\.?\b/gi, canonical: 'Ak.' },
];

// Kamus gelar depan baku yang diawali di awal teks
const FRONT_TITLES_CONFIG: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /^Prof(?:esor)?\.?(?:\s+|$)/i, canonical: 'Prof.' },
  { regex: /^drg\.?(?:\s+|$)/i, canonical: 'drg.' },
  { regex: /^drh\.?(?:\s+|$)/i, canonical: 'drh.' },
  { regex: /^dr\.(?:\s+|$)/, canonical: 'dr.' }, // Dokter medis huruf kecil eksplisit
  { regex: /^(?:Dr|DR)\.?(?:\s+|$)/, canonical: 'Dr.' }, // Doktor akademik
  { regex: /^Drs\.?(?:\s+|$)/i, canonical: 'Drs.' },
  { regex: /^Dra\.?(?:\s+|$)/i, canonical: 'Dra.' },
  { regex: /^Ir\.?(?:\s+|$)/i, canonical: 'Ir.' },
  { regex: /^Hj\.?(?:\s+|$)/i, canonical: 'Hj.' },
  { regex: /^H\.(?:\s+|$)/, canonical: 'H.' },
  { regex: /^H(?:\s+|$)/, canonical: 'H.' },
  { regex: /^K\.?\s*H\.?(?:\s+|$)/i, canonical: 'K.H.' },
  { regex: /^KH\.?(?:\s+|$)/i, canonical: 'K.H.' },
  { regex: /^Kyai(?:\s+|$)/i, canonical: 'K.' },
  { regex: /^Nyai(?:\s+|$)/i, canonical: 'Ny.' },
  { regex: /^Ny\.?(?:\s+|$)/i, canonical: 'Ny.' },
  { regex: /^Ust(?:adz(?:ah)?)?\.?(?:\s+|$)/i, canonical: 'Ust.' },
  { regex: /^Habib(?:\s+|$)/i, canonical: 'Habib' },
  { regex: /^apt\.?(?:\s+|$)/i, canonical: 'apt.' },
  { regex: /^Ns\.?(?:\s+|$)/i, canonical: 'Ns.' },
  { regex: /^Gr\.?(?:\s+|$)/i, canonical: 'Gr.' },
  { regex: /^(?:Raden(?:\s+Ajeng|\s+Ayu)?\.?|R\.?\s*A\.?)(?:\s+|$)/i, canonical: 'R.A.' },
  { regex: /^Rd\.?(?:\s+|$)/i, canonical: 'Rd.' },
  { regex: /^Tgk\.?(?:\s+|$)/i, canonical: 'Tgk.' },
  { regex: /^Buya(?:\s+|$)/i, canonical: 'Buya' },
];

// Partikel nama yang tetap huruf kecil atau format khusus
const NAME_PARTICLES = new Set([
  'bin', 'binti', 'ibnu', 'ibn', 'van', 'der', 'den', 'von', 'de', 'da', 'di', 'du', 'al', 'el'
]);

/**
 * Merapikan kapitalisasi nama orang menjadi Title Case.
 */
export function formatNameWord(word: string, isFirstWord = false): string {
  if (!word) return '';
  const lower = word.toLowerCase();

  // Partikel di tengah nama
  if (!isFirstWord && NAME_PARTICLES.has(lower)) {
    return lower;
  }

  // Nama berawalan Al-, El-, Az-, An-, Ar-, As-, At-, Ad-, Asy-, Ath-
  if (/^(al|el|az|an|ar|as|at|ad|ad-d|asy|ath)-/i.test(word)) {
    const parts = word.split('-');
    return parts.map((p) => {
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }).join('-');
  }

  // Tanda hubung umum
  if (word.includes('-')) {
    return word.split('-').map(p => formatNameWord(p, isFirstWord)).join('-');
  }

  // Tanda petik/apostrof (misal: "Syafi'i", "Ma'ruf")
  if (word.includes("'") || word.includes("’")) {
    const quote = word.includes("'") ? "'" : "’";
    const parts = word.split(quote);
    return parts.map((p, idx) => {
      if (p.length === 0) return '';
      if (idx === 0) return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      if (p.length === 1 && p.toLowerCase() === 'i') return 'i';
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }).join(quote);
  }

  // Standar Title Case
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Normalisasi string gelar mandiri (misal dari kolom "Gelar" pada Excel/GTK)
 * Contoh: "S. PD.I, M. PD" -> "S.Pd.I, M.Pd."
 */
export function normalizeAcademicTitle(titleStr?: string | null): string {
  if (!titleStr) return '';
  let clean = String(titleStr).trim();
  if (!clean || clean === '-' || clean === '--') return '';

  clean = clean.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ');

  const matchedTitles: string[] = [];
  let remaining = clean;

  for (const item of BACK_TITLES_MAP) {
    const matches = remaining.match(item.regex);
    if (matches) {
      for (const _ of matches) {
        if (!matchedTitles.includes(item.canonical)) {
          matchedTitles.push(item.canonical);
        }
      }
      remaining = remaining.replace(item.regex, ' ');
    }
  }

  // Bersihkan sisa
  const residual = remaining.replace(/[,.;\s]+/g, ' ').trim();
  if (residual && matchedTitles.length === 0) {
    return clean;
  }

  if (matchedTitles.length > 0) {
    if (residual && !matchedTitles.some(t => t.toLowerCase() === residual.toLowerCase())) {
      return [...matchedTitles, residual].join(', ');
    }
    return matchedTitles.join(', ');
  }

  return clean;
}

/**
 * Parser dan Formatter Lengkap: Memformat nama lengkap seseorang beserta gelar depan dan gelar belakang
 * sesuai kaidah EYD/PUEBI.
 * 
 * Contoh:
 * - "siti rochimah, s.pd.i" -> "Siti Rochimah, S.Pd.I"
 * - "Siti Rochimah, S. PD.I" -> "Siti Rochimah, S.Pd.I"
 * - "Siti Rochimah S. PD.I" -> "Siti Rochimah, S.Pd.I"
 * - "DRS. H. AHMAD DAHLAN, M.PD.I, PH.D" -> "Drs. H. Ahmad Dahlan, M.Pd.I, Ph.D."
 * - "prof. dr. hj. siti maryam, m.ag." -> "Prof. Dr. Hj. Siti Maryam, M.Ag."
 * - "dr. muhammad ihsan, sp.a" -> "dr. Muhammad Ihsan, Sp.A"
 */
export function formatFullNameWithTitles(rawInput?: string | null): string {
  if (!rawInput) return '';
  let str = String(rawInput).trim();
  if (!str || str === '-' || str === '--') return '';

  // Placeholder khusus seperti '[Nama Kepala]'
  if (str.startsWith('[') && str.endsWith(']')) return str;

  // Normalisasi spasi
  str = str.replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ');
  str = str.replace(/\s+/g, ' ').trim();

  // 1. Ekstrak Gelar Depan dari awal string
  const detectedFrontTitles: string[] = [];
  let workingStr = str;

  let foundFront = true;
  while (foundFront && workingStr.length > 0) {
    foundFront = false;
    for (const item of FRONT_TITLES_CONFIG) {
      const match = workingStr.match(item.regex);
      if (match) {
        let canonical = item.canonical;
        // Jika didahului oleh Prof., jadikan Dr. (Doktor)
        if (canonical === 'dr.' && detectedFrontTitles.includes('Prof.')) {
          canonical = 'Dr.';
        }
        if (!detectedFrontTitles.includes(canonical)) {
          detectedFrontTitles.push(canonical);
        }
        workingStr = workingStr.slice(match[0].length).trim();
        foundFront = true;
        break;
      }
    }
  }

  // 2. Ekstrak Gelar Belakang
  let namePart = workingStr;
  const detectedBackTitles: string[] = [];

  // Jika ada koma
  if (namePart.includes(',')) {
    const commaParts = namePart.split(',');
    namePart = commaParts[0].trim();
    const titleCandidates = commaParts.slice(1).join(', ');

    let titleRemains = titleCandidates;
    for (const item of BACK_TITLES_MAP) {
      const matches = titleRemains.match(item.regex);
      if (matches) {
        for (const _ of matches) {
          if (!detectedBackTitles.includes(item.canonical)) {
            detectedBackTitles.push(item.canonical);
          }
        }
        titleRemains = titleRemains.replace(item.regex, ' ');
      }
    }

    // Jika ada teks tambahan yang bukan hanya titik/koma/spasi
    const extraTitles = titleRemains
      .split(',')
      .map(s => s.replace(/^[,.\s]+|[,.\s]+$/g, '').trim())
      .filter(s => s.length > 0 && !/^[.,\s]+$/.test(s));

    for (const ext of extraTitles) {
      if (ext && !detectedBackTitles.includes(ext)) {
        detectedBackTitles.push(ext);
      }
    }
  }

  // Jika di bagian namePart masih ada gelar belakang yang tidak dipisahkan tanda koma
  for (const item of BACK_TITLES_MAP) {
    const matches = namePart.match(item.regex);
    if (matches) {
      for (const _ of matches) {
        if (!detectedBackTitles.includes(item.canonical)) {
          detectedBackTitles.push(item.canonical);
        }
      }
      namePart = namePart.replace(item.regex, ' ').trim();
    }
  }

  // 3. Merapikan bagian nama utama (Title Case)
  const nameWords = namePart
    .replace(/[,.;\s]+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);

  const formattedNameWords = nameWords.map((w, idx) => formatNameWord(w, idx === 0));
  const cleanMainName = formattedNameWords.join(' ');

  // Jika nama utama kosong (misal hanya berisi gelar)
  if (!cleanMainName) {
    const fullTitles = [...detectedFrontTitles, ...detectedBackTitles].join(', ');
    return fullTitles || str;
  }

  // 4. Gabungkan komponen: Gelar Depan + Nama Utama + Gelar Belakang
  let result = cleanMainName;
  if (detectedFrontTitles.length > 0) {
    result = `${detectedFrontTitles.join(' ')} ${result}`;
  }

  if (detectedBackTitles.length > 0) {
    result = `${result}, ${detectedBackTitles.join(', ')}`;
  }

  return result;
}

/**
 * Format nama guru/staf secara cerdas dengan menggabungkan nama dan gelar secara otomatis
 * tanpa duplikasi bila gelar sudah ada di dalam nama atau diisi terpisah.
 */
export function formatTeacherDisplayName(teacher?: { nama?: string; gelar?: string } | null): string {
  if (!teacher) return '';
  const rawNama = teacher.nama?.trim() || '';
  const rawGelar = teacher.gelar?.trim() || '';

  if (!rawNama && !rawGelar) return '';
  if (!rawGelar) return formatFullNameWithTitles(rawNama);

  // Jika rawNama sudah mengandung koma dan gelar
  if (rawNama.includes(',') && rawNama.length > 5) {
    return formatFullNameWithTitles(rawNama);
  }

  // Normalisasi gelar terpisah
  const cleanGelar = normalizeAcademicTitle(rawGelar);
  const formattedNama = formatFullNameWithTitles(rawNama);

  // Cek apakah gelar sudah ada di dalam formattedNama
  if (
    formattedNama.includes(cleanGelar) ||
    (cleanGelar && formattedNama.toLowerCase().includes(cleanGelar.toLowerCase()))
  ) {
    return formattedNama;
  }

  if (cleanGelar) {
    if (formattedNama.includes(',')) {
      return `${formattedNama}, ${cleanGelar}`;
    }
    return `${formattedNama}, ${cleanGelar}`;
  }

  return formattedNama;
}

/**
 * Format nama penandatangan resmi untuk dokumen/surat dinas (Standar Kemenag & Lembaga Pendidikan)
 * Bagian nama utama ditulis HURUF KAPITAL (UPPERCASE), sedangkan gelar akademik (depan maupun belakang)
 * tetap ditulis dengan format baku EYD / Mixed Case (misal: S.Pd.I, M.Pd, S.Ag, Drs., Hj.).
 * 
 * Contoh:
 * - "siti rochimah, s.pd.i" -> "SITI ROCHIMAH, S.Pd.I"
 * - "SITI ROCHIMAH, S.PD.I" -> "SITI ROCHIMAH, S.Pd.I"
 * - "drs. h. ahmad fauzi, m.pd.i" -> "Drs. H. AHMAD FAUZI, M.Pd.I"
 * - "ahmad fauzi, s.pd" -> "AHMAD FAUZI, S.Pd"
 */
export function formatOfficialSignatureName(rawInput?: string | null): string {
  if (!rawInput) return '';
  let str = String(rawInput).trim();
  if (!str || str === '-' || str === '--') return '';
  if (str.startsWith('[') && str.endsWith(']')) return str;

  // 1. Ekstrak Gelar Depan
  const detectedFrontTitles: string[] = [];
  let workingStr = str
    .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let foundFront = true;
  while (foundFront && workingStr.length > 0) {
    foundFront = false;
    for (const item of FRONT_TITLES_CONFIG) {
      const match = workingStr.match(item.regex);
      if (match) {
        let canonical = item.canonical;
        if (canonical === 'dr.' && detectedFrontTitles.includes('Prof.')) {
          canonical = 'Dr.';
        }
        if (!detectedFrontTitles.includes(canonical)) {
          detectedFrontTitles.push(canonical);
        }
        workingStr = workingStr.slice(match[0].length).trim();
        foundFront = true;
        break;
      }
    }
  }

  // 2. Ekstrak Gelar Belakang
  let namePart = workingStr;
  const detectedBackTitles: string[] = [];

  if (namePart.includes(',')) {
    const commaParts = namePart.split(',');
    namePart = commaParts[0].trim();
    const titleCandidates = commaParts.slice(1).join(', ');

    let titleRemains = titleCandidates;
    for (const item of BACK_TITLES_MAP) {
      const matches = titleRemains.match(item.regex);
      if (matches) {
        for (const _ of matches) {
          if (!detectedBackTitles.includes(item.canonical)) {
            detectedBackTitles.push(item.canonical);
          }
        }
        titleRemains = titleRemains.replace(item.regex, ' ');
      }
    }

    const extraTitles = titleRemains
      .split(',')
      .map(s => s.replace(/^[,.\s]+|[,.\s]+$/g, '').trim())
      .filter(s => s.length > 0 && !/^[.,\s]+$/.test(s));

    for (const ext of extraTitles) {
      if (ext && !detectedBackTitles.includes(ext)) {
        detectedBackTitles.push(ext);
      }
    }
  }

  for (const item of BACK_TITLES_MAP) {
    const matches = namePart.match(item.regex);
    if (matches) {
      for (const _ of matches) {
        if (!detectedBackTitles.includes(item.canonical)) {
          detectedBackTitles.push(item.canonical);
        }
      }
      namePart = namePart.replace(item.regex, ' ').trim();
    }
  }

  // Bagian nama utama di-UPPERCASE
  const cleanMainName = namePart
    .replace(/[,.;\s]+/g, ' ')
    .trim()
    .toUpperCase();

  if (!cleanMainName) {
    const fullTitles = [...detectedFrontTitles, ...detectedBackTitles].join(', ');
    return fullTitles || str;
  }

  let result = cleanMainName;
  if (detectedFrontTitles.length > 0) {
    result = `${detectedFrontTitles.join(' ')} ${result}`;
  }

  if (detectedBackTitles.length > 0) {
    result = `${result}, ${detectedBackTitles.join(', ')}`;
  }

  return result;
}

