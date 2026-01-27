/**
 * LIZA-AI V2 - Message Handler
 * Developer: (hank!nd3 p4d4y41!)
 */

const config = require('./config');
const { smsg } = require('./lib/myfunc'); // നിങ്ങളുടെ lib ഫോൾഡറിൽ ഈ ഫയൽ ഉണ്ടെന്ന് ഉറപ്പുവരുത്തുക

async function handleMessages(sock, chatUpdate) {
    try {
        let mek = chatUpdate.messages[0];
        if (!mek.message) return;
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        
        // മെസ്സേജിനെ ലളിതമായ ഫോർമാറ്റിലേക്ക് മാറ്റുന്നു
        const m = smsg(sock, mek);
        const msgBody = m.body || "";
        const prefix = config.PREFIX;
        const noPrefixMode = config.NO_PREFIX;

        let commandName = "";
        let args = [];

        // 🔍 കമാൻഡ് ചെക്കിംഗ് ലോജിക്
        if (msgBody.startsWith(prefix)) {
            args = msgBody.slice(prefix.length).trim().split(/\s+/);
            commandName = args.shift().toLowerCase();
        } else if (noPrefixMode) {
            args = msgBody.trim().split(/\s+/);
            commandName = args.shift().toLowerCase();
        }

        // 🔒 Private Mode ചെക്കിംഗ്
        const isOwner = m.sender.startsWith(config.OWNER_NUMBER) || m.key.fromMe;
        if (config.MODE === 'private' && !isOwner) return;

        // പ്ലഗിൻ സിസ്റ്റം വഴി കമാൻഡ് പ്രവർത്തിപ്പിക്കുന്നു
        // ശ്രദ്ധിക്കുക: index.js-ൽ പ്ലഗിനുകൾ ലോഡ് ചെയ്തിട്ടുണ്ടെങ്കിൽ മാത്രമേ ഇത് പ്രവർത്തിക്കൂ
        const { plugins } = require('./index'); 
        if (plugins && plugins.has(commandName)) {
            const plugin = plugins.get(commandName);
            await plugin.execute(sock, m, args);
        }

    } catch (err) {
        console.error('Error in handleMessages:', err);
    }
}

// ഗ്രൂപ്പിൽ ആരെങ്കിലും വരുമ്പോഴോ പോകുമ്പോഴോ ഉള്ള ഫംഗ്ഷൻ (തൽക്കാലം ലളിതമായി)
async function handleGroupParticipantUpdate(sock, anu) {
    console.log('Group Update:', anu);
}

// സ്റ്റാറ്റസ് ഓട്ടോ വ്യൂ (Optional)
async function handleStatus(sock, chatUpdate) {
    // സ്റ്റാറ്റസ് ഓട്ടോമാറ്റിക് ആയി റീഡ് ചെയ്യാനുള്ള കോഡ് ഇവിടെ ചേർക്കാം
}

module.exports = { 
    handleMessages, 
    handleGroupParticipantUpdate, 
    handleStatus 
};
