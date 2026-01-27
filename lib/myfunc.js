/**
 * LIZA-AI V2 - Helper Functions
 * Developer: (hank!nd3 p4d4y41!)
 */

const { jidDecode, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');

// മെസ്സേജിനെ ലളിതമായ രീതിയിലേക്ക് മാറ്റുന്നു (Simple Message Format)
exports.smsg = (sock, m, store) => {
    if (!m) return m;
    let M = {};
    if (m.key) {
        M.key = m.key;
        M.fromMe = m.key.fromMe;
        M.id = m.key.id;
        M.isGroup = m.key.remoteJid.endsWith('@g.us');
        M.remoteJid = m.key.remoteJid;
        M.sender = sock.decodeJid(m.fromMe ? sock.user.id : (M.isGroup ? m.key.participant : m.key.remoteJid));
    }

    if (m.message) {
        M.type = Object.keys(m.message)[0];
        M.msg = m.message[M.type];
        M.body = m.message.conversation || m.message.extendedTextMessage?.text || m.message[M.type]?.caption || m.message[M.type]?.text || "";
        M.mention = m.message[M.type]?.contextInfo?.mentionedJid || [];
        M.quoted = m.message[M.type]?.contextInfo?.quotedMessage || null;
    }

    // മെസ്സേജ് റീപ്ലേ (Reply) ചെയ്യാനുള്ള എളുപ്പവഴി
    M.reply = (text) => sock.sendMessage(M.remoteJid, { text: text }, { quoted: m });

    return M;
};

// JID ഡീകോഡ് ചെയ്യാൻ
exports.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    } else return jid;
};
