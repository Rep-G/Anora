import express, { Request, Response } from "express";
import { Router } from "express";
import functions from "../utilities/structs/functions.js";
import { verifyToken } from "../tokenManager/tokenVerify.js";
import qs from "qs";
import error from "../utilities/structs/error.js";
import { AES256Encryption } from "@ryanbekhen/cryptkhen";
import MMCode from "../model/mmcodes.js";
import fs from "fs";
import axios from "axios";
import jwt from "jsonwebtoken";
import safety, { Safety } from "./../utilities/safety.js";
const app = express.Router();
var RoleEnum;
interface ParsedQuery {
    "player.option.customKey"?: string;
    bucketId?: string;
  }
(function (RoleEnum) {
    RoleEnum["Owner"] = "OWNER";
    RoleEnum["Dev"] = "DEVELOPER";
    RoleEnum["Mod"] = "MODERATOR";
    RoleEnum["Helper"] = "HELPER";
    RoleEnum["T3"] = "T3_USER";
    RoleEnum["T2"] = "T2_USER";
    RoleEnum["T1"] = "T1_USER";
    RoleEnum["User"] = "USER";
    RoleEnum["Banned"] = "BANNED";
})(RoleEnum || (RoleEnum = {}));

const aes256 = new AES256Encryption("336524895db149eeb12742d2f1890434");
global.mmclients = new Map();
const buildUniqueId = {};
import log from "../utilities/structs/log.js";
app.get("/fortnite/api/matchmaking/session/findPlayer/*", (req, res) => {
    res.status(200).end();
});
app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", verifyToken, async (req, res) => {
    const parsedQuery: ParsedQuery = qs.parse(req.query as Record<string, string>, { ignoreQueryPrefix: true }) as ParsedQuery;

    const playerCustomKey: string | undefined = parsedQuery["player.option.customKey"];
    const bucketId: string | undefined = parsedQuery.bucketId ? decodeURIComponent(parsedQuery.bucketId) : undefined;
    if (typeof bucketId !== "string" || bucketId.split(":").length !== 4) {
        return res.status(400).end();
    }
    let region = bucketId.split(":")[2];
    if (region == "NONE") region = "NAE";
    if (region == "NA") region = "NAE";
    let playlist = bucketId.split(":")[3];
    if (!Number.isNaN(parseInt(playlist))) {
        // we're on an old version, parse this into a real playlist
        switch (parseInt(playlist)) {
            case /*1*/ 10:
                playlist = "playlist_defaultduo";
                break;
            case 2:
                playlist = "playlist_defaultsolo";
                break;
            case /*3*/ 9:
                playlist = "playlist_defaultsquad";
                break;
        }
    }
    /*const gameServers = config..GAME_SERVERS;
    const selectedServer = gameServers.find((server) => {
        return server.split(":")[2] === playlist;
    });
    if (!selectedServer) {
        return error.createError("errors.com.epicgames.common.matchmaking.playlist.not_found", `No server found for playlist ${playlist}`, [], 1013, "invalid_playlist", 404, res);
    }*/
    const memory = functions.GetVersionInfo(req);
    if (typeof playerCustomKey === "string") {
        const codeDocument = await MMCode.findOne({ code_lower: playerCustomKey?.toLowerCase() })/*.cacheQuery()*/;
        /*if (!codeDocument) {
            return error.createError("errors.com.epicgames.common.matchmaking.code.not_found", `The matchmaking code "${playerCustomKey}" was not found`, [], 1013, "invalid_code", 404, res);
        }
        if (codeDocument.private == true && codeDocument.owner.cacheHexString != req.user._id.cacheHexString && req.user.username_lower != "ploosh") {
            return error.createError("errors.com.epicgames.common.matchmaking.code.unauthorized", `You are not authorized to join using the matchmaking code "${playerCustomKey}"`, [], 1013, "unauthorized", 401, res);
        }*/
        global.mmclients.set(req.user.accountId, {
            accountId: req.user.accountId,
            customKey: playerCustomKey,
            region: region,
            playlist: playlist,
            version: memory.build
            //ip: codeDocument.ip,
            //port: codeDocument.port,
        });
    }
    else {
        global.mmclients.set(req.user.accountId, {
            accountId: req.user.accountId,
            customKey: playerCustomKey,
            region: region,
            playlist: playlist,
            version: memory.build
            //ip: selectedServer.split(":")[0],
            //port: parseInt(selectedServer.split(":")[1]),
        });
    }
    buildUniqueId[req.user.accountId] = bucketId.split(":")[0];
    log.matchmaker(memory + region);
    //if (!req.user.canJoinDonator && memory.build == 9.10) return error.createError("errors.dev.ploosh.astro.need_donator", `You must be a donator to play on 9.10!`, [], 1013, "not_donator", 403, res);
    const mmData = jwt.sign({
        region,
        playlist,
        type: typeof playerCustomKey === "string" ? "custom" : "normal",
        key: typeof playerCustomKey === "string" ? playerCustomKey : undefined,
        bucket: bucketId,
        version: `${memory.build}`
    }, safety.env.API_KEY);
    var matchmakerIP = `ws://${safety.env.MATCHMAKER_IP}`;
    var data = mmData.split(".");
    return res.json({
        serviceUrl: matchmakerIP,
        ticketType: "anora",
        //payload: encryptedPayload,
        payload: data[0] + "." + data[1] /*`${memory.build} ${typeof playerCustomKey === "string" ? "ckey " + playerCustomKey : "account " + region + " " + playlist + " " + bucketId}`*/,
        signature: data[2],
    });
});
app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", (req, res) => {
    res.json({
        accountId: req.params.accountId,
        sessionId: req.params.sessionId,
        key: functions.MakeID().replace(/-/g, "").toLowerCase(),
    });
});

