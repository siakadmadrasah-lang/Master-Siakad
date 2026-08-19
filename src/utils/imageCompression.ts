import imageCompression from 'browser-image-compression';
import { supabase, getMysqlApiUrl } from '@/integrations/supabase/client';
import { DEFAULT_OG_IMAGE_NAME } from '@/config/site';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

export const compressImage = async (file: File): Promise<File> => {
  // Always compress if > 100KB for maximum speed and small size
  if (file.size < 100 * 1024) {
    return file;
  }

  // Compression options optimized for web and social share cards
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1200,
    useWebWorker: false,
    initialQuality: 0.7,
  };

  try {
    const compressPromise = imageCompression(file, options);
    const timeoutPromise = new Promise<File>((_, reject) =>
      setTimeout(() => reject(new Error('Compression timeout')), 2500)
    );
    return await Promise.race([compressPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Menggunakan file asli karena kompresi lambat/gagal:", error);
    return file;
  }
};

export const compressSignature = async (file: File): Promise<File> => {
  if (file.size < 150 * 1024) {
    return file;
  }
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 600,
    useWebWorker: false,
    initialQuality: 0.8,
  };

  try {
    const compressPromise = imageCompression(file, options);
    const timeoutPromise = new Promise<File>((_, reject) =>
      setTimeout(() => reject(new Error('Signature compression timeout')), 1200)
    );
    return await Promise.race([compressPromise, timeoutPromise]);
  } catch (error) {
    return file;
  }
};

export const dataURLtoBlob = (dataurl: string): Blob => {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return new Blob([], { type: 'image/png' });
  }
};

export const formatImageUrl = (url: string | undefined | null): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:')) {
    if (trimmed.startsWith('data:;base64,') || trimmed.startsWith('data:application/octet-stream;base64,')) {
      return trimmed.replace(/^data:[^;]*;/, 'data:image/jpeg;');
    }
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return trimmed;
  }
  
  // High-reliability origin resolution if external MySQL API is configured
  try {
    const apiUrl = getMysqlApiUrl();
    if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
      const origin = new URL(apiUrl).origin;
      const cleanPath = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
      return `${origin}${cleanPath}`;
    }
  } catch (e) { void e; }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return '/' + trimmed;
};

export const uploadImageToStorage = async (file: File, folderPath: string = 'uploads'): Promise<string> => {
  if (!file) return '';

  // 1. Kompres gambar secara cepat (fallback ke file asli jika gagal)
  const targetFile = await compressImage(file);
  const targetBlob: Blob = (targetFile && targetFile.size > 0) ? targetFile : file;

  const getBase64 = (f: File | Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        let res = reader.result as string;
        if (res && typeof res === 'string' && res.startsWith('data:')) {
          if (res.startsWith('data:;base64,') || res.startsWith('data:application/octet-stream;base64,')) {
            const realType = file.type || 'image/jpeg';
            res = res.replace(/^data:[^;]*;/, `data:${realType};`);
          }
          resolve(res);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(f);
    });
  };

  // 2. Upload Utama: Storage (Bucket untuk link permanen)
  try {
    const cleanFileName = (file.name || 'image.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${cleanFileName}`;
    const filePath = `${folderPath}/${fileName}`;

    const { data: uploadRes, error: uploadErr } = await supabase.storage.from('public').upload(filePath, targetBlob, {
      cacheControl: '31536000',
      upsert: true
    });

    if (!uploadErr && uploadRes) {
      if (uploadRes.publicUrl) {
        return formatImageUrl(uploadRes.publicUrl);
      }
      const { data } = supabase.storage.from('public').getPublicUrl(filePath);
      if (data?.publicUrl) {
        return formatImageUrl(data.publicUrl);
      }
    }
  } catch (err) {
    console.warn("Storage upload skipped:", err);
  }

  // 3. Fallback akhir ke Compressed Base64 Data URL
  return await getBase64(targetBlob);
};

export const convertBase64ToPublicUrl = async (base64Str: string): Promise<string> => {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:')) {
    return formatImageUrl(base64Str);
  }

  // Coba simpan ke Storage agar mendapatkan URL permanen
  try {
    const blob = dataURLtoBlob(base64Str);
    const fileName = `converted-${Date.now()}-${DEFAULT_OG_IMAGE_NAME}`;
    const filePath = `settings/${fileName}`;

    const { data: uploadRes, error: uploadErr } = await supabase.storage.from('public').upload(filePath, blob, {
      cacheControl: '31536000',
      upsert: true
    });

    if (!uploadErr && uploadRes) {
      if (uploadRes.publicUrl) {
        return formatImageUrl(uploadRes.publicUrl);
      }
      const { data } = supabase.storage.from('public').getPublicUrl(filePath);
      if (data?.publicUrl) {
        return formatImageUrl(data.publicUrl);
      }
    }
  } catch (err) {
    console.warn("Storage conversion error:", err);
  }

  return base64Str;
};

// Helper pembuatan thumbnail otomatis untuk file video
export const generateVideoThumbnail = (videoSrc: File | string): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      const url = typeof videoSrc === 'string' ? videoSrc : URL.createObjectURL(videoSrc);
      video.src = url;

      video.onloadeddata = () => {
        video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(640, video.videoWidth || 640);
          canvas.height = Math.min(360, video.videoHeight || 360);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
            if (typeof videoSrc !== 'string') URL.revokeObjectURL(url);
            resolve(thumbUrl);
            return;
          }
        } catch (e) {
          console.warn("Error drawing video thumbnail frame:", e);
        }
        if (typeof videoSrc !== 'string') URL.revokeObjectURL(url);
        resolve('');
      };

      video.onerror = () => {
        if (typeof videoSrc !== 'string') URL.revokeObjectURL(url);
        resolve('');
      };

      setTimeout(() => {
        if (typeof videoSrc !== 'string') URL.revokeObjectURL(url);
        resolve('');
      }, 4000);
    } catch (err) {
      resolve('');
    }
  });
};

