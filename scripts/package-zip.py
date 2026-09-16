import os
import shutil
import zipfile
import time

dist_dir = 'dist'
plesk_zip = 'public/siakadmadrasah-plesk-ready.zip'
cpanel_zip = 'public/siakadmadrasah-cpanel-ready.zip'

print(f"Creating zip files from {dist_dir} with strict Unix 644/755 permissions...")

# Ensure destination directory exists
os.makedirs('public', exist_ok=True)

now = time.localtime(time.time())[:6]

def add_entry_to_zip(zipf, arcname, data, is_dir=False):
    # Ensure forward slashes for zip compatibility
    arcname = arcname.replace('\\', '/')
    if is_dir and not arcname.endswith('/'):
        arcname += '/'

    zinfo = zipfile.ZipInfo(arcname, now)
    zinfo.create_system = 3 # Unix platform indicator
    zinfo.compress_type = zipfile.ZIP_DEFLATED if not is_dir else zipfile.ZIP_STORED

    if is_dir:
        # drwxr-xr-x (0755) + MS-DOS directory flag 0x10
        zinfo.external_attr = (0o40755 << 16) | 0x10
    else:
        # -rw-r--r-- (0644)
        zinfo.external_attr = 0o100644 << 16

    zipf.writestr(zinfo, data if not is_dir else b'')

def transform_plesk_content(arcname, raw_bytes):
    if arcname == 'db_config.php':
        text = raw_bytes.decode('utf-8', errors='replace')
        text = text.replace("define('DB_NAME', 'masbagoes_siakad')", "define('DB_NAME', 'jaenal_siakadmadrasah')")
        text = text.replace("define('DB_USER', 'masbagoes_siakad')", "define('DB_USER', 'jaenal_siakadmadrah')")
        text = text.replace("define('DB_PASS', 'masbagus15')", "define('DB_PASS', 'masbagus15')")
        return text.encode('utf-8')
    elif arcname == 'api.php':
        text = raw_bytes.decode('utf-8', errors='replace')
        text = text.replace("DB_NAME : 'masbagoes_siakad'", "DB_NAME : 'jaenal_siakadmadrasah'")
        text = text.replace("DB_USER : 'masbagoes_siakad'", "DB_USER : 'jaenal_siakadmadrah'")
        return text.encode('utf-8')
    elif arcname == 'index.php':
        text = raw_bytes.decode('utf-8', errors='replace')
        text = text.replace("DB_NAME : 'masbagoes_siakad'", "DB_NAME : 'jaenal_siakadmadrasah'")
        text = text.replace("DB_USER : 'masbagoes_siakad'", "DB_USER : 'jaenal_siakadmadrah'")
        return text.encode('utf-8')
    elif arcname == 'PLESK_HOSTING_GUIDE.txt':
        text = raw_bytes.decode('utf-8', errors='replace')
        text = text.replace("define('DB_NAME', 'nama_db_anda')", "define('DB_NAME', 'jaenal_siakadmadrasah')")
        text = text.replace("define('DB_USER', 'user_db_anda')", "define('DB_USER', 'jaenal_siakadmadrah')")
        text = text.replace("define('DB_PASS', 'password_db_anda')", "define('DB_PASS', 'masbagus15')")
        return text.encode('utf-8')
    return raw_bytes

# Gather all directories and files
entries = []
for root, dirs, files in os.walk(dist_dir):
    rel_root = os.path.relpath(root, dist_dir)
    if rel_root != '.':
        entries.append((rel_root, None, True))
    for file in sorted(files):
        if file.endswith('.zip'):
            continue
        file_path = os.path.join(root, file)
        arcname = os.path.relpath(file_path, dist_dir)
        with open(file_path, 'rb') as f:
            raw_bytes = f.read()
        entries.append((arcname, raw_bytes, False))

# 1. Package cPanel ZIP (keeps default configuration: masbagoes_siakad / masbagus15)
with zipfile.ZipFile(cpanel_zip, 'w') as zip_cpanel:
    for arcname, data, is_dir in entries:
        add_entry_to_zip(zip_cpanel, arcname, data, is_dir)

# 2. Package Plesk ZIP (customized with Plesk database credentials)
with zipfile.ZipFile(plesk_zip, 'w') as zip_plesk:
    for arcname, data, is_dir in entries:
        if is_dir:
            add_entry_to_zip(zip_plesk, arcname, None, True)
        else:
            transformed = transform_plesk_content(arcname, data)
            add_entry_to_zip(zip_plesk, arcname, transformed, False)

# 3. Also ensure copies in dist/ if dist exists
if os.path.exists(dist_dir):
    shutil.copyfile(cpanel_zip, os.path.join(dist_dir, 'siakadmadrasah-cpanel-ready.zip'))
    shutil.copyfile(plesk_zip, os.path.join(dist_dir, 'siakadmadrasah-plesk-ready.zip'))

print(f"Successfully created cPanel ZIP ({os.path.getsize(cpanel_zip)} bytes) with 0644/0755 Unix permissions")
print(f"Successfully created Plesk ZIP ({os.path.getsize(plesk_zip)} bytes) with 0644/0755 Unix permissions")

