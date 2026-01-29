/**
 * LIZA-AI V2 - Message Handler (Gist Support)
 * Developer: chank!nd3 p4d4y41!
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
        
        // Ephemeral മെസ്സേജ് കൈകാര്യം ചെയ്യുന്നു
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        
        const m = smsg(sock, mek);
        const msgBody = m.body || "";
        const prefix = config.PREFIX;
        
        // --- 🔍 കമാൻഡ് ചെക്കിംഗ് ---
        const isCommand = msgBody.startsWith(prefix);
        const command = isCommand ? msgBody.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : "";
        const args = msgBody.trim().split(/\s+/).slice(1);

        // ഉടമസ്ഥനാണോ എന്ന് പരിശോധിക്കുന്നു (Number matching fixed)
        const isOwner = m.sender.split('@')[0] === config.OWNER_NUMBER || m.key.fromMe;

        // --- 🐞 DEBUG LOGS ---
        console.log(chalk.cyan(`📩 New Message: "${msgBody}" | From: ${m.sender}`));
        if (isCommand) {
            console.log(chalk.green(`🚀 Command Detected: ${command}`));
        }

        // --- 📢 SAFE STARTUP NOTIFICATION ---
        if (!hasNotified && isOwner && isCommand) {
            await sock.sendMessage(m.chat, { text: "🤖 *LIZA-AI V2 ആക്ടീവ് ആണ്!* \n\n*Dev:* chank!nd3 p4d4y41!\n*Mode:* " + config.MODE }, { quoted: m });
            hasNotified = true;
        }

        // 🔒 Private Mode Logic (Modified for better control)
        if (config.MODE === 'private' && !isOwner) {
            if (isCommand) console.log(chalk.red(`🚫 Command blocked: Private Mode is ON.`));
            return;
        }

        // --- 📥 GIST INSTALLER COMMAND ---
        if (command === 'install' && isOwner) {
            let gistUrl = args[0];
            if (!gistUrl) return m.reply(`*ജിസ്റ്റ് ലിങ്ക് നൽകൂ!* \nഉദാഹരണം: ${prefix}install https://gist.github.com/user/id`);

            try {
                const rawUrl = gistUrl.includes('/raw') ? gistUrl : gistUrl + '/raw';
                const response = await axios.get(rawUrl);
                
                // പ്ലഗിൻ പേര് ജിസ്റ്റിൽ നിന്ന് കണ്ടെത്താൻ ശ്രമിക്കുന്നു അല്ലെങ്കിൽ ടൈംസ്റ്റാമ്പ് ഉപയോഗിക്കുന്നു
                const fileName = `gist_${Date.now()}.js`;
                const filePath = path.join(__dirname, 'plugins', fileName);

                if (!fs.existsSync(path.join(__dirname, 'plugins'))) {
                    fs.mkdirSync(path.join(__dirname, 'plugins'));
                }

                fs.writeFileSync(filePath, response.data);
                
                // പ്ലഗിൻ ലോഡ് ചെയ്യുന്നു
                delete require.cache[require.resolve(filePath)]; // പഴയ കാഷെ കളയുന്നു
                const newPlugin = require(filePath);
                
                if (newPlugin.command) {
                    global.plugins.set(fileName, newPlugin);
                    m.reply(`✅ *പ്ലഗിൻ ഇൻസ്റ്റാൾ ആയി!* \n\n*കമാൻഡ്:* ${newPlugin.command}\n*വിവരണം:* ${newPlugin.description || 'ലഭ്യമല്ല'}`);
                } else {
                    fs.unlinkSync(filePath); // തെറ്റായ ഫയൽ ആണെങ്കിൽ ഡിലീറ്റ് ചെയ്യുന്നു
                    m.reply('⚠️ പ്ലഗിൻ ഫോർമാറ്റ് തെറ്റാണ്. `module.exports` പരിശോധിക്കുക.');
                }
            } catch (e) {
                console.error(e);
                m.reply('❌ ഇൻസ്റ്റാൾ പരാജയപ്പെട്ടു: ' + e.message);
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
                        console.log(chalk.blue(`⚙️ Executing: ${file}`));
                        await plugin.execute(sock, m, { args, command, isOwner, prefix });
                    } catch (err) {
                        console.error(chalk.red(`❌ Error in ${file}:`), err);
                        m.reply(`⚠️ പ്ലഗിൻ എറർ: ${err.message}`);
                    }
                    break;
                }
            }
            if (!pluginFound) {
                console.log(chalk.yellow(`❓ Command "${command}" not found.`));
            }
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
