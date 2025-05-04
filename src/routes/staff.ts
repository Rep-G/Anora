import destr from "destr";
import express from "express";
import {dirname} from "dirname-filename-esm";
import fs from "fs";
import path from "path";
import Shop from "../utilities/shop.js";
import Users from "../model/user.js";
import functions from "../utilities/structs/functions.js";
import Profiles from "../model/profiles.js";
import log from "../utilities/structs/log.js";
import Friends from "../model/friends.js";
import safety from "../utilities/safety.js";
const app = express.Router();
const __dirname = dirname(import.meta);

app.get("/api/staff/rotateshop/:apikey", async (req, res) => {
    if (req.params.apikey !== safety.env.API_KEY) {
        return res.status(400).send("Invalid API Key");
    }
    log.api("Staff used rotate shop command");
    var response = await Shop.updateShop();
    return res.status(200).send(response);
});

app.get("/api/staff/exchangecodes/:apikey", async (req, res) => {
    if (req.params.apikey !== safety.env.API_KEY) {
        return res.status(400).send("Invalid API Key");
    }
    return res.status(200).json(global.exchangeCodes);
});
app.get("/api/staff/setuser/:apikey", async (req, res) => {
    if (req.params.apikey !== safety.env.API_KEY) {
        return res.status(400).send("Invalid API Key");
    }

    var accountId = req.headers['accountid'];  
    var field: any = req.headers['field'];
    var value: any = req.headers['value'];

    if (!accountId || !field || value === undefined) {
        return res.status(400).send("Missing required headers: accountId, field, value");
    }

    if (value === "true") {
        value = true;
    } else if (value === "false") {
        value = false;
    }

    try {
        if (field == "kills" || field == "wins") {
            value = parseInt(value);
        }
        const updatedUser = await Users.findOneAndUpdate(
            { accountId: accountId },
            { $set: { [field]: value } },
            { new: true }
        );

        if (updatedUser) {
            log.api(`Staff used set user endpoint on ${updatedUser.username}`);
            return res.status(200).send("Updated user");
        } else {
            return res.status(404).send("User not found");
        }
    } catch (error) {
        log.error("Error: " + error);
        return res.status(500).send("Error updating user");
    }
});

app.get("/api/staff/deleteuser/:apikey", async (req, res) => {
    if (req.params.apikey !== safety.env.API_KEY) {
        return res.status(400).send("Invalid API Key");
    }

    var accountId = req.headers['accountid'];  

    if (!accountId === undefined) {
        return res.status(400).send("Missing required headers: accountId, field, value");
    }
    try {
        const updatedUser = await Users.findOneAndDelete({ accountId: accountId});
        const updatedProfile = await Profiles.findOneAndDelete({ accountId: accountId});
        const updatedFriends = await Friends.findOneAndDelete({ accountId: accountId});
        if (updatedUser) {
            log.api(`Staff used delete user endpoint on ${updatedUser.username}`);
            return res.status(200).send("Deleted user");
        } else {
            return res.status(404).send("User not found");
        }
    } catch (error) {
        log.error("Error: " + error);
        return res.status(500).send("Error deleting user");
    }
});

