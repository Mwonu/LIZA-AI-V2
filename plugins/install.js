/**
 * Plugin Installer for LIZA-AI V2 (MongoDB Integrated)
 * Developer: (chank!nd3 p4d4y41!)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// MongoDB സ്കീമ (index.js-ൽ ഉള്ള അതേ സ്കീമ തന്നെ വേണം)
const PluginSchema = mongoose.models.Plugin || mongoose.model('Plugin', new mongoose.Schema({
    name: { type: String, unique: true },
    content: String
}));

module.exports = {
    command: "install",
    async execute(sock, msg, args) {
        const { remoteJid } = msg.key;

        if (!args[0]) {
            return await sock.sendMessage(remoteJid, { text: "⚠️ *Gist ലിങ്ക് നൽകുക!* \nഉദാഹരണം: `.install https://gist.githubusercontent.com/.../raw`" }, { quoted: msg });
        }

        try {
            let url = args[0];
            if (url.includes('gist.github.com') && !url.includes('/raw')) {
                url = url + '/raw';
            }

            await sock.sendMessage(remoteJid, { text: "📥 പ്ലഗിൻ ഡൗൺലോഡ് ചെയ്യുന്നു..." });

            const response = await axios.get(url);
            const pluginCode = response.data;

            // ഫയലിന്റെ പേര് സെറ്റ് ചെയ്യുന്നു
            const fileName = path.basename(url).split('?')[0].includes('.js') 
                ? path.basename(url).split('?')[0] 
                : `plugin_${Date.now()}.js`;

            const filePath = path.join(__dirname, fileName);

            // 1. ഫയൽ സിസ്റ്റത്തിലേക്ക് സേവ് ചെയ്യുന്നു
            fs.writeFileSync(filePath, pluginCode);

            // 2. MongoDB-യിലേക്ക് സേവ് ചെയ്യുന്നു (Permanent Backup)
            try {
                // ഉണ്ടെങ്കിൽ അപ്ഡേറ്റ് ചെയ്യും, ഇല്ലെങ്കിൽ പുതിയത് ഉണ്ടാക്കും
                await PluginSchema.findOneAndUpdate(
                    { name: fileName },
                    { content: pluginCode },
                    { upsert: true, new: true }
                );
                console.log(`✅ ${fileName} saved to MongoDB.`);
            } catch (dbErr) {
                console.error("DB Save Error:", dbErr);
            }

            // 🚀 ഇൻസ്റ്റാൾ വിജയകരമാണോ എന്ന് പരിശോധിക്കുന്നു
            try {
                // പ്ലഗിൻ ലോഡ് ആകുന്നുണ്ടോ എന്ന് നോക്കുന്നു
                if (pluginCode.includes('command') && pluginCode.includes('execute')) {
                    await sock.sendMessage(remoteJid, { 
                        text: `✅ *പ്ലഗിൻ ഇൻസ്റ്റാൾ ആയി!* \n\n📄 ഫയൽ: ${fileName}\n🗄️ *Status:* MongoDB-യിൽ ബാക്കപ്പ് ചെയ്തു.\n\nഇനി ബോട്ട് റീസ്റ്റാർട്ട് ആയാലും ഈ പ്ലഗിൻ പോകില്ല!\n\n*(chank!nd3 p4d4y41!)*` 
                    }, { quoted: msg });
                }
            } catch (e) {
                fs.unlinkSync(filePath); 
                await sock.sendMessage(remoteJid, { text: "❌ പ്ലഗിൻ കോഡിൽ പിശകുണ്ട്!" });
            }

        } catch (error) {
            console.error(error);
            await sock.sendMessage(remoteJid, { text: "❌ ഇൻസ്റ്റാളേഷൻ പരാജയപ്പെട്ടു." });
        }
    }
};
