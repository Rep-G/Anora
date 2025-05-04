import express, { request, Request, Response } from "express";
import GameServer from "../model/schema.js";
import PlayerSch from "../model/schemaplayers.js";
import MMCSch from "../model/schemammc.js";
import axios from "axios";
import crypto from "crypto";
import log from "../utilities/structs/log.js";

const webapp = express.Router();

function RollSessionId() {
    let ticketId = crypto
      .createHash("md5")
      .update(`1${Date.now()}`)
      .digest("hex");
    let matchId = crypto
      .createHash("md5")
      .update(`2${Date.now()}`)
      .digest("hex");
    let sessionId = crypto
      .createHash("md5")
      .update(`3${Date.now()}`)
      .digest("hex");
  
    return [ticketId, matchId, sessionId];
  }
  
  function CreateSessionId() {
    let sessionId = crypto
      .createHash("md5")
      .update(`3${Date.now()}`)
      .digest("hex");
  
    return sessionId;
  }
  
  function RollSessionIdForIps() {
    global.knownipsessions = []; // clear it
  
    // NA
    GameServer.find({ region: "NA" })
      .then((documents) => {
        documents.forEach((doc) => {
          let IP = doc.IP;
          let Port = doc.Port;
          let uniqueSessionId = CreateSessionId();
          global.knownipsessions.push({ ip: IP, port: Port, sessionId: uniqueSessionId, region: "NA", playlist: doc.playlist });
        });
      })
      .catch((err) => {
        console.error(err);
      });
  
    // EU
    GameServer.find({ region: "EU" })
      .then((documents) => {
        documents.forEach((doc) => {
          let IP = doc.IP;
          let Port = doc.Port;
          let uniqueSessionId = CreateSessionId();
          global.knownipsessions.push({ ip: IP, port: Port, sessionId: uniqueSessionId, region: "EU", playlist: doc.playlist });
        });
      })
      .catch((err) => {
        console.error(err);
      });
    // OCE
    GameServer.find({ region: "OCE" })
    .then((documents) => {
      documents.forEach((doc) => {
        let IP = doc.IP;
        let Port = doc.Port;
        let uniqueSessionId = CreateSessionId();
        global.knownipsessions.push({ ip: IP, port: Port, sessionId: uniqueSessionId, region: "OCE", playlist: doc.playlist });
      });
    })
    .catch((err) => {
      console.error(err);
    });
    MMCSch.find({})
      .then((documents) => {
        documents.forEach((doc) => {
          let IP = doc.ip;
          let Port = doc.port;
          let uniqueSessionId = CreateSessionId();
          global.knownipsessions.push({ ip: IP, port: Port, sessionId: uniqueSessionId, region: "NA", playlist: "Playlist_DefaultSolo" });
        });
      })
      .catch((err) => {
        console.error(err);
      });
  
    log.matchmaker('All keys were generated');
  }

webapp.get(
  "/anora/gs/create/session/:region/:ip/:port/:playlist/:name",
  async (req, res) => {
    //console.log("works!");
    let region = req.params.region;
    let ip = req.params.ip;
    let port = req.params.port;
    let playlist = req.params.playlist;
    let name = req.params.name;
    let version = parseFloat(name.replace("AnoraOther", "") == name ? "13.40" : name.replace("AnoraOther", ""));

    if (!region || !ip || !port || !playlist || !name)
      return res.json({ message: "invalid params" });

    const gameServer = await GameServer.findOne({ name: name });

    if (gameServer) {
      await GameServer.updateOne({ name: name }, { $set: {IP: ip, Port: port} });
      global.knownipsessions = [];
      global.knownsessionIds = [];
      let json = RollSessionId();
      RollSessionIdForIps();

      global.sessionId = json[2];
      global.matchId = json[1];
      global.ticketId = json[0];
      //return res.json({ message: "Gameserver exists!" });
      return res.json({ message: "success!" });
    }

    //console.log("works1!");

    let gs = await GameServer.create({
      name: name,
      IP: ip,
      Port: port,
      status: "offline",
      playerCount: 0,
      playlist: playlist,
      region: region,
      version: version
    });
    RollSessionIdForIps();
    let requestbody = {
      region: region,
      ip: ip,
      port: port,
      playlist: playlist,
      version: version
    }
    await axios.post(`http://127.0.0.1:70/gs/create`, requestbody);
    gs.save().catch((err) => {
      return res.json({ err: err });
    });
    //console.log("works12!");

    return res.json({ message: "success!" });
  }
);
webapp.get("/anora/gs/status/set/:name/:status", async (req, res) => {
  let name = req.params.name;
  let status = req.params.status;
  const gameServer = await GameServer.findOne({ name: name });
  if (!gameServer) {
    return res.json({ message: "gameserver no existy." });
  }

  let region = gameServer.region;
  let ip = gameServer.IP;
  let port = gameServer.Port;
  let playlist = gameServer.playlist;
  let version = gameServer.version;

  if (status == "online") {
    await GameServer.updateOne({ name: name }, { $set: { status: "online" } });
    return res.json({ message: "success" });
  } else if (status == "bus") {
    await GameServer.updateOne({ name: name }, { $set: { status: "bus" } });
    return res.json({ message: "success" });
  } else if (status == "offline") {
    await GameServer.updateOne({ name: name }, { $set: { status: "offline" } });

    // Send POST request to gs/delete with the same request body
    let requestbody = {
      region: region,
      ip: ip,
      port: port,
      playlist: playlist,
      version: version
    };
    await axios.post(`http://127.0.0.1:70/gs/delete`, requestbody);

    return res.json({ message: "success" });
  }

  return res.json({ message: "some error occured." });
});

webapp.get('/anora/gs/match/search/:sessionid', async (req, res) => {
  let sessionid = req.params.sessionid;

  if (!sessionid) {
    return res.json({ "message": "this sessionId does not exist" });
  }

  const sessionlookup = await PlayerSch.findOne({ sessionId: sessionid });

  if (!sessionlookup) {
    return res.json({ message: "there is no sessionid on this list named that." });
  }

  PlayerSch.deleteOne({ sessionId: sessionid });

  return res.send(sessionid + " " + sessionlookup.ip + ":" + sessionlookup.port);
});

export default webapp;