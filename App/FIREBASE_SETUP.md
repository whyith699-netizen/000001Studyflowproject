# Firebase Console Setup untuk GitHub Pages

## Masalah
Domain `whyith699-netizen.github.io` tidak authorized di Firebase Console, menyebabkan error:
```
auth/unauthorized-domain: This domain is not authorized. Please add it to Firebase Console.
```

## Solusi - Tambahkan Domain ke Firebase Auth

### Langkah 1: Buka Firebase Console
1. Kunjungi https://console.firebase.google.com/
2. Login ke akun Google Anda
3. Pilih project: **studydashboard-bd8f0**

### Langkah 2: Masuk ke Authentication Settings
1. Di menu sebelah kiri, klik **Build** > **Authentication**
2. Klik tab **Sign-in method**
3. Klik tombol **⚙️ Settings** (ikon gear) di pojok kanan atas

### Langkah 3: Tambahkan Authorized Domain
1. Scroll ke bagian **Authorized domains**
2. Klik tombol **+ Add domain**
3. Masukkan domain: `whyith699-netizen.github.io`
4. Klik **Add**

### Langkah 4: Verifikasi Domain Terdaftar
Pastikan domain muncul dalam daftar:
- `studydashboard-bd8f0.firebaseapp.com` (default)
- `whyith699-netizen.github.io` ( baru ditambahkan)

### Langkah 5: Deploy Ulang Aplikasi
Setelah domain ditambahkan, deploy ulang aplikasi:

```bash
cd App
npm run build
npm run deploy
```

Atau push ke GitHub dan biarkan GitHub Actions yang mendeploy.

---

## Memeriksa Error di Browser

Setelah deployment, buka https://whyith699-netizen.github.io/StudyFlowDasboarduser/ dan:

1. **Buka Developer Console** (F12 atau Ctrl+Shift+I)
2. **Cek tab Console** untuk error message:
   - Jika ada error Firebase, pastikan domain sudah authorized
   - Jika ada error JavaScript lain, Error Boundary akan menampilkan detail error

### Error yang Mungkin Muncul dan Solusinya:

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `auth/unauthorized-domain` | Domain tidak authorized | Tambahkan domain ke Firebase Console (langkah di atas) |
| `Failed to load resource` | Path salah | Pastikan path sudah diperbaiki (vite.config.js) |
| Blank page tanpa error | JavaScript crash | Error Boundary akan menampilkan detail error |

---

## Pengujian Lokal

Sebelum deploy, test terlebih dahulu secara lokal:

```bash
cd App
npm install
npm run dev
```

Kemudian buka http://localhost:5173/StudyFlowDasboarduser

---

## Checklist Deployment

- [ ] Path mismatch sudah diperbaiki (vite.config.js tanpa trailing slash)
- [ ] Error Boundary sudah ditambahkan
- [ ] Domain `whyith699-netizen.github.io` sudah ditambahkan ke Firebase Auth
- [ ] Aplikasi sudah di-build dan deploy
- [ ] Test login dengan Google Sign-In berhasil
