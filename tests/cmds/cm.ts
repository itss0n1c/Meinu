import { inspect } from 'node:util';
import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, Command } from '../../lib/index.js';

export default new Command({
	name: 'context action',
	type: ApplicationCommandType.Message,
})
	.addHandler('button', (bot, int) => int.reply(int.customId))
	.addHandler('messageContextMenu', async (bot, int) => {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setLabel('Test').setCustomId('context action-test').setStyle(ButtonStyle.Primary),
		);
		int.reply({
			content: `\`\`\`js\n${inspect(int.targetMessage, false, 0)}\`\`\``,
			components: [row],
		});
	});
