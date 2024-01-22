import { ApplicationCommandOptionType } from 'discord.js';
import { inspect } from 'util';
import { Command } from '../utils/index.js';

export default new Command({
	name: 'eval',
	description: 'evaluate javascript',
	options: [
		{
			name: 'script',
			description: 'the code',
			type: ApplicationCommandOptionType.String,
			required: true
		}
	],
	ownersOnly: true
}).addHandler('chatInput', async (bot, int) => {
	const script = int.options.getString('script', true);

	let run: string;
	try {
		run = await Object.getPrototypeOf(async () => '').constructor('bot', 'int', `return ${script}`)(bot, int);
	} catch (e) {
		console.error(e);
		run = e as string;
	}

	return int.reply({
		content: `Output for \`${script}\`:\n\`\`\`js\n${inspect(run, { depth: 0 })}\`\`\``
	});
});
