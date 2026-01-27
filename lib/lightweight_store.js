/**
 * Developer: (hank!nd3 p4d4y41!)
 */

const fs = require('fs');

const makeInMemoryStore = () => {
    let store = { contacts: {}, messages: {}, chats: {} };

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
        },

        writeToFile: (path) => {
            fs.writeFileSync(path, JSON.stringify(store));
        },

        // ഈ ഫംഗ്ഷൻ ഉണ്ടെന്ന് ഉറപ്പുവരുത്തുക
        readFromFile: (path) => {
            if (fs.existsSync(path)) {
                try {
                    const data = JSON.parse(fs.readFileSync(path));
                    store.contacts = data.contacts || {};
                    store.messages = data.messages || {};
                    store.chats = data.chats || {};
                } catch (e) {
                    console.log("Store file read error:", e);
                }
            }
        }
    };
};

module.exports = { makeInMemoryStore };
