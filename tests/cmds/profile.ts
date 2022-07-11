import { Command, MessageEmbed } from '../../src';

export default new Command({
	name: 'Get PFP',
	description: 'get user profile picture',
	type: 'USER'
}).interactionHandler(async (bot, int) => {
	if (int.isContextMenu() && int.inGuild()) {
		if (!int.guild) {
			throw 'Guild not found';
		}
		const user = await int.guild.members.fetch(int.targetId);
		int.reply({
			embeds: [
				new MessageEmbed().setDescription(`${user.user}'s PFP`).setImage(
					user.displayAvatarURL({
						dynamic: true,
						format: 'png'
					})
				)
			]
		});
	}
});
