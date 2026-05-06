const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")
const pino = require("pino")
const fs = require('fs')
const readline = require('readline')

// ====== BOT SETTINGS ======
let settings = {
    antilink: true,
    antiword: true,
    warnKick: 3,
    antiBanDelay: true,
    badwords: [
        "fuck", "shit", "pussy", "nude", "poes", "naai",
        "dls account for sale", "account for sale", "inbox for price", "am selling account", "buying account", "dm for price"
    ],
}

// ====== WARNINGS DATABASE ======
let warnings = {}
const warningsFile = './warnings.json'
const settingsFile = './settings.json'

if (fs.existsSync(settingsFile)) {
    settings = JSON.parse(fs.readFileSync(settingsFile))
}
if (fs.existsSync(warningsFile)) {
    warnings = JSON.parse(fs.readFileSync(warningsFile))
}

const saveSettings = () => fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2))
const saveWarnings = () => fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2))

// Clear warnings older than 24hrs
const clearOldWarnings = () => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    for (const key in warnings) {
        if (now - warnings[key].lastWarn > oneDay) delete warnings[key]
    }
    saveWarnings()
}
setInterval(clearOldWarnings, 60 * 60 * 1000)

// Random delay for anti-ban protection
const randomDelay = (min = 2000, max = 5000) => new Promise(resolve => 
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
)

// Question prompt for pairing code input
const question = (text) => new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(text, (answer) => {
        rl.close()
        resolve(answer)
    })
})

// ====== MAIN BOT FUNCTION ======
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        // ====== PAIRING CODE MODE ======
        if (qr) {
            console.log('\n📱 *PAIRING CODE MODE*\n')
            const pairingCode = await sock.requestPairingCode(await question('Enter your phone number (with country code, e.g., 1234567890): '))
            console.log(`\n✨ Your pairing code: ${pairingCode}\n`)
            console.log('📲 Enter this code in WhatsApp:\n1. Open WhatsApp on your phone\n2. Go to Settings > Devices > Link a device\n3. Select "Link with phone number"\n4. Enter the code above\n\n')
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode) !== DisconnectReason.loggedOut
            console.log('Connection closed due to:', lastDisconnect?.error, 'reconnecting:', shouldReconnect)
            if (shouldReconnect) {
                startBot()
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connected successfully!')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // ====== MESSAGE HANDLER ======
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        
        if (!msg.message) return
        if (msg.key.fromMe) return
        
        const sender = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const isGroup = sender.endsWith('@g.us')
        
        console.log(`[${new Date().toLocaleTimeString()}] ${sender}: ${text}`)

        // ====== ANTI-LINK FEATURE ======
        if (settings.antilink && isGroup) {
            if (/(https?:\/\/[^\s]+|www\.[^\s]+)/gi.test(text)) {
                if (!warnings[sender]) warnings[sender] = { count: 0, lastWarn: Date.now() }
                warnings[sender].count++
                warnings[sender].lastWarn = Date.now()
                
                await sock.sendMessage(sender, { text: `⚠️ Link detected! Warnings: ${warnings[sender].count}/${settings.warnKick}` })
                
                if (warnings[sender].count >= settings.warnKick) {
                    await sock.groupParticipantsUpdate(sender, [msg.key.participant], 'remove')
                    delete warnings[sender]
                    saveWarnings()
                }
                saveWarnings()
                return
            }
        }

        // ====== ANTI-BAD WORDS FEATURE ======
        if (settings.antiword && isGroup) {
            for (let word of settings.badwords) {
                if (text.toLowerCase().includes(word.toLowerCase())) {
                    if (!warnings[msg.key.participant]) warnings[msg.key.participant] = { count: 0, lastWarn: Date.now() }
                    warnings[msg.key.participant].count++
                    warnings[msg.key.participant].lastWarn = Date.now()
                    
                    await sock.sendMessage(sender, { text: `⚠️ Bad word detected! Warnings: ${warnings[msg.key.participant].count}/${settings.warnKick}` })
                    
                    if (warnings[msg.key.participant].count >= settings.warnKick) {
                        await sock.groupParticipantsUpdate(sender, [msg.key.participant], 'remove')
                        delete warnings[msg.key.participant]
                        saveWarnings()
                    }
                    saveWarnings()
                    return
                }
            }
        }

        // ====== BOT COMMANDS ======
        if (text.startsWith('!')) {
            const args = text.slice(1).split(' ')
            const command = args[0].toLowerCase()

            // Anti-ban delay
            if (settings.antiBanDelay) await randomDelay()

            switch(command) {
                case 'help':
                    await sock.sendMessage(sender, { 
                        text: `📋 *Bot Commands:*\n\n!help - Show this message\n!settings - Show current settings\n!antilink on/off - Toggle antilink\n!antiword on/off - Toggle antiword\n!badwords list - Show bad words list` 
                    })
                    break

                case 'settings':
                    await sock.sendMessage(sender, { 
                        text: `⚙️ *Current Settings:*\n\nAnti-link: ${settings.antilink ? '✅' : '❌'}\nAnti-word: ${settings.antiword ? '✅' : '❌'}\nWarn Kick: ${settings.warnKick}\nAnti-ban delay: ${settings.antiBanDelay ? '✅' : '❌'}` 
                    })
                    break

                case 'antilink':
                    if (args[1] === 'on') {
                        settings.antilink = true
                        saveSettings()
                        await sock.sendMessage(sender, { text: '✅ Anti-link enabled' })
                    } else if (args[1] === 'off') {
                        settings.antilink = false
                        saveSettings()
                        await sock.sendMessage(sender, { text: '❌ Anti-link disabled' })
                    }
                    break

                case 'antiword':
                    if (args[1] === 'on') {
                        settings.antiword = true
                        saveSettings()
                        await sock.sendMessage(sender, { text: '✅ Anti-word enabled' })
                    } else if (args[1] === 'off') {
                        settings.antiword = false
                        saveSettings()
                        await sock.sendMessage(sender, { text: '❌ Anti-word disabled' })
                    }
                    break

                case 'badwords':
                    if (args[1] === 'list') {
                        await sock.sendMessage(sender, { 
                            text: `🚫 *Bad Words List:*\n\n${settings.badwords.map((w, i) => `${i + 1}. ${w}`).join('\n')}` 
                        })
                    }
                    break

                default:
                    await sock.sendMessage(sender, { text: '❓ Unknown command. Type !help for available commands.' })
            }
        }
    })
}

startBot().catch(err => console.error('Bot error:', err))
