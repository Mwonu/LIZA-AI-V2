const config = require("../config");

module.exports = {
    command: "noprefix",
    async execute(sock, msg, args) {
        if (!args[0]) return sock.sendMessage(msg.key.remoteJid, { text: "ഉപയോഗിക്കേണ്ട രീതി: `.noprefix on` അല്ലെങ്കിൽ `.noprefix off`" });

        if (args[0] === "on") {
            config.NO_PREFIX = true;
            await sock.sendMessage(msg.key.remoteJid, { text: "✅ No-Prefix Mode ഓൺ ചെയ്തു. ഇനി ചിഹ്നം ഇല്ലാതെ കമാൻഡുകൾ ഉപയോഗിക്കാം!" });
        } else {
            config.NO_PREFIX = false;
            await sock.sendMessage(msg.key.remoteJid, { text: "✅ No-Prefix Mode ഓഫ് ചെയ്തു. ഇനി പ്രിഫിക്സ് നിർബന്ധമാണ്." });
        }
    }
};
