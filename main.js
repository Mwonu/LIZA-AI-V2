/**
 * LIZA-AI V2 - Message Handler (Gist Support)
 * Developer: (hank!nd3 p4d4y41!)
 */

const config = require('./config');
const { smsg } = require('./lib/myfunc');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // ജിസ്റ്റ് ഡൗൺലോഡ് ചെയ്യാൻ axios ആവശ്യമാണ്
const chalk = require('chalk');

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

        // 🔒 Private Mode
        if (config.MODE === 'private' && !isOwner) return;

        // --- 📥 GIST INSTALLER COMMAND ---
        if (command === 'install' && isOwner) {
            let gistUrl = args[0];
            if (!gistUrl) return m.reply(`*ജിസ്റ്റ് ലിങ്ക് നൽകൂ!* \nഉദാഹരണം: ${prefix}install https://gist.github.com/user/id`);

            try {
                // ജിസ്റ്റ് ലിങ്കിൽ നിന്ന് റോ (raw) ഡാറ്റ എടുക്കുന്നു
                const rawUrl = gistUrl.includes('/raw') ? gistUrl : gistUrl + '/raw';
                const response = await axios.get(rawUrl);
                
                // പ്ലഗിൻ പേര് കണ്ടെത്തുന്നു (ജിസ്റ്റ് ഫയൽ നെയിം അല്ലെങ്കിൽ റാണ്ടം നെയിം)
                const fileName = `gist_${Date.now()}.js`;
                const filePath = path.join(__dirname, 'plugins', fileName);

                fs.writeFileSync(filePath, response.data);
                
                // പ്ലഗിൻ റീലോഡ് ചെയ്യുക (ഇൻസ്റ്റാൾ ചെയ്ത ഉടൻ വർക്ക് ആകാൻ)
                const newPlugin = require(filePath);
                if (newPlugin.command) {
                    global.plugins.set(fileName, newPlugin);
                    m.reply(`✅ *പ്ലഗിൻ ഇൻസ്റ്റാൾ ആയി!* \nകമാൻഡ്: ${newPlugin.command}`);
                } else {
                    m.reply('⚠️ പ്ലഗിൻ സേവ് ആയി, പക്ഷേ കമാൻഡ് ഫോർമാറ്റ് തെറ്റാണ്.');
                }
            } catch (e) {
                console.error(e);
                m.reply('❌ ഇൻസ്റ്റാൾ ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു. ലിങ്ക് പരിശോധിക്കുക.');
            }
            return;
        }

        // --- ⚙️ PLUGIN EXECUTION ---
        // index.js-ൽ സെറ്റ് ചെയ്ത global.plugins ഉപയോഗിക്കുന്നു
        let executed = false;
        global.plugins.forEach((plugin, file) => {
            if (plugin.command && plugin.command.includes(command)) {
                executed = true;
                plugin.execute(sock, m, { args, command, isOwner });
            }
        });

    } catch (err) {
        console.error('Error in handleMessages:', err);
    }
}

async function handleGroupParticipantUpdate(sock, anu) {
    console.log(chalk.blue('👥 Group Update:'), anu);
}

async function handleStatus(sock, chatUpdate) {
    // ഓട്ടോ സ്റ്റാറ്റസ് വ്യൂ ഇവിടെ വേണമെങ്കിൽ ആഡ് ചെയ്യാം
}

module.exports = { 
    handleMessages, 
    handleGroupParticipantUpdate, 
    handleStatus 
};
