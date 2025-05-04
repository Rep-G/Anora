import express from "express";
import Profile from "../model/profiles.js";
import User from "../model/user.js";
import profileManager from "../structs/profile.js";
import functions from "../utilities/structs/functions.js";
import error from "../utilities/structs/error.js";

const app = express.Router();

app.post('/fortnite/api/game/v3/profile/*/client/emptygift', async (req, res) => { 
    const playerName = req.body.playerName;
    if (!playerName) {
        return res.status(400).send("Your gonna need a player name unc")
    }
    const user = await User.findOne({ username: playerName });
    if (!user) {
        return error.createError(
            "errors.com.epicgames.user.not_found",
            "User not found.",
            undefined, 16027, undefined, 404, res
        );
    }
    const profiles = await Profile.findOne({ accountId: user.accountId });
    if (!await profileManager.validateProfile("common_core", profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${"common_core"}`,
        ["common_core"], 12813, undefined, 403, res
    );
    let common_core = profiles?.profiles["common_core"];
    let athena = profiles?.profiles["athena"]; // since the receiver is the sender we can simply do this.
    let memory = functions.GetVersionInfo(req);
    let Notifications = [];
    let ApplyProfileChanges: Object[] = [];
    let BaseRevision = common_core.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? common_core.commandRevision : common_core.rvn;
    let QueryRevision = req.query.rvn || -1;
    let validGiftBoxes = [
        "GiftBox:gb_accountmergevbucks",
        "GiftBox:gb_accountmerge",
        "GiftBox:gb_battlepass",
        "GiftBox:gb_makegoodathena",
        "GiftBox:gb_makegood",
        "GiftBox:gb_seasonfirstwin"
    ];

    let missingFields = checkFields(["offerId", "giftWrapTemplateId"], req.body);

    if (missingFields.fields.length > 0) return error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
    );

    if (typeof req.body.offerId != "string") return ValidationError("offerId", "a string", res);
    if (typeof req.body.giftWrapTemplateId != "string") return ValidationError("giftWrapTemplateId", "a string", res);
    if (typeof req.body.personalMessage != "string") return ValidationError("personalMessage", "a string", res);

    if (req.body.personalMessage.length > 100) return error.createError(
        "errors.com.epicgames.string.length_check",
        `The personalMessage you provided is longer than 100 characters, please make sure your personal message is less than 100 characters long and try again.`,
        undefined, 16027, undefined, 400, res
    );

    if (!validGiftBoxes.includes(req.body.giftWrapTemplateId)) return error.createError(
        "errors.com.epicgames.giftbox.invalid",
        `The giftbox you provided is invalid, please provide a valid giftbox and try again.`,
        undefined, 16027, undefined, 400, res
    );

    athena.rvn += 1;
    athena.commandRevision += 1;
    athena.updated = new Date().toISOString();

    common_core.rvn += 1;
    common_core.commandRevision += 1;
    common_core.updated = new Date().toISOString();

    await profiles?.updateOne({
        $set: {
            [`profiles.athena`]: athena,
            [`profiles.common_core`]: common_core,
        },
    });

    global.giftReceived[user.accountId] = true;

    functions.sendXmppMessageToId({
        type: "com.epicgames.gift.received",
        payload: {},
        timestamp: new Date().toISOString()
    }, user.accountId);

    if (ApplyProfileChanges.length > 0) {
        common_core.rvn += 1;
        common_core.commandRevision += 1;
        common_core.updated = new Date().toISOString();

        await profiles?.updateOne({ $set: { [`profiles.${"common_core"}`]: common_core } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": common_core
        }];
    }
    res.json({
        profileRevision: common_core.rvn || 0,
        profileId: "common_core",
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: common_core.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

function checkFields(fields: string[], body: Record<string, any>): { fields: string[] } {
    let missingFields = { fields: [] as string[] };
    fields.forEach(field => {
        if (!body[field]) {
            missingFields.fields.push(field);
        }
    });
    return missingFields;
}
function ValidationError(field, type, res) {
    return error.createError("errors.com.epicgames.validation.validation_failed", `Validation Failed. '${field}' is not ${type}.`, [field], 1040, undefined, 400, res);
}

export default app;