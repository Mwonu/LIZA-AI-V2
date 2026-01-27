/**
 * LIZA-AI V2 - Core Engine (Public/Private Support)
 * Created by Chank!nd3 p4d4y41!
 */

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");
const chalk = require("chalk");
const config = require("./config");

const plugins = new Map();

const loadPlugins = () => {
    const pluginFolder = path.join(__dirname, "plugins");
    if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder);
    plugins.clear();
    fs.readdirSync(pluginFolder).forEach(file => {
        if (file.endsWith(".js")) {
            try {
                const pluginPath = `./plugins/${file}`;
                delete require.cache[require.resolve(pluginPath)];
                const plugin = require(pluginPath);
                if (plugin.command && plugin.execute) {
                    plugins.set(plugin.command, plugin);
                }
            } catch (e) { console.error(`Error loading ${file}:`, e); }
        }
    });
    console.log(chalk.green(`✅ Plugins Loaded! (Chank!nd3 p4d4y41!)`));
};

async function startLiza() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) startLiza();
        } else if (connection === "open") {
            console.log(chalk.blue.bold(`\nLIZA-AI V2 Online | Mode: ${config.MODE}\n`));
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // 🔒 Public/Private ലോജിക്
        const isOwner = msg.key.remoteJid.includes(config.OWNER_NUMBER);
        if (config.MODE === 'private' && !isOwner) return;

        const msgBody = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const prefix = config.PREFIX;
        const noPrefixMode = config.NO_PREFIX;

        let commandName = "";
        let args = [];

        if (msgBody.startsWith(prefix)) {
            args = msgBody.slice(prefix.length).trim().split(/\s+/);
            commandName = args.shift().toLowerCase();
        } else if (noPrefixMode) {
            args = msgBody.trim().split(/\s+/);
            commandName = args.shift().toLowerCase();
        }

        const plugin = plugins.get(commandName);
        if (plugin) {
            try {
                await plugin.execute(sock, msg, args);
            } catch (err) { console.error(err); }
        }
    });
}

loadPlugins();
startLiza();
