import { Command, MessageEmbed } from '../../src';

const pfp = new Command({
	name: 'Get PFP',
	description: 'get user profile picture',
	type: 'USER'
});

pfp.interactionHandler(async (bot, int) => {
	if (int.isContextMenu()) {
		const user = await int.guild.members.fetch(int.targetId);
		int.reply({
			embeds: [ new MessageEmbed().setDescription(`${user.user}'s PFP`).setImage(user.user.displayAvatarURL({
				dynamic: true,
				format: 'png'
			})) ]
		});
	}
});

export default pfp;
