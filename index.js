/**
 * LIZA-AI V2 - Core Engine (Plugin Enabled)
 * Optimized for Railway Deployment
 * Developer: (hank!nd3 p4d4y41!)
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

// --- 📂 PLUGIN LOADER (hank!nd3 p4d4y41!) ---
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

app.get('/', (req, res) => { res.send('LIZA-AI V2 is Running Successfully!'); });
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
                console.log(chalk.green('✅ Session ID successfully converted and loaded!'));
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
            browser: ["LIZA-AI V2", "Safari", "3.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            syncFullHistory: false, // ഹിസ്റ്ററി സിങ്കിംഗ് കുറയ്ക്കുന്നു
            msgRetryCounterCache,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
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
                
                // --- സുരക്ഷിതമായ സ്റ്റാർട്ടപ്പ് നോട്ടിഫിക്കേഷൻ ---
                setTimeout(async () => {
                    try {
                        const botNumber = sock.decodeJid(sock.user.id);
                        await sock.sendMessage(botNumber, { 
                            text: `✅ *LIZA-AI V2 കണക്ട് ആയി!* \n\n*Status:* Stable\n*Plugins:* ${global.plugins.size}` 
                        });
                    } catch (e) {
                        console.log(chalk.red('⚠️ Startup message skip: ' + e.message));
                    }
                }, 15000); // 15 സെക്കൻഡ് ഡിലേ നൽകുന്നു
            }
            
            if (connection === 'close') {
                let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                if (reason !== DisconnectReason.loggedOut) {
                    console.log(chalk.red(`❌ Connection Closed (${reason}). Retrying in 5s...`));
                    setTimeout(() => startLizaBot(), 5000);
                } else {
                    console.log(chalk.red('❌ Session Logged Out. Please update SESSION_ID.'));
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
        console.error('Connection Error:', error)
        await delay(5000)
        startLizaBot()
    }
}

module.exports = { startLizaBot, loadPlugins };
startLizaBot()
