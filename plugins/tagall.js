/**
 * Tagall Plugin
 * Developer: (hank!nd3 p4d4y41!)
 */

module.exports = {
    command: ['tagall', 'all'],
    category: 'group',
    description: 'ഗ്രൂപ്പിലെ എല്ലാവരെയും ടാഗ് ചെയ്യാൻ',
    async execute(sock, m, { args }) {
        if (!m.isGroup) return m.reply('ഈ കമാൻഡ് ഗ്രൂപ്പിൽ മാത്രമേ ഉപയോഗിക്കാൻ കഴിയൂ!');
        
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const isAdmin = participants.find(p => p.id === m.sender)?.admin;
        
        if (!isAdmin) return m.reply('ക്ഷമിക്കണം, ഈ കമാൻഡ് അഡ്മിൻമാർക്ക് മാത്രമേ ഉള്ളതാണ്.');

        let message = args.join(' ') || 'Attention Everyone!';
        let txt = `📢 *TAG ALL*\n\n*Message:* ${message}\n\n`;
        
        let mentions = [];
        for (let p of participants) {
            txt += ` @${p.id.split('@')[0]}\n`;
            mentions.push(p.id);
        }

        await sock.sendMessage(m.chat, { text: txt, mentions: mentions }, { quoted: m });
    }
};
