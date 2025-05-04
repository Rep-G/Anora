import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your account stats');

export async function execute(interaction: ChatInputCommandInteraction) {

    await interaction.deferReply({ ephemeral: true });

    try {
        const user = await Users.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.editReply({ content: "You do not have an account." });
        const profile = await Profiles.findOne({ accountId: user.accountId });
        if (!profile) return interaction.editReply({ content: "You do not have an account." });

        const embed = new EmbedBuilder()
            .setTitle("Your account")
            .setDescription("These are your account details")
            .setColor("#2b2d31")
            .addFields([
                {
                    name: "Username",
                    value: user.username,
                    inline: true
                },
                {
                    name: "Vbucks",
                    value: profile.profiles.common_core.items['Currency:MtxPurchased'].quantity.toString(),
                    inline: true
                },
                {
                    name: "Kills",
                    value: user.kills.toString(),
                    inline: true
                },
                {
                    name: "Wins",
                    value: user.wins.toString(),
                    inline: true
                },
            ])
            .setFooter({
                text: user.accountId,
            })
            .setTimestamp();

        interaction.editReply({ embeds: [embed] });
    } catch (err) {
        console.log(err);
        interaction.editReply({ content: "An error occured while executing this command!\n\n" + err });
    }

}