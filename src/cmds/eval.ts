import { inspect } from 'util';
import { Command } from '../Command';

const evalc = new Command({
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
});

evalc.run(async (client, interaction) => {
	if (!client.owners.includes(interaction.user.id)) {
		return 'Can\'t let you do that fam';
	}


	const script = interaction.options.getString('script');

	let run: string;
	try {
		run = await Object.getPrototypeOf((async () => '')).constructor('client', 'interaction', `return ${script}`)(client, interaction);
	} catch (e) {
		console.error(e);
		run = e;
	}

	return `Output for \`${script}\`:\n\`\`\`js\n${inspect(run, { depth: 0 })}\`\`\``;
});

export default evalc;
