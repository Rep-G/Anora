import { Client, TextChannel } from 'discord.js';
import { client } from '../bot/index.js'; 
import { verifyToken } from '../tokenManager/tokenVerify.js';
import User from '../model/user.js';
import Profiles from '../model/profiles.js';
import safety from '../utilities/safety.js';
import express from "express";
import log from '../utilities/structs/log.js';

const app = express.Router();

app.post("/fortnite/api/game/v2/toxicity/account/:unsafeReporter/report/:reportedPlayer", verifyToken, async (req, res) => {
    try {
        log.backend(`POST /fortnite/api/game/v2/toxicity/account/${req.params.unsafeReporter}/report/${req.params.reportedPlayer} called`);

        const reporter = req.user.accountId;
        const reportedPlayer = req.params.reportedPlayer;

        log.backend(`Searching for reporter with accountId: ${reporter}`);
        let reporterData = await User.findOne({ accountId: reporter }).lean();

        log.backend(`Searching for reported player with accountId: ${reportedPlayer}`);
        let reportedPlayerData = await User.findOne({ accountId: reportedPlayer }).lean();
        let reportedPlayerDataProfile = await Profiles.findOne({ accountId: reportedPlayer }).lean();

        if (!reportedPlayerData) {
            log.error(`Reported player with accountId: ${reportedPlayer} not found in the database`);
            return res.status(404).send({ "error": "Player not found" });
        }

        const reason = req.body.reason || 'No reason provided';
        const details = req.body.details || 'No details provided';
        const playerAlreadyReported = reportedPlayerDataProfile?.profiles?.totalReports ? 'Yes' : 'No';

        log.backend(`Player already reported: ${playerAlreadyReported}`);

        await Profiles.findOneAndUpdate(
            { accountId: reportedPlayer },
            { $inc: { 'profiles.totalReports': 1 } },
            { new: true, upsert: true }
        ).then((updatedProfile) => {
            log.backend(`Successfully updated totalReports to ${updatedProfile.profiles.totalReports} for accountId: ${reportedPlayer}`);
        }).catch((err) => {
            log.error(`Error updating totalReports for accountId: ${reportedPlayer} ` + err);
            return res.status(500).send({ "error": "Database update error" });
        });

        // Use the already imported client to send the report to Discord
        await new Promise<void>((resolve, reject) => {
            client.once('ready', async () => {
                try {
                    const payload = {
                        embeds: [{
                            title: 'New User Report',
                            description: 'A new report has arrived!',
                            color: 0xFFA500,
                            fields: [
                                {
                                    name: "Reporting Player",
                                    value: reporterData?.username,
                                    inline: true
                                },
                                {
                                    name: "Reported Player",
                                    value: reportedPlayerData.username,
                                    inline: true
                                },
                                {
                                    name: "Player already reported",
                                    value: playerAlreadyReported,
                                    inline: false
                                },
                                {
                                    name: "Reason",
                                    value: reason,
                                    inline: true
                                },
                                {
                                    name: "Additional Details",
                                    value: details,
                                    inline: true
                                }
                            ]
                        }]
                    };

                    const channel = await client.channels.fetch(safety.env.REPORT_CHANNEL);

                    if (channel instanceof TextChannel) {
                        log.backend(`Sending embed to channel with ID: ${channel.id}`);
                        const message = await channel.send({
                            embeds: [payload.embeds[0]]
                        });
                        log.backend(`Message sent with ID: ${message.id}`);
                    } else {
                        log.error("The channel is not a valid text channel or couldn't be found.");
                    }

                    resolve();
                } catch (error) {
                    log.error('Error sending message: ' + error);
                    reject(error);
                }
            });
        });

        return res.status(200).send({ "success": true });
    } catch (error) {
        if (error instanceof Error) {
            log.error(error.message);
        } else {
            log.error(String(error)); 
        }
        return res.status(500).send({ "error": "Internal server error" });
    }
});

export default app;