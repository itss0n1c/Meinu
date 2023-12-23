import { inspect } from 'util';
import { ApplicationCommandType, Command } from '../../src/index.js';

const user = new Command({
	name: 'user action',
	type: ApplicationCommandType.User
}).addHandler('userContextMenu', async (bot, int) => {
	if (!int.guild) throw 'Guild not found';

	const user = await int.guild.members.fetch(int.targetId);
	int.reply(`\`\`\`js\n${inspect(user, false, 0)}\`\`\``);
});

export default user;
