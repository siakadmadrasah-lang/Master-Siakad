import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from 'vite';

const mode = process.argv[2] || 'production';
const rootDir = process.cwd();
// loadEnv(mode, rootDir, '') akan membaca file .env* + process.env.
// Kita tetap whitelist variabel yang boleh dipakai agar aman saat pengembangan via AI Studio.
const env = loadEnv(mode, rootDir, '');

const pickFirst = (...values) => values.find((v) => typeof v === 'string' && v.trim());

const fallbackSiteUrl = 'https://siakad-madrasah.edgeone.dev';
const defaultOgImageName = (env.VITE_OG_IMAGE_NAME || '').trim() || 'og-image-share-v2.jpeg';
const defaultTitle = 'Si@Kad Madrasah Berbasis Digital';
const defaultDescription = 'Sistem Informasi Akademik Modern Si@Kad Madrasah';
const fallbackSupabaseUrl = 'https://zyytldzzqahayjxyegdm.supabase.co';
const fallbackSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5eXRsZHp6cWFoYXlqeHllZ2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzA1MzAsImV4cCI6MjA4OTUwNjUzMH0.xNhRWM9qCOcIfu89jbM-atzp3pj86h2lUVmibn18UEI';

// Prioritas:
// 1) VITE_SITE_URL (disarankan set di Environment Variables EdgeOne)
// 2) Beberapa var CI yang umum (jika tersedia)
// 3) fallback (agar build tidak gagal)
const inferredSiteUrl =
  pickFirst(
    env.VITE_SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.SITE_URL,
    process.env.URL,
    process.env.DEPLOYMENT_URL,
    process.env.VERCEL_URL
  ) || fallbackSiteUrl;

const siteUrl = inferredSiteUrl.replace(/\/+$/, '');

// Bisa override penuh jika ingin pakai URL gambar absolut (mis. CDN)
const directOgImageUrl = pickFirst(env.VITE_OG_IMAGE_URL, process.env.VITE_OG_IMAGE_URL);

const sanitizeText = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const cleaned = value
    .replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const isSafeHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const toAbsoluteUrl = (value, fallback, baseUrl = siteUrl) => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  try {
    const url = new URL(value.trim(), `${baseUrl}/`);
    return isSafeHttpUrl(url.href) ? url.href : fallback;
  } catch {
    return fallback;
  }
};

