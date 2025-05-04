import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import Users from '../../../model/user.js';
import axios from "axios";
import Profiles from '../../../model/profiles.js';
import safety from '../../../utilities/safety.js';
const allowedStaffRoles = ["Moderator", "Admin", "Manager", "Developer", "Owner"];
export const data = new SlashCommandBuilder()
    .setName('setuser')
    .setDescription('Set a user field')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('The username of the user you want edit')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('field')
            .setDescription('Field you want to change')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('value')
            .setDescription('Value you want to change too')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

export async function execute(interaction: ChatInputCommandInteraction) {

    await interaction.deferReply({ ephemeral: true });

    try {
        const interactionUser = await Users.findOne({discordId: interaction.user.id });
        const user = await Users.findOne({ username: interaction.options.getString("username") });
        if (!user) return interaction.editReply({ content: "User do not have an account." });
        const profile = await Profiles.findOne({ username: interaction.options.getString("username") });
        if (!profile) return interaction.editReply({ content: "User do not have an account." });
        if (!interactionUser!.roles.some(role => allowedStaffRoles.includes(role.split(':')[0]))) {
            return interaction.editReply({ content: "You are not allowed to use this command" });
        }
        const response = await axios.get("http://127.0.0.1:3551/api/staff/setuser/" + safety.env.API_KEY, {
            headers: {
                'accountid': user.accountId,
                'add': interaction.options.getString("field"),
                'value': interaction.options.getString("value"),
            }
        })

        interaction.editReply({ content: response.data.toString() });
    } catch (err) {
        console.log(err);
        return interaction.editReply({ content: "An error occured while executing this command!\n\n" + err });
    }

}