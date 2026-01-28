/**
 * LIZA-AI V2 - Message Handler (Gist Support)
 * Developer: (hank!nd3 p4d4y41!)
 */

const config = require('./config');
const { smsg } = require('./lib/myfunc');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');

// ബോട്ട് സ്റ്റാർട്ട് ആകുമ്പോൾ ഒരു തവണ മാത്രം നോട്ടിഫിക്കേഷൻ അയക്കാൻ
let hasNotified = false;

async function handleMessages(sock, chatUpdate) {
    try {
        let mek = chatUpdate.messages[0];
        if (!mek.message) return;
        
        // --- 🐞 DEBUG LOGS ---
        // ലോഗ്സിൽ മെസ്സേജ് വരുന്നത് കാണാൻ ഇത് സഹായിക്കും
        console.log(chalk.cyan('📩 New Message Received'));

        // Ephemeral മെസ്സേജ് കൈകാര്യം ചെയ്യുന്നു
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        
        const m = smsg(sock, mek);
        const msgBody = m.body || "";
        const prefix = config.PREFIX;
        
        // --- 🔍 കമാൻഡ് ചെക്കിംഗ് ---
        const isCommand = msgBody.startsWith(prefix);
        const command = isCommand ? msgBody.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : "";
        const args = msgBody.trim().split(/\s+/).slice(1);

        const isOwner = m.sender.split('@')[0] === config.OWNER_NUMBER || m.key.fromMe;

        if (isCommand) {
            console.log(chalk.green(`🚀 Command Detected: ${command} | From: ${m.sender}`));
        }

        // --- 📢 SAFE STARTUP NOTIFICATION ---
        if (!hasNotified && isOwner && isCommand) {
            await sock.sendMessage(m.chat, { text: "🤖 *LIZA-AI V2 ആക്ടീവ് ആണ്!* \nകമാൻഡുകൾ പ്രോസസ്സ് ചെയ്യാൻ തയ്യാറാണ്." }, { quoted: m });
            hasNotified = true;
        }

        // 🔒 Private Mode
        if (config.MODE === 'private' && !isOwner) return;

        // --- 📥 GIST INSTALLER COMMAND ---
        if (command === 'install' && isOwner) {
            let gistUrl = args[0];
            if (!gistUrl) return m.reply(`*ജിസ്റ്റ് ലിങ്ക് നൽകൂ!* \nഉദാഹരണം: ${prefix}install https://gist.github.com/user/id`);

            try {
                const rawUrl = gistUrl.includes('/raw') ? gistUrl : gistUrl + '/raw';
                const response = await axios.get(rawUrl);
                
                const fileName = `gist_${Date.now()}.js`;
                const filePath = path.join(__dirname, 'plugins', fileName);

                if (!fs.existsSync(path.join(__dirname, 'plugins'))) {
                    fs.mkdirSync(path.join(__dirname, 'plugins'));
                }

                fs.writeFileSync(filePath, response.data);
                
                // പ്ലഗിൻ ലോഡ് ചെയ്യുന്നു
                const newPlugin = require(filePath);
                if (newPlugin.command) {
                    global.plugins.set(fileName, newPlugin);
                    m.reply(`✅ *പ്ലഗിൻ ഇൻസ്റ്റാൾ ആയി!* \nകമാൻഡ്: ${newPlugin.command}`);
                } else {
                    m.reply('⚠️ പ്ലഗിൻ സേവ് ആയി, പക്ഷേ ഫോർമാറ്റ് തെറ്റാണ്.');
                }
            } catch (e) {
                m.reply('❌ ഇൻസ്റ്റാൾ പരാജയപ്പെട്ടു: ' + e.message);
            }
            return;
        }

        // --- ⚙️ PLUGIN EXECUTION ---
        if (isCommand) {
            let pluginFound = false;
            for (let [file, plugin] of global.plugins) {
                // പ്ലഗിൻ സ്ട്രിംഗ് ആണോ അറേ ആണോ എന്ന് നോക്കുന്നു
                const isMatch = Array.isArray(plugin.command) 
                    ? plugin.command.includes(command) 
                    : plugin.command === command;

                if (isMatch) {
                    pluginFound = true;
                    try {
                        console.log(chalk.blue(`⚙️ Executing Plugin: ${file}`));
                        await plugin.execute(sock, m, { args, command, isOwner, prefix });
                    } catch (err) {
                        console.error(chalk.red(`❌ Error in plugin ${file}:`), err);
                        m.reply(`⚠️ പ്ലഗിൻ എറർ: ${err.message}`);
                    }
                    break;
                }
            }
            if (!pluginFound) console.log(chalk.yellow(`❓ Command "${command}" not found in plugins.`));
        }

    } catch (err) {
        console.error('Error in handleMessages:', err);
    }
}

async function handleGroupParticipantUpdate(sock, anu) {
    console.log(chalk.blue('👥 Group Update:'), anu);
}

async function handleStatus(sock, chatUpdate) {
    // ഓട്ടോ സ്റ്റാറ്റസ് വ്യൂ ഇവിടെ ചേർക്കാം
}

module.exports = { 
    handleMessages, 
    handleGroupParticipantUpdate, 
    handleStatus 
};