const sanitizeVersionParam = (version) => {
  if (!version) return '';
  const trimmed = String(version).trim();
  if (!trimmed) return '';
  const timestamp = Date.parse(trimmed);
  if (!isNaN(timestamp) && timestamp > 0) {
    return String(timestamp);
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
};

const appendAssetVersion = (value, version, baseUrl = siteUrl) => {
  const cleanVer = sanitizeVersionParam(version);
  if (typeof value !== 'string' || !value.trim() || !cleanVer) {
    return value;
  }

  try {
    const url = new URL(value.trim(), `${baseUrl}/`);
    url.searchParams.set('v', cleanVer);
    return url.href;
  } catch {
    const separator = value.includes('?') ? '&' : '?';
    return `${value}${separator}v=${cleanVer}`;
  }
};

const fetchSiteSettings = async () => {
  const supabaseUrl = pickFirst(
    env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    fallbackSupabaseUrl
  );
  const supabaseAnonKey = pickFirst(
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    fallbackSupabaseAnonKey
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    return {};
  }

  const restUrl = new URL('/rest/v1/site_settings', supabaseUrl);
  restUrl.searchParams.set('select', 'id,value');
  restUrl.searchParams.set('id', 'in.(general,seo,identitas_madrasah)');

  try {
    const response = await fetch(restUrl, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase response ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data)
      ? Object.fromEntries(
          data
            .filter((item) => item?.id)
            .map((item) => [item.id, item.value || {}])
        )
      : {};
  } catch (error) {
    console.warn(`[prepare-static-meta] Gagal mengambil site_settings: ${error?.message || error}`);
    return {};
  }
};

const siteSettings = await fetchSiteSettings();
const general = siteSettings.general || {};
const seo = siteSettings.seo || {};
const identitas = siteSettings.identitas_madrasah || {};

const effectiveSiteUrl = (
  process.env.VITE_SITE_URL?.trim() ||
  (seo.website_url && isSafeHttpUrl(seo.website_url) && !seo.website_url.includes('edgeone.dev')
    ? seo.website_url.trim().replace(/\/+$/, '')
    : 'https://siakad-madrasah.jaenalmaskun.biz.id')
);

const fallbackOgImageUrl = directOgImageUrl
  ? directOgImageUrl.trim()
  : `${effectiveSiteUrl}/${defaultOgImageName}`;

const schoolName = sanitizeText(general.school_name, defaultTitle);
const metaTitle = sanitizeText(seo.title || general.school_name, schoolName);
const metaDescription = sanitizeText(seo.description || general.tagline, defaultDescription);
const ogTitle = sanitizeText(seo.og_title || metaTitle, metaTitle);
const ogDescription = sanitizeText(seo.og_description || metaDescription, metaDescription);
const twitterTitle = sanitizeText(seo.twitter_title || ogTitle, ogTitle);
const twitterDescription = sanitizeText(seo.twitter_description || ogDescription, ogDescription);
const canonicalUrl = toAbsoluteUrl(seo.website_url || effectiveSiteUrl, `${effectiveSiteUrl}/`, effectiveSiteUrl).replace(/\/+$/, '') + '/';

const isTempHost = (url) => typeof url === 'string' && (url.includes('catbox.moe') || url.includes('tmpfiles.org'));

const rawOgImage = (!isTempHost(seo.image_url) && seo.image_url) ||
  (!isTempHost(seo.og_image_url) && seo.og_image_url);

const baseOgImageUrl = toAbsoluteUrl(
  rawOgImage,
  fallbackOgImageUrl,
  effectiveSiteUrl
);
const ogImageUrl = appendAssetVersion(baseOgImageUrl, seo.og_image_updated_at, effectiveSiteUrl);

const lowerBaseImg = baseOgImageUrl.toLowerCase();
const ogImageType = (lowerBaseImg.includes('.jpg') || lowerBaseImg.includes('.jpeg'))
  ? 'image/jpeg'
  : lowerBaseImg.includes('.png')
    ? 'image/png'
    : lowerBaseImg.includes('.webp')
      ? 'image/webp'
      : (seo.og_image_type || 'image/jpeg');

const keywords = sanitizeText(seo.keywords, `${metaTitle}, Siakad Madrasah, Sistem Informasi Akademik, E-Rapor, Portal Madrasah`);

const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${effectiveSiteUrl}#organization`,
      "name": schoolName,
      "description": metaDescription,
      "url": effectiveSiteUrl,
      "logo": ogImageUrl,
      "image": ogImageUrl,
      ...(identitas.alamat ? { "address": { "@type": "PostalAddress", "streetAddress": identitas.alamat } } : {}),
      ...(identitas.email ? { "email": identitas.email } : {}),
      ...(identitas.telepon ? { "telephone": identitas.telepon } : {})
    },
    {
      "@type": "WebSite",
      "@id": `${effectiveSiteUrl}#website`,
      "url": effectiveSiteUrl,
      "name": schoolName,
      "description": metaDescription,
      "publisher": { "@id": `${effectiveSiteUrl}#organization` },
      "inLanguage": "id-ID"
    },
    {
      "@type": "WebPage",
      "@id": `${effectiveSiteUrl}#webpage`,
      "url": canonicalUrl,
      "name": ogTitle,
      "description": ogDescription,
      "isPartOf": { "@id": `${effectiveSiteUrl}#website` },
      "primaryImageOfPage": { "@type": "ImageObject", "url": ogImageUrl },
      "inLanguage": "id-ID"
    }
  ]
};

const templatePath = path.join(rootDir, 'index.template.html');
const outputPath = path.join(rootDir, 'index.html');

const template = await readFile(templatePath, 'utf8');
const output = template
  .replaceAll('__SITE_URL__', effectiveSiteUrl)
  .replaceAll('__CANONICAL_URL__', escapeHtml(canonicalUrl))
  .replaceAll('__META_TITLE__', escapeHtml(metaTitle))
  .replaceAll('__META_DESCRIPTION__', escapeHtml(metaDescription))
  .replaceAll('__META_KEYWORDS__', escapeHtml(keywords))
  .replaceAll('__OG_TITLE__', escapeHtml(ogTitle))
  .replaceAll('__OG_DESCRIPTION__', escapeHtml(ogDescription))
  .replaceAll('__TWITTER_TITLE__', escapeHtml(twitterTitle))
  .replaceAll('__TWITTER_DESCRIPTION__', escapeHtml(twitterDescription))
  .replaceAll('__OG_IMAGE_URL__', escapeHtml(ogImageUrl))
  .replaceAll('__OG_IMAGE_TYPE__', escapeHtml(ogImageType))
  .replaceAll('__SITE_NAME__', escapeHtml(schoolName))
  .replaceAll('__IMAGE_ALT__', escapeHtml(schoolName))
  .replaceAll('__JSON_LD_DATA__', JSON.stringify(jsonLdGraph, null, 2));

let current = '';
try {
  current = await readFile(outputPath, 'utf8');
} catch {
  current = '';
}

if (current !== output) {
  await writeFile(outputPath, output, 'utf8');
  console.log(`Static meta disiapkan untuk ${siteUrl} (${mode}).`);
} else {
  console.log(`Static meta sudah sinkron untuk ${siteUrl} (${mode}).`);
}
