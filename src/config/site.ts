export const SITE_URL_FALLBACK = 'https://siakad-madrasah.jaenalmaskun.biz.id';

const getRuntimeOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
};

export const DEFAULT_SITE_URL = (
  import.meta.env.VITE_SITE_URL?.trim() ||
  getRuntimeOrigin() ||
  SITE_URL_FALLBACK
).replace(/\/+$/, '');

export const DEFAULT_SITE_URL_WITH_SLASH = `${DEFAULT_SITE_URL}/`;

export const DEFAULT_OG_IMAGE_NAME = 'og-image-share-v2.jpeg';
export const DEFAULT_OG_IMAGE_PATH = `/${DEFAULT_OG_IMAGE_NAME}`;
export const SEO_SHARE_IMAGE_STORAGE_PATH = 'settings/seo-social-share';

export const DEFAULT_SVG_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23064e3b"/><stop offset="50%" stop-color="%23047857"/><stop offset="100%" stop-color="%230f766e"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/><circle cx="600" cy="315" r="220" fill="%23ffffff" opacity="0.05"/><path d="M600 200 L680 250 L680 350 L600 400 L520 350 L520 250 Z" fill="none" stroke="%2334d399" stroke-width="4" opacity="0.4"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="48" font-weight="900">Si%40Kad Madrasah</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="%23a7f3d0" font-family="sans-serif" font-size="24" font-weight="600">Sistem Informasi Akademik Modern</text></svg>`;

export const normalizeSiteUrl = (value?: string, trailingSlash = false) => {
  const normalized = (value?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '');
  return trailingSlash ? `${normalized}/` : normalized;
};

export const buildDefaultOgImageUrl = (siteUrl?: string) => {
  const origin = normalizeSiteUrl(siteUrl);
  return new URL(DEFAULT_OG_IMAGE_PATH, `${origin}/`).href;
};

export const sanitizeVersionParam = (version?: string): string => {
  if (!version || typeof version !== 'string') return '';
  const trimmed = version.trim();
  if (!trimmed) return '';
  const timestamp = Date.parse(trimmed);
  if (!isNaN(timestamp) && timestamp > 0) {
    return String(timestamp);
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
};

export const appendVersionToAssetUrl = (value?: string, version?: string) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  const cleanVer = sanitizeVersionParam(version);
  if (!trimmed || trimmed.startsWith('data:') || !cleanVer) {
    return trimmed;
  }

  try {
    const isProtocolRelative = trimmed.startsWith('//');
    const baseValue = isProtocolRelative ? `https:${trimmed}` : trimmed;
    const url = new URL(baseValue, `${DEFAULT_SITE_URL}/`);
    url.searchParams.set('v', cleanVer);
    return isProtocolRelative ? url.toString().replace(/^https:/, '') : url.toString();
  } catch {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}v=${cleanVer}`;
  }
};

export const stripVersionFromAssetUrl = (value?: string) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    const isProtocolRelative = trimmed.startsWith('//');
    const baseValue = isProtocolRelative ? `https:${trimmed}` : trimmed;
    const url = new URL(baseValue, `${DEFAULT_SITE_URL}/`);
    url.searchParams.delete('v');

    const normalized = url.toString();
    return isProtocolRelative ? normalized.replace(/^https:/, '') : normalized;
  } catch {
    return trimmed.replace(/([?&])v=[^&]*(&|$)/, (_match, prefix, suffix) => {
      if (prefix === '?' && suffix) return '?';
      if (prefix === '&' && suffix) return '&';
      return '';
    }).replace(/[?&]$/, '');
  }
};
