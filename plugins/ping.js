/**
 * Ping Plugin - LIZA-AI V2
 * Developer: chank!nd3 p4d4y41!
 */

module.exports = {
    command: ['ping', 'p'],
    category: 'main',
    description: 'ബോട്ടിന്റെ സ്പീഡ് അറിയാൻ',
    async execute(sock, m, { args }) {
        try {
            // quoted മെസ്സേജ് ഒഴിവാക്കി നേരിട്ട് മെസ്സേജ് അയക്കുന്നു (Stability-ക്ക് വേണ്ടി)
            await sock.sendMessage(m.chat, { 
                text: 'Pong! 🏓\n*LIZA-AI V2 Online*' 
            });
        } catch (e) {
            console.error("Ping Plugin Error: ", e);
        }
    }
}