app.get("/api/staff/setvbucks/:apikey", async (req, res) => {
    if (req.params.apikey !== safety.env.API_KEY) {
        return res.status(400).send("Invalid API Key");
    }

    var accountId = req.headers['accountid'];  
    var add: any = req.headers['add'];
    var value: any = req.headers['value'];

    if (!accountId || !add || !value) {
        return res.status(400).send("Missing required headers: accountId, add, value");
    }
    if (add === "true") {
        add = true;
    } else if (add === "false") {
        add = false;
    }
    try {
        let user = await Users.findOne({accountId: accountId})
        if (user)
        {
            if (add == "true")
            {
                const updatedProfile = await Profiles.findOneAndUpdate(
                    { accountId: accountId },
                    { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': parseInt(value) } },
                    { new: true }
                );
                if (updatedProfile) {
                    log.api(`Staff used set vbucks endpoint on ${user?.username}`);
                    return res.status(200).send("Updated user");
                } else {
                    return res.status(404).send("User not found");
                }
            }
            else
            {
                const updatedProfile = await Profiles.findOneAndUpdate(
                    { accountId: accountId },
                    { $set: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': parseInt(value) } },
                    { new: true }
                );
                if (updatedProfile) {
                    log.api(`Staff used set vbucks endpoint on ${user?.username}`);
                    return res.status(200).send("Updated user");
                } else {
                    return res.status(404).send("User not found");
                }
            }
        }
        else
        {
            return res.status(404).send("User not found");
        }


    } catch (error) {
        log.error("Error: " + error);
        return res.status(500).send("Error updating user");
    }
});

app.get("/api/staff/givefl/:apikey", async (req, res) => {
    if (req.params.apikey !== safety.env.API_KEY) {
        return res.status(400).send("Invalid API Key");
    }

    var accountId = req.headers['accountid'];
    try {
        if (accountId) {
            const User = await Users?.findOne({ accountId: accountId });
            if (User) {
                const allItems = destr<{ items: any }>(fs.readFileSync(path.join(__dirname, "../../Config/DefaultProfiles/allathena.json"), 'utf8'))
                if (!allItems) return res.status(400).send("Failed to parse all items");
            
                Profiles.findOneAndUpdate({ accountId: User.accountId }, { $set: { "profiles.athena.items": allItems.items } }, { new: true }, (err, doc) => {
                    if (err) log.error(err.toString());
            
                });
                User.fullLocker = true;
                    await User.save();
                    log.api(`Staff used full locker endpoint on ${User.username}`);
                    return res.status(200).send("Updated user with full locker");
            }
        } else {
            return res.status(400).send("Please provide a valid accountId header");
        }
    } catch (error) {
        log.error("Error: " + error);
        return res.status(500).send("Error giving full locker");
    }
});

app.get("/api/staff/additem/:apikey", async (req, res) => {
    if (req.params.apikey !== safety.env.API_KEY) {
        return res.status(400).send("Invalid API Key");
    }

    var accountId = req.headers.accountid;
    var cosmeticName: any = req.headers.cosmeticname;

    if (!accountId || !cosmeticName) {
        console.log(req.headers);
        return res.status(400).send("Please provide both 'accountid' and 'cosmeticname' headers");
    }

    try {
        const user = await Users?.findOne({ accountId: accountId });
        if (!user) return res.status(404).send("User not found");

        const profile = await Profiles?.findOne({ accountId: accountId });
        if (!profile) return res.status(404).send("Profile not found");

        const cosmeticData = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search?name=${cosmeticName}`).then(res => res.json());
        if (!cosmeticData || !cosmeticData.data) return res.status(404).send(`Cosmetic '${cosmeticName}' not found`);

        const cosmeticFromAPI = cosmeticData.data;
        const cosmeticId = cosmeticFromAPI.id;
        /*const regex = /^(?:[A-Z][a-z]*\b\s*)+$/;

        if (!regex.test(cosmeticName)) {
            return res.status(400).send("Please ensure the cosmetic name has correct casing (e.g., 'Renegade Raider')");
        }*/

        const allItems = destr<{ items: any }>(fs.readFileSync(path.join(__dirname, "../../Config/DefaultProfiles/allathena.json"), 'utf8'))
        if (!allItems) return res.status(400).send("Failed to parse all items");

        const items = allItems["items"];

        let foundCosmeticKey = "";
        let found = false;

        for (const key of Object.keys(items)) {
            const [type, id] = key.split(":");
            if (id === cosmeticId) {
                foundCosmeticKey = key;
                if (profile.profiles.athena.items[key]) {
                    return res.status(400).send("User already owns this cosmetic");
                }
                found = true;
                break;
            }
        }

        if (!found) {
            return res.status(404).send(`Cosmetic '${cosmeticName}' not found in the local data`);
        }

        await Profiles.findOneAndUpdate(
            { accountId: accountId },
            { $set: { [`profiles.athena.items.${foundCosmeticKey}`]: items[foundCosmeticKey] } },
            { new: true }
        ).catch((error: any) => {
            if (error)
            {
                log.error(error);
            }
            return res.status(500).send("Error updating profile with the cosmetic");
        });

        functions.refreshAccount(accountId, user.username);
        log.api("Added " + cosmeticName + " to user " + user.username);
        return res.status(200).send(`Successfully added '${cosmeticName}' to user '${user.username}'`);
    } catch (error: any) {
        log.error(error);
        return res.status(500).send("An unexpected error occurred");
    }
});

export default app;