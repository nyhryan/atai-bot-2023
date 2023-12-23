import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { wrap } from './helper/helper.ts';

const __dirname = import.meta.dir;

export type SlashCommandModuleType = {
	data: SlashCommandBuilder;
	execute: Function;
}

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(pathToFileURL(filePath).toString()) as SlashCommandModuleType;

		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
			console.log(`[INFO] Loaded command at ${filePath}`);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN!);

// and deploy your commands!
console.log(`Started refreshing ${commands.length} application (/) commands.`);
const [registeredCommands, registerErr] = await wrap(rest.put(
	Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
	{ body: commands },
));

if (registerErr) {
	console.error(registerErr);
}
console.log(`Successfully reloaded ${registeredCommands.length} application (/) commands.`);

