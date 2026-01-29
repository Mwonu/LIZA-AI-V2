/**
 * LIZA-AI V2 - Message Handler
 * Developer: chank!nd3 p4d4y41!
 */

const config = require('./config');
const { smsg } = require('./lib/myfunc');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');

let hasNotified = false;

async function handleMessages(sock, chatUpdate) {
    try {
        let mek = chatUpdate.messages[0];
        if (!mek.message) return;
        
        // Ephemeral handling
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        
        const m = smsg(sock, mek);
        const msgBody = m.body || "";
        const prefix = config.PREFIX;
        
        const isCommand = msgBody.startsWith(prefix);
        const command = isCommand ? msgBody.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : "";
        const args = msgBody.trim().split(/\s+/).slice(1);

        // Owner check
        const isOwner = m.sender.split('@')[0] === config.OWNER_NUMBER || m.key.fromMe;

        if (isCommand) {
            console.log(chalk.green(`🚀 Command Detected: ${command} | From: ${m.sender}`));
        }

        // --- 📢 STARTUP NOTIFICATION (ഫിക്സ് ചെയ്തത്) ---
        if (!hasNotified && isOwner && isCommand) {
            try {
                await sock.sendMessage(m.chat, { text: "🤖 *LIZA-AI V2 Online!*" });
                hasNotified = true;
            } catch (e) {
                console.log("Notification Error: ", e.message);
            }
        }

        // 🔒 Private Mode
        if (config.MODE === 'private' && !isOwner) return;

        // --- 📥 GIST INSTALLER ---
        if (command === 'install' && isOwner) {
            let gistUrl = args[0];
            if (!gistUrl) return m.reply(`*ജിസ്റ്റ് ലിങ്ക് നൽകൂ!*`);
            try {
                const rawUrl = gistUrl.includes('/raw') ? gistUrl : gistUrl + '/raw';
                const response = await axios.get(rawUrl);
                const fileName = `gist_${Date.now()}.js`;
                const filePath = path.join(__dirname, 'plugins', fileName);
                fs.writeFileSync(filePath, response.data);
                const newPlugin = require(filePath);
                if (newPlugin.command) {
                    global.plugins.set(fileName, newPlugin);
                    m.reply(`✅ *ഇൻസ്റ്റാൾ ആയി:* ${newPlugin.command}`);
                }
            } catch (e) {
                m.reply('❌ പരാജയപ്പെട്ടു: ' + e.message);
            }
            return;
        }

        // --- ⚙️ PLUGIN EXECUTION ---
        if (isCommand) {
            let pluginFound = false;
            for (let [file, plugin] of global.plugins) {
                const isMatch = Array.isArray(plugin.command) 
                    ? plugin.command.includes(command) 
                    : plugin.command === command;

                if (isMatch) {
                    pluginFound = true;
                    try {
                        // പ്ലഗിൻ എക്സിക്യൂട്ട് ചെയ്യുന്നു
                        await plugin.execute(sock, m, { args, command, isOwner, prefix });
                    } catch (err) {
                        console.error(chalk.red(`❌ Error in ${file}:`), err);
                        m.reply(`⚠️ എറർ: ${err.message}`);
                    }
                    break;
                }
            }
        }

    } catch (err) {
        console.error('Error in handleMessages:', err);
    }
}

async function handleGroupParticipantUpdate(sock, anu) {
    console.log(chalk.blue('👥 Group Update:'), anu);
}

async function handleStatus(sock, chatUpdate) {}

module.exports = { handleMessages, handleGroupParticipantUpdate, handleStatus };
