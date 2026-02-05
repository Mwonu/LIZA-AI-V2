/**
 * Alive Plugin - LIZA-AI V2
 * Developer: (hank!nd3 p4d4y41!
 */

module.exports = {
    command: ['alive', 'status'],
    category: 'main',
    description: 'ബോട്ട് ഓൺലൈൻ ആണോ എന്ന് പരിശോധിക്കാൻ',
    async execute(sock, m, { prefix }) {
        try {
            const text = `🤖 *LIZA-AI V2 IS ONLINE* \n\n` +
                         `👨‍💻 *Dev:* (hank!nd3 p4d4y41!\n` +
                         `📟 *Prefix:* [ ${prefix} ]\n` +
                         `🛰 *Status:* Stable on Render\n\n` +
                         `_How can I help you today?_`;

            await sock.sendMessage(m.chat, { 
                text: text,
                contextInfo: {
                    externalAdReply: {
                        title: "LIZA-AI V2",
                        body: "WhatsApp Bot Project",
                        // താഴെ കാണുന്ന ലിങ്കിൽ നിങ്ങളുടെ ഫോട്ടോ മാറ്റാം
                        thumbnailUrl: "https://telegra.ph/file/dcce2a395297660707324.jpg", 
                        sourceUrl: "https://github.com/",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (e) {
            console.error("Alive Plugin Error: ", e);
        }
    }
}
