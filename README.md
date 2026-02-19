
# FinRealize - Sistem Informasi Realisasi Keuangan (Cloud Ready)

Aplikasi manajemen anggaran dan realisasi keuangan yang mendukung impor data dari Excel, visualisasi data interaktif, dan analisis cerdas menggunakan Gemini AI.

## Fitur Utama
- **Dashboard**: Ringkasan anggaran, realisasi, dan sisa anggaran secara real-time.
- **Data Master**: Impor anggaran SKPD via Excel.
- **Realisasi**: Pencatatan transaksi realisasi keuangan.
- **Laporan**: Cetak laporan per Program, Kegiatan, atau Sub Kegiatan ke Excel.
- **AI Insights**: Analisis otomatis performa keuangan menggunakan Google Gemini 3 Flash.
- **Cloud Ready**: Sudah dilengkapi dengan API Service untuk dihubungkan ke database eksternal (Supabase/Firebase).

## Teknologi
- **Frontend**: React (TSX), Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Excel Processing**: SheetJS (XLSX)
- **AI**: Google Generative AI (Gemini API)

## Cara Menjalankan
1. Pastikan Anda memiliki Node.js terinstall.
2. Clone repositori ini.
3. Jalankan `npm install` atau `yarn install`.
4. Tambahkan `API_KEY` Gemini Anda di environment variable.
5. Jalankan `npm run dev` atau `npm start`.

## Struktur Folder
- `/pages`: Halaman utama aplikasi.
- `/services`: Logika API, Data, dan AI.
- `types.ts`: Definisi struktur data (TypeScript).
