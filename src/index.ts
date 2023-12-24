import { Client, Collection, GatewayIntentBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { SlashCommandModuleType } from './deploy-commands.js';

const __dirname = import.meta.dir;

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
		const command = await import(Bun.pathToFileURL(filePath).toString()) as SlashCommandModuleType;
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
			console.log(`[INFO] Loaded command ${command.data.name} from ${file}`);
		}
		else {
			console.error(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// add all events in events directory to client event listener
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = await import(Bun.pathToFileURL(filePath).toString());
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
	console.log(`[INFO] Loaded event ${event.name} from ${file}`);
}

// login to Discord with your app's token
client.login(process.env.TOKEN);