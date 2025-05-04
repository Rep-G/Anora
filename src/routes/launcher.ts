import Users from "../model/user.js";
import Friends from "../model/friends.js";
import bcrypt from "bcrypt";
import express from "express";
import Safety from "../utilities/safety.js";
import * as fs from 'fs';
import * as path from 'path';
import log from "../utilities/structs/log.js";
import { dirname } from "dirname-filename-esm";

const app = express.Router();
const __dirname = dirname(import.meta);

const newsEntries = {
    newsEntry1: {
      header: "Anora launch.",
      content: "Launch is coming soon."
    },
    newsEntry2: {
      header: "Anora revamp",
      content: "Anora has been fully redone and better than ever."
    },
    newsEntry3: {
      header: "Unc is too old",
      content: "Fr"
    }
  };

interface CatalogItem {
    price: number;
    itemGrants: string[];
    image: string;
    featured?: boolean;
    name: string;
}

const catalogConfigPath = path.join(__dirname, '..', '..', 'Config', 'catalog_config.json');
const launcherVersionPath = path.join(__dirname, '..', '..', 'Config', 'launcher_versions.json');
let catalogData: Record<string, CatalogItem> = {};

fs.readFile(catalogConfigPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading catalog_config.json:', err);
    return;
  }
  catalogData = JSON.parse(data);

  const featuredKeys = ['featured1', 'featured2', 'featured3', 'featured4'];
  for (const key of featuredKeys) {
    if (catalogData[key]) {
      catalogData[key].featured = true;
    }
  }
});
app.get("/launcher/check/email", async (req, res) => {
    const email = req.query.email;
    if (await Users.findOne({email: email})) return res.status(200).send("true");
    return res.status(400).send("false");
});
app.get("/launcher/exchangecode", async (req,res) => {
    const {email, check, code} = req.query;
    try {
        switch (check) {
            case "false":
                const createdCode = Math.random().toString(36).substring(2, 7).toUpperCase();
                const User = await Users.findOne({email: email});
                if (User) {
                    let index = global.exchangeCodes.findIndex((i: { accountId: any; }) => i.accountId == User.accountId);
                    if (index == -1) {
                        let exchangeCode = {
                            creationDate: Date.now(),
                            exchange_code: createdCode,
                            accountId: User.accountId
                        };
                        global.exchangeCodes.push(exchangeCode);
                        return res.status(200).send(exchangeCode.exchange_code);
                    }
                }
                return res.status(200).send("false");
                break;
            case "true":
                let index = global.exchangeCodes.findIndex((i: { exchange_code: any; }) => i.exchange_code == code);
                let exchange = global.exchangeCodes[index];
                if (index == -1) return res.status(200).send("false").end();
                global.exchangeCodes.splice(index, 1);
                return res.status(200).send("true").end();
                break;
            case "get":
                const targetUser = await Users.findOne({email: email});
                if (targetUser) {
                    let index = global.exchangeCodes.findIndex((i: { accountId: any; }) => i.accountId == targetUser.accountId);
                    let exchange = global.exchangeCodes[index];
                    if (index != -1) {
                        return res.status(200).send(exchange.exchange_code);
                    }
                }
                return res.status(200).send("false");
                break;
            default:
                return res.status(200).send("false").end();
                break;
        }
    }
    catch(error: any) {
        log.error("Error: " + error);
        return res.status(200).send("false").end();
    }
});
app.get('/launcher/news', (req, res) => {
    res.json(newsEntries);
});

app.get("/launcher/shopimages", (req, res) => {
    if (!catalogData || Object.keys(catalogData).length === 0) {
        return res.status(400).send("No catalog data");
    }

    const imageUrls: { image: string, featured: boolean, itemNumber: number, itemName: string, price: number }[] = [];

    for (const [key, item] of Object.entries(catalogData)) {
        if (item.image) {
            const itemNumber = parseInt(key.replace(/\D/g, ''), 10);

            imageUrls.push({
                image: item.image,
                featured: item.featured || false,
                itemNumber: itemNumber,
                itemName: item.name,
                price: item.price
            });
        }
    }

    res.status(200).json(imageUrls);
});