const mm = async (req, res) => {
    //log.mms("Requested to join");
    if (!global.mmclients.has(req.user.accountId)) {
        return error.createError("errors.com.epicgames.common.matchmaking.session.not_found", `The matchmaking session "${req.params.sessionId}" was not found`, [], 1013, "invalid_session", 404, res);
    }
    const client = global.mmclients.get(req.user.accountId);
    if (!client)
        return res.status(400).end();

    /*const response = await axios.get(
        `https://backend.ploosh.dev/plooshfn/gs/match/search/${req.params.sessionId}`
    );

    if (!response.data) return error.createError("errors.com.epicgames.common.matchmaking.session.not_found", `The matchmaking session "${req.params.sessionId}" was not found`, [], 1013, "invalid_session", 404, res);
    if (typeof response.data !== "string") return error.createError("errors.com.epicgames.common.matchmaking.session.not_found", `The matchmaking session "${req.params.sessionId}" was not found`, [], 1013, "invalid_session", 404, res);;

    let ipString = response.data.split(" ")[1];
    let serverAddress = ipString.split(":")[0];
    let serverPort = ipString.split(":")[1];*/
    let serverAddress;
    let serverPort;
    try {
        let response = await axios.get(
            `http://${safety.env.MATCHMAKER_IP}/session/${req.params.sessionId}`
        );
        serverAddress = response.data.ip;
        serverPort = response.data.port;
    } catch {
        return error.createError("errors.com.epicgames.common.matchmaking.session.not_found", `The matchmaking session "${req.params.sessionId}" was not found`, [], 1013, "invalid_session", 404, res);
    }
    res.json({
        id: req.params.sessionId,
        ownerId: functions.MakeID().replace(/-/gi, "").toUpperCase(),
        ownerName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        serverName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        serverAddress,
        serverPort,
        maxPublicPlayers: 220,
        openPublicPlayers: 175,
        maxPrivatePlayers: 0,
        openPrivatePlayers: 0,
        attributes: {
            REGION_s: /*"EU"*/ client.region,
            GAMEMODE_s: "FORTATHENA",
            ALLOWBROADCASTING_b: true,
            SUBREGION_s: client.region == "NAE" ? "VA" : "GB",
            DCID_s: "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
            tenant_s: "Fortnite",
            MATCHMAKINGPOOL_s: "Any",
            STORMSHIELDDEFENSETYPE_i: 0,
            HOTFIXVERSION_i: 0,
            PLAYLISTNAME_s: client.playlist,
            SESSIONKEY_s: functions.MakeID().replace(/-/gi, "").toUpperCase(),
            TENANT_s: "Fortnite",
            BEACONPORT_i: 15009,
        },
        publicPlayers: [],
        privatePlayers: [],
        totalPlayers: 0,
        allowJoinInProgress: true,
        shouldAdvertise: true,
        isDedicated: true,
        usesStats: true,
        allowInvites: true,
        usesPresence: true,
        allowJoinViaPresence: true,
        allowJoinViaPresenceFriendsOnly: false,
        buildUniqueId: buildUniqueId[req.user.accountId] || "0",
        lastUpdated: new Date().toISOString(),
        started: false,
    });
};
app.get("/fortnite/api/matchmaking/session/:sessionId", verifyToken, mm);
app.get("/fortnite/api/matchmaking/session/:sessionId/:hwid", verifyToken, mm);
app.post("/fortnite/api/matchmaking/session/*/join", verifyToken, (req, res) => {
    res.status(204).end();
});
app.post("/fortnite/api/matchmaking/session/*/join/:hwid", verifyToken, (req, res) => {
    res.status(204).end();
});
app.post("/fortnite/api/matchmaking/session/matchMakingRequest", verifyToken, (req, res) => {
    res.json([]);
});
export default app;