import { ApplicationCommandOptionType, Command } from '../../lib/index.js';

export default new Command({
	name: 'ac',
	description: 'ac test',
	options: [
		{
			name: 'query',
			description: 'query',
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true,
		},
	],
}).addHandler('autocomplete', (bot, int) => {
	const str = int.options.getString('query', true);
	return int.respond(
		[...str].map((c) => ({
			name: c.toUpperCase(),
			value: c,
		})),
	);
});
