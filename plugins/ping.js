/**
 * Ping Plugin - LIZA-AI V2
 * Developer: chank!nd3 p4d4y41!
 */

module.exports = {
    command: ['ping', 'p'], // ഇവിടെ 'command' എന്ന് തന്നെ വേണം
    category: 'main',
    description: 'ബോട്ടിന്റെ സ്പീഡ് അറിയാൻ',
    async execute(sock, m, { args }) {
        await sock.sendMessage(m.chat, { text: 'Pong! 🏓' }, { quoted: m });
    }
}
