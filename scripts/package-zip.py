import os
import zipfile

dist_dir = 'dist'
output_zip = 'public/siakadmadrasah-plesk-ready.zip'

print(f"Creating zip file: {output_zip} from {dist_dir}...")

with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            # Skip any previously generated zip files inside dist/ to avoid infinite recursion
            if file.endswith('.zip'):
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, dist_dir)
            zipf.write(file_path, arcname)

print(f"Successfully created {output_zip} with size: {os.path.getsize(output_zip)} bytes")
