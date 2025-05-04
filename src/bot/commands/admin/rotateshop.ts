import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import Users from '../../../model/user.js';
import axios from "axios";
import Profiles from '../../../model/profiles.js';
import safety from '../../../utilities/safety.js';
const allowedStaffRoles = ["Admin", "Manager", "Developer", "Owner"];
export const data = new SlashCommandBuilder()
    .setName('rotateshop')
    .setDescription('Rotate the item shop')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

export async function execute(interaction: ChatInputCommandInteraction) {

    await interaction.deferReply({ ephemeral: true });

    try {
        const interactionUser = await Users.findOne({discordId: interaction.user.id });
        if (!interactionUser!.roles.some(role => allowedStaffRoles.includes(role.split(':')[0]))) {
            return interaction.editReply({ content: "You are not allowed to use this command" });
        }
        const response = await axios.get("http://127.0.0.1:3551/api/staff/rotateshop/" + safety.env.API_KEY)

        interaction.editReply({ content: response.data.toString() });
    } catch (err) {
        console.log(err);
        return interaction.editReply({ content: "An error occured while executing this command!\n\n" + err });
    }

}