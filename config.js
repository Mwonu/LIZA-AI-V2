/**
 * LIZA-AI V2 Configuration
 * Developer: Chank!nd3 p4d4y41!
 */

module.exports = {
    SESSION_ID: process.env.SESSION_ID || '', 
    OWNER_NUMBER: process.env.OWNER_NUMBER || '91...', 
    OWNER_NAME: 'Chank!nd3 p4d4y41!',
    BOT_NAME: 'LIZA-AI V2',
    
    // Prefix സെറ്റിംഗ്സ്
    // ചിഹ്നം ഇല്ലാതെ വർക്ക് ചെയ്യാൻ ഇതിൽ '' (Empty String) നൽകിയാൽ മതി
    // ഒരേസമയം രണ്ടും വേണമെങ്കിൽ ['.', ''] എന്ന് നൽകാം
    PREFIX: process.env.PREFIX || '.', 
    
    // No-Prefix Mode: ഇത് true ആക്കിയാൽ ചിഹ്നം ഇല്ലാതെയും കമാൻഡുകൾ പ്രവർത്തിക്കും
    NO_PREFIX: process.env.NO_PREFIX === 'true' ? true : false, 
    
    MODE: process.env.MODE || 'public',
    
    // സ്റ്റിക്കർ മെറ്റാഡേറ്റ (നിങ്ങൾ നേരത്തെ ആവശ്യപ്പെട്ടത്)
    PACKNAME: 'LIZA-AI V2',
    AUTHOR: 'Chank!nd3 p4d4y41!'
};
