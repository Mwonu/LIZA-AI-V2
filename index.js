/**
 * LIZA-AI V2 - Core Engine (Plugin Enabled)
 * Optimized for Railway Deployment
 * Developer: (hank!nd3 p4d4y41!
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

// --- 🌐 RAILWAY SERVER SETUP ---
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

const config = require('./config') 

setInterval(() => {
    try {
        store.writeToFile('./baileys_store.json')
    } catch (e) {
        // Console spam ഒഴിവാക്കാൻ ലോഗ് സൈലന്റ് ആക്കി
    }
}, 30000) // 30 സെക്കൻഡിലൊരിക്കൽ മാത്രം സ്റ്റോർ അപ്ഡേറ്റ് ചെയ്യുന്നു

async function startLizaBot() {
    try {
        if (!fs.existsSync('./session')) fs.mkdirSync('./session');
        
        // --- 🔑 SESSION INITIALIZATION ---
        if (!fs.existsSync('./session/creds.json') && process.env.SESSION_ID) {
            try {
                let sessionID = process.env.SESSION_ID;
                let sessionData = sessionID.includes('LIZA~') 
                    ? sessionID.split('LIZA~')[1] 
                    : (sessionID.includes('Session~') ? sessionID.split('Session~')[1] : sessionID);
                
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
            // കണക്ഷൻ സ്റ്റെബിലിറ്റിക്കായി ഡെസ്ക്ടോപ്പ് ബ്രൗസർ സെറ്റിംഗ്സ്
            browser: ["LIZA-AI V2", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
            },
            markOnlineOnConnect: true, 
            generateHighQualityLinkPreview: true,
            msgRetryCounterCache,
            defaultQueryTimeoutMs: undefined, // അനന്തമായി വെയിറ്റ് ചെയ്യുന്നത് ഒഴിവാക്കാൻ
        })

        sock.ev.on('creds.update', saveCreds)
        store.bind(sock.ev)

        // --- 📡 CONNECTION MONITORING ---
        sock.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s
            if (connection === 'connecting') console.log(chalk.yellow('🔄 Connecting to WhatsApp...'))
            
            if (connection === "open") {
                console.log(chalk.blue.bold(`\n---------------------------------`));
                console.log(chalk.white(`🤖 LIZA-AI V2 Status: ONLINE`));
                console.log(chalk.white(`👨‍💻 Developer: (hank!nd3 p4d4y41!`));
                console.log(chalk.blue.bold(`---------------------------------\n`));
            }
            
            if (connection === 'close') {
                let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(chalk.red(`❌ Connection Closed: ${reason}`));

                if (reason === DisconnectReason.restartRequired || reason === 440) {
                    console.log(chalk.yellow('🔄 Restarting to fix stream error...'));
                    startLizaBot();
                } else if (reason === DisconnectReason.loggedOut) {
                    console.log(chalk.bgRed('‼️ WhatsApp Account Logged Out! Delete session folder and update SESSION_ID.'));
                    process.exit(0);
                } else {
                    // മറ്റു കാരണങ്ങൾ ഉണ്ടെങ്കിൽ 5 സെക്കൻഡിന് ശേഷം വീണ്ടും ശ്രമിക്കും
                    setTimeout(() => startLizaBot(), 5000);
                }
            }
        })

        sock.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek || !mek.message) return
                
                // സ്റ്റാറ്റസ് ഓട്ടോ വ്യൂ അല്ലെങ്കിൽ ഇഗ്നോർ ചെയ്യാൻ
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
