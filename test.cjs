'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const api = require('./index.cjs')

test('one CommonJS entry exposes the existing bot contract', () => {
    for (const name of ['default', 'makeWASocket', 'useMultiFileAuthState', 'makeCacheableSignalKeyStore', 'fetchLatestBaileysVersion', 'downloadContentFromMessage', 'downloadMediaMessage', 'getContentType', 'jidDecode', 'areJidsSameUser', 'generateWAMessage', 'generateWAMessageFromContent']) {
        assert.equal(typeof api[name], 'function', name)
    }
    assert.equal(api.default, api.makeWASocket)
    assert.equal(api.DisconnectReason.loggedOut, 401)
})

test('the same entry includes the client, store, link and formatter APIs', () => {
    for (const name of ['WaClient', 'createStore', 'WaAuthMemoryStore', 'defineWaClientPlugin', 'classifyStatusMedia', 'listStatuses', 'parseCallLogRecord', 'createAdminAllowList', 'evaluateGroupLink', 'createFormatter']) {
        assert.equal(typeof api[name], 'function', name)
    }
})

test('ESM shares the CommonJS implementation and protobuf objects', async () => {
    const esm = await import('./index.mjs')
    assert.equal(esm.default, api.default)
    assert.equal(esm.WaClient, api.WaClient)
    assert.equal(esm.proto, api.proto)
    assert.equal(esm.clientProto, api.clientProto)
})

test('package exposes a single public API path', () => {
    const pkg = require('./package.json')
    assert.deepEqual(Object.keys(pkg.exports), ['.', './package.json'])
    assert.equal(pkg.main, './index.cjs')
})

test('socket protobuf retains text and quoted context', () => {
    const value = { extendedTextMessage: { text: 'Ourin', contextInfo: { stanzaId: 'quote-id', participant: '123@s.whatsapp.net' } } }
    const result = api.proto.Message.decode(api.proto.Message.encode(value).finish())
    assert.equal(result.extendedTextMessage.text, 'Ourin')
    assert.equal(result.extendedTextMessage.contextInfo.stanzaId, 'quote-id')
})

test('native client protobuf is available without replacing socket protobuf', () => {
    assert.notEqual(api.clientProto, api.proto)
    const result = api.clientProto.Message.decode(api.clientProto.Message.encode({ conversation: 'hello' }).finish())
    assert.equal(result.conversation, 'hello')
})

test('different media and content APIs retain distinct names', () => {
    assert.equal(typeof api.downloadClientMediaMessage, 'function')
    assert.equal(typeof api.getClientContentType, 'function')
    assert.equal(typeof api.fetchClientWaWebVersion, 'function')
    assert.equal(typeof api.writeClientRandomPadMax16, 'function')
    assert.notEqual(api.downloadClientMediaMessage, api.downloadMediaMessage)
})

test('binary node encoding and decoding preserve a message stanza', async () => {
    const node = { tag: 'message', attrs: { id: 'fixture', to: '123@s.whatsapp.net' }, content: [{ tag: 'body', attrs: {}, content: Buffer.from('test') }] }
    const decoded = await api.decodeBinaryNode(await api.encodeBinaryNode(node))
    assert.equal(decoded.tag, node.tag)
    assert.equal(decoded.attrs.to, node.attrs.to)
    assert.equal(Buffer.from(decoded.content[0].content).toString(), 'test')
})

test('multi-file authentication persists credentials and key buffers', async () => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ourin-test-'))
    try {
        const { state, saveCreds } = await api.useMultiFileAuthState(folder)
        state.creds.registered = true
        await state.keys.set({ session: { fixture: Buffer.from([1, 2, 3]) } })
        await saveCreds()
        const restored = await api.useMultiFileAuthState(folder)
        assert.equal(restored.state.creds.registered, true)
        assert.deepEqual(restored.state.creds.noiseKey.private, state.creds.noiseKey.private)
        assert.deepEqual((await restored.state.keys.get('session', ['fixture'])).fixture, Buffer.from([1, 2, 3]))
    } finally { await fs.rm(folder, { recursive: true, force: true }) }
})

test('AES-GCM round trip rejects a modified ciphertext', () => {
    const plain = Buffer.from('ourin fixture'), key = Buffer.alloc(32, 7), iv = Buffer.alloc(12, 1), aad = Buffer.from('test')
    const encrypted = api.aesEncryptGCM(plain, key, iv, aad)
    assert.deepEqual(api.aesDecryptGCM(encrypted, key, iv, aad), plain)
    encrypted[0] ^= 1
    assert.throws(() => api.aesDecryptGCM(encrypted, key, iv, aad))
})

test('link and text helpers work from the unified API', () => {
    assert.equal(api.findFirstLink('https://chat.whatsapp.com/ABC123').kind, 'whatsapp_group_invite')
    assert.equal(api.findFirstLink('no link'), null)
    assert.equal(api.getMessageText({ imageMessage: { caption: 'caption' } }), 'caption')
})

test('group link decisions delegate deletion through the caller', async () => {
    const calls = []
    const result = await api.evaluateGroupLink({
        key: { isGroup: true, remoteJid: '123@g.us', participant: '456@s.whatsapp.net', id: 'test', fromMe: false },
        message: { conversation: 'https://example.com/test' }
    }, {
        isAllowedSender: async () => false,
        deleteMessage: async (...args) => { calls.push(args); return true }
    })
    assert.equal(result.action, 'deleted')
    assert.deepEqual(calls, [['123@g.us', 'test', '456@s.whatsapp.net']])
})

test('status media classification remains available', () => {
    assert.equal(api.classifyStatusMedia({ imageMessage: {} }), api.WA_STATUS_MEDIA_KINDS.IMAGE)
    assert.equal(api.classifyStatusMedia({ conversation: 'text' }), null)
})

test('formatter creates independent configurations', () => {
    const first = api.createFormatter({ bot: { name: 'First Bot' } })
    const second = api.createFormatter({ bot: { name: 'Second Bot' } })
    assert.ok(first.createBotInfo({}).includes('First Bot'))
    assert.ok(second.createBotInfo({}).includes('Second Bot'))
    assert.ok(!first.createBotInfo({}).includes('Second Bot'))
    assert.equal(first.capitalize('hello world'), 'Hello World')
})

test('bot validates numbers without opening a connection on import', () => {
    const { normalizePhone } = require('./bot.cjs')
    assert.equal(normalizePhone('081234567890'), '6281234567890')
    assert.equal(normalizePhone('+62 812-3456-7890'), '6281234567890')
    assert.throws(() => normalizePhone('invalid'))
})
