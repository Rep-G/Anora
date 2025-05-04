import { Client, Partials, Collection, Events, GatewayIntentBits, ActivityType, SlashCommandBuilder, GuildBan, BaseInteraction } from 'discord.js';
import path from 'node:path';
import logger from '../utilities/structs/log.js';
import fs from 'node:fs';
import Users from '../model/user.js';
import Friends from "../model/friends.js";
import Profiles from "../model/profiles.js";
import axios from "axios";
import functions from '../utilities/structs/functions.js';
import Safety from '../utilities/safety.js';
import { Clients } from "../xmpp/xmpp.js";
import { setMaxListeners } from 'events';

setMaxListeners(20); // Increase max listeners to avoid memory leaks

const allowedRoleIds = [
    { id: '1273920482328186930', role: 'Moderator', status: 5 },
    { id: '1276986755878354986', role: 'Admin', status: 2 },
    { id: '1273920479207624735', role: 'Manager', status: 3 },
    { id: '1238646063829749831', role: 'Owner', status: 1 },
    { id: '1273920481216434300', role: 'Developer', status: 4 },
    { id: '1309626591743053824', role: 'Trusted', status: 6 }
];

export const client: Client = new Client({
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers
    ],
    presence: {
        activities: [{
            name: `${Clients.length} players!`,
            type: ActivityType.Watching,
        }],
        status: 'online',
    },
});

global.discordClient = client;
global.discordApplication = await functions.FetchApplication();

client.commands = new Collection();
const basePath = process.cwd();
const foldersPath = path.join(basePath, 'build', 'bot', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const command: Command = await import(`file://${path.join(commandsPath, file)}`);

            if (command.data && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                logger.error(`[WARNING] The command at ${path.join(commandsPath, file)} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            logger.error(`[ERROR] Error loading command file at ${path.join(commandsPath, file)}: ${error}`);
        }
    }
}

async function updateStatus() {
    client.user?.setPresence({
        activities: [{
            name: `${Clients.length} players!`,
            type: ActivityType.Watching,
        }],
        status: 'online',
    });

    try {
        const guild = await client.guilds.fetch(Safety.env.GUILD_ID);
        const members = await guild.members.fetch(); 
        members.forEach(async member => {
            let avatarUPD = await Users.findOne({ discordId: member.id });
            if (avatarUPD) {
                let avatarUrl = member.displayAvatarURL({ size: 1024 }) || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSieyaZb-hSOtWnc6wha3QQlMLL8_cfvr2WIQ&s";
                avatarUPD.avatarUrl = avatarUrl!;
                avatarUPD.save();
            }

            if (member.roles.cache.has("1329709833183559721")) {
                const user = await Users.findOne({ discordId: member.id });
                if (user && !user.roles.some(role => role.startsWith("Donator:"))) {
                    user.roles.push("Donator:8");
                    await user.save();
                }

                if (user && !user.fullLocker && !user.claimedOG) {
                    try {
                        user.claimedOG = true;
                        await user.save();

                        const cosmetics = ["Renegade Raider", "Ghoul Trooper", "Skull Trooper", "Aerial Assault Trooper", "Raider's Revenge", "Mako"];
                        await Promise.all(cosmetics.map(cosmetic =>
                            axios.get(`http://127.0.0.1:3551/api/staff/additem/${Safety.env.API_KEY}`, {
                                headers: { 'accountid': user.accountId, 'cosmeticname': cosmetic }
                            })
                        ));
                    } catch (error: any) {
                        logger.error(error.message);
                    }
                }
            }

            if (member.roles.cache.has("1273920486241341441")) {
                const user = await Users.findOne({ discordId: member.id });
                if (user && !user.roles.some(role => role.startsWith("Donator:"))) {
                    user.roles.push("Donator:8");
                    await user.save();
                }

                if (user && !user.fullLocker && !user.claimedExclusive) {
                    user.claimedExclusive = true;
                    await user.save();

                    const exclusiveCosmetics = ["Wonder", "Honor Guard", "Icicle", "Dark Razor", "Spectral Spine", "Shattered Wing"];
                    await Promise.all(exclusiveCosmetics.map(cosmetic =>
                        axios.get(`http://127.0.0.1:3551/api/staff/additem/${Safety.env.API_KEY}`, {
                            headers: { 'accountid': user.accountId, 'cosmeticname': cosmetic }
                        })
                    ));
                }
            }

            const userRoles = allowedRoleIds.filter(role => member.roles.cache.has(role.id));
            if (userRoles.length > 0) {
                const user = await Users.findOne({ discordId: member.id });

                if (user) {
                    let updated = false;

                    for (const userRole of userRoles) {
                        const roleString = `${userRole.role}:${userRole.status}`;
                        if (roleString != "Trusted:6" && !user.fullLocker) {
                            await axios.get(`http://127.0.0.1:3551/api/staff/givefl/${Safety.env.API_KEY}`, {
                                headers: { 'accountid': user.accountId }
                            });
                        }
                        if (!user.roles.includes(roleString)) {
                            user.roles.push(roleString);
                            updated = true;
                        }

                        if (!member.roles.cache.has(userRole.id)) {
                            try {
                                await member.roles.add(userRole.id);
                                logger.backend(`Assigned role ${userRole.role} to ${member.user.tag}`);
                            } catch (error) {
                                logger.error(`Failed to assign role ${userRole.role} to ${member.user.tag}: ${error}`);
                            }
                        }
                    }

                    if (updated) {
                        await user.save();
                        logger.backend(`Updated roles for ${member.user.tag}: ${user.roles.join(", ")}`);
                    }
                }
            }
        });
    } catch (error) {
        logger.error("Error fetching guild members:" + error);
    }

    return;
}

