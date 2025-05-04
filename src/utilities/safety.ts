import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { z } from "zod";

import { dirname } from 'dirname-filename-esm'

const __dirname = dirname(import.meta)

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const configSchema = z.object({
    MONGO_URI: z.string(),
    BOT_TOKEN: z.string(),
    GUILD_ID: z.string(),
    REPORT_CHANNEL: z.string(),
    VERSION: z.string(),
    CLIENT_ID: z.string(),
    SITE_URL: z.string(),
    CLIENT_SECRET: z.string(),
    API_KEY: z.string(),
    VBUCKS_ON_KILL: z.string(),
    VBUCKS_ON_WIN: z.string(),
    TIER_ON_KILL: z.string(),
    NAME: z.string(),
    PORT: z.number(),
    MATCHMAKER_IP: z.string(),
    MAIN_SEASON: z.number(),
    ENABLE_CROSS_BANS: z.boolean(),
    DEBUG_LOG: z.boolean(),
});

export class Safety {
    private convertToBool(value: string | undefined | boolean, key: string): boolean {
        if (value === "true") {
            return true;
        } else if (value === "false") {
            return false;
        } else {
            throw new Error(`The environment variable ${key} is not true or false, please declare it correctly in the .env file. Value: ${value}`);
        }
    }

    public isDev: boolean = process.env.USERENVIROMENT === "development";

    public env: z.infer<typeof configSchema> = {
        MONGO_URI: process.env.MONGO_URI,
        BOT_TOKEN: process.env.BOT_TOKEN,
        GUILD_ID: process.env.GUILD_ID as string,
        REPORT_CHANNEL: process.env.REPORT_CHANNEL as string,
        CLIENT_ID: process.env.CLIENT_ID as string,
        SITE_URL: process.env.SITE_URL as string,
        CLIENT_SECRET: process.env.CLIENT_SECRET as string,
        VERSION: process.env.VERSION as string,
        API_KEY: process.env.API_KEY as string,
        VBUCKS_ON_KILL: process.env.VBUCKS_ON_KILL as string,
        VBUCKS_ON_WIN: process.env.VBUCKS_ON_WIN as string,
        TIER_ON_KILL: process.env.TIER_ON_KILL as string,
        NAME: process.env.NAME,
        PORT: parseInt(process.env.PORT),
        MATCHMAKER_IP: process.env.MATCHMAKER_IP,
        MAIN_SEASON: parseInt(process.env.MAIN_SEASON),
        ENABLE_CROSS_BANS: this.convertToBool(process.env.ENABLE_CROSS_BANS, "ENABLE_CROSS_BANS"),
        DEBUG_LOG: this.convertToBool(process.env.DEBUG_LOG, "DEBUG_LOG"),
    };

    public async airbag(): Promise<boolean> {
        try {
            const stateDir = path.join(__dirname, ".././state/");
            if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir);
    
            if (parseInt(process.version.slice(1)) < 18) {
                throw new Error(`Your node version is too old, please update to at least 18. Your version: ${process.version}`);
            }
    
            const tokens = JSON.stringify({ "accessTokens": [], "refreshTokens": [], "clientTokens": [] });
    
            const tokensPath = path.resolve(__dirname, "../../tokens.json");
            if (!fs.existsSync(tokensPath)) fs.writeFileSync(tokensPath, tokens);
    
            let missingVariables = Object.entries(this.env)
                .filter(([key, value]) => value === undefined && key !== "CLIENT_ID" && key !== "GUILD_ID")
                .map(([key]) => key);
    
            if (missingVariables.length > 0) {
                throw new TypeError(`The environment ${missingVariables.length > 1 ? "variables" : "variable"} ${missingVariables.join(", ")} ${missingVariables.length > 1 ? "are" : "is"} missing, please declare ${missingVariables.length > 1 ? "them" : "it"} in the .env file.`);
            }
    
            this.env.NAME = this.env.NAME?.replace(/ /g, "_");
    
            return true;
        } catch (error) {
            console.error("Error in airbag(): ", error);
            return false;
        }
    }
}

export default new Safety();
