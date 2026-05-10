# Panduan Operasional & Migrasi Server (StudyFlow)

## Status Terkini
- **Database:** MariaDB berjalan di dalam Docker.
- **API:** Node.js Express berjalan di dalam Docker (Port 3001).
- **Data:** Migrasi dari Firestore ke MariaDB telah **SELESAI** (100% Match).
- **Frontend:** Menggunakan API sebagai sumber data utama dengan fallback ke Firestore.

---

## Struktur Folder Penting
- \`Backend/studyflow-api/\`: Folder utama backend.
- \`Backend/studyflow-api/mariadb_data/\`: **SANGAT PENTING.** Berisi seluruh data database MariaDB Anda.
- \`Backend/studyflow-api/service-account.json\`: Kredensial Firebase Admin.
- \`Backend/studyflow-api/docker-compose.yml\`: Konfigurasi container.

---

## Panduan Pemindahan ke Server Debian (CLI-Only)

Ikuti langkah ini untuk memindahkan database dan API dari komputer Arch Anda ke server Debian 24/7.

### 1. Persiapan di Server Debian (CLI)
Install Docker dan Docker Compose di Debian:
\`\`\`bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Logout dan login kembali agar izin grup docker aktif
\`\`\`

### 2. Kompresi Data di Komputer Arch
Buka terminal di komputer Arch Anda:
\`\`\`bash
cd /home/archgha99/Disk2/001Code/000001Studyflowproject/Backend/
# Matikan container sebelum mengompres data agar database tidak korup
cd studyflow-api && docker-compose down && cd ..

# Kompres seluruh folder backend
tar -czvf studyflow-backup.tar.gz studyflow-api/
\`\`\`

### 3. Transfer ke Server Debian
Gunakan \`scp\` atau \`rsync\` untuk mengirim file backup ke server:
\`\`\`bash
scp studyflow-backup.tar.gz user@ip-server-debian:/home/user/
\`\`\`

### 4. Ekstrak dan Jalankan di Debian
Di dalam server Debian:
\`\`\`bash
tar -xzvf studyflow-backup.tar.gz
cd studyflow-api/

# Jalankan sistem
docker-compose up -d
\`\`\`

### 5. Verifikasi di Debian
\`\`\`bash
# Cek apakah container berjalan
docker ps

# Cek log database
docker logs studyflow-db

# Test koneksi API
curl http://localhost:3001/health
\`\`\`

---

## Remote Maintenance via AnyDesk (dari PC Pribadi)

AnyDesk memungkinkan kamu mengakses GUI/terminal server Debian dari PC pribadi tanpa harus duduk di depan server.

### 1. Install AnyDesk di Server Debian
\`\`\`bash
# Tambah repository AnyDesk
wget -qO - https://keys.anydesk.com/repos/DEB-GPG-KEY | sudo apt-key add -
echo "deb http://deb.anydesk.com/ all main" | sudo tee /etc/apt/sources.list.d/anydesk-stable.list

sudo apt update
sudo apt install anydesk -y
\`\`\`

### 2. Jalankan AnyDesk sebagai Service (Headless / Tanpa Monitor)
Agar AnyDesk bisa diakses tanpa layar terhubung ke server:
\`\`\`bash
# Aktifkan AnyDesk sebagai systemd service
sudo systemctl enable --now anydesk

# Cek status service
sudo systemctl status anydesk

# Lihat AnyDesk ID server
anydesk --get-id
\`\`\`
Catat **AnyDesk ID** server Debian kamu. ID ini yang digunakan dari PC pribadi untuk koneksi.

### 3. Atur Password Unattended Access (Akses Tanpa Konfirmasi)
Agar bisa konek tanpa ada orang di depan server:
\`\`\`bash
# Set password untuk unattended access
echo "PASSWORD_KAMU" | anydesk --set-password
\`\`\`
> ⚠️ Ganti \`PASSWORD_KAMU\` dengan password yang kuat. Jangan gunakan password yang sama dengan login sistem.

### 4. Install AnyDesk di PC Pribadi (Arch Linux)
\`\`\`bash
# Via AUR
yay -S anydesk-bin
# atau
pamac install anydesk-bin
\`\`\`
Buka AnyDesk, masukkan **AnyDesk ID server**, lalu gunakan password unattended yang sudah di-set.

### 5. Tips Keamanan AnyDesk
- **Whitelist IP:** Batasi akses hanya dari IP PC kamu di konfigurasi AnyDesk.
- **Nonaktifkan jika tidak dipakai:** \`sudo systemctl stop anydesk\`
- **Gunakan kombinasi dengan SSH:** Untuk maintenance ringan, SSH lebih aman & ringan. AnyDesk untuk keadaan darurat atau GUI.
- **Pastikan port tidak diblokir:** AnyDesk menggunakan port **TCP 7070** dan relay melalui server AnyDesk (tidak butuh port forwarding jika ada internet).

### Alternatif: SSH Biasa (Lebih Direkomendasikan untuk CLI)
Jika server Debian **hanya CLI** (tanpa GUI), SSH lebih ringan dan aman:
\`\`\`bash
# Dari PC pribadi
ssh user@ip-server-debian

# Jika IP dinamis, gunakan layanan DDNS seperti DuckDNS
\`\`\`

---

## Perawatan Rutin (CLI)

**Melihat Log API:**
\`\`\`bash
docker logs -f studyflow-api
\`\`\`

**Restart Sistem:**
\`\`\`bash
docker-compose restart
\`\`\`

**Update Kode:**
Jika Anda mengubah kode di komputer pribadi dan ingin update ke server:
1. Push kode ke Git (kecuali \`mariadb_data\` dan \`service-account.json\`).
2. Di server: \`git pull\`.
3. Jalankan \`docker-compose up -d --build\`.

---

## Risiko dan Catatan
- **Backup:** Selalu backup folder \`mariadb_data\` secara rutin. Jika folder ini hilang, seluruh data database Anda hilang.
- **Port API:** Pastikan port \`3001\` dibuka di firewall Debian (UFW) jika ingin diakses dari luar.
- **Port AnyDesk:** AnyDesk menggunakan relay internet, biasanya **tidak perlu buka port** di firewall. Namun jika koneksi lambat, buka port \`TCP 7070\`.
- **Firestore:** Jangan hapus Firestore dulu sampai Anda yakin server Debian berjalan stabil selama minimal 1 minggu.
- **Keamanan Remote:** Jika menggunakan AnyDesk unattended, pastikan password-nya kuat dan tidak bocor. Pertimbangkan matikan AnyDesk service saat tidak digunakan.
