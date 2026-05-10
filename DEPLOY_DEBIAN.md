# Self-Hosting StudyFlow on Debian 13

## 1. Persiapan Server
Pastikan server Debian Anda sudah terinstall Docker dan Git.
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
```

## 2. Transfer File ke Server
Anda bisa melakukan `git clone` repository ini di server Anda, atau mengirim file menggunakan `rsync`/`scp`.

## 3. Konfigurasi Environment
Di folder root proyek pada server Debian:
1. Salin `.env.server.example` menjadi `.env`
   ```bash
   cp .env.server.example .env
   ```
2. Edit `.env` dan masukkan `CLOUDFLARE_TUNNEL_TOKEN` Anda. 
   *(Token ini didapatkan dari dashboard Cloudflare Zero Trust saat membuat tunnel baru. Pastikan Tunnel di Cloudflare mengarah ke `http://frontend:80`)*.

## 4. Jalankan Aplikasi
Jalankan perintah berikut di root folder proyek:
```bash
sudo docker compose up -d --build
```

Ini akan melakukan build untuk:
- Frontend (React + Nginx)
- Backend API (Node.js)
- Database (MariaDB)
- Cloudflare Tunnel (menghubungkan Nginx langsung ke domain Anda)

Selesai! Aplikasi Anda akan bisa diakses melalui domain Cloudflare Anda.
