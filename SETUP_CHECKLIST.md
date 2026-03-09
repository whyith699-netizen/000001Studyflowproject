# 📋 Checklist Setup - Google Drive Integration

## ✅ Status Saat Ini

| Komponen | Status | Keterangan |
|----------|--------|------------|
| Backend Drive endpoints | ✅ Selesai | `/v1/drive/status`, `/v1/drive/connect`, `/v1/drive/files`, `/v1/drive/upload`, `/v1/drive/disconnect` |
| Frontend UI Notes | ✅ Selesai | NotesPage.jsx dengan semua fitur Drive |
| OAuth Google Service | ✅ Selesai | `google-drive-oauth-service.js` |
| Drive Service | ✅ Selesai | `drive-service.js` dengan retry logic |
| Environment files | ✅ Selesai | `.env` backend dan frontend sudah dibuat |
| Build & Syntax | ✅ Lolos | Tidak ada error compile |
| **Support 2 metode Firebase** | ✅ Baru | Bisa pakai file JSON langsung ATAU env vars |

---

## 🔧 Yang Harus Dilakukan Sebelum Sesi Berikutnya

### 1. Isi Firebase Admin Credentials (WAJIB)

**File:** `Backend/notes-api/.env`

Ada **2 metode** yang bisa dipilih:

#### Metode A: Pakai File JSON Langsung (LEBIH MUDAH untuk development) ✅ RECOMMENDED

1. Download service account JSON dari Firebase Console
2. Simpan file di `Backend/notes-api/serviceAccountKey.json`
3. Isi `.env`:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
```

> ✅ **Keuntungan:** Tidak perlu copy-paste private key, langsung pakai file JSON.

#### Metode B: Pakai Environment Variables (recommended untuk production)

```env
FIREBASE_PROJECT_ID=<project-id-kamu>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n<key>\n-----END PRIVATE KEY-----\n"
```

**Cara mendapatkan:**
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project kamu
3. Settings ⚙️ → Service Accounts
4. Klik **"Generate new private key"**
5. Download file JSON
6. Copy value dari:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

> ⚠️ **Penting:** Format `FIREBASE_PRIVATE_KEY` harus satu baris dengan `\n` untuk newline.

---

### 2. Jalankan Backend

```bash
cd Backend/notes-api
npm start
```

**Verifikasi:**
- Buka `http://localhost:4001/health`
- Harus muncul: `{"status":"ok","service":"notes-api"}`

**Jika error:**
- `Missing Firebase credentials` → `.env` belum diisi dengan benar
- `Service account file not found` → Path file JSON salah (Metode A)
- `Private key format invalid` → Pastikan format string dengan `\n` (Metode B)

---

### 3. Verifikasi Frontend Environment

**File:** `Applications/.env`

```env
VITE_NOTES_API_BASE_URL=http://localhost:4001
VITE_GOOGLE_OAUTH_CLIENT_ID=912149378367-lei8llrsc6p5b08b1ltih3bbl8krk33u.apps.googleusercontent.com
```

✅ Sudah terkonfigurasi dengan benar.

---

### 4. Setup Google Cloud Console (WAJIB)

**URL:** [Google Cloud Console](https://console.cloud.google.com/)

#### a. Enable Google Drive API
1. Pilih project kamu
2. API & Services → Library
3. Cari **"Google Drive API"**
4. Klik **Enable**

#### b. Konfigurasi OAuth Consent Screen
1. API & Services → OAuth consent screen
2. Pastikan user type = **External**
3. Tambahkan scope:
   - `.../auth/drive.file`
   - `.../auth/drive.readonly`

#### c. OAuth 2.0 Client ID
1. API & Services → Credentials
2. Pilih OAuth Client ID yang ada (atau buat baru)
3. **Authorized JavaScript origins** tambahkan:
   ```
   http://localhost:5173
   ```
4. Simpan

> ⚠️ **Tanpa origin ini**, OAuth tidak akan bekerja di development!

---

### 5. Jalankan Frontend

```bash
cd Applications
npm run dev
```

**Verifikasi:**
- Frontend jalan di `http://localhost:5173`
- Login dengan Firebase Auth
- Buka halaman Notes

---

### 6. Test Flow Lengkap

| Test | Expected Result |
|------|-----------------|
| Connect folder link | Status berubah jadi "Connected", nama folder muncul |
| List files | Daftar file di folder muncul |
| Upload file | File berhasil diupload, muncul di list |
| Disconnect | Status kembali ke "Not connected" |

---

## 🐛 Troubleshooting

### Backend tidak bisa start
```
Error: Missing Firebase credentials. Set either:
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
OR
- FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```
→ `.env` belum diisi dengan benar ATAU file JSON tidak ditemukan

### Service account file not found
```
Error: Service account file not found: ...
```
→ Pastikan path file JSON benar (cek apakah file ada di lokasi tersebut)

### OAuth Google gagal (401)
```
Error: Access blocked: The origin is not allowed
```
→ Tambahkan `http://localhost:5173` ke Authorized JavaScript origins

### Google token invalid
```
Error: Token does not match the client
```
→ Pastikan email Google OAuth match dengan email Firebase user

### CORS error
```
Access to fetch blocked by CORS policy
```
→ Pastikan backend sudah set CORS origin yang benar

---

## 📁 File Penting yang Sudah Berubah

### Backend
| File | Fungsi |
|------|--------|
| `server.js` | Express server + semua endpoint Drive |
| `config.js` | Load env variables (support 2 metode Firebase) |
| `firebase-admin.js` | Initialize Firebase Admin SDK (support file JSON + env vars) |
| `.env` | Environment credentials |
| `.env.example` | Template .env dengan dokumentasi 2 metode |

### Frontend
| File | Fungsi |
|------|--------|
| `NotesPage.jsx` | UI halaman Notes + Drive integration |
| `drive-service.js` | API calls ke backend Drive endpoints |
| `google-drive-oauth-service.js` | OAuth flow Google |
| `translations.js` | Text untuk UI (multi-language) |
| `.env` | API base URL + OAuth client ID |

---

## 📌 Catatan Penting

1. **Supabase OPTIONAL** - Fitur Drive bisa jalan tanpa Supabase
2. **Endpoint `/v1/notes/*`** akan return `503 NOT_CONFIGURED` jika Supabase tidak dikonfigurasi (ini expected)
3. **Fokus session berikut:** Stabilkan `connect + list + upload` Drive dulu
4. **Firebase Auth WAJIB** - Semua endpoint butuh ID token
5. **Google OAuth WAJIB** - Drive endpoints butuh access token
6. **2 Metode Firebase:**
   - **Metode A (file JSON):** Lebih mudah untuk development lokal
   - **Metode B (env vars):** Lebih aman untuk production/deploy

---

## ✨ Siap untuk Sesi Berikutnya?

Setelah semua checklist di atas ✅, kamu bisa langsung:
1. Test connect folder
2. Test list files
3. Test upload file
4. Fix bug atau improve UX jika ada issue

**Good luck!** 🚀
