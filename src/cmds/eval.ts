import { inspect } from 'util';
import { Command } from '../Command';

export default new Command({
	name: 'eval',
	description: 'evaluate javascript',
	options: [
		{
			name: 'script',
			description: 'the code',
			type: 'STRING',
			required: true
		}
	]
}).run(async (bot, int) => {
	if (!bot.owners.includes(int.user.id)) {
		return 'Can\'t let you do that fam';
	}

	const script = int.options.getString('script');

	let run: string;
	try {
		run = await Object.getPrototypeOf(async () => '').constructor('bot', 'int', `return ${script}`)(bot, int);
	} catch (e) {
		console.error(e);
		run = e;
	}

	return `Output for \`${script}\`:\n\`\`\`js\n${inspect(run, { depth: 0 })}\`\`\``;
});
