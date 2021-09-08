import { inspect } from 'util';
import { Command } from '../../src';

const cm = new Command({
	name: 'context action',
	description: '',
	type: 'MESSAGE'
});

cm.interactionHandler((bot, int, msg) => {
	if (int.isContextMenu()) {
		int.reply({
			content: `\`\`\`js\n${inspect(msg, false, 0)}\`\`\``
		});
	}
});

export default cm;
