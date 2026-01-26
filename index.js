/**
 * LIZA-AI V2 - Core Engine
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

// 📂 പ്ലഗിനുകൾ ലോഡ് ചെയ്യാനുള്ള ഫംഗ്ഷൻ
const loadPlugins = () => {
    const pluginFolder = path.join(__dirname, "plugins");
    if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder);

    fs.readdirSync(pluginFolder).forEach(file => {
        if (file.endsWith(".js")) {
            try {
                const plugin = require(`./plugins/${file}`);
                if (plugin.command && plugin.execute) {
                    plugins.set(plugin.command, plugin);
                }
            } catch (e) {
                console.error(`Error loading ${file}:`, e);
            }
        }
    });
    console.log(chalk.green(`✅ ${plugins.size} Plugins Loaded! (Chank!nd3 p4d4y41!)`));
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
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow("🔄 Reconnecting LIZA-AI V2..."));
                startLiza();
            }
        } else if (connection === "open") {
            console.log(chalk.blue.bold(`\n----------------------------`));
            console.log(chalk.white(`  ${config.BOT_NAME} is Online!`));
            console.log(chalk.white(`  Dev: ${config.OWNER_NAME}`));
            console.log(chalk.blue.bold(`----------------------------\n`));
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const msgBody = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!msgBody.startsWith(config.PREFIX)) return;

        const args = msgBody.slice(config.PREFIX.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const plugin = plugins.get(commandName);
        if (plugin) {
            try {
                await plugin.execute(sock, msg, args);
            } catch (err) {
                console.error("Plugin Error:", err);
                sock.sendMessage(msg.key.remoteJid, { text: "❌ Error executing command!" });
            }
        }
    });
}

loadPlugins();
startLiza();
