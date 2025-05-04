import { APIActionRowComponent, APIButtonComponent, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';
import Friends from '../../../model/friends.js';

export const data = new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete your account');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const User = await Users.findOne({ discordId: interaction.user.id });

    if (User && !User.banned)
    {
        await Users.findOneAndDelete({ discordId: interaction.user.id });
        await Profiles.findOneAndDelete({ accountId: User.accountId });
        await Friends.findOneAndDelete({ accountId: User.accountId });
        interaction.editReply({content: "Your account has been deleted"});
    }
    else
    {
        interaction.editReply({content: "You do not have an account or you are banned"});
    }


}
