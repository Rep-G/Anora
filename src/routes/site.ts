import express from "express";
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from "bcrypt";
import log from "../utilities/structs/log.js";
import Users from "../model/user.js";
import fs from 'fs';
import Friends from "../model/friends.js";
import Profiles from "../model/profiles.js";
const app = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let authProviders = [
    {provider: "discord", field: "discordId"}
];
let changeableFields = ["username", "password"];
app.get("/shop", async (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, "../../Config/catalog_config.json"), 'utf8');
        res.status(200).json(JSON.parse(data));
    } catch (error) {
        res.status(500).send("Error reading the JSON file.");
    }
});
app.get("/site/get/email", async (req,res) => {
    try {
        const authorization = req.headers['authorization'];
        const type = req.query.type;
        if (!type || !authorization) return res.status(400).json({ success: false, message: "Missing paramaters"});
        let user;
        if (!authorization.startsWith("Bearer")) return res.status(400).json({ success: false, message: "Invalid authentication format"});
        switch (type) {
            case "credentials":
                const authCreds = authorization.slice(7);
                const email = authCreds.split(":")[0];
                const password = authCreds.split(":")[1];
                user = await Users.findOne({email: email});
                if (user) {
                    let validPassword = await bcrypt.compare(password, user.password);
                    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid email or password" });
                }
                break;
            case "token":
                const authToken = authorization.slice(7);
                user = await Users.findOne({wt: authToken});
                if (!user) return res.status(401).json({ success: false, message: "Invalid token" });
                break;
        }
        return res.status(200).json({"success": true, "message": user.email});
    }    
    catch(error: any) {
        
    }
});
app.get("/site/get/accountId", async (req,res) => {
    try {
        const authorization = req.headers['authorization'];
        const type = req.query.type;
        if (!type || !authorization) return res.status(400).json({ success: false, message: "Missing paramaters"});
        let user;
        if (!authorization.startsWith("Bearer")) return res.status(400).json({ success: false, message: "Invalid authentication format"});
        switch (type) {
            case "credentials":
                const authCreds = authorization.slice(7);
                const email = authCreds.split(":")[0];
                const password = authCreds.split(":")[1];
                user = await Users.findOne({email: email});
                if (user) {
                    let validPassword = await bcrypt.compare(password, user.password);
                    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid email or password" });
                }
                break;
            case "token":
                const authToken = authorization.slice(7);
                user = await Users.findOne({wt: authToken});
                if (!user) return res.status(401).json({ success: false, message: "Invalid token" });
                break;
        }
        return res.status(200).json({"success": true, "message": user.accountId});
    }    
    catch(error: any) {
        
    }
});
app.post("/site/account/delete", async (req, res) => {
    try {
        const authorization = req.headers['authorization'];
        const type = req.query.type;
        if (!type || !authorization) return res.status(400).json({ success: false, message: "Missing parameters" });
        let user;
        if (authorization && authorization.startsWith('Bearer ')) {
            switch (type) {
                case "credentials":
                    const authCreds = authorization.slice(7);
                    const email = authCreds.split(":")[0];
                    const password = authCreds.split(":")[1];
                    user = await Users.findOne({email: email});
                    if (user) {
                        let validPassword = await bcrypt.compare(password, user.password);
                        if (!validPassword) return res.status(401).json({ success: false, message: "Invalid email or password" });
                    }
                    break;
                case "token":
                    const authToken = authorization.slice(7);
                    user = await Users.findOne({wt: authToken});
                    if (!user) return res.status(401).json({ success: false, message: "Invalid token" });
                    break;
            }
            await Users.findOneAndDelete({accountId: user.accountId});
            await Friends.findOneAndDelete({accountId: user.accountId});
            await Profiles.findOneAndDelete({accountId: user.accountId});
            return res.status(200).json({success: true, message: "Deleted account"});
        }
        else return res.status(400).json({ success: false, message: "Invalid authentication header format" });
    } 
    catch(error: any) {
        return res.status(400).json({ success: false, message: "Internal server error: " + error.message });
    }
 
});
app.post("/site/change/:field", async (req, res) => {
    try {
        const field = req.params.field;
        let value = req.query.value;
        const authorization = req.headers['authorization'];
        const type = req.query.type;
        if (!field || !value || !type || !authorization) return res.status(400).json({ success: false, message: "Missing parameters" });
        let user;
        if (!changeableFields.includes(field)) return res.status(400).json({ success: false, message: "You are not allowed to change this field" });
        if (authorization && authorization.startsWith('Bearer ')) {
            switch (type) {
                case "credentials":
                    const authCreds = authorization.slice(7);
                    const email = authCreds.split(":")[0];
                    const password = authCreds.split(":")[1];
                    user = await Users.findOne({email: email});
                    if (user) {
                        let validPassword = await bcrypt.compare(password, user.password);
                        if (!validPassword) return res.status(401).json({ success: false, message: "Invalid email or password" });
                        if (field == "username" && (!user.roles.some(role => role.startsWith("Trusted:")) && !user.roles.some(role => role.startsWith("Donator:")))) {
                            return res.status(401).json({ success: false, message: "You must be a donator to do this" });
                        } 
                    }
                    break;
                case "token":
                    const authToken = authorization.slice(7);
                    user = await Users.findOne({wt: authToken});
                    if (!user) return res.status(401).json({ success: false, message: "Invalid token" });
                    if (field == "username" && (!user.roles.some(role => role.startsWith("Trusted:")) && !user.roles.some(role => role.startsWith("Donator:")))) {
                        return res.status(401).json({ success: false, message: "You must be a donator to do this" });
                    }    
                    break;
            }
            if (field == "password")  {
                value = await bcrypt.hash(value.toString(), 10);
            }
             await Users.findOneAndUpdate(
                { accountId: user.accountId },
                { $set: { [field]: value } },
                { new: true }
            );
            return res.status(200).json({success: true, message: "Updated field"});
        }
        else return res.status(400).json({ success: false, message: "Invalid authentication header format" });
    } 
    catch(error: any) {
        return res.status(400).json({ success: false, message: "Internal server error: " + error.message });
    }
 
});
app.get("/site/login/credentials", async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const authCreds = authHeader.slice(7);
        log.api(authCreds);
        try {
            const email = authCreds.split(":")[0];
            const password = authCreds.split(":")[1];
            const user = await Users.findOne({email: email});
            if (user) {
                const validPassword = await bcrypt.compare(password, user.password);
                if (!validPassword)  return res.status(401).json({ success: false, message: "Invalid email or password" });
                return res.status(200).json({ success: true, message: "Authenticated user" });
            }
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        } catch (err) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }
    } else {
        return res.status(400).json({ success: false, message: "No authentication header found" });
    }
});
app.get("/site/login/token", async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const authToken = authHeader.slice(7);

        try {
            const user = await Users.findOne({wt: authToken});
            if (user) return res.status(200).json({ success: true, message: user.email });
            return res.status(401).json({ success: false, message: "Invalid token" });
        } catch (err) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
    } else {
        return res.status(400).json({ success: false, message: "No authentication token found" });
    }
});

export default app;