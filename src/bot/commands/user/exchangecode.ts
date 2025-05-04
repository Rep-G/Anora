import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import functions from "../../../utilities/structs/functions.js";
import axios from "axios";
import log from "../../../utilities/structs/log.js";
import Users from '../../../model/user.js';

export const data = new SlashCommandBuilder()
	.setName('exchangecode')
	.setDescription('Create an exchange code')

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
try {


	const discordId = interaction.user.id;

	const user = await Users.findOne({ discordId: interaction.user.id });
	if (user)  {
        const response = await axios.get("http://127.0.0.1:3551/launcher/exchangecode?check=false&email=" + user.email);
        if (response.status != 200) {
            return interaction.editReply({content: "Failed to create an exchange code, ensure you have an account."});
        }
        if (response.data.toString() != "false") {
            let createdExchangeCode = response.data.toString();
            let exchangeCode = global.exchangeCodes.find(code => code.exchange_code === createdExchangeCode);
            let creationDate = new Date(exchangeCode.creationDate).getTime();
            let currentTime = Date.now();
            let expirationTime = 300 - Math.floor((currentTime - creationDate) / 1000);
            return interaction.editReply({content: `Created exchange code **${response.data.toString()}**, expires in ${expirationTime} seconds.`});
        }
        else {
            const response2 = await axios.get("http://127.0.0.1:3551/launcher/exchangecode?check=get&email=" + user.email);
            if (response2.status != 200 || response2.data.toString() == "false") {
                return interaction.editReply({content: "Failed to create an exchange code, ensure you have an account."});
            }
            else {
                let recievedCode = response2.data.toString();
                let exchangeCode = global.exchangeCodes.find(code => code.exchange_code === recievedCode);
                let creationDate = new Date(exchangeCode.creationDate).getTime();
                let currentTime = Date.now();
                let expirationTime = 300 - Math.floor((currentTime - creationDate) / 1000);
                return interaction.editReply({content: `You already have an exchange code **${response2.data.toString()}**, it expires in ${expirationTime} seconds.`});
            }
        }
    }
}
catch(err: any) {
    return interaction.editReply({content: `Error creating exchange code: ${err}`});  
}
}
