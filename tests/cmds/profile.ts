import { ApplicationCommandType, Command, EmbedBuilder } from '../../lib/index.js';

export default new Command({
	name: 'Get PFP',
	type: ApplicationCommandType.User,
}).addHandler('userContextMenu', async (bot, int) => {
	if (!int.guild) throw new Error('Cannot get pfp of a DM');

	const user = await int.guild.members.fetch(int.targetId);
	int.reply({
		embeds: [
			new EmbedBuilder().setDescription(`${user.user}'s PFP`).setImage(
				user.displayAvatarURL({
					extension: 'png',
				}),
			),
		],
	});
});