app.get("/launcher/login", async (req, res) => {
    const email = String(req.query.email || '');
    const password = String(req.query.password || '');
    const User = await Users.findOne({ email });

    if (User) {
        const validPassword = await bcrypt.compare(password, User.password);
        if (!validPassword) {
            return res.status(400).send("false");
        }
        if (User.banned) {
            return res.status(400).send("false");
        }
        return res.status(200).send("true");
    } else {
        return res.status(400).send("false");
    }
});

app.get("/launcher/username", async (req, res) => {
    const email = String(req.query.email || '');
    const User = await Users.findOne({ email });

    if (User) {
        res.status(200).send(User.username);
    } else {
        res.status(400).send("You do not have an account!");
    }
});
app.get("/launcher/setstatus", async (req, res) => {
    const email = String(req.query.email || '');
    const status = String(req.query.status || 'offline')
    const User = await Users.findOne({ email });

    if (User) {
        User.status = status;
        User.save();
        res.status(200).send(User.status);
    } else {
        res.status(400).send("You do not have an account!");
    }
});
app.get("/launcher/avatar", async (req, res) => {
    const email = String(req.query.email || '');
    const User = await Users.findOne({ email });

    if (User) {
        res.status(200).send(User.avatarUrl);
    } else {
        res.status(400).send("You do not have an account!");
    }
});

app.get("/launcher/getfriends", async (req, res) => {
    try {
        const email = String(req.query.email || '');
        const User = await Users.findOne({ email });
        if (User) {
            const UserFriends = await Friends.findOne({ accountId: User.accountId });
            const acceptedList = UserFriends?.list.accepted;
            const users = await Promise.all(
            acceptedList.map(async (friend) => {
                const user = await Users.findOne({ accountId: friend.accountId });
                
                if (user) {
                let roles = user.roles;
                let highestRole = roles.reduce((prev, current) => {
                    let prevNumber = parseInt(prev.split(':')[1]);
                    let currentNumber = parseInt(current.split(':')[1]);
                    return (currentNumber > prevNumber) ? current : prev;
                }, roles[0]);
            
                let highestRoleName = highestRole.split(':')[0];
                return {
                    username: user.username,
                    role: highestRoleName,
                    status: user.status,
                    avatarUrl: user.avatarUrl 
                };
                } else {
                return null;
                }
            }));
            const filteredUsers = users.filter(user => user !== null);
            res.json(filteredUsers);
        } else {
            res.status(400).send("You do not have an account!");
        }
    }
    catch(error: any) {
        log.error(error)
        res.status(400).send("Interval Server Error");
    }
});

app.get("/launcher/version", async (req, res) => {
    fs.readFile(launcherVersionPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading catalog_config.json:', err);
          return res.status(400).send("false");
        }
        let json = JSON.parse(data);
        if (json.launcher_version == req.query.version) return res.status(200).send("true");
        return res.status(400).send("false");
    });
});
app.get("/bootstrap/version", async (req, res) => {
    fs.readFile(launcherVersionPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading catalog_config.json:', err);
          return res.status(400).send("false");
        }
        let json = JSON.parse(data);
        if (json.bootstrap_version == req.query.version) return res.status(200).send("true");
        return res.status(400).send("false");
    });
});
app.get("/launcher/changeusername", async (req, res) => {
    const email = String(req.query.email || '');
    const username = String(req.query.username || '');
    const User = await Users.findOne({ email });

    if (User) {
        if (User.claimedExclusive || User.claimedOG || User.roles.some(role => role.startsWith("Trusted:"))) {
            User.username = username;
            await User.save();
            res.status(200).send("Saved username");
        }
        else {
            res.status(400).send("You must be a donator to do this!");
        }
    } else {
        res.status(400).send("You do not have an account.");
    }
});

app.get("/launcher/changepassword", async (req, res) => {
    const email = String(req.query.email || '');
    const password = String(req.query.password || '');
    const User = await Users.findOne({ email });

    if (User) {
        User.password = await bcrypt.hash(password, 10);
        await User.save();
        return res.status(200).send("Saved password");
    } else {
        return res.status(400).send("You do not have an account");
    }
});


export default app;