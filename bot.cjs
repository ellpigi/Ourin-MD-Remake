'use strict'

const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } = require('./index.cjs')
const pino = require('pino')
const qr = require('qrcode-terminal')
const readline = require('node:readline/promises')
const path = require('node:path')

function normalizePhone(value) {
    let number = String(value || '').replace(/[ +()-]/g, '')
    if (number.startsWith('0')) number = `62${number.slice(1)}`
    if (!/^[1-9]\d{7,14}$/.test(number)) {
        throw new Error('Nomor harus berupa kode negara + nomor, contoh 6281234567890.')
    }
    return number
}

async function main() {
    const logger = pino({ level: process.env.LOG_LEVEL || 'warn' })
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve('sessions/basic'))
    let stopping = false
    let current = null
    let retryTimer = null
    let attempts = 0

    function connect() {
        const socket = makeWASocket({
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
            logger,
            browser: ['Ubuntu', 'Chrome', '22.0.0'],
            syncFullHistory: false,
            markOnlineOnConnect: false
        })
        current = socket
        let pairingRequested = false
        socket.ev.on('creds.update', () => saveCreds().catch(error => logger.error({ err: error }, 'save credentials failed')))
        socket.ev.on('connection.update', update => {
            void (async () => {
                if (stopping || current !== socket) return
                if (update.qr && !state.creds.registered) {
                    if (process.env.WA_NUMBER) {
                        if (!pairingRequested) {
                            pairingRequested = true
                            const code = await socket.requestPairingCode(normalizePhone(process.env.WA_NUMBER))
                            console.log(`Kode pairing: ${code}`)
                        }
                    } else qr.generate(update.qr, { small: true })
                }
                if (update.connection === 'open') {
                    attempts = 0
                    console.log('Terhubung. Kirim .ping atau .menu dari nomor lain.')
                }
                if (update.connection === 'close') {
                    const code = update.lastDisconnect?.error?.output?.statusCode
                    if (code === DisconnectReason.loggedOut || code === DisconnectReason.connectionReplaced) {
                        console.log(`Koneksi berhenti (${code}). Periksa perangkat tertaut di WhatsApp.`)
                        stopping = true
                        return
                    }
                    if (++attempts > 10) {
                        stopping = true
                        console.error('10 kali reconnect gagal. Periksa koneksi lalu jalankan ulang.')
                        process.exitCode = 1
                        return
                    }
                    retryTimer = setTimeout(connect, Math.min(30_000, attempts * 3000))
                }
            })().catch(error => logger.error({ err: error }, 'connection event failed'))
        })
        socket.ev.on('messages.upsert', ({ messages, type }) => {
            if (type !== 'notify') return
            for (const message of messages) {
                if (message.key.fromMe || !message.key.remoteJid || message.key.remoteJid === 'status@broadcast') continue
                const text = message.message?.conversation || message.message?.extendedTextMessage?.text
                const reply = text === '.ping' ? 'Pong!' : text === '.menu' ? 'Ourin Remake\n.ping - cek bot\n.menu - menu' : null
                if (reply) {
                    socket.sendMessage(message.key.remoteJid, { text: reply }, { quoted: message })
                        .catch(error => logger.error({ err: error }, 'reply failed'))
                }
            }
        })
    }
    const stop = () => {
        stopping = true
        clearTimeout(retryTimer)
        current?.end(new Error('Stopped by user'))
        saveCreds().then(() => process.exit(0), () => process.exit(1))
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    if (!state.creds.registered && !process.env.WA_NUMBER && process.stdin.isTTY) {
        const input = readline.createInterface({ input: process.stdin, output: process.stdout })
        try {
            const answer = (await input.question('Nomor untuk pairing (Enter untuk QR): ')).trim()
            if (answer) process.env.WA_NUMBER = normalizePhone(answer)
        } finally { input.close() }
    }
    connect()
}
module.exports = { normalizePhone }
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
