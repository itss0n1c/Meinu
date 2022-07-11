import { Command } from '../../src';

export default new Command({
	name: 'ac',
	description: 'ac test',
	options: [
		{
			name: 'query',
			description: 'query',
			type: 'STRING',
			required: true,
			autocomplete: true
		}
	]
}).interactionHandler((bot, int) => {
	if (int.isAutocomplete()) {
		const str = int.options.getString('query', true);
		return int.respond(
			[ ...str ].map((c) => ({
				name: c.toUpperCase(),
				value: c
			}))
		);
	}
});
