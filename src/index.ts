import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from 'path';
import axios from "axios";
import jwt, { JwtPayload } from 'jsonwebtoken';
import rateLimit from "express-rate-limit";
import cors from "cors";
import { dirname } from 'dirname-filename-esm';
import destr from "destr";
import {Clients} from "./xmpp/xmpp.js";
import { client } from './bot/index.js';
import cookie from "cookie";
import kv from './utilities/kv.js';
import Safety from './utilities/safety.js';
import User from "./model/user.js";
import functions from "./utilities/structs/functions.js";
import Shop from "./utilities/shop.js";
import error from "./utilities/structs/error.js";
import log from './utilities/structs/log.js';

import { DateAddHours } from "./routes/auth.js";

const __dirname = dirname(import.meta);

global.kv = kv;
global.safety = Safety;
global.JWT_SECRET = functions.MakeID();
global.safetyEnv = Safety.env;
global.accessTokens = [];
global.refreshTokens = [];
global.clientTokens = [];
global.smartXMPP = false;
global.exchangeCodes = [];

const app = express();
const PORT = Safety.env.PORT;

await Safety.airbag();
await client.login(process.env.BOT_TOKEN);

let tokens: any;

tokens = destr(fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
for (let tokenType in tokens) {
    for (let tokenIndex in tokens[tokenType]) {
        let decodedToken: JwtPayload = jwt.decode(tokens[tokenType][tokenIndex].token.replace("eg1~", "")) as JwtPayload;

        if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
            tokens[tokenType].splice(Number(tokenIndex), 1);
        }
    }
}

fs.writeFileSync(path.join(__dirname, "../tokens.json"), JSON.stringify(tokens, null, 2) || "");

if (!tokens || !tokens.accessTokens) {
    console.log("No access tokens found, resetting tokens.json");
    await kv.set('tokens', fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
    tokens = destr(fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
}

global.accessTokens = tokens.accessTokens;
global.refreshTokens = tokens.refreshTokens;
global.clientTokens = tokens.clientTokens;

mongoose.set("strictQuery", true);

mongoose
    .connect(Safety.env.MONGO_URI)
    .then(() => {
        log.backend("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB: ", error);
    });

mongoose.connection.on("error", (err) => {
    log.error(
        "MongoDB failed to connect, please make sure you have MongoDB installed and running."
    );
    throw err;
});
function cleanupOldExchangeCodes() {
    const currentTime = Date.now();
    const initialLength = global.exchangeCodes.length;

    global.exchangeCodes = global.exchangeCodes.filter(code => {
        const codeCreationTime = new Date(code.creationDate).getTime();
        return currentTime - codeCreationTime <= 300000;
    });

    if (global.exchangeCodes.length < initialLength) {
        log.backend('Cleaned up expired exchange codes');
    }
}

setInterval(cleanupOldExchangeCodes, 5000);
app.get('/auth/discord/callback', async (req, res) => {
    const { code } = req.query;

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: Safety.env.CLIENT_ID,
            client_secret: Safety.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code as string,
            redirect_uri: "https://backend.anorafn.org/auth/discord/callback",
            scope: 'identify' 
        }));

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const discordId = userResponse.data.id;

        const user = await User.findOne({ discordId });
        let success;
        let status;
        if (user) {
            status = "Success";
            success = "true"
            user.wt = functions.MakeID();
            await user.save();  
            return res.send(`
              <!DOCTYPE html>
                <html>
                    <head>
                        <title>Anora Authorization</title>
                    </head>
                    <body>
                        <p>${status}, redirecting back to site.</p>
                        <script>
                            document.cookie = "anora_auth=${user.wt}; path=/; domain=.anorafn.org; Secure; SameSite=Lax; Max-Age=604800";
                            setTimeout(function() {
                                 window.location.href = "${Safety.env.SITE_URL}/login?success=${success}&type=token";
                            }, 1000);
                        </script>
                    </body>
                </html>
            `)
            
        } else {
            success = "false";
            status = "Failed"
            return res.send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Anora Authorization</title>
                    </head>
                    <body>
                        <p>${status}, redirecting back to site.</p>
                        <script>
                            setTimeout(function() {
                                 window.location.href = "${Safety.env.SITE_URL}/login?success=${success}&type=token";
                            }, 1000);
                        </script>
                    </body>
                </html>
            `)
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});
app.get("/", (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Server Status</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 0; 
                    display: flex; 
                    justify-content: center; 
                    flex-direction: column; 
                    align-items: center; 
                    min-height: 100vh; 
                    background: linear-gradient(180deg, #201E2E 0%, #080913 100%); 
                    background-repeat: no-repeat; 
                    background-size: cover; 
                    background-position: center; 
                }
                h1 { color: #fff; font-size: 50px; }
                pre { background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 5px; color: #fff; }
                p, h2, h3 { color: #fff; }
            </style>
        </head>
        <body>
            <h1>Anora Backend</h1>
            <h3>There are currently <strong>${Clients.length}</strong> online</h3>
            <p><strong>Status:</strong> OK</p>
            <p><strong>Uptime:</strong> ${uptime.toFixed(2)} seconds</p>
            <p><strong>Node Version:</strong> ${process.version}</p>
            <p><strong>Platform:</strong> ${process.platform} (${process.arch})</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'Not Set'}</p>
            <h2>Memory Usage</h2>
            <pre>${JSON.stringify(memoryUsage, null, 2)}</pre>
            <h2>CPU Usage</h2>
            <pre>${JSON.stringify(cpuUsage, null, 2)}</pre>
        </body>
    </html>
    `);
});

// app.use(rateLimit({ windowMs: 0.5 * 60 * 1000, max: 45 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: ['https://anorafn.org', 'http://localhost:3000'],
    credentials: true,
}));

const importRoutes = async (dir) => {
    for (const fileName of fs.readdirSync(path.join(__dirname, dir))) {
        if (fileName.includes(".map")) continue;
        try {
            app.use((await import(`file://${__dirname}/${dir}/${fileName}`)).default);
        } catch (error) {
            console.log(fileName, error)
        }
    }
};

await importRoutes("routes");

app.listen(PORT, () => {
    log.backend(`App started listening on port ${PORT}`);
    import("./xmpp/xmpp.js");
}).on("error", async (err) => {
    if (err.message == "EADDRINUSE") {
        log.error(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
        await functions.sleep(3000)
        process.exit(0);
    } else throw err;
});

const loggedUrls = new Set<string>();

Shop.updateShop();

app.use((req, res, next) => {
    const url = req.originalUrl;
    if (!loggedUrls.has(url)) {
        log.debug(`Missing endpoint: ${req.method} ${url} request port ${req.socket.localPort}`);
        return error.createError(
            "errors.com.epicgames.common.not_found",
            "Sorry, the resource you were trying to find could not be found",
            undefined, 1004, undefined, 404, res
        );
    }
    next();
});
