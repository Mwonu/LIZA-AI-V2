/**
 * Alive Plugin
 * Developer: (hank!nd3 p4d4y41!)
 */

module.exports = {
    command: ['alive'],
    category: 'main',
    description: 'ബൊട്ടിന്റെ സ്റ്റാറ്റസ് അറിയാൻ',
    async execute(sock, m, { isOwner }) {
        const aliveMsg = `🤖 *LIZA-AI V2 IS ONLINE* 🤖\n\n` +
                         `*Status:* Stable\n` +
                         `*Developer:* (hank!nd3 p4d4y41!)\n` +
                         `*Mode:* ${sock.public ? 'Public' : 'Private'}\n\n` +
                         `_എന്തെങ്കിലും സഹായത്തിന് മെനു ടൈപ്പ് ചെയ്യുക._`;

        await sock.sendMessage(m.chat, { 
            text: aliveMsg,
            contextInfo: {
                externalAdReply: {
                    title: "LIZA-AI V2",
                    body: "(hank!nd3 p4d4y41!)",
                    thumbnailUrl: "https://telegra.ph/file/your-image-link.jpg", // നിങ്ങളുടെ ഇമേജ് ലിങ്ക് ഇവിടെ നൽകാം
                    sourceUrl: "https://github.com/",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });
    }
};
