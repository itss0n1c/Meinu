import { inspect } from 'util';
import { Command } from '../../src';

const user = new Command({
	name: 'user action',
	description: 'actions on user',
	type: 'USER'
});

user.interactionHandler(async (bot, int) => {
	if (int.isContextMenu() && int.inGuild()) {
		if (!int.guild) {
			throw 'Guild not found';
		}
		const user = await int.guild.members.fetch(int.targetId);
		int.reply(`\`\`\`js\n${inspect(user, false, 0)}\`\`\``);
	}
});

export default user;
