import { Client, Collection, GatewayIntentBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { getDirName } from './helper/helper.js';
import { SlashCommandModuleType } from './deploy-commands.js';

import dotenv from 'dotenv';
dotenv.config();

const __dirname = getDirName(import.meta.url);

console.log('Starting ATAI bot...');

export class CustomClient extends Client {
	commands: Collection<string, SlashCommandModuleType> | undefined;
}

const client = new CustomClient(
	{
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
		],
	},
);
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// add all commands in commands directory to client.commands collection
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(pathToFileURL(filePath).toString()) as SlashCommandModuleType;
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// add all events in events directory to client event listener
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = await import(pathToFileURL(filePath).toString());
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// login to Discord with your app's token
client.login(process.env.TOKEN);