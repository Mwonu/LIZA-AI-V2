/**
 * LIZA-AI V2 - Simple Store System
 * Developer: (hank!nd3 p4d4y41!)
 */

const fs = require('fs');

const makeInMemoryStore = () => {
    let store = {
        contacts: {},
        messages: {},
        chats: {}
    };

    return {
        contacts: store.contacts,
        messages: store.messages,
        chats: store.chats,

        bind: (ev) => {
            ev.on('contacts.update', (update) => {
                for (let contact of update) {
                    store.contacts[contact.id] = { ...store.contacts[contact.id], ...contact };
                }
            });

            ev.on('chats.set', ({ chats }) => {
                for (let chat of chats) {
                    store.chats[chat.id] = chat;
                }
            });
            
            // കൂടുതൽ സ്റ്റോർ ലോജിക് ഇവിടെ ചേർക്കാം
        },

        writeToFile: (path) => {
            fs.writeFileSync(path, JSON.stringify(store));
        },

        readFromFile: (path) => {
            if (fs.existsSync(path)) {
                store = JSON.parse(fs.readFileSync(path));
            }
        }
    };
};

module.exports = { makeInMemoryStore };
