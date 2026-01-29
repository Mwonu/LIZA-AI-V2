/**
 * LIZA-AI V2 - Message Handler
 * Developer: (hank!nd3 p4d4y41!
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
        if (!mek || !mek.message) return;

        // --- 🕒 TIMEOUT LOGIC ---
        // പഴയ മെസ്സേജുകൾ (Offline Messages) സ്പാം ആകുന്നത് തടയാൻ
        const messageTimestamp = mek.messageTimestamp;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (currentTimestamp - messageTimestamp > 15) { // 15 സെക്കൻഡിൽ കൂടുതൽ പഴക്കമുണ്ടെങ്കിൽ അവഗണിക്കും
            return;
        }
        
        // Ephemeral handling
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        
        const m = smsg(sock, mek);
        if (!m) return; 

        const msgBody = (m.body || "").trim();
        const prefix = config.PREFIX;
        
        // --- 🔍 കമാൻഡ് തിരിച്ചറിയൽ ലോജിക് ---
        const isPrefixMsg = msgBody.startsWith(prefix);
        let command = "";
        
        if (isPrefixMsg) {
            command = msgBody.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
        } else if (config.NO_PREFIX) {
            command = msgBody.split(/\s+/)[0].toLowerCase();
        }

        const args = msgBody.split(/\s+/).slice(1);
        const isCommand = command !== ""; 

        // Owner check
        const senderNumber = m.sender ? m.sender.split('@')[0] : "";
        const isOwner = senderNumber === config.OWNER_NUMBER || m.key.fromMe;

        if (isCommand && isPrefixMsg) {
            console.log(chalk.green(`🚀 Command Detected: ${command} | From: ${senderNumber}`));
        }

        // --- 📢 STARTUP NOTIFICATION ---
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
