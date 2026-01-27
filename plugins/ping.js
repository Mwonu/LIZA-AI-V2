module.exports = {
    name: 'ping',
    category: 'main',
    desc: 'ബോട്ടിന്റെ സ്പീഡ് അറിയാൻ',
    async execute(sock, m, { args }) {
        await sock.sendMessage(m.chat, { text: 'Pong! 🏓' }, { quoted: m });
    }
}
