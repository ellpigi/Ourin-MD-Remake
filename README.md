# Ourin Remake Baileys 2.0.1

Satu runtime untuk CommonJS dan ESM. Tidak memerlukan build atau folder vendor.
Kredit dan lisensi sumber tetap disertakan dalam `LICENSES.txt`.

## Perbaikan versi ini

- `sendMessage` menerima `{ location }` dan payload protobuf `{ locationMessage }`.
- `{ location, buttons, caption }` mempertahankan lokasi, teks, dan tombol.
- Payload mentah yang ada dalam schema, termasuk `buttonsMessage`, `listMessage`,
  `templateMessage`, `interactiveMessage`, media, dan pembungkus pesan, dapat
  melewati generator tanpa keliru dianggap sebagai upload media.
- Header lokasi dinormalisasi, termasuk thumbnail base64, enum header, dan
  jenis tombol native flow. Koordinat nol tetap sah; koordinat tidak valid ditolak.
- Quote, mention, dan contextInfo ditempatkan pada pesan di dalam pembungkus.
  Pemrosesan tidak mengubah objek pesan atau kutipan milik pemanggil.
- Pesan protobuf untuk edit/hapus, polling, dan event mempertahankan atribut
  atau node tambahan pada alur `sendMessage`.
- Metadata video bulat/PTV dipertahankan. Album berupa array dan header album
  dibedakan dengan benar.
- Constructor cache dan antrean diperbaiki langsung di runtime untuk mengatasi
  `import_node_cache.default is not a constructor` dan masalah serupa pada
  `p-queue`. Tidak perlu patch runtime dari bot.
- Kegagalan transport, seluruh enkripsi gagal, atau tidak ditemukannya perangkat
  tujuan menghasilkan error; pengiriman tidak dilaporkan berhasil secara palsu.

## Upload dan pasang

Gunakan Node.js **>=22.12.0**. Pengujian dilakukan di Node.js 24.19.0 pada Linux.
Ekstrak ZIP dan unggah **isi foldernya** ke root repository:

https://github.com/ellpigi/Ourin-MD-Remake

`package.json` dan `index.cjs` harus langsung terlihat di root repository.
Mengunggah satu ZIP tanpa mengekstraknya tidak menjadikannya paket npm.

Untuk bot yang mengimpor `ourin`, gunakan dependency berikut di package.json bot:

```json
"ourin": "https://codeload.github.com/ellpigi/Ourin-MD-Remake/tar.gz/refs/heads/main"
```

Pertahankan nama key sesuai kode bot. Jika kode mengimpor `baileys`, gunakan
key `baileys` dengan URL yang sama. Pertahankan dependency bot lainnya.
URL mengikuti branch `main`; sesudah upload berhasil, URL dapat dipatok ke
commit hasil upload agar instalasi dapat diulang secara konsisten.

Jalankan dari folder bot:

```bash
npm install
npm start
```

Pada npm 12 yang memblokir arsip remote secara default, gunakan:

```bash
npm install --allow-remote=root --allow-git=none
```

Jika lockfile bot masih menunjuk versi lama, perbarui dependency dan lockfile
melalui instalasi, lalu upload keduanya. Restart bot atau `npm ci` dengan
lockfile lama tidak memperbarui Baileys. Jangan hapus folder sesi.

## Pengiriman lokasi

```js
const { default: makeWASocket, proto } = require('ourin')
// sock adalah socket yang sudah tersambung dan terautentikasi.
const location = {
  degreesLatitude: -6.2088,
  degreesLongitude: 106.8456,
  name: 'Jakarta',
  address: 'Indonesia'
}

await sock.sendMessage(jid, { location })
await sock.sendMessage(jid, { locationMessage: location })
await sock.sendMessage(jid, {
  location,
  caption: 'Lokasi kami',
  buttons: [{
    buttonId: '.menu',
    buttonText: { displayText: 'Menu' },
    type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
  }]
})
```

