# Jam peak dan off-peak DeepSeek — hari kerja menurut waktu Beijing, bukan UTC

[English](./README.md) · [中文](./README_CN.md) · [Español](./README_ES.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Tiếng Việt](./README_VI.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md) · [Русский](./README_RU.md) · **Bahasa Indonesia**

Peak adalah **Senin sampai Jumat, 09:00–12:00 dan 14:00–18:00 waktu Beijing** — yaitu `01:00-04:00` dan `06:00-10:00` UTC — dan selebihnya off-peak dengan harga separuh. Sejak 2026-08-23 seluruh akhir pekan off-peak, dan akhir pekan itu dibatasi dalam waktu Beijing: berjalan **dari Jumat 16:00 UTC sampai Minggu 16:00 UTC**, bukan tengah malam ke tengah malam UTC. Repositori ini adalah tabel uji bertanggal yang mengunci batas-batas itu, ditambah implementasi rujukan sekitar tiga puluh baris.

## Harga (USD per juta token, off-peak / peak)

| Model | Masukan, cache kena | Masukan, cache meleset | Keluaran |
| --- | ---: | ---: | ---: |
| `deepseek-v4-flash` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-flash-vision-exp` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-pro` | 0.022 / 0.044 | 0.66 / 1.32 | 1.98 / 3.96 |

Dibaca 2026-08-23 di <https://api-docs.deepseek.com/quick_start/pricing/>. Harga berubah; halaman penyedia yang menentukan.

## Apa yang tertulis di dua versi halaman penyedia

> **EN** — Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).

> **ZH** — 空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）。

Kedua kutipan dibiarkan dalam bahasa aslinya: itu bukti, dan begitu diterjemahkan ia bukan kutipan lagi. Jamnya cocok — 09:00–12:00 dan 14:00–18:00 waktu Beijing *memang* 01:00–04:00 dan 06:00–10:00 UTC. Kalendernya tidak. Kalimat Mandarin menaruh hari kerja dalam waktu Beijing (北京时间周一至周五); kalimat Inggris menempelkan `UTC` pada jam dan membiarkan «Monday through Friday» menggantung, sehingga terbaca sebagai hari kerja UTC. Kedua pembacaan hanya berbeda pada 16:00–24:00 UTC hari Jumat dan Minggu: enam belas jam seminggu. Repositori ini mengikuti rumusan Mandarin.

## Tiga cara salah, dan yang ketiga tak terlihat

**1. Berlaku surut.** Fungsi harga dipanggil dengan stempel waktu masa lalu — pemutaran ulang buku besar, penghitungan ulang pemakaian, dasbor biaya atas permintaan lama. Diskon akhir pekan tanpa syarat diam-diam memangkas separuh setiap tagihan akhir pekan sebelum aturan berlaku. Diskon harus digantungkan pada saat berlakunya, dan untuk hitung mundur syaratnya dikenakan pada saat *yang sedang diuji*, bukan pada «sekarang».

**2. Hitung mundur mendarat di dalam akhir pekan.** Di dalam akhir pekan, kedua sisi setiap tepi jendela sama-sama off-peak, jadi hitung mundur yang berhenti di tepi berikutnya mencapai nol tanpa ada yang berubah. Dari Jumat 18:30 waktu Beijing, perubahan nyata berikutnya adalah Senin 09:00 — sekitar 63 jam, cukup panjang untuk membuat sebagian teks antarmuka meluber.

**3. Hari dibaca dari kalender yang salah — dan tak ada uji terhadap jadwal yang berlaku yang bisa menangkapnya.** Akhir pekan Beijing berjalan **dari Jumat 16:00 UTC sampai Minggu 16:00 UTC**. Kedua kalender hanya berbeda pada 16:00–24:00 UTC, sementara kedua jendela peak DeepSeek berada di luar rentang itu. Jadi implementasi yang membaca hari dari saat yang belum digeser akan lolos setiap vektor yang bisa Anda tulis terhadap jendela resmi, lalu mulai berbohong pada hari penyedia menggeser satu jendela melewati 16:00 UTC.

## Dua saat yang mengunci sumbu kalender

`2026-08-28T16:30:00Z` dan `2026-08-30T16:30:00Z`. Tabelnya juga memuat satu jadwal yang **ditandai jelas sebagai sintetis**, dengan jendela peak menutupi 16:00–22:00 UTC. Itu bukan jadwal penyedia yang nyata dan tidak disodorkan sebagai itu — hanya itulah cara mengunci sumbu kalender. Sekalian: kalau kode harga Anda tidak diparameterkan oleh jadwal, sumbu ini sama sekali tak bisa diuji, dan itu saja sudah layak diketahui.

## Cara memakainya

Silakan porting `phase_at` — tiga puluh baris yang membosankan, dan jadwalnya cuma data — atau abaikan sama sekali bagian Python-nya dan tempelkan larik `vectors` ke apa pun yang proyek Anda pakai untuk uji berbasis tabel. Tiap entri berisi satu saat UTC, jam dinding Beijing yang bersesuaian, fase yang diharapkan, dan satu baris tentang apa yang dibedakannya.

```
python3 check_vectors.py     # 18/18 passed
```

## Di tempat lain

- Aturan yang sama dalam prosa, dua versi catatan kaki penyedia berdampingan, dan setiap tarif dibaca ulang tiap hari: <https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html>
- Kalkulator yang menerapkan aturan ini pada tagihan sungguhan — pilih model, isi komposisi token, dan ia memberi tahu Anda ada di sisi mana daftar tarif saat ini dan berapa nilainya kalau menunggu: <https://xyzs996.github.io/llm-cost-calculator/>
- README bahasa Inggris lengkap (vektor satu per satu, tabel uji mutasi, dan sampel 19 implementasi): <https://github.com/xyzs996/deepseek-peak-hours/blob/main/README.md>
