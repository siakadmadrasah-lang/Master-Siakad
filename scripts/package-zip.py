import os
import shutil
import zipfile

dist_dir = 'dist'
plesk_zip = 'public/siakadmadrasah-plesk-ready.zip'
cpanel_zip = 'public/siakadmadrasah-cpanel-ready.zip'

print(f"Creating zip files from {dist_dir}...")

with zipfile.ZipFile(plesk_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            # Skip any previously generated zip files inside dist/ to avoid infinite recursion
            if file.endswith('.zip'):
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, dist_dir)
            zipf.write(file_path, arcname)

shutil.copyfile(plesk_zip, cpanel_zip)

# Also ensure copies in dist/ if dist exists
if os.path.exists(dist_dir):
    shutil.copyfile(plesk_zip, os.path.join(dist_dir, 'siakadmadrasah-plesk-ready.zip'))
    shutil.copyfile(cpanel_zip, os.path.join(dist_dir, 'siakadmadrasah-cpanel-ready.zip'))

print(f"Successfully created {cpanel_zip} and {plesk_zip} with size: {os.path.getsize(cpanel_zip)} bytes")

