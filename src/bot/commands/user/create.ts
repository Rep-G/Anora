import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import functions from "../../../utilities/structs/functions.js";
import log from "../../../utilities/structs/log.js";
import Users from '../../../model/user.js';

export const data = new SlashCommandBuilder()
	.setName('create')
	.setDescription('Create an account')
	.addStringOption(option =>
		option.setName('email')
			.setDescription('Desired email.')
			.setRequired(true))
	.addStringOption(option =>
		option.setName('password')
			.setDescription('Desired password.')
			.setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {

	await interaction.deferReply({ ephemeral: true });

	const discordId = interaction.user.id;
	const username = interaction.user.tag;
	const email = interaction.options.getString('email');
	const plainPassword = interaction.options.getString('password');
	const avatarUrl = interaction.user.avatarURL();

	const user = await Users.findOne({ discordId: interaction.user.id });
	if (user) return interaction.editReply({ content: "You already have an account!" });

	await functions.registerUser(discordId, username!, email!.toLowerCase(), plainPassword!, avatarUrl!).then(async (res) => {
		await interaction.editReply({ content: res.message });
	}).catch((err) => {
		log.error(err);
	});
}
