# Portal Akademik SD Islam Al-Barkah — aset ikon PWA

Paket ini memperbarui aset ikon PWA menggunakan logo yang diberikan untuk SD Islam Al-Barkah.

## Isi
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `public/icons/apple-touch-icon.png`
- `app/manifest.ts`
- `app/layout.tsx`

## Cara menerapkan dengan aman
1. Cadangkan proyek portal yang saat ini berjalan.
2. Salin file di dalam paket ke proyek Next.js dengan struktur folder yang sama.
3. Periksa `app/layout.tsx` dan `app/manifest.ts` bila proyek memiliki konfigurasi metadata sendiri; jangan menimpa konfigurasi yang lebih baru tanpa membandingkannya.
4. Jalankan build dan uji di deployment preview terlebih dahulu.
5. Setelah ikon ter-deploy, hapus lalu pasang ulang shortcut/aplikasi di HP untuk memperbarui ikon yang mungkin tersimpan di cache.

**Penting:** ini adalah paket aset dan konfigurasi PWA, bukan file APK Android atau aplikasi iOS yang sudah dibuild. Portal yang sedang berjalan tidak diubah oleh paket ini. Untuk APK dan iOS, proyek lengkap perlu disiapkan dan dibuild terpisah.
