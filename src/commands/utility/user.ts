import { CommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
	.setName('user')
	.setDescription('Provides information about the user.');

export async function execute(interaction: CommandInteraction) {
	// interaction.user is the object representing the User who ran the command
	// interaction.member is the GuildMember object, which represents the user in the specific guild
	const member = interaction.member as GuildMember;
    await interaction.reply(`${member.user.displayName}, joined at ${member.joinedAt}.`);
}
