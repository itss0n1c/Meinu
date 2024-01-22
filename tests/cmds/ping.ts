import { Command } from '../../lib/index.js';
export default new Command({
	name: 'ping',
	description: 'Pong!',
	dmPermission: true, // default: false
	ownersOnly: true, // default: false
	nsfw: true, // default: false
	global: true, // default: false
}).addHandler('chatInput', async (bot, int) => {
	const sent = await int.deferReply({
		fetchReply: true,
	});
	const diff = sent.createdTimestamp - int.createdTimestamp;
	return int.editReply({
		content: `🏓 Pong! ${diff}ms`,
	});
});
