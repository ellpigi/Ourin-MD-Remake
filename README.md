# Ourin Remake Baileys 2

Paket ringkas dengan satu runtime, satu impor utama, dan deklarasi TypeScript
yang sudah digabung. Tidak memerlukan folder source tambahan atau proses build
saat dipasang. Kode basis client yang sama hanya dimasukkan sekali. Kredit dan
lisensi sumber tersedia dalam satu berkas `LICENSES.txt`.

## Upload dan pemasangan

Ekstrak ZIP lalu unggah semua file di dalam foldernya ke root repository:

https://github.com/ellpigi/Ourin-MD-Remake

Pastikan `package.json` dan `index.cjs` langsung terlihat di root. ZIP mentah
yang diunggah sebagai satu file tidak dapat digunakan sebagai dependency npm.

Di package.json bot, ganti nilai dependency yang digunakan kode bot:

```json
"baileys": "github:ellpigi/Ourin-MD-Remake"
```

Pertahankan nama key sesuai string import bot. Jika kode memakai
`require('ourin-baileys')`, gunakan key `ourin-baileys` dengan nilai GitHub yang
sama. Pertahankan semua dependency bot yang lain. Lalu jalankan di folder bot:

```bash
npm install
npm start
```

Gunakan Node.js >=22.12.0; pengujian lokal memakai Node.js 24.19.0 pada Linux.

## Satu impor

```js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  WaClient,
  createStore,
  findFirstLink,
  createFormatter
} = require('baileys')
```

```js
import makeWASocket, { WaClient, createFormatter } from 'baileys'
```

| API | Penggunaan |
| --- | --- |
| `makeWASocket`, auth, grup, media, interactive message | Kontrak socket Baileys untuk bot yang sudah ada. |
| `WaClient`, `createStore`, helper status, newsletter, media dan JID | API client lengkap melalui impor utama yang sama. |
| `findFirstLink`, `getMessageText`, `evaluateGroupLink`, `createAdminAllowList` | Helper pemeriksaan tautan dan keputusan moderasi. |
| `createFormatter(config)` | Formatter menu, informasi bot, tanggal, angka, uptime, dan pesan. |

`WaClient` dan `makeWASocket` memiliki model event, store, dan konfigurasi yang
berbeda. Tersedia dari satu impor tidak berarti socket otomatis mempunyai
semua method client, atau keduanya bisa memakai sesi autentikasi yang sama.

Untuk nama yang bertabrakan, API socket dipertahankan. Versi client memakai
nama `clientProto`, `downloadClientMediaMessage`, `getClientContentType`,
`fetchClientWaWebVersion`, `writeClientRandomPadMax16`, dan `clientDelay`.
Dengan demikian fungsi lama tidak diam-diam diganti oleh implementasi lain.

## Tes dan contoh bot

Untuk menjalankan tes paket dari hasil ekstrak:

```bash
npm ci
npm test
```

Untuk menjalankan contoh bot sederhana:

```bash
npm start
```

Masukkan nomor pairing pada terminal. Enter tanpa nomor memakai QR.
Untuk panel tanpa input terminal, atur environment variable `WA_NUMBER`
dengan nomor berkode negara, misalnya `6281234567890`. Masukkan kode melalui
WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon. Contoh membalas
`.ping` dan `.menu`, serta menyimpan sesi di `sessions/basic`.

Contoh ini tidak menyertakan seluruh aplikasi dan plugin bot. Bot yang sudah
kamu punya tetap dijalankan dari project bot tersebut dengan dependency baru.

## Batas verifikasi

Sebanyak 15 tes runtime paket lulus. Consumer TypeScript ESM dan CommonJS
lulus pemeriksaan strict NodeNext, termasuk setelah instalasi arsip sebagai
alias dependency dalam project terpisah. Pemeriksaan mencakup ekspor CJS/ESM,
format protobuf kedua API, binary
node, fixture penyimpanan auth, integritas AES-GCM, keputusan link, formatter,
serta validasi nomor. Deklarasi TypeScript digabung untuk consumer NodeNext.
Tes upstream yang relevan dari pekerjaan sebelumnya juga menjadi dasar
integrasi. Pengujian paket dijalankan tanpa akun atau pesan WhatsApp sungguhan.

Pairing live, seluruh fitur server WhatsApp, dan seluruh plugin bot pengguna
belum terverifikasi. Addon native optional tidak disertakan; client memakai
fallback JavaScript/Node crypto yang tersedia. Utilitas Rust/WASM yang
diperlukan runtime sudah dibundel.

Helper atribusi newsletter-status bawaan masih eksperimental: properti root
`contextInfo` tidak diserialisasi oleh schema Message yang disertakan. Tidak
ada klaim pengujian live untuk jalur itu. Riwayat sumber, checksum lampiran,
dan perubahan integrasi dicatat dalam `LICENSES.txt`.
