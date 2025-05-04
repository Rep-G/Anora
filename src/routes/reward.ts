import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import safety from "../utilities/safety.js";
import Profiles from "../model/profiles.js";
import log from "../utilities/structs/log.js";
import {dirname} from "dirname-filename-esm";
import Users from "../model/user.js";
import profileManager from "../structs/profile.js";
import functions from "../utilities/structs/functions.js";
const __dirname = dirname(import.meta);  
const app = express.Router();
var season = `Season${safety.env.MAIN_SEASON}`;
var profileId = "athena";
var ItemExists = false;
let BattlePass = JSON.parse(fs.readFileSync(path.join(__dirname, "../..", "responses", "BattlePass", `${season}.json`), "utf8"));

app.get("/rewards/kill/:key", async (req, res) => {
    if (req.params.key == safety.env.API_KEY)
    {
        const User = await Users.findOne({username: req.query.username});
        if (User)
        {
            const vbucks = parseInt(safety.env.VBUCKS_ON_KILL);
            const filter = { accountId: User?.accountId };
            const profile = await Profiles.findOne(filter);
            if (typeof profile?.profiles.common_core.items["Currency:MtxPurchased"].quantity === 'string') {
                await Profiles.updateOne(
                    filter,
                    { $set: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': parseInt(profile.profiles.common_core.items["Currency:MtxPurchased"].quantity) || 0 } }
                );
            }
            const update = { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': 75 } };
            const options = { new: true };
            await Profiles.findOneAndUpdate(filter, update, options);
            await Users.findOneAndUpdate(
                { username: req.query.username },
                { $inc: { 
                    'kills': 1
                } },
                { new: true}
            );
            functions.refreshAccount(User?.accountId, User?.username);
            if (!User.roles.some(role => role.startsWith("Donator:")) && User.fullLocker === false && profile?.profiles["athena"].stats.attributes.book_purchased === false)
                {
                    await giveBattlePassItem("athena", "3C1777684B7D65BECE90F28BB05CB4AF", profile.profiles["athena"].rvn, 1, User?.accountId);
                }
                else if (!User.roles.some(role => role.startsWith("Donator:")) && User.fullLocker === false && profile?.profiles["athena"].stats.attributes.book_level < 100 && profile?.profiles["athena"].stats.attributes.book_purchased === true)
                {
                    
                    await giveBattlePassItem("athena", "C677E22244C444256A79ACA0C59BAE7D", profile.profiles["athena"].rvn, 1, User?.accountId);
                }
                else if (User.roles.some(role => role.startsWith("Donator:")) &&  User.fullLocker === false && profile?.profiles["athena"].stats.attributes.book_level < 100 && profile?.profiles["athena"].stats.attributes.book_purchased === true || User.roles.some(role => role.startsWith("Donator:")) && User.fullLocker === false && profile?.profiles["athena"].stats.attributes.book_purchased === false)
                {
                    await giveBattlePassItem("athena", "A9DB423A2EDB4D8CA4D97204CE3F0D79", profile.profiles["athena"].rvn, 1, User?.accountId)
                }
                
            log.api(`Sent ${vbucks} vbucks to ${User?.username} for 1 kill, user now has ${User?.kills} kills, giving bp tier!`)
            return res.status(200).send("Gave reward");
        }
        else
        {
            return res.status(400).send("User not found");
        }
    }
    else
    {
        return res.status(400).send("Invalid API Key");
    }
});

app.get("/rewards/win/:key", async (req, res) => {
    if (req.params.key == safety.env.API_KEY)
    {
        const User = await Users.findOne({username: req.query.username})
        if (User)
        {
            const amount = `${safety.env.VBUCKS_ON_WIN}`;
            const vbucks = parseInt(amount);
            const filter = { accountId: User?.accountId };
            const update = { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': 25 } };
            const options = { new: true };
            await Profiles.findOneAndUpdate(filter, update, options);
            await Users.findOneAndUpdate(
                { username: req.query.username },
                { $inc: { 
                    'wins': 1
                } },
                { new: true}
            );
            await Profiles.findOneAndUpdate(
                filter,
                { $inc: { 
                    'profiles.athena.stats.attributes.level': 1
                } },
                options
            );
            functions.refreshAccount(User?.accountId, User?.username);
            log.api(`Sent ${amount} vbucks to ${User?.username} for 1 win, user now has ${User?.wins} wins`)
            return res.status(200).send("Gave reward");
        }
        else
        {
            return res.status(400).send("User not found");
        }
    }
    else
    {
        return res.status(400).send("Invalid API Key");
    }
});


async function giveBattlePassItem(profileId, offerId, queryRevision, purchaseQuantity, accountId) {
    const profiles = await Profiles.findOne({ accountId: accountId });

    if (!(await profileManager.validateProfile(profileId, profiles))) { return "No profile template"}

    let profile = profiles?.profiles[(profileId as string)];
    let athena = profiles?.profiles["athena"];


    let MultiUpdate: any[] = [{
        "profileRevision": athena.rvn || 0,
        "profileId": "athena",
        "profileChangesBaseRevision": athena.rvn || 0,
        "profileChanges": [],
        "profileCommandRevision": athena.commandRevision || 0,
    }];

    let memory = {
        season: 13,
        build: 13.40
    }
    let Notifications: any[] = [];
    let ApplyProfileChanges: Object[] = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = queryRevision || -1;

    if (!profile.items) profile.items = {};
    if (!athena.items) athena.items = {};

    if (memory.season == safety.env.MAIN_SEASON) {

        var season = `Season${safety.env.MAIN_SEASON}`; // Don't change it if you don't know what it is
        var OnlySeasonNumber = `${safety.env.MAIN_SEASON}`;
        var ItemExists = false;
        let BattlePass = JSON.parse(fs.readFileSync(path.join(__dirname, "../..", "responses", "BattlePass", `${season}.json`), "utf8"));
        if (!BattlePass) {
            log.debug(`PurchaseCatalogEntry: No Battle Pass found for season: ${season}`);
            return "No battlepass for this season";
        }

        if (offerId == BattlePass.battlePassOfferId || offerId == BattlePass.battleBundleOfferId || offerId == BattlePass.tierOfferId) {

            if (BattlePass.battlePassOfferId == offerId || BattlePass.battleBundleOfferId == offerId) {
                let lootList: {
                    itemType: string;
                    itemGuid: string;
                    quantity: number;
                }[] = [];
                var EndingTier = athena.stats.attributes.book_level;
                athena.stats.attributes.book_purchased = true;

                const tokenKey = `Token:Athena_S${OnlySeasonNumber}_NoBattleBundleOption_Token`;
                const tokenData = {
                    "templateId": `Token:athena_s${OnlySeasonNumber}_nobattlebundleoption_token`,
                    "attributes": {
                        "max_level_bonus": 0,
                        "level": 1,
                        "item_seen": true,
                        "xp": 0,
                        "favorite": false
                    },
                    "quantity": 1
                };
    
                profiles!.profiles["common_core"].items[tokenKey] = tokenData;
            
                ApplyProfileChanges.push({
                    "changeType": "itemAdded",
                    "itemId": tokenKey,
                    "item": tokenData
                });

                if (BattlePass.battleBundleOfferId == offerId) {
                    athena.stats.attributes.book_level += 25;
                    if (athena.stats.attributes.book_level > 100)
                        athena.stats.attributes.book_level = 100;
                    EndingTier = athena.stats.attributes.book_level;
                }
                for (var i = 0; i < EndingTier; i++) {
                    var FreeTier = BattlePass.freeRewards[i] || {};
                    var PaidTier = BattlePass.paidRewards[i] || {};
                    for (var item in FreeTier) {
                        if (item.toLowerCase() == "token:athenaseasonxpboost") {
                            athena.stats.attributes.season_match_boost += FreeTier[item];
                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "season_match_boost",
                                "value": athena.stats.attributes.season_match_boost
                            });
                        }
                        if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                            athena.stats.attributes.season_friend_match_boost += FreeTier[item];
                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "season_friend_match_boost",
                                "value": athena.stats.attributes.season_friend_match_boost
                            });
                        }
                        if (item.toLowerCase().startsWith("currency:mtx")) {
                            for (var key in profile.items) {
                                if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                    if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                        profile.items[key].attributes.quantity += FreeTier[item];
                                        break;
                                    }
                                }
                            }
                        }
                        if (item.toLowerCase().startsWith("homebasebanner")) {
                            for (var key in profile.items) {
                                if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                    profile.items[key].attributes.item_seen = false;
                                    ItemExists = true;
                                    ApplyProfileChanges.push({
                                        "changeType": "itemAttrChanged",
                                        "itemId": key,
                                        "attributeName": "item_seen",
                                        "attributeValue": profile.items[key].attributes.item_seen
                                    });
                                }
                            }
                            if (ItemExists == false) {
                                var ItemID = functions.MakeID();
                                var Item = { "templateId": item, "attributes": { "item_seen": false }, "quantity": 1 };
                                profile.items[ItemID] = Item;
                                ApplyProfileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": ItemID,
                                    "item": Item
                                });
                            }
                            ItemExists = false;
                        }
                        if (item.toLowerCase().startsWith("athena")) {
                            for (var key in athena.items) {
                                if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                    athena.items[key].attributes.item_seen = false;
                                    ItemExists = true;
                                    MultiUpdate[0].profileChanges.push({
                                        "changeType": "itemAttrChanged",
                                        "itemId": key,
                                        "attributeName": "item_seen",
                                        "attributeValue": athena.items[key].attributes.item_seen
                                    });
                                }
                            }
                            if (ItemExists == false) {
                                var ItemID = functions.MakeID();
                                const Item = { "templateId": item, "attributes": { "max_level_bonus": 0, "level": 1, "item_seen": false, "xp": 0, "variants": [], "favorite": false }, "quantity": FreeTier[item] };
                                athena.items[ItemID] = Item;
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": ItemID,
                                    "item": Item
                                });
                            }
                            ItemExists = false;
                        }
                        lootList.push({
                            "itemType": item,
                            "itemGuid": item,
                            "quantity": FreeTier[item] as number
                        });
                    }
                    for (var item in PaidTier) {
                        if (item.toLowerCase() == "token:athenaseasonxpboost") {
                            athena.stats.attributes.season_match_boost += PaidTier[item];
                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "season_match_boost",
                                "value": athena.stats.attributes.season_match_boost
                            });
                        }
                        if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                            athena.stats.attributes.season_friend_match_boost += PaidTier[item];
                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "season_friend_match_boost",
                                "value": athena.stats.attributes.season_friend_match_boost
                            });
                        }
                        if (item.toLowerCase().startsWith("currency:mtx")) {
                            for (var key in profile.items) {
                                if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                    if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                        profile.items[key].quantity += PaidTier[item];
                                        break;
                                    }
                                }
                            }
                        }
                        if (item.toLowerCase().startsWith("homebasebanner")) {
                            for (var key in profile.items) {
                                if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                    profile.items[key].attributes.item_seen = false;
                                    ItemExists = true;
                                    ApplyProfileChanges.push({
                                        "changeType": "itemAttrChanged",
                                        "itemId": key,
                                        "attributeName": "item_seen",
                                        "attributeValue": profile.items[key].attributes.item_seen
                                    });
                                }
                            }
                            if (ItemExists == false) {
                                var ItemID = functions.MakeID();
                                var Item = { "templateId": item, "attributes": { "item_seen": false }, "quantity": 1 };
                                profile.items[ItemID] = Item;
                                ApplyProfileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": ItemID,
                                    "item": Item
                                });
                            }
                            ItemExists = false;
                        }
                        if (item.toLowerCase().startsWith("athena")) {
                            for (var key in athena.items) {
                                if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                    athena.items[key].attributes.item_seen = false;
                                    ItemExists = true;
                                    MultiUpdate[0].profileChanges.push({
                                        "changeType": "itemAttrChanged",
                                        "itemId": key,
                                        "attributeName": "item_seen",
                                        "attributeValue": athena.items[key].attributes.item_seen
                                    });
                                }
                            }
                            if (ItemExists == false) {
                                var ItemID = functions.MakeID();
                                const Item = { "templateId": item, "attributes": { "max_level_bonus": 0, "level": 1, "item_seen": false, "xp": 0, "variants": [], "favorite": false }, "quantity": PaidTier[item] };
                                athena.items[ItemID] = Item;
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": ItemID,
                                    "item": Item
                                });
                            }
                            ItemExists = false;
                        }
                        lootList.push({
                            "itemType": item,
                            "itemGuid": item,
                            "quantity": PaidTier[item]
                        });
                    }
                }
                var GiftBoxID = functions.MakeID();
                var GiftBox = { "templateId": 8 <= 4 ? "GiftBox:gb_battlepass" : "GiftBox:gb_battlepasspurchased", "attributes": { "max_level_bonus": 0, "fromAccountId": "", "lootList": lootList } };
                if (8 > 2) {
                    profile.items[GiftBoxID] = GiftBox;
                    ApplyProfileChanges.push({
                        "changeType": "itemAdded",
                        "itemId": GiftBoxID,
                        "item": GiftBox
                    });
                }
                MultiUpdate[0].profileChanges.push({
                    "changeType": "statModified",
                    "name": "book_purchased",
                    "value": athena.stats.attributes.book_purchased
                });
                MultiUpdate[0].profileChanges.push({
                    "changeType": "statModified",
                    "name": "book_level",
                    "value": athena.stats.attributes.book_level
                });
            }

            if (BattlePass.tierOfferId == offerId) {
                let lootList: {
                    itemType: string;
                    itemGuid: string;
                    quantity: number;
                }[] = [];
                var StartingTier = athena.stats.attributes.book_level;
                var EndingTier;
                athena.stats.attributes.book_level += purchaseQuantity || 1;
                EndingTier = athena.stats.attributes.book_level;
                for (let i = StartingTier; i < EndingTier; i++) {
                    var FreeTier = BattlePass.freeRewards[i] || {};
                    var PaidTier = BattlePass.paidRewards[i] || {};
                    for (var item in FreeTier) {
                        if (item.toLowerCase() == "token:athenaseasonxpboost") {
                            athena.stats.attributes.season_match_boost += FreeTier[item];
                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "season_match_boost",
                                "value": athena.stats.attributes.season_match_boost
                            });
                        }
                        if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                            athena.stats.attributes.season_friend_match_boost += FreeTier[item];
                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "season_friend_match_boost",
                                "value": athena.stats.attributes.season_friend_match_boost
                            });
                        }
                        if (item.toLowerCase().startsWith("currency:mtx")) {
                            for (var key in profile.items) {
                                if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                    if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                        profile.items[key].quantity += FreeTier[item];
                                        break;
                                    }
                                }
                            }
                        }
                        if (item.toLowerCase().startsWith("homebasebanner")) {
                            for (var key in profile.items) {
                                if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                    profile.items[key].attributes.item_seen = false;
                                    ItemExists = true;
                                    ApplyProfileChanges.push({
                                        "changeType": "itemAttrChanged",
                                        "itemId": key,
                                        "attributeName": "item_seen",
                                        "attributeValue": profile.items[key].attributes.item_seen
                                    });
                                }
                            }
                            if (ItemExists == false) {
                                var ItemID = functions.MakeID();
                                var Item = { "templateId": item, "attributes": { "item_seen": false }, "quantity": 1 };
                                profile.items[ItemID] = Item;
                                ApplyProfileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": ItemID,
                                    "item": Item
                                });
                            }
                            ItemExists = false;
                        }
                        if (item.toLowerCase().startsWith("athena")) {
                            for (var key in athena.items) {
                                if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                    athena.items[key].attributes.item_seen = false;
                                    ItemExists = true;
                                    MultiUpdate[0].profileChanges.push({
                                        "changeType": "itemAttrChanged",
                                        "itemId": key,
                                        "attributeName": "item_seen",
                                        "attributeValue": athena.items[key].attributes.item_seen
                                    });
                                }
                            }
                            if (ItemExists == false) {
                                var ItemID = functions.MakeID();
                                const Item = { "templateId": item, "attributes": { "max_level_bonus": 0, "level": 1, "item_seen": false, "xp": 0, "variants": [], "favorite": false }, "quantity": FreeTier[item] };
                                athena.items[ItemID] = Item;
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": ItemID,
                                    "item": Item
                                });
                            }
                            ItemExists = false;
                        }
                        lootList.push({
                            "itemType": item,
                            "itemGuid": item,
                            "quantity": FreeTier[item]
                        });
                    }
                    for (var item in PaidTier) {
                        if (item.toLowerCase() == "token:athenaseasonxpboost") {
                            athena.stats.attributes.season_match_boost += PaidTier[item];
                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "season_match_boost",
                                "value": athena.stats.attributes.season_match_boost
                            });
                        }
                        if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                            athena.stats.attributes.season_friend_match_boost += PaidTier[item];
                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "season_friend_match_boost",
                                "value": athena.stats.attributes.season_friend_match_boost
                            });
                        }
                        if (item.toLowerCase().startsWith("currency:mtx")) {
                            for (var key in profile.items) {
                                if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                    if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                        profile.items[key].quantity += PaidTier[item];
                                        break;
                                    }
                                }
                            }
                        }
                        if (item.toLowerCase().startsWith("homebasebanner")) {
                            for (var key in profile.items) {
                                if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                    profile.items[key].attributes.item_seen = false;
                                    ItemExists = true;
                                    ApplyProfileChanges.push({
                                        "changeType": "itemAttrChanged",
                                        "itemId": key,
                                        "attributeName": "item_seen",
                                        "attributeValue": profile.items[key].attributes.item_seen
                                    });
                                }
                            }
                            if (ItemExists == false) {
                                var ItemID = functions.MakeID();
                                var Item = { "templateId": item, "attributes": { "item_seen": false }, "quantity": 1 };
                                profile.items[ItemID] = Item;
                                ApplyProfileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": ItemID,
                                    "item": Item
                                });
                            }
                            ItemExists = false;
                        }
                        if (item.toLowerCase().startsWith("athena")) {
                            for (var key in athena.items) {
                                if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                    athena.items[key].attributes.item_seen = false;
                                    ItemExists = true;
                                    MultiUpdate[0].profileChanges.push({
                                        "changeType": "itemAttrChanged",
                                        "itemId": key,
                                        "attributeName": "item_seen",
                                        "attributeValue": athena.items[key].attributes.item_seen
                                    });
                                }
                            }
                            if (ItemExists == false) {
                                var ItemID = functions.MakeID();
                                const Item = { "templateId": item, "attributes": { "max_level_bonus": 0, "level": 1, "item_seen": false, "xp": 0, "variants": [], "favorite": false }, "quantity": PaidTier[item] };
                                athena.items[ItemID] = Item;
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": ItemID,
                                    "item": Item
                                });
                            }
                            ItemExists = false;
                        }
                        lootList.push({
                            "itemType": item,
                            "itemGuid": item,
                            "quantity": PaidTier[item]
                        });
                    }
                }
                var GiftBoxID = functions.MakeID();
                var GiftBox = {
                    "templateId": "GiftBox:gb_battlepass",
                    "attributes": {
                        "max_level_bonus": 0,
                        "fromAccountId": "",
                        "lootList": lootList
                    }
                };
                if (8 > 2) {
                    profile.items[GiftBoxID] = GiftBox;
                    ApplyProfileChanges.push({
                        "changeType": "itemAdded",
                        "itemId": GiftBoxID,
                        "item": GiftBox
                    });
                }
                MultiUpdate[0].profileChanges.push({
                    "changeType": "statModified",
                    "name": "book_level",
                    "value": athena.stats.attributes.book_level
                });
            }
            log.debug(`PurchaseCatalogEntry: Successfully processed Battle Pass purchase`);

            if (MultiUpdate[0].profileChanges.length > 0) {
                athena.rvn += 1;
                athena.commandRevision += 1;
                athena.updated = new Date().toISOString();
                MultiUpdate[0].profileRevision = athena.rvn;
                MultiUpdate[0].profileCommandRevision = athena.commandRevision;
            }

            if (ApplyProfileChanges.length > 0) {
                profile.rvn += 1;
                profile.commandRevision += 1;
                profile.updated = new Date().toISOString();
                await profiles?.updateOne({ $set: { [`profiles.${profileId}`]: profile, [`profiles.athena`]: athena } });
            }

            if (QueryRevision != ProfileRevisionCheck) {
                ApplyProfileChanges = [{
                    "changeType": "fullProfileUpdate",
                    "profile": profile
                }];
            }

            if (ApplyProfileChanges.length > 0) {
                await profiles?.updateOne({ $set: { [`profiles.${profileId}`]: profile, [`profiles.athena`]: athena } });
            }
            return;
        }
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        //        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile, [`profiles.athena`]: athena } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${profileId}`]: profile, [`profiles.athena`]: athena } });

};

export default app;