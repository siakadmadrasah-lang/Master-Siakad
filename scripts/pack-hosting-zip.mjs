import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicZipPath = path.join(rootDir, 'public', 'siakadmadrasah-plesk-ready.zip');
const distZipPath = path.join(distDir, 'siakadmadrasah-plesk-ready.zip');

function walkDir(currentDir, relativePath = '', fileList = []) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.endsWith('.zip')) continue;
    const fullPath = path.join(currentDir, entry.name);
    const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      walkDir(fullPath, entryRelPath, fileList);
    } else {
      fileList.push({ fullPath, relPath: entryRelPath });
    }
  }
  return fileList;
}

async function packZip() {
  console.log('[pack-hosting-zip] Memulai pembuatan file ZIP hosting Plesk/cPanel...');
  
  if (!fs.existsSync(distDir)) {
    console.error('Error: Direktori dist/ tidak ditemukan. Jalankan vite build lebih dulu.');
    process.exit(1);
  }

  // Try Python first as it creates standard ZIP64 archives with perfect central directory offsets
  try {
    const pythonScript = path.join(rootDir, 'scripts', 'package-zip.py');
    if (fs.existsSync(pythonScript)) {
      execSync(`python3 ${pythonScript}`, { stdio: 'inherit' });
      if (fs.existsSync(publicZipPath)) {
        fs.copyFileSync(publicZipPath, distZipPath);
        console.log('[pack-hosting-zip] ✅ File ZIP berhasil dibuat menggunakan Python zipfile.');
        return;
      }
    }
  } catch (err) {
    console.warn('[pack-hosting-zip] Python zipfile fallback ke JSZip Node...');
  }

  const zip = new JSZip();
  const files = walkDir(distDir);

  for (const file of files) {
    const fileData = fs.readFileSync(file.fullPath);
    zip.file(file.relPath, fileData);
  }

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  fs.mkdirSync(path.dirname(publicZipPath), { recursive: true });
  fs.writeFileSync(publicZipPath, content);
  fs.writeFileSync(distZipPath, content);

  const sizeMb = (content.length / (1024 * 1024)).toFixed(2);
  console.log(`[pack-hosting-zip] ✅ Berhasil membuat siakadmadrasah-plesk-ready.zip (${sizeMb} MB) di public/ dan dist/`);
}

packZip().catch((err) => {
  console.error('[pack-hosting-zip] Error:', err);
  process.exit(1);
});

