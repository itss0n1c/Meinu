import { inspect } from 'util';
import { Command } from '../Command';

const cm = new Command({
	name: 'context action',
	description: '',
	cmd_type: 'CONTEXT'
});

cm.interactionHandler((bot, int, msg) => {
	if (int.isContextMenu()) {
		int.reply({
			content: `\`\`\`js\n${inspect(msg, false, 0)}\`\`\``
		});
	}
});

export default cm;
