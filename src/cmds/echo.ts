import { MessageEmbed } from 'discord.js';
import { Command } from '../Command';

const echo = new Command({
	name: 'echo',
	description: 'send back what the user sent',
	options: [
		{
			name: 'string',
			description: 'the string you want sent back to you',
			type: 'STRING',
			required: true
		}
	],
	buttons: [
		{
			label: 'yeet',
			style: 'PRIMARY',
			customId: 'primary'
		}
	]
});

echo.interactionHandler((bot, int) => {
	if (int.isButton()) {
		const embed = new MessageEmbed(int.message.embeds[0] as MessageEmbed)
			.setDescription(int.customId);
		int.update({ embeds: [
			embed
		] });
	}
});

echo.run((bot, interaction) => interaction.options.getString('string') || 'hi');


export default echo;