// Helper parsing YouTube / Google Drive / Vimeo embed & thumbnail
export const getYouTubeEmbedUrl = (url: string | undefined | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // 1. YouTube URLs (watch, shorts, live, embed, youtu.be)
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }

  // 2. Google Drive Video URLs
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // 3. Vimeo Video URLs
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  // 4. Check if it's already an embed iframe URL
  if (trimmed.includes('youtube.com/embed/') || trimmed.includes('drive.google.com/file/d/') || trimmed.includes('player.vimeo.com/video/')) {
    return trimmed;
  }

  return null;
};

export const getYouTubeThumbnail = (url: string | undefined | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  return null;
};

export const isVideoUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  return (
    Boolean(getYouTubeEmbedUrl(url)) ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.startsWith('data:video/') ||
    lower.startsWith('blob:') ||
    lower.includes('/videos/') ||
    lower.includes('drive.google.com') ||
    lower.includes('vimeo.com')
  );
};

// Auto Compress & Upload untuk Media (Gambar maupun Video)
export const addTextWatermarkToImage = async (
  file: File, 
  options: { title: string; subtitle?: string; badge?: string }
): Promise<File> => {
  if (!file || !options.title) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(file);

          // 1. Gambar foto utama
          ctx.drawImage(img, 0, 0);

          // 2. Gambar overlay gradien di bagian bawah untuk kontras teks
          const gradientHeight = Math.max(120, img.height * 0.35);
          const gradient = ctx.createLinearGradient(0, img.height - gradientHeight, 0, img.height);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
          gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.6)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, img.height - gradientHeight, img.width, gradientHeight);

          const paddingLeft = Math.max(20, img.width * 0.04);
          let currentY = img.height - (gradientHeight * 0.55);

          // 3. Gambar Badge/Label
          if (options.badge) {
            const badgeText = options.badge.toUpperCase();
            const badgeFontSize = Math.max(12, Math.round(img.width * 0.02));
            ctx.font = `900 ${badgeFontSize}px sans-serif`;
            const badgeWidth = ctx.measureText(badgeText).width + 20;
            const badgeHeight = badgeFontSize + 10;

            ctx.fillStyle = '#059669'; // Emerald
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(paddingLeft, currentY - badgeFontSize + 2, badgeWidth, badgeHeight, 10);
              ctx.fill();
            } else {
              ctx.fillRect(paddingLeft, currentY - badgeFontSize + 2, badgeWidth, badgeHeight);
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(badgeText, paddingLeft + 10, currentY + 2);
            currentY += badgeHeight + 10;
          }

          // 4. Gambar Judul Teks
          const titleFontSize = Math.max(18, Math.round(img.width * 0.038));
          ctx.font = `900 ${titleFontSize}px sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          ctx.fillText(options.title, paddingLeft, currentY);
          currentY += titleFontSize + 8;

          // 5. Gambar Subtitle / Watermark Nama Madrasah
          if (options.subtitle) {
            ctx.shadowBlur = 4;
            const subFontSize = Math.max(12, Math.round(img.width * 0.022));
            ctx.font = `600 ${subFontSize}px sans-serif`;
            ctx.fillStyle = '#CBD5E1';
            ctx.fillText(options.subtitle, paddingLeft, currentY);
          }

          canvas.toBlob((blob) => {
            if (blob) {
              const watermarkedFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(watermarkedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.90);
        } catch (err) {
          console.warn("Watermark render error:", err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export const uploadMediaToStorage = async (
  file: File, 
  folderPath: string = 'gallery',
  watermarkOptions?: { title: string; subtitle?: string; badge?: string }
): Promise<{ url: string; type: 'image' | 'video'; thumbnail?: string }> => {
  if (!file) throw new Error('File tidak ditemukan');

  const isVideo = file.type.startsWith('video/');

  if (!isVideo) {
    let targetFile = file;
    if (watermarkOptions && watermarkOptions.title) {
      targetFile = await addTextWatermarkToImage(file, watermarkOptions);
    }
    // Jalankan kompresi & upload gambar
    const imageUrl = await uploadImageToStorage(targetFile, folderPath);
    return { url: imageUrl, type: 'image' };
  }

  // Jika file adalah Video
  // 1. Buat thumbnail otomatis dari frame video
  const thumbnail = await generateVideoThumbnail(file);

  // 2. Upload video file ke Storage
  const cleanFileName = (file.name || 'video.mp4').replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${Date.now()}-${cleanFileName}`;
  const filePath = `${folderPath}/videos/${fileName}`;

  try {
    const { data: uploadRes, error: uploadErr } = await supabase.storage.from('public').upload(filePath, file, {
      cacheControl: '31536000',
      upsert: true
    });

    if (!uploadErr && uploadRes) {
      const { data } = supabase.storage.from('public').getPublicUrl(filePath);
      if (data?.publicUrl) {
        return {
          url: formatImageUrl(data.publicUrl),
          type: 'video',
          thumbnail: thumbnail || ''
        };
      }
    }
  } catch (err) {
    console.warn("Video storage upload fallback:", err);
  }

  // Fallback ke Object URL / FileReader jika storage belum terkonfigurasi
  const videoUrl = URL.createObjectURL(file);
  return {
    url: videoUrl,
    type: 'video',
    thumbnail: thumbnail || ''
  };
};

