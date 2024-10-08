import { ApplicationIntegrationType, Command, InteractionContextType } from '../../lib/index.js';
export default new Command({
	name: 'ping',
	description: 'Pong!',
	integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
	contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
}).addHandler('chatInput', async (bot, int) => {
	const sent = await int.deferReply({
		fetchReply: true,
	});
	const diff = sent.createdTimestamp - int.createdTimestamp;
	return int.editReply({
		content: `🏓 Pong! ${diff}ms`,
	});
});
