import express, { Request, Response } from "express";
import path from "path";
import {dirname} from "dirname-filename-esm";
const __dirname = dirname(import.meta);

const app = express.Router();
const bootstrapkey = "a120d9e5-1348-4672-b8ef-a406a4c20aa7";
const zipFilePath = path.join(__dirname, "..", "..", "assets", "Launcher.zip");
const bootstrapperFilePath = path.join(__dirname, "..", "..", "assets", "AnoraLauncher.zip");
const redirectFilePath = path.join(__dirname, "..", "..", "assets", "Redirect.dll");
const paksFilePath = path.join(__dirname, "..", "..", "assets", "paks.zip");
const gfsdkFilePath = path.join(__dirname, "..", "..", "assets", "GFSDK_Aftermath_Lib.x64.dll");
app.get("/assets/launcher", (req, res) => {
    try {
        res.sendFile(zipFilePath, (err) => {
            if (err) {
                console.error("Error sending file:", err.message);
                return res.status(500).send("Error downloading the launcher.");
            }
        });
    } catch (error) {
        console.error("Error:", (error as Error).message);
        return res.status(500).send("Internal server error.");
    }
});
app.get("/assets/bootstrapper", (req, res) => {
    if (req.query.key != bootstrapkey) return res.status(500).send("Invalid key, please download through lootlabs.");
    try {
        res.sendFile(bootstrapperFilePath, (err) => {
            if (err) {
                console.error("Error sending file:", err.message);
                return res.status(500).send("Error downloading the bootstrapper.");
            }
        });
    } catch (error) {
        console.error("Error:", (error as Error).message);
        return res.status(500).send("Internal server error.");
    }
});
app.get("/assets/paks", (req, res) => {
    try {
        res.sendFile(paksFilePath, (err) => {
            if (err) {
                console.error("Error sending file:", err.message);
                return res.status(500).send("Error downloading the launcher.");
            }
        });
    } catch (error) {
        console.error("Error:", (error as Error).message);
        return res.status(500).send("Internal server error.");
    }
});

app.get("/assets/redirect", (req, res) => {
    try {
        res.sendFile(redirectFilePath, (err) => {
            if (err) {
                console.error("Error sending file:", err.message);
                return res.status(500).send("Error downloading the redirect.");
            }
        });
    } catch (error) {
        console.error("Error:", (error as Error).message);
        return res.status(500).send("Internal server error.");
    }
});

app.get("/assets/gfsdk", (req, res) => {
    try {
        res.sendFile(gfsdkFilePath, (err) => {
            if (err) {
                console.error("Error sending file:", err.message);
                return res.status(500).send("Error downloading the dll.");
            }
        });
    } catch (error) {
        console.error("Error:", (error as Error).message);
        return res.status(500).send("Internal server error.");
    }
});

export default app;