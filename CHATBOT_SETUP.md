# 🤖 StudyFlow Chatbot - Setup Guide

Selamat datang di StudyFlow AI Chatbot! Panduan ini akan membantu Anda mengaktifkan fitur chatbot dengan Google Gemini 3.0 Flash.

---

## 📋 Daftar Isi

1. [Cara Mendapatkan API Key](#-cara-mendapatkan-api-key)
2. [Setup di StudyFlow](#-setup-di-studyflow)
3. [Cara Menggunakan Chatbot](#-cara-menggunakan-chatbot)
4. [FAQ & Troubleshooting](#-faq--troubleshooting)
5. [Batasan & Limit](#-batasan--limit)

---

## 🔑 Cara Mendapatkan API Key

### Langkah 1: Buka Google AI Studio

Kunjungi: **[https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)**

![Step 1](https://aistudio.google.com/apikey)

### Langkah 2: Login dengan Akun Google

Login menggunakan akun Google Anda (Gmail biasa sudah bisa).

### Langkah 3: Buat API Key

1. Klik tombol **"Create API Key"**
2. Pilih **"Create API key in new project"** (atau pilih project yang sudah ada)

### Langkah 4: Copy API Key

Setelah dibuat, API Key akan ditampilkan. Klik tombol **Copy** untuk menyalin.

**Format API Key:** `AIzaSy...` (39 karakter)

### Langkah 5: Simpan dengan Aman

⚠️ **Penting:** Simpan API Key Anda dengan rahasia! Jangan bagikan kepada siapa pun.

---

## ⚙️ Setup di StudyFlow

### Pertama Kali

1. **Buka aplikasi StudyFlow** dan login
2. **Klik icon chat** 💬 di pojok kanan bawah
3. Jendela setup akan muncul otomatis

### Input API Key

1. **Klik "📋 Panduan Mendapatkan API Key"** untuk melihat panduan lengkap (jika perlu)
2. **Paste API Key** di form yang tersedia
3. **Klik "Simpan API Key"**

### Verifikasi

Setelah berhasil menyimpan, Anda akan melihat:
- ✓ API Key sudah dikonfigurasi
- Chatbot siap digunakan!

### Edit/Hapus API Key

Untuk mengubah API Key:
1. Buka chatbot
2. Klik icon **Settings** ⚙️ di header
3. Pilih **"Edit"** atau **"Hapus API Key"**

---

## 💬 Cara Menggunakan Chatbot

### Fitur yang Tersedia

| Fitur | Contoh Pertanyaan |
|-------|-------------------|
| 📊 **Cek Progress** | "Bagaimana progress belajarku hari ini?" |
| 📋 **Lihat Tugas** | "Apa tugas yang belum selesai?" |
| ⏱ **Timer Pomodoro** | "Mulai timer 25 menit" |
| 📅 **Jadwal** | "Apa jadwal kelas hari ini?" |
| 💡 **Motivasi** | "Beri aku semangat belajar" |
| 💡 **Rekomendasi** | "Apa yang harus aku pelajari sekarang?" |

### Quick Replies

Klik salah satu tombol quick reply untuk pertanyaan umum:
- 📊 Progress
- 📋 Tugas
- ⏱ Timer
- 💡 Motivasi

### Feedback

Setiap respons AI memiliki tombol 👍/👎 untuk memberikan feedback.

---

## ❓ FAQ & Troubleshooting

### Error: "Invalid API Key"

**Penyebab:**
- API Key salah format atau tidak valid
- API Key sudah di-revoke di Google AI Studio

**Solusi:**
1. Pastikan API Key dimulai dengan `AIza`
2. Pastikan panjang 39 karakter
3. Coba buat API Key baru di Google AI Studio

### Error: "Quota Exceeded"

**Penyebab:**
- Melebihi limit gratis: 1500 requests/hari

**Solusi:**
- Tunggu 24 jam untuk reset quota
- Atau upgrade ke paid tier di Google Cloud Console

### Error: "Rate Limit"

**Penyebab:**
- Terlalu banyak request dalam waktu singkat (limit: 60/menit)

**Solusi:**
- Tunggu beberapa saat sebelum mengirim pesan lagi

### Error: "API key does not have permission"

**Penyebab:**
- API Key belum di-enable untuk Gemini API

**Solusi:**
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project Anda
3. API & Services → Library
4. Cari "Generative Language API" dan Enable

### Chatbot tidak muncul

**Penyebab:**
- User belum login
- Chatbot disabled di config

**Solusi:**
- Pastikan sudah login di StudyFlow
- Hubungi developer jika masalah berlanjut

---

## 📊 Batasan & Limit

### Free Tier (Gratis)

| Limit | Value |
|-------|-------|
| Requests per hari | 1500 |
| Requests per menit | 60 |
| Tokens per request | 1024 (output) |
| Model | Gemini 3.0 Flash |

### Estimasi Penggunaan

- **1 user aktif** = ~20-30 chat/hari
- **1500 requests** = cukup untuk ~50-75 user/hari

### Paid Tier (Jika Perlu)

Jika membutuhkan lebih banyak quota:

| Resource | Price |
|----------|-------|
| Input tokens | $7 / 1 juta tokens |
| Output tokens | $21 / 1 juta tokens |

Upgrade di: [Google Cloud Console](https://console.cloud.google.com/billing)

---

## 🔐 Keamanan & Privasi

### Penyimpanan API Key

- ✅ API Key disimpan **terenkripsi** di browser Anda (localStorage)
- ✅ **Tidak dikirim** ke server backend StudyFlow
- ✅ Hanya digunakan untuk komunikasi langsung dengan Google API

### Data Chat

- ✅ Chat disimpan di Firestore pribadi Anda
- ✅ Hanya Anda yang bisa akses chat Anda sendiri
- ✅ Bisa dihapus kapan saja via tombol "Hapus Riwayat"

---

## 🆘 Butuh Bantuan?

Jika mengalami masalah:

1. **Baca FAQ** di atas
2. **Periksa Console** browser untuk error messages (F12)
3. **Hubungi developer** untuk bantuan lebih lanjut

---

## 📱 Update & Perubahan

Dokumentasi ini terakhir diupdate: **7 Maret 2026**

**Versi:** 1.0.0

**Model AI:** Google Gemini 3.0 Flash

---

**Selamat menggunakan StudyFlow AI Chatbot! 🎉**
