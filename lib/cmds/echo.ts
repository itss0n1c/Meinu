import { ApplicationCommandOptionType } from 'discord.js';
import { Command } from '../utils/index.js';

export default new Command({
	name: 'echo',
	description: 'send back what the user sent',
	options: [
		{
			name: 'string',
			description: 'the string you want sent back to you',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
}).addHandler('chatInput', (bot, int) => {
	const string = int.options.getString('string', true);
	return int.reply(string);
});
