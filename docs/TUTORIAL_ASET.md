# Tutorial Mengganti Foto, Musik, Video, dan Teks

Cara termudah: **siapkan file baru dengan nama yang sama persis, lalu timpa file lamanya.** Tidak perlu mengubah kode dan tidak perlu build ulang.

Saat ini beberapa foto masih dummy, dan foto mempelai masih foto kucing. Semuanya tercantum di bawah.

---

## 1. Daftar foto

Semua file ada di folder [`assets/images/`](../assets/images).

| File | Dipakai di | Ukuran ideal | Status |
| --- | --- | --- | --- |
| `bg.webp` | Layar pembuka & bagian atas | 1000 × 1000 px (persegi) | Sudah foto Anda |
| `cewe.webp` | Foto Asha | 800 × 800 px (persegi) | **Dummy: ganti** |
| `cowo.webp` | Foto Yusnar | 800 × 800 px (persegi) | **Dummy: ganti** |
| `gallery-1.webp` … `gallery-6.webp` | Galeri (2 carousel, masing-masing 3 foto) | 1280 × 720 px (landscape) | **Dummy: ganti** |
| `slide-1.webp` … `slide-3.webp` | Latar kiri tampilan laptop/desktop | 1280 × 960 px | **Dummy: ganti** |
| `og-image.jpg` | Gambar preview saat link dibagikan di WhatsApp | 1200 × 630 px, di bawah 300 KB | Sudah foto Anda |
| `donate.png` | QRIS di Love Gift | Persegi | **Pastikan QRIS benar** |
| `icon-192x192.png` | Ikon tab browser & loading | 192 × 192 px | Monogram A&Y |
| `placeholder.webp` | Tampilan sementara saat foto dimuat | — | Biarkan |

> Foto galeri otomatis dipotong rasio 16:9, dan foto mempelai dipotong bulat dari bagian tengah. Letakkan wajah di tengah foto.

### Cara mengubah foto ke WebP dan mengecilkannya