`relayMessage(jid, protobufMessage, options)` tetap tersedia. Untuk quote,
isi opsi ketiga `sendMessage`: `{ quoted: pesan }`. `liveLocation` atau
`liveLocationMessage` membentuk satu payload; pembaruan berkala dan pelacakan
perangkat tidak otomatis dibuat. Media mentah yang sudah diunggah harus
membawa URL/directPath, key, hash, dan metadata yang benar. Gunakan `{ image }`,
`{ video }`, `{ audio }`, `{ sticker }`, atau `{ document, mimetype }` agar
library menyiapkan uploadnya.

Paket hanya dapat menyerialisasi field yang tersedia dalam schemanya.
Payload baru yang belum ada dalam schema, data rusak, pembatasan server,
atau tipe pesan yang tidak didukung penerima tidak otomatis menjadi kompatibel.

## API dan contoh bot

```js
import makeWASocket, { proto, WaClient, createStore } from 'ourin'
```

CommonJS dan ESM memakai objek runtime yang sama. `WaClient` adalah API client
berbeda dengan konfigurasi dan event tersendiri; tidak otomatis berbagi sesi
atau kontrak payload dengan `makeWASocket`. Nama yang bertabrakan tersedia
sebagai `clientProto`, `downloadClientMediaMessage`, `getClientContentType`,
`fetchClientWaWebVersion`, `writeClientRandomPadMax16`, dan `clientDelay`.

Ini library dengan contoh bot sederhana, bukan seluruh project bot dan
plugin store. Untuk menjalankan contoh:

```bash
npm ci
npm run check
npm start
```

Masukkan nomor pairing pada terminal atau isi environment `WA_NUMBER`
misalnya `6281234567890`. Enter tanpa nomor menggunakan QR. Contoh membalas
`.ping` dan `.menu` serta menyimpan sesi di `sessions/basic`.

## Hasil pengujian

**102 tes otomatis lulus, 0 gagal.** Instalasi `npm ci` bersih berhasil.
Pemeriksaan syntax dan TypeScript strict NodeNext untuk CommonJS dan ESM
juga lulus. Tes dijalankan di luar paket; ZIP berisi 10 file tanpa `.npmrc`,
folder test, node_modules, atau sesi autentikasi.

| Pemeriksaan | Cakupan |
| --- | --- |
| Alur kirim | Generator asli, fan-out beberapa perangkat, salinan perangkat sendiri, stanza dan binary encode/decode. Transport serta repositori Signal pengganti digunakan untuk mengisolasi uji alur. |
| Variasi pesan | Lokasi biasa/mentah/langsung, tombol lokasi/teks/media, daftar, template, native flow, carousel, kontak, reaction, edit/hapus/pin, polling, event, forward, album, pembungkus dan quote/mention. |
| Media nyata | Fixture PNG, WebP, WAV, MP4, dokumen: upload terisolasi, AES-CBC, HMAC, hash SHA-256, serta dekripsi yang menghasilkan byte file awal. |
| Signal nyata | Enkripsi/dekripsi pribadi memakai pasangan akun sementara di memori; enkripsi/dekripsi grup dengan distribusi sender key. Payload lokasi dan tombol lokasi dipertahankan. |
| Startup nyata | Constructor publik `makeWASocket` membuka WebSocket lokal; cache dan antrean transaksi/pre-key dijalankan. |
| Error | Input tidak valid, koordinat salah, payload kosong, transport gagal, enkripsi gagal, dan perangkat tujuan tidak ditemukan. |
| Kontrak API | Regresi ekspor CommonJS/ESM, protobuf, binary node, penyimpanan auth sementara, AES-GCM, formatter dan helper lain. |

Tes tidak memakai akun WhatsApp pengguna atau mengirim ke server WhatsApp.
Pairing, penerimaan di HP, dukungan tombol lokasi oleh versi WhatsApp tertentu,
dan fitur eksperimental newsletter/status belum diverifikasi langsung.
`sendMessage` yang selesai menunjukkan alur pengiriman lokal selesai;
status delivered/read tetap harus dilihat dari receipt. Tidak ada jaminan
semua tipe pesan dan seluruh kondisi server bebas error.

Helper atribusi newsletter-status tetap eksperimental: root `contextInfo`
bukan field Message dan tidak diserialisasi sebagai konteks pesan.
