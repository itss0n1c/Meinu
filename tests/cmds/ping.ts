import { Command, CommandContext, CommandIntegrationType } from '../../lib/index.js';
export default new Command({
	name: 'ping',
	description: 'Pong!',
	global: true,
	integration_types: [CommandIntegrationType.GUILD_INSTALL, CommandIntegrationType.USER_INSTALL],
	contexts: [CommandContext.GUILD, CommandContext.BOT_DM, CommandContext.PRIVATE_CHANNEL],
}).addHandler('chatInput', async (bot, int) => {
	const sent = await int.deferReply({
		fetchReply: true,
	});
	const diff = sent.createdTimestamp - int.createdTimestamp;
	return int.editReply({
		content: `🏓 Pong! ${diff}ms`,
	});
});
