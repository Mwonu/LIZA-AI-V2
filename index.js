/**
 * LIZA-AI V2 - Core Engine (Optimized)
 * Developer: (chank!nd3 p4d4y41!)
 */

require('./config') 
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const { smsg } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const express = require('express');

// --- 📂 PLUGIN LOADER ---
global.plugins = new Map();
const pluginFolder = path.join(__dirname, 'plugins');

function loadPlugins() {
    if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder);
    const pluginFiles = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));
    
    for (const file of pluginFiles) {
        const fullPath = path.join(pluginFolder, file);
        try {
            if (require.cache[require.resolve(fullPath)]) {
                delete require.cache[require.resolve(fullPath)];
            }
            const plugin = require(fullPath);
            if (plugin.command) {
                global.plugins.set(file, plugin);
            }
        } catch (e) {
            console.log(chalk.red(`❌ Error loading plugin ${file}: ` + e.message));
        }
    }
    console.log(chalk.green(`✅ Successfully loaded ${global.plugins.size} plugins!`));
}

loadPlugins();

// --- 🌐 SERVER SETUP ---
const app = express();
const port = process.env.PORT || 8080; 

app.get('/', (req, res) => { res.send('LIZA-AI V2 is Online!'); });
app.listen(port, "0.0.0.0", () => { 
    console.log(chalk.green(`🌐 Server active on port ${port}`)); 
});

// --- 📦 STORE SETUP ---
const { makeInMemoryStore } = require('./lib/lightweight_store')
const store = makeInMemoryStore()
store.readFromFile('./baileys_store.json')

setInterval(() => {
    try {
        store.writeToFile('./baileys_store.json')
    } catch (e) {}
}, 30000)

async function startLizaBot() {
    try {
        if (!fs.existsSync('./session')) fs.mkdirSync('./session');
        
        // --- 🔑 SESSION DECODER (FIXED) ---
        if (!fs.existsSync('./session/creds.json') && process.env.SESSION_ID) {
            try {
                let sessionID = process.env.SESSION_ID.trim();
                let sessionData = sessionID.replace(/LIZA~|Session~/g, "");
                
                const buffer = Buffer.from(sessionData, 'base64');
                fs.writeFileSync('./session/creds.json', buffer.toString());
                console.log(chalk.green('✅ Session ID Successfully Extracted!'));
            } catch (e) {
                console.log(chalk.red('❌ Session ID Decoding Error: ' + e.message));
            }
        }

        let { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !process.env.SESSION_ID,
            browser: ["LIZA-AI V2", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
            },
            markOnlineOnConnect: true, 
            generateHighQualityLinkPreview: true,
            msgRetryCounterCache,
        })

        sock.ev.on('creds.update', saveCreds)
        store.bind(sock.ev)

        // --- 📡 CONNECTION MONITORING (STRONGER LOGIC) ---
        sock.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s
            if (connection === 'connecting') console.log(chalk.yellow('🔄 Connecting to WhatsApp...'))
            
            if (connection === "open") {
                console.log(chalk.blue.bold(`\n---------------------------------`));
                console.log(chalk.white(`🤖 LIZA-AI V2 Status: ONLINE`));
                console.log(chalk.white(`👨‍💻 Developer: (chank!nd3 p4d4y41!)`));
                console.log(chalk.blue.bold(`---------------------------------\n`));
            }
            
            if (connection === 'close') {
                let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(chalk.red(`❌ Connection Closed: ${reason}`));

                // ലോഗൗട്ട് ആകാത്ത എല്ലാ സാഹചര്യത്തിലും തനിയെ റീസ്റ്റാർട്ട് ചെയ്യും
                if (reason === DisconnectReason.loggedOut) {
                    console.log(chalk.bgRed('‼️ Logged Out! Please update SESSION_ID and Re-deploy.'));
                    process.exit(1); 
                } else if (reason === DisconnectReason.restartRequired || reason === 408) {
                    console.log(chalk.yellow('♻️ Restarting session...'));
                    startLizaBot();
                } else {
                    console.log(chalk.yellow(`🩹 Attempting to reconnect in 5s...`));
                    setTimeout(() => startLizaBot(), 5000);
                }
            }
        })

        sock.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek || !mek.message) return
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    if (typeof handleStatus === 'function') await handleStatus(sock, chatUpdate);
                    return;
                }
                await handleMessages(sock, chatUpdate)
            } catch (err) {
                console.error('Message Handling Error:', err)
            }
        })

        sock.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        sock.ev.on('group-participants.update', async (anu) => {
            if (typeof handleGroupParticipantUpdate === 'function') {
                await handleGroupParticipantUpdate(sock, anu)
            }
        })

        return sock
    } catch (error) {
        console.error('Fatal Error:', error)
        setTimeout(() => startLizaBot(), 10000)
    }
}

startLizaBot()
