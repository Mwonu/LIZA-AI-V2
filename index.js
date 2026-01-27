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

    // പഴയ ലിസ്റ്റ് ക്ലിയർ ചെയ്യുന്നു (റീലോഡിംഗിന് സഹായിക്കും)
    plugins.clear();

    fs.readdirSync(pluginFolder).forEach(file => {
        if (file.endsWith(".js")) {
            try {
                const pluginPath = `./plugins/${file}`;
                delete require.cache[require.resolve(pluginPath)]; // ക്യാഷ് ക്ലിയർ ചെയ്യുന്നു
                const plugin = require(pluginPath);
                
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
        const prefix = config.PREFIX;
        const noPrefixMode = config.NO_PREFIX;

        let commandName = "";
        let args = [];

        // 🔍 കമാൻഡ് തിരിച്ചറിയാനുള്ള ലോജിക്
        if (msgBody.startsWith(prefix)) {
            // പ്രിഫിക്സ് ഉണ്ടെങ്കിൽ അത് കളഞ്ഞ് കമാൻഡ് എടുക്കുന്നു
            args = msgBody.slice(prefix.length).trim().split(/\s+/);
            commandName = args.shift().toLowerCase();
        } else if (noPrefixMode) {
            // No-Prefix Mode ഓൺ ആണെങ്കിൽ നേരിട്ട് കമാൻഡ് എടുക്കുന്നു
            args = msgBody.trim().split(/\s+/);
            commandName = args.shift().toLowerCase();
        }

        // പ്ലഗിൻ ഉണ്ടോ എന്ന് നോക്കുന്നു
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
