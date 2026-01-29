/**
 * LIZA-AI V2 Configuration
 * Developer: chank!nd3 p4d4y41!
 */

module.exports = {
    SESSION_ID: process.env.SESSION_ID || '', 
    OWNER_NUMBER: process.env.OWNER_NUMBER || '91...', // റെയിൽവേ വേരിയബിൾ വഴിയോ നേരിട്ടോ നൽകാം
    OWNER_NAME: 'chank!nd3 p4d4y41!',
    BOT_NAME: 'LIZA-AI V2',
    
    // Prefix സെറ്റിംഗ്സ്
    PREFIX: process.env.PREFIX || '.', 
    
    // റെയിൽവേയിൽ NO_PREFIX = true എന്ന് നൽകിയാൽ ചിഹ്നം ഇല്ലാതെ വർക്ക് ചെയ്യും
    NO_PREFIX: process.env.NO_PREFIX === 'true' ? true : false, 
    
    MODE: process.env.MODE || 'public',
    
    // സ്റ്റിക്കർ മെറ്റാഡേറ്റ
    PACKNAME: 'LIZA-AI V2',
    AUTHOR: 'chank!nd3 p4d4y41!'
};
