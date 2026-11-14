# Tutorial Menghubungkan Firebase Firestore

Estimasi waktu: 10–15 menit. Tidak perlu kartu kredit, cukup paket gratis **Spark**.

Data yang disimpan di Firebase: ucapan & doa, balasan, konfirmasi kehadiran, jumlah like, dan pengaturan dashboard.

> [!IMPORTANT]
> **Jangan kirim password admin ke siapa pun**, termasuk ke Claude. Password hanya Anda ketik di Firebase Console dan saat login dashboard.

---

## Langkah 1 — Buat project

1. Buka [console.firebase.google.com](https://console.firebase.google.com) dan login dengan akun Google Anda.
2. Klik **Create a project** / **Get started by setting up a Firebase project**.
3. Isi nama, misalnya `undangan-asha-yusnar`, lalu lanjutkan.
4. **Google Analytics** boleh dimatikan, karena tidak dipakai.
5. Klik **Create project** dan tunggu selesai.

## Langkah 2 — Daftarkan Web App dan salin konfigurasi

1. Di halaman utama project, klik ikon **`</>`** (Web).
2. Isi nama, misalnya `undangan-web`. **Firebase Hosting tidak perlu dicentang.**
3. Klik **Register app**. Akan muncul kode berisi `firebaseConfig` seperti ini:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "undangan-asha-yusnar.firebaseapp.com",
     projectId: "undangan-asha-yusnar",
     storageBucket: "undangan-asha-yusnar.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```

4. **Salin blok ini.** Inilah data yang dibutuhkan untuk menyambungkan website. Isinya memang publik dan aman dibagikan; yang melindungi data adalah rules di langkah 4.

Bisa dilihat lagi kapan saja di **⚙️ Project settings → General → Your apps**.

## Langkah 3 — Buat database Firestore

1. Menu kiri: **Build → Firestore Database → Create database**.
2. Bila diminta memilih edition, pilih **Standard**.
3. Location: pilih **`asia-southeast2` (Jakarta)** agar cepat untuk tamu di Indonesia. *Lokasi tidak bisa diubah setelah dibuat.*
4. Pilih **Start in production mode**, lalu **Create**.

## Langkah 4 — Pasang aturan keamanan (rules)

1. Masih di Firestore Database, buka tab **Rules**.
2. Hapus semua isinya.
3. Salin seluruh isi file [`firestore.rules`](../firestore.rules) dari project ini dan tempel di sana.
4. Klik **Publish**.

Rules inilah yang mencegah tamu menghapus ucapan orang lain, memalsukan jumlah like, atau mengaku sebagai admin.

## Langkah 5 — Aktifkan metode login

1. Menu kiri: **Build → Authentication → Get started**.
2. Tab **Sign-in method**, aktifkan dua metode ini:
   - **Anonymous** → Enable → Save. *Dipakai tamu agar bisa mengirim, mengubah, dan menyukai ucapan tanpa membuat akun.*
   - **Email/Password** → Enable (opsi pertama saja) → Save. *Dipakai login admin di dashboard.*

## Langkah 6 — Buat akun admin

1. Masih di Authentication, buka tab **Users → Add user**.
2. Isi email dan password Anda, lalu klik **Add user**.
3. Pada baris akun tersebut, salin nilai kolom **User UID** (contoh: `k3Jd9sLm2PqR...`).

Lalu daftarkan akun itu sebagai admin:

1. Buka **Firestore Database → tab Data → + Start collection**.
2. **Collection ID**: `admins` → Next.
3. **Document ID**: tempel **User UID** tadi.
4. Tambahkan satu field: nama `role`, tipe `string`, nilai `admin`.
5. Klik **Save**.

> Hanya akun yang UID-nya ada di koleksi `admins` yang bisa masuk dashboard. Admin hanya bisa ditambahkan lewat Console ini, tidak bisa dari website.

## Langkah 7 — Izinkan domain website

1. **Authentication → Settings → Authorized domains**.
2. Pastikan `localhost` ada. Bila belum, klik **Add domain** dan tambahkan.
3. Setelah website online, tambahkan juga domain Anda, misalnya `undangan-anda.netlify.app`.

---

## Langkah 8 — Kirim data ini ke Claude

Cukup kirim dua hal berikut, dan sisanya akan dikerjakan:

| Data | Dari mana | Wajib? |
| --- | --- | --- |
| Blok `firebaseConfig` | Langkah 2 | Wajib |
| Domain website | Netlify / domain Anda | Bila sudah ada, untuk preview WhatsApp |

**Yang tidak perlu dikirim:** password admin dan User UID.

### Atau pasang sendiri

Buka [`js/connection/firebase-config.js`](../js/connection/firebase-config.js), isi nilainya, lalu jalankan:

```bash
npm install
npm run dev
```

Buka `http://localhost:8080`.

---

## Langkah 9 — Cek apakah sudah berhasil

- [ ] Buka undangan, kirim satu ucapan. Ucapan muncul di daftar.
- [ ] Refresh halaman. Ucapan masih ada.
- [ ] Di Firebase Console → Firestore → Data, koleksi `comments` berisi ucapan tadi.
- [ ] Klik ikon hati pada ucapan. Jumlahnya bertambah.
- [ ] Buka `/dashboard.html`, login dengan akun admin. Statistik tampil.
- [ ] Coba hapus ucapan uji tadi dari dashboard.

## Bila ada masalah

| Pesan / gejala | Penyebab | Solusi |
| --- | --- | --- |
| "Fitur ucapan belum aktif" | `firebase-config.js` masih kosong | Ulangi langkah 2 dan 8 |
| "Login anonim belum diaktifkan" | Anonymous belum aktif | Ulangi langkah 5 |
| "Aksi ini tidak diizinkan" | Rules belum dipublikasikan | Ulangi langkah 4 |
| "Akun ini belum terdaftar sebagai admin" | UID di `admins` salah atau belum ada | Ulangi langkah 6, pastikan Document ID sama persis dengan User UID |
| "Email atau password salah" | Salah ketik | Reset password di Authentication → Users |
| "Kuota harian penyimpanan sudah habis" | Melewati kuota gratis harian | Otomatis pulih keesokan harinya |

## Berapa kuota yang terpakai?

Kuota gratis Firestore saat ini umumnya sekitar **50.000 baca dan 20.000 tulis per hari**. Angka pastinya bisa berubah, cek [halaman harga Firebase](https://firebase.google.com/pricing).

Satu tamu yang membaca halaman ucapan memakai kurang lebih 15–30 baca. Ucapan baru dimuat saat tamu menggulir ke bagian tersebut, sehingga 500 tamu dalam sehari masih jauh di bawah kuota.

Selama tetap di paket **Spark**, tidak akan ada tagihan. Bila kuota habis, layanan hanya berhenti sampai kuota pulih.

## Struktur data (referensi)

| Koleksi | Isi | Yang boleh menulis |
| --- | --- | --- |
| `comments/{id}` | Ucapan & balasan | Tamu (milik sendiri), admin (semua) |
| `comments/{id}/likes/{uid}` | Penanda like per tamu | Tamu (milik sendiri) |
| `settings/app` | Saklar fitur di dashboard, dibuat otomatis saat pertama diubah | Admin |
| `admins/{uid}` | Daftar admin | Hanya lewat Console |

## Batasan yang perlu diketahui

- **Sensor kata kasar** bekerja saat ucapan ditampilkan. Teks aslinya tetap tersimpan di database dan terlihat oleh admin. Daftar katanya ada di `badWords` pada [`js/common/util.js`](../js/common/util.js).
- **Pembatasan spam:** Rules membatasi format dan panjang ucapan, tetapi tidak membatasi jumlah kirim per menit. Ucapan spam bisa dihapus dari dashboard. Bila perlu perlindungan lebih, aktifkan [Firebase App Check](https://firebase.google.com/docs/app-check).
- **Tamu berganti perangkat** atau menghapus data browser tidak bisa lagi mengubah ucapan lamanya, karena identitas anonimnya tersimpan di browser.
- **Jumlah kehadiran** dihitung per ucapan. Tamu yang mengirim dua ucapan terhitung dua kali, jadi gunakan CSV dari dashboard untuk pengecekan akhir.

## Opsional: menguji tanpa project sungguhan

Bila Java sudah terpasang, Anda bisa menjalankan emulator lokal:

```bash
npx firebase-tools emulators:start --project demo-undangan
npm run dev
```

Lalu buka `http://localhost:8080/?emulator`. Datanya hanya tersimpan selama emulator berjalan.
