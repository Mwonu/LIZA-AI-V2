// alive.js പ്ലഗിനിലെ മാതൃക
try {
    const text = `🤖 *LIZA-AI V2 Is Alive!* \n\n*Developer:* (hank!nd3 p4d4y41!\n*Status:* Running on Render`;
    
    await sock.sendMessage(m.chat, { 
        text: text,
        contextInfo: {
            externalAdReply: {
                title: "LIZA-AI V2",
                body: "(hank!nd3 p4d4y41!",
                thumbnailUrl: "https://telegra.ph/file/your_image.jpg", // നിങ്ങളുടെ ഇമേജ് ലിങ്ക്
                sourceUrl: "https://github.com/your-username",
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });

} catch (err) {
    console.error(err);
}
