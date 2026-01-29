/**
 * LIZA-AI V2 - Core Engine (Plugin Enabled)
 * Optimized for Railway Deployment
 * Developer: chank!nd3 p4d4y41!
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
        console.log("Store write error: ", e.message)
    }
}, config.storeWriteInterval || 10000)

async function startLizaBot() {
    try {
        if (!fs.existsSync('./session')) fs.mkdirSync('./session');
        
        if (!fs.existsSync('./session/creds.json') && process.env.SESSION_ID) {
            try {
                let sessionID = process.env.SESSION_ID;
                let sessionData = sessionID.includes('LIZA~') 
                    ? sessionID.split('LIZA~')[1] 
                    : (sessionID.includes('Session~') ? sessionID.split('Session~')[1] : sessionID);
                
                const buffer = Buffer.from(sessionData, 'base64');
                fs.writeFileSync('./session/creds.json', buffer.toString());
                console.log(chalk.green('✅ Session ID Loaded!'));
            } catch (e) {
                console.log(chalk.red('❌ Session ID Error: ' + e.message));
            }
        }

        let { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !process.env.SESSION_ID,
            browser: ["LIZA-AI V2", "Chrome", "110.0.5481.178"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
            },
            markOnlineOnConnect: false, // സ്റ്റെബിലിറ്റിക്ക് വേണ്ടി ഇത് false ആക്കി
            syncFullHistory: false, 
            shouldSyncHistoryMessage: () => false, // ഹിസ്റ്ററി സിങ്ക് പൂർണ്ണമായും ബ്ലോക്ക് ചെയ്തു
            msgRetryCounterCache,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
        })

        sock.ev.on('creds.update', saveCreds)
        store.bind(sock.ev)

        sock.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s
            if (connection === 'connecting') console.log(chalk.yellow('🔄 LIZA-AI is connecting...'))
            
            if (connection === "open") {
                console.log(chalk.blue.bold(`\n---------------------------------`));
                console.log(chalk.white(`🤖 LIZA-AI V2 is Online!`));
                console.log(chalk.white(`👨‍💻 Dev: (hank!nd3 p4d4y41!)`));
                console.log(chalk.blue.bold(`---------------------------------\n`));
                
                // 20 സെക്കൻഡ് കഴിഞ്ഞ് മാത്രം നോട്ടിഫിക്കേഷൻ
                setTimeout(async () => {
                    try {
                        const botNumber = sock.decodeJid(sock.user.id);
                        await sock.sendMessage(botNumber, { 
                            text: `✅ *LIZA-AI V2 Connected!* \n\n*Developer:* (hank!nd3 p4d4y41!)` 
                        });
                    } catch (e) {}
                }, 20000);
            }
            
            if (connection === 'close') {
                let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                if (reason !== DisconnectReason.loggedOut) {
                    // പെട്ടെന്ന് റീസ്റ്റാർട്ട് ചെയ്യാതെ 5 സെക്കൻഡ് ഗ്യാപ്പ് നൽകുന്നു
                    console.log(chalk.red(`❌ Connection Lost (${reason}). Reconnecting in 5s...`));
                    setTimeout(() => startLizaBot(), 5000);
                } else {
                    console.log(chalk.red('❌ Logged Out. Update SESSION_ID.'));
                }
            }
        })

        sock.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    if (typeof handleStatus === 'function') await handleStatus(sock, chatUpdate);
                    return;
                }
                await handleMessages(sock, chatUpdate)
            } catch (err) {
                console.error('Upsert Error:', err)
            }
        })

        sock.ev.on('group-participants.update', async (anu) => {
            if (typeof handleGroupParticipantUpdate === 'function') {
                await handleGroupParticipantUpdate(sock, anu)
            }
        })

        sock.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        sock.public = config.MODE === 'public';
        sock.plugins = global.plugins;

        return sock
    } catch (error) {
        console.error('Error:', error)
        await delay(5000)
        startLizaBot()
    }
}

startLizaBot()
