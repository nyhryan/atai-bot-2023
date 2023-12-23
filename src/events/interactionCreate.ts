import { Events, Interaction } from 'discord.js';
import { wrap } from '../helper/helper.js';
import { CustomClient } from '../index.js';


export const name = Events.InteractionCreate;
export async function execute(interaction: Interaction) {
	if (interaction.isChatInputCommand()) {
		const client = interaction.client as CustomClient;
		const command = client.commands!.get(interaction.commandName);
		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		const [, error] = await wrap(command.execute(interaction));
		if (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			}
			else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	}
}
