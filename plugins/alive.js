/**
 * LIZA-AI V2 - Alive Plugin
 * Fixed ESM & Function Wrapper Error
 */

const handler = async (sock, m, { prefix }) => {
    try {
        const text = `🤖 *LIZA-AI V2 Is Alive!* \n\n` +
                     `👨‍💻 *Developer:* (chank!nd3 p4d4y41!\n` +
                     `🛰 *Status:* Running on Render\n` +
                     `📟 *Prefix:* ${prefix}`;
        
        await sock.sendMessage(m.chat, { 
            text: text,
            contextInfo: {
                externalAdReply: {
                    title: "LIZA-AI V2 ONLINE",
                    body: "(hank!nd3 p4d4y41!",
                    thumbnailUrl: "https://telegra.ph/file/dcce2a395297660707324.jpg", 
                    sourceUrl: "https://github.com/",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });

    } catch (err) {
        console.error("❌ Error in alive.js:", err);
    }
};

// കമാൻഡ് സെറ്റിംഗ്സ്
handler.command = ['alive']; 

module.exports = handler;
