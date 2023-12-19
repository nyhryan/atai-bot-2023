const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { wrap } = require('../../helper/helper');

module.exports = {
	/**
	 * Slash command that gets bot's new status, activity type, and activity name
	 */
	data: new SlashCommandBuilder()
		.setName('bot-presence')
		.setDescription('Changes the bot\'s presence')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		// bot status option
		.addStringOption(option =>
			option
				.setName('status')
				.setDescription('The status of the bot')
				.setRequired(true)
				.addChoices(
					{ name: 'Online', value: 'online' },
					{ name: 'Idle', value: 'idle' },
					{ name: 'Do Not Disturb', value: 'dnd' },
					{ name: 'Invisible', value: 'invisible' }),
		)
		// activity type option
		.addIntegerOption(option =>
			option
				.setName('activity-type')
				.setDescription('The activity type of the bot')
				.setRequired(true)
				.addChoices(
					{ name: 'Playing', value: 0 },
					{ name: 'Streaming', value: 1 },
					{ name: 'Listening', value: 2 },
					{ name: 'Watching', value: 3 },
					{ name: 'Custom', value: 4 },
					{ name: 'Competing', value: 5 }),
		)
		// activity name option
		.addStringOption(option =>
			option
				.setName('activity-name')
				.setDescription('The activity name of the bot')
				.setRequired(true)
				.setMaxLength(32),
		),
	/**
	 * update bot's presence and reply to user
	 * @param {*} interaction
	 */
	async execute(interaction) {
		const [ status, activityType, activityName ] = interaction.options.data;
		const client = interaction.client;
		client.user.setPresence({
			activities: [{
				name: activityName.value,
				type: activityType.value,
			}],
			status: status.value,
		});
		const [ , replyError ] = await wrap(interaction.reply({ content: 'Presence updated!', ephemeral: true }));
		if (replyError) {
			console.error(replyError);
		}
	},
};