client.once(Events.ClientReady, async () => {
    let clientId = await client.application?.id;
    global.clientId = clientId;

    setInterval(updateStatus, 30000); // Updated interval to 30s for efficiency

    import('./deploy-commands.js');
});

client.once(Events.ClientReady, async () => {
    logger.bot(`[READY] Logged in as ${client.user?.tag}!`);
});

client.on(Events.InteractionCreate, async (interaction: BaseInteraction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName)!;

    if (!command) await interaction.reply({ content: 'This command does not exist', ephemeral: true });

    try {
        await command.execute(interaction);
    } catch (error: any) {
        console.log(error.toString());
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.on(Events.GuildBanAdd, async (ban: GuildBan) => {
    if (!Safety.env.ENABLE_CROSS_BANS) return;

    const memberBan = await ban.fetch();
    if (memberBan.user.bot) return;

    const userData = await Users.findOne({ discordId: memberBan.user.id });

    if (userData && userData.banned !== true) {
        await userData.updateOne({ $set: { banned: true } });

        let refreshToken = global.refreshTokens.findIndex(i => i.accountId == userData.accountId);
        if (refreshToken != -1) global.refreshTokens.splice(refreshToken, 1);

        let accessToken = global.accessTokens.findIndex(i => i.accountId == userData.accountId);
        if (accessToken != -1) {
            global.accessTokens.splice(accessToken, 1);

            let xmppClient = global.Clients.find(client => client.accountId == userData.accountId);
            if (xmppClient) xmppClient.client.close();
        }

        if (accessToken != -1 || refreshToken != -1) await functions.UpdateTokens();
        logger.bot(`[BAN] ${memberBan.user.tag} has been banned from the backend since they got banned from the Discord server.`);
    }
});

client.on(Events.GuildBanRemove, async (ban: GuildBan) => {
    if (!Safety.env.ENABLE_CROSS_BANS) return;
    if (ban.user.bot) return;

    const userData = await Users.findOne({ discordId: ban.user.id });

    if (userData && userData.banned === true) {
        await userData.updateOne({ $set: { banned: false } });
        logger.bot(`[BAN] ${ban.user.tag} has been unbanned from the backend since they got unbanned from the Discord server.`);
    }
});

interface Command {
    data: SlashCommandBuilder;
    execute(interaction: any): Promise<void>;
}

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
    }
}
