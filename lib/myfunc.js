/**
 * LIZA-AI V2 - Helper Functions
 * Developer: (hank!nd3 p4d4y41!)
 */

const { jidDecode, downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');
const fs = require('fs');

// മെസ്സേജിനെ ലളിതമായ രീതിയിലേക്ക് മാറ്റുന്നു (Simple Message Format)
exports.smsg = (sock, m, store) => {
    if (!m) return m;
    let M = {};
    if (m.key) {
        M.key = m.key;
        M.fromMe = m.key.fromMe;
        M.id = m.key.id;
        M.chat = m.key.remoteJid;
        M.isGroup = M.chat.endsWith('@g.us');
        M.sender = sock.decodeJid(m.fromMe ? sock.user.id : (M.isGroup ? m.key.participant : m.key.remoteJid));
    }

    if (m.message) {
        M.mtype = getContentType(m.message); // മെസ്സേജ് ടൈപ്പ് കൃത്യമായി ലഭിക്കാൻ
        M.msg = (M.mtype == 'viewOnceMessageV2') ? m.message[M.mtype].message[getContentType(m.message[M.mtype].message)] : m.message[M.mtype];
        
        // --- കമാൻഡ് തിരിച്ചറിയാൻ താഴെ പറയുന്ന ബോഡി ലോജിക് നിർബന്ധമാണ് ---
        M.body = (M.mtype === 'conversation') ? m.message.conversation : 
                 (M.mtype === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                 (M.mtype === 'imageMessage') && m.message.imageMessage.caption ? m.message.imageMessage.caption : 
                 (M.mtype === 'videoMessage') && m.message.videoMessage.caption ? m.message.videoMessage.caption : 
                 (M.mtype === 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                 (M.mtype === 'interactiveResponseMessage') ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : 
                 (M.mtype === 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                 (M.mtype === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : "";

        M.mentionedJid = M.msg?.contextInfo?.mentionedJid || [];
        
        // Quoted Message കൈകാര്യം ചെയ്യുന്നു
        let quoted = M.msg?.contextInfo?.quotedMessage ? M.msg.contextInfo.quotedMessage : null;
        if (quoted) {
            M.quoted = {};
            M.quoted.type = getContentType(quoted);
            M.quoted.msg = quoted[M.quoted.type];
            M.quoted.sender = sock.decodeJid(M.msg.contextInfo.participant);
            M.quoted.body = M.quoted.msg?.text || M.quoted.msg?.caption || M.quoted.msg || "";
        } else {
            M.quoted = null;
        }
    }

    // മെസ്സേജ് റിപ്ലേ (Reply) ചെയ്യാനുള്ള എളുപ്പവഴി
    M.reply = (text) => sock.sendMessage(M.chat, { text: text }, { quoted: m });

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
