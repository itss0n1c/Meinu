import { MessageEmbed } from 'discord.js';
import { Command } from '../Command';

const color = new Command({
	name: 'color',
	description: 'send back what the user sent',
	selectmenu: [
		{
			customId: 'color-menu',
			options: [
				{
					label: 'Red',
					description: 'it\'s the color red',
					value: 'red'
				},
				{
					label: 'Blue',
					description: 'it\'s the colour blue',
					value: 'blue'
				}
			]
		}
	]
});

color.interactionHandler(async (bot, int) => {
	if (int.isSelectMenu()) {
		const embed = new MessageEmbed(int.message.embeds[0] as MessageEmbed);
		if (int.customId === 'color-menu') {
			embed.setDescription(`Selected ${int.values[0]}`);
			await int.update({
				embeds: [ embed ],
				components: []
			});
		}
	}
});

color.run(() => 'Please select a color below');


export default color;
