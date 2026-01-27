/**
 * LIZA-AI V2 - Core Engine
 * Optimized for Railway Deployment
 * Developer: (hank!nd3 p4d4y41!)
 */

require('./config') 
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const { smsg } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const express = require('express');

// --- 🌐 RAILWAY SERVER SETUP ---
const app = express();
const port = process.env.PORT || 3000; 

app.get('/', (req, res) => { res.send('LIZA-AI V2 is Running Successfully!'); });
app.listen(port, "0.0.0.0", () => { 
    console.log(chalk.green(`🌐 Server active on port ${port}`)); 
});

// --- 📦 STORE SETUP (hank!nd3 p4d4y41!) ---
const { makeInMemoryStore } = require('./lib/lightweight_store') // Destructuring ശരിയാക്കി
const store = makeInMemoryStore()
store.readFromFile('./baileys_store.json') // ഫയൽ പാത്ത് നൽകി

const config = require('./config') 

// 10 സെക്കൻഡ് കൂടുമ്പോൾ ഡാറ്റ സേവ് ചെയ്യും
setInterval(() => {
    try {
        store.writeToFile('./baileys_store.json')
    } catch (e) {
        console.log("Store write error: ", e.message)
    }
}, config.storeWriteInterval || 10000)

async function startLizaBot() {
    try {
        if (!fs.existsSync('./session')) fs.mkdirSync('./session');
        
        // --- 🔑 SESSION ID HANDLING ---
        if (!fs.existsSync('./session/creds.json') && process.env.SESSION_ID) {
            try {
                let sessionID = process.env.SESSION_ID;
                let sessionData = sessionID.includes('LIZA~') 
                    ? sessionID.split('LIZA~')[1]
