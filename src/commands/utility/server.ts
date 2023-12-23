import { ChatInputCommandInteraction, Guild, SlashCommandBuilder } from 'discord.js';


export const data = new SlashCommandBuilder()
	.setName('server')
	.setDescription('Provides information about the server.');

export async function execute(interaction: ChatInputCommandInteraction) {
	// interaction.guild is the object representing the Guild in which the command was run
	const guild = interaction.guild as Guild;
	await interaction.reply(`This server is ${guild.name} and has ${guild.memberCount} members.`);
}
