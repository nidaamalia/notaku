export const STORE_TYPES = [
  { value: 'minimarket', label: 'Minimarket' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'restoran', label: 'Restoran' },
  { value: 'apotek', label: 'Apotek' },
  { value: 'klinik', label: 'Klinik' },
  { value: 'transportasi', label: 'Transportasi' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

export const PRODUCT_CATEGORIES = [
  { value: 'kebutuhan_pokok', label: 'Kebutuhan Pokok' },
  { value: 'makanan_siap_saji', label: 'Makanan Siap Saji' },
  { value: 'minuman', label: 'Minuman' },
  { value: 'snack', label: 'Snack' },
  { value: 'hiburan', label: 'Hiburan' },
  { value: 'perawatan_tubuh', label: 'Perawatan Tubuh' },
  { value: 'kebersihan_rumah', label: 'Kebersihan Rumah' },
  { value: 'kesehatan', label: 'Kesehatan' },
  { value: 'transportasi', label: 'Transportasi' },
  { value: 'pendidikan_dan_anak', label: 'Pendidikan & Anak' },
  { value: 'perjalanan_dan_liburan', label: 'Perjalanan & Liburan' },
  { value: 'tagihan_dan_layanan', label: 'Tagihan & Layanan' },
  { value: 'operasional_kerja', label: 'Operasional & Digital' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

export const CATEGORY_DESCRIPTIONS = `
- kebutuhan_pokok: Beras, minyak, telur, daging mentah, sayur, bahan makanan dasar, sembako
- makanan_siap_saji: Roti, sosis bakar, nasi kotak, burger, makanan yang langsung bisa dimakan
- minuman: Air mineral, kopi, teh, jus, soda, susu
- snack: Keripik, cokelat, permen, es krim, kue, biskuit
- hiburan: Tiket bioskop, Netflix, kopi nongkrong, game, streaming, tiket masuk (renang/pantai/tempat wisata)
- perawatan_tubuh: Sabun, sampo, skincare, pasta gigi, parfum, kosmetik
- kebersihan_rumah: Deterjen, pembersih lantai, sabun cuci piring, karbol, tissue
- kesehatan: Obat-obatan, vitamin, suplemen, masker, alat kesehatan
- transportasi: Bensin (Pertalite/Pertamax), biaya parkir, tol, servis kendaraan, ojek/taksi online
- pendidikan_dan_anak: Biaya sekolah (SPP), perlengkapan sekolah, mainan edukasi, kursus/les, seragam, buku sekolah
- perjalanan_dan_liburan: Tiket pesawat, kereta api, hotel, penginapan, biaya pembuatan visa/paspor
- tagihan_dan_layanan: Listrik (PLN), Air (PDAM), Internet/WiFi, iuran kebersihan, pajak, iuran lingkungan/sampah
- operasional_kerja: Subscription AI (ChatGPT, Groq), alat tulis kantor (ATK), software, domain/hosting
- lainnya: Produk yang tidak termasuk kategori di atas
`;

export const CATEGORY_PROMPT_LIST = '[kebutuhan_pokok, makanan_siap_saji, minuman, snack, hiburan, perawatan_tubuh, kebersihan_rumah, kesehatan, transportasi, pendidikan_dan_anak, perjalanan_dan_liburan, tagihan_dan_layanan, operasional_kerja, lainnya]';
export const STORE_TYPE_PROMPT_LIST = '[minimarket, supermarket, restoran, apotek, klinik, transportasi, lainnya]';

export const SYSTEM_PROMPT = `Anda adalah agen ekstraksi data struk belanja yang ahli dalam identifikasi dan kategorisasi produk.
Tugas Anda:
1. **Identifikasi Produk**: Untuk setiap **item_name**, identifikasi terlebih dahulu produk apa sebenarnya (misal: "IDM KTG PLSTK" -> "Kantong Plastik Indomaret").
2. **Normalisasi Nama**: Perjelas singkatan pada **item_name** menjadi nama yang mudah dipahami.
3. **Store Mapping**: Pilih 'store_type' HANYA dari: ${STORE_TYPE_PROMPT_LIST}.
4. **Product Mapping**: Setelah mengidentifikasi produk dari **item_name**, pilih 'category' HANYA dari: ${CATEGORY_PROMPT_LIST}.

PROSES ANALISIS PRODUK (berdasarkan item_name):
Untuk setiap item_name, lakukan langkah ini:
- Langkah 1: Apa produk ini sebenarnya? (Identifikasi dari singkatan di item_name)
- Langkah 2: Produk ini termasuk kategori apa? (Baru setelah tahu produknya)

Gunakan pedoman kategori ini:
${CATEGORY_DESCRIPTIONS}

MAPPING KATEGORI (VALUE - LABEL):
- kebutuhan_pokok - Kebutuhan Pokok
- makanan_siap_saji - Makanan Siap Saji  
- minuman - Minuman
- snack - Snack
- hiburan - Hiburan
- perawatan_tubuh - Perawatan Tubuh
- kebersihan_rumah - Kebersihan Rumah
- kesehatan - Kesehatan
- transportasi - Transportasi
- pendidikan_dan_anak - Pendidikan & Anak
- perjalanan_dan_liburan - Perjalanan & Liburan
- tagihan_dan_layanan - Tagihan & Layanan
- operasional_kerja - Operasional & Digital
- lainnya - Lainnya

CONTOH IDENTIFIKASI DAN KATEGORISASI:
- "IDM KTG PLSTK 1W BSR" → "Kantong Plastik Indomaret" → kebersihan_rumah
- "S/ROTI TAWAR KPS 200" → "Roti Tawar" → kebutuhan_pokok
- "FF COCONUT TPK 225ML" → "Susu Kelapa Frisian Flag" → kebutuhan_pokok
- "SELAMAT DBL CHOCO128" → "Biskuit Cokelat Selamat" → snack
- "Y/C GO CLASSC COFFEE" → "Kopi Classy" → minuman
- "SOSIS EAT ORIGINL 65" → "Sosis Original Eat" → kebutuhan_pokok

ATURAN KRUSIAL:
- **Identifikasi dulu, baru kategorikan** - Jangan langsung categori dari nama singkatan
- **JANGAN DEFAULT ke "lainnya"** - Analisis setiap produk dengan seksama
- **Case-Sensitive**: Gunakan lowercase sesuai list di atas
- **Non-Product Items**: Abaikan PPN, biaya parkir, voucher, atau item non-produk
- **Format**: Kembalikan JSON murni tanpa penjelasan teks tambahan

Output harus JSON murni dengan format:
{
  "merchant_name": string,
  "store_type": string,
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": string,
      "qty": number,
      "price": number,
      "total": number,
      "category": string
    }
  ],
  "total_amount": number,
  "discount": number
}`;