1. Buka [squoosh.app](https://squoosh.app) (gratis, foto tidak diunggah ke server).
2. Seret foto ke halaman tersebut.
3. Di panel kanan, aktifkan **Resize**, lalu isi lebar sesuai tabel di atas.
4. Pada **Compress**, pilih **WebP**, kualitas sekitar **75**.
5. Klik **Download**, ganti namanya sesuai tabel, lalu timpa file lama.

Usahakan tiap foto di bawah **200 KB** agar tamu dengan sinyal lemah tetap nyaman. Untuk `og-image.jpg`, pilih format **MozJPEG**.

### Ingin menambah atau mengurangi foto galeri?

Buka [`index.html`](../index.html), cari `gallery-1.webp`. Setiap foto berada di dalam satu blok:

```html
<div class="carousel-item">
    <img src="./assets/images/placeholder.webp"
        data-src="./assets/images/gallery-7.webp" alt="image 7"
        class="d-block img-fluid cursor-pointer"
        onclick="undangan.guest.modal(this)">
</div>
```

Salin atau hapus bloknya, lalu sesuaikan juga tombol titik di `carousel-indicators` tepat di atasnya agar jumlahnya sama.

---

## 2. Musik

Timpa [`assets/music/pure-love-304010.mp3`](../assets/music) dengan lagu Anda memakai nama yang sama.

Bila ingin memakai nama lain, ubah atribut `data-audio` pada tag `<body>` di `index.html`:

```html
<body data-audio="./assets/music/lagu-kami.mp3" ...>
```

- File saat ini 9,5 MB. Musik sudah di-stream sehingga tidak menunda pembukaan undangan, tetapi tetap memakai kuota tamu saat diputar. Disarankan dikompres ke **128 kbps (sekitar 3–4 MB)** dengan alat seperti [Audacity](https://www.audacityteam.org).
- Tidak ingin musik? Hapus atribut `data-audio`.
- Bila mengganti lagu, ubah atau hapus juga tautan `music` di bagian footer `index.html`.
- Gunakan lagu yang memang boleh dipakai agar aman dari klaim hak cipta.

## 3. Video

Timpa [`assets/video/265501_tiny.mp4`](../assets/video). Video saat ini masih dummy (anak bebek).

- Format **MP4 (H.264)**, rasio **16:9**, disarankan di bawah **10 MB**.
- Bila memakai nama lain, ubah `data-src` pada elemen `id="video-love-story"` di `index.html`.
- Tidak ingin video? Hapus seluruh elemen `<div id="video-love-story" ...></div>`.

---

## 4. Teks dan data acara

Semua teks ada di [`index.html`](../index.html). Gunakan **Ctrl + F** di VS Code untuk mencari teks berikut:

| Yang diubah | Cari teks ini |
| --- | --- |
| Nama panggilan pasangan | `Asha &amp; Yusnar` |
| Nama lengkap & orang tua | `Asha Riska Amalia`, `Yusnar Setiyadi`, `Heri Junaedi`, `Bambang Sutejo` |
| Tanggal yang tertulis | `17 September 2027` |
| Jam akad & resepsi | `Pukul 09.00 WIB`, `Pukul 13.00 WIB` |
| Alamat acara | `id="venue-address"` |
| Link Google Maps | `maps.app.goo.gl` |
| Kisah cinta | `Jarak, Bimbingan` |
| Rekening | `1570007632822` (ubah **di dua tempat**, termasuk `data-copy`) |

### Data yang masih perlu dicek

> [!WARNING]
> Data berikut berasal dari template lama dan **harus diganti atau dihapus sebelum undangan disebar**:
>
> - **Love Gift → Gift, nomor telepon:** `0812345678` (ubah di dua tempat)
> - **Love Gift → Gift, alamat kirim hadiah:** `RT 10 RW 02, Desa Pajerukan...` (ubah di dua tempat)
>
> Bila tidak menerima kiriman hadiah, hapus seluruh kartu "Gift" di `index.html`.

### Tanggal untuk hitung mundur & Google Calendar

Keduanya diatur pada tag `<body>`:

```html
<body data-time="2027-09-17T09:00:00+07:00" data-time-end="2027-09-17T16:00:00+07:00" ...>
```

- `data-time`: waktu mulai acara, dipakai hitung mundur dan kalender.
- `data-time-end`: waktu selesai di kalender. **Saat ini 16.00 WIB hanya perkiraan**, silakan sesuaikan.
- `+07:00` berarti WIB. Gunakan `+08:00` untuk WITA dan `+09:00` untuk WIT.

---

## 5. Warna tema

Semua warna ada di bagian paling atas [`css/common.css`](../css/common.css):

| Variabel | Warna | Dipakai untuk |
| --- | --- | --- |
| `--color-blush` | `#FFF5F7` | Latar bagian selang-seling |
| `--color-soft-pink` | `#F9D5DE` | Latar lembut & bingkai foto |
| `--color-rose` | `#EFA9BC` | Garis tombol & hiasan hati |
| `--color-primary` | `#B04F71` | Tombol utama |
| `--color-mauve` | `#A04E6C` | Judul berhuruf sambung |
| `--color-text-main` | `#5A3D48` | Teks utama |
| `--color-champagne` | `#D9B382` | Lingkaran tipis keemasan pada foto |
| `--color-sage` | `#527D67` | Tanda "Datang" |

Warna-warna ini mengacu pada `color_pallete.jpeg` milik Anda. Bila mengganti warna tombol atau teks, pilih yang cukup gelap agar mudah dibaca. Bila mengubah warna `--color-primary`, ubah juga nilai `--color-primary-rgb` di bawahnya.

---

## 6. Preview link di WhatsApp

Agar foto muncul saat link dibagikan, WhatsApp membutuhkan alamat lengkap. Setelah punya domain, buka `index.html` dan ubah:

```html
<!-- Sebelum -->
<meta property="og:image" content="./assets/images/og-image.jpg">

<!-- Sesudah (contoh) -->
<meta property="og:image" content="https://undangan-anda.netlify.app/assets/images/og-image.jpg">
```

---

## 7. Link khusus per tamu

Tambahkan `?to=` di belakang alamat undangan, dan nama tamu akan tampil di layar pembuka serta terisi otomatis di form ucapan:

```text
https://undangan-anda.netlify.app/?to=Bapak Budi dan Keluarga
```

WhatsApp mungkin memotong link pada spasi. Ganti spasi dengan `%20`:

```text
https://undangan-anda.netlify.app/?to=Bapak%20Budi%20dan%20Keluarga
```

---

## 8. Melihat hasil dan menerbitkan

```bash
npm install      # hanya perlu sekali
npm run dev      # buka http://localhost:8080
```

Bila foto lama masih muncul, tekan **Ctrl + Shift + R** untuk memuat ulang tanpa cache.

Untuk diunggah manual, jalankan perintah berikut, lalu unggah **isi folder `public`** ke hosting:

```bash
npm run build:public
```

Bila repository sudah tersambung ke Netlify lewat GitHub Actions, cukup push ke branch `master`. Pipeline akan otomatis melakukan build dan deploy.
