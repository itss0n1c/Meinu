import { inspect } from 'util';
import { Command } from '../../src';

export default new Command({
	name: 'context action',
	description: '',
	type: 'MESSAGE'
}).interactionHandler((bot, int, msg) => {
	if (int.isContextMenu()) {
		int.reply({
			content: `\`\`\`js\n${inspect(msg, false, 0)}\`\`\``
		});
	}
});
