import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicPleskZipPath = path.join(rootDir, 'public', 'siakadmadrasah-plesk-ready.zip');
const distPleskZipPath = path.join(distDir, 'siakadmadrasah-plesk-ready.zip');
const publicCpanelZipPath = path.join(rootDir, 'public', 'siakadmadrasah-cpanel-ready.zip');
const distCpanelZipPath = path.join(distDir, 'siakadmadrasah-cpanel-ready.zip');

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

  // Sinkronisasi dist/assets ke root assets/ agar kompatibel jika repo di-pull ke root Plesk
  try {
    const rootAssetsDir = path.join(rootDir, 'assets');
    const distAssetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(distAssetsDir)) {
      if (fs.existsSync(rootAssetsDir)) {
        fs.rmSync(rootAssetsDir, { recursive: true, force: true });
      }
      fs.cpSync(distAssetsDir, rootAssetsDir, { recursive: true });
      console.log('[pack-hosting-zip] ✅ Sinkronisasi dist/assets ke root assets/ selesai.');
    }
  } catch (e) {
    console.warn('[pack-hosting-zip] Warning saat copy assets ke root:', e.message);
  }

  // Try Python first as it creates standard ZIP64 archives with perfect central directory offsets
  try {
    const pythonScript = path.join(rootDir, 'scripts', 'package-zip.py');
    if (fs.existsSync(pythonScript)) {
      execSync(`python3 ${pythonScript}`, { stdio: 'inherit' });
      if (fs.existsSync(publicPleskZipPath) && fs.existsSync(publicCpanelZipPath)) {
        fs.copyFileSync(publicPleskZipPath, distPleskZipPath);
        fs.copyFileSync(publicCpanelZipPath, distCpanelZipPath);
        console.log('[pack-hosting-zip] ✅ File ZIP cPanel & Plesk berhasil dibuat menggunakan Python zipfile.');
        return;
      }
    }
  } catch (err) {
    console.warn('[pack-hosting-zip] Python zipfile fallback ke JSZip Node...');
  }

  const zipCpanel = new JSZip();
  const zipPlesk = new JSZip();
  const files = walkDir(distDir);

  for (const file of files) {
    const fileData = fs.readFileSync(file.fullPath);
    // Add to cPanel archive (original default credentials)
    zipCpanel.file(file.relPath, fileData);

    // Add to Plesk archive with transformed DB credentials:
    // DB_USER: jaenal_siakadmadrah
    // DB_NAME: jaenal_siakadmadrasah
    // DB_PASS: masbagus15
    let pleskData = fileData;
    if (file.relPath === 'db_config.php') {
      let str = fileData.toString('utf-8');
      str = str.replace("define('DB_NAME', 'masbagoes_siakad')", "define('DB_NAME', 'jaenal_siakadmadrasah')");
      str = str.replace("define('DB_USER', 'masbagoes_siakad')", "define('DB_USER', 'jaenal_siakadmadrah')");
      str = str.replace("define('DB_PASS', 'masbagus15')", "define('DB_PASS', 'masbagus15')");
      pleskData = Buffer.from(str, 'utf-8');
    } else if (file.relPath === 'api.php' || file.relPath === 'index.php') {
      let str = fileData.toString('utf-8');
      str = str.replace(/DB_NAME\s*:\s*'masbagoes_siakad'/g, "DB_NAME : 'jaenal_siakadmadrasah'");
      str = str.replace(/DB_USER\s*:\s*'masbagoes_siakad'/g, "DB_USER : 'jaenal_siakadmadrah'");
      pleskData = Buffer.from(str, 'utf-8');
    } else if (file.relPath === 'PLESK_HOSTING_GUIDE.txt') {
      let str = fileData.toString('utf-8');
      str = str.replace("define('DB_NAME', 'nama_db_anda')", "define('DB_NAME', 'jaenal_siakadmadrasah')");
      str = str.replace("define('DB_USER', 'user_db_anda')", "define('DB_USER', 'jaenal_siakadmadrah')");
      str = str.replace("define('DB_PASS', 'password_db_anda')", "define('DB_PASS', 'masbagus15')");
      pleskData = Buffer.from(str, 'utf-8');
    }
    zipPlesk.file(file.relPath, pleskData);
  }

  const [contentCpanel, contentPlesk] = await Promise.all([
    zipCpanel.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }),
    zipPlesk.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })
  ]);

  fs.mkdirSync(path.dirname(publicPleskZipPath), { recursive: true });
  fs.writeFileSync(publicCpanelZipPath, contentCpanel);
  fs.writeFileSync(distCpanelZipPath, contentCpanel);
  fs.writeFileSync(publicPleskZipPath, contentPlesk);
  fs.writeFileSync(distPleskZipPath, contentPlesk);

  const sizeCpanelMb = (contentCpanel.length / (1024 * 1024)).toFixed(2);
  const sizePleskMb = (contentPlesk.length / (1024 * 1024)).toFixed(2);
  console.log(`[pack-hosting-zip] ✅ Berhasil membuat siakadmadrasah-cpanel-ready.zip (${sizeCpanelMb} MB) & siakadmadrasah-plesk-ready.zip (${sizePleskMb} MB) di public/ dan dist/`);
}

packZip().catch((err) => {
  console.error('[pack-hosting-zip] Error:', err);
  process.exit(1);
});

