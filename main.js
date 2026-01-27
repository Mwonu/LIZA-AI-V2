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
        
        // Ephemeral മെസ്സേജ് കൈകാര്യം ചെയ്യുന്നു
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        
        const m = smsg(sock, mek);
        const msgBody = m.body || "";
        const prefix = config.PREFIX;
        
        // 🔍 കമാൻഡ് ചെക്കിംഗ്
        const isCommand = msgBody.startsWith(prefix);
        const command = isCommand ? msgBody.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : "";
        const args = msgBody.trim().split(/\s+/).slice(1);

        const isOwner = m.sender.split('@')[0] === config.OWNER_NUMBER || m.key.fromMe;

        // --- 📢 SAFE STARTUP NOTIFICATION ---
        // ആദ്യത്തെ മെസ്സേജ് വരുമ്പോൾ ബോട്ട് ആക്ടീവ് ആണെന്ന് ഓണറെ അറിയിക്കുന്നു
        if (!hasNotified && isOwner) {
            await sock.sendMessage(m.chat, { text: "🤖 *LIZA-AI V2 ആക്ടീവ് ആണ്!* \nകമാൻഡുകൾ ഉപയോഗിക്കാൻ തയ്യാറാണ്." }, { quoted: m });
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
            let executed = false;
            global.plugins.forEach((plugin) => {
                if (plugin.command && plugin.command.includes(command)) {
                    executed = true;
                    plugin.execute(sock, m, { args, command, isOwner });
                }
            });
        }

    } catch (err) {
        console.error('Error in handleMessages:', err);
    }
}

async function handleGroupParticipantUpdate(sock, anu) {
    console.log(chalk.blue('👥 Group Update:'), anu);
}

async function handleStatus(sock, chatUpdate) {
    // ഓട്ടോ സ്റ്റാറ്റസ് വ്യൂ വേണമെങ്കിൽ ഇവിടെ ചേർക്കാം
}

module.exports = { 
    handleMessages, 
    handleGroupParticipantUpdate, 
    handleStatus 
};